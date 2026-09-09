"""CLI and research-data integrity checks using disposable project copies.

These small synthetic runs exercise logging and replay, not hardware safety.
Neither result files nor LATEST.txt in the delivered project are modified.
"""
import csv
import gzip
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path, PurePosixPath, PureWindowsPath


PROJECT = Path(__file__).resolve().parents[1]


def read_csv(path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", newline="", encoding="utf-8") as stream:
        return list(csv.DictReader(stream))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ExperimentIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="thermal-experiment-tests-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.scratch = Path(cls.temp.name)
        cls.base = cls.scratch / "project"
        cls.base.mkdir()
        shutil.copy2(PROJECT / "run_experiments.py", cls.base / "run_experiments.py")
        shutil.copytree(PROJECT / "src", cls.base / "src")
        shutil.copytree(PROJECT / "config", cls.base / "config")
        (cls.base / "results").mkdir()
        cls.config = json.loads((cls.base / "config" / "evaluation.json").read_text())
        # Keep the fixture small while crossing dropout and disturbance boundaries.
        cls.config.update(
            steps=365,
            seeds=[6100, 6101],
            policies=["interval_queue", "interval_no_queue", "threshold"],
            scenarios=["no_delay", "delay_8", "delay_20", "dropout_60",
                       "hot_start", "upper_corner", "model_violation",
                       "stuck_low", "queue_mismatch"],
            mismatch_window=[130, 140],
        )
        cls.config_path = cls.base / "config" / "integration.json"
        cls.config_path.write_text(json.dumps(cls.config, indent=2), encoding="utf-8")
        cls.first = cls.base / "results" / "first"
        cls.replay = cls.base / "results" / "replay"
        for output in (cls.first, cls.replay):
            result = cls.run_cli(output)
            if result.returncode:
                raise RuntimeError(f"Fixture runner failed:\n{result.stdout}\n{result.stderr}")
        cls.raw = read_csv(cls.first / "raw_steps.csv.gz")
        cls.episodes = read_csv(cls.first / "episodes.csv")
        cls.summary = read_csv(cls.first / "summary.csv")
        cls.groups = defaultdict(list)
        for row in cls.raw:
            cls.groups[(row["scenario"], row["seed"], row["policy"])].append(row)

    @classmethod
    def run_cli(cls, output, config_path=None):
        return subprocess.run(
            [sys.executable, str(cls.base / "run_experiments.py"),
             "--config", str(config_path or cls.config_path), "--out", str(output)],
            cwd=cls.base,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )

    def tiny_config(self, name):
        config = dict(self.config, steps=12, seeds=[6199],
                      scenarios=["no_delay"], policies=["interval_queue"])
        path = self.base / "config" / f"{name}.json"
        path.write_text(json.dumps(config), encoding="utf-8")
        return path

    def test_repeat_run_reproduces_data_and_nonvolatile_metadata(self):
        # Gzip envelopes and wall-clock metadata are intentionally not compared.
        for name in ("episodes.csv", "summary.csv", "example_traces.csv"):
            with self.subTest(file=name):
                self.assertEqual((self.first / name).read_bytes(),
                                 (self.replay / name).read_bytes())
        with gzip.open(self.first / "raw_steps.csv.gz", "rb") as stream:
            first_raw = stream.read()
        with gzip.open(self.replay / "raw_steps.csv.gz", "rb") as stream:
            self.assertEqual(first_raw, stream.read())
        first_meta = json.loads((self.first / "run_metadata.json").read_text())
        replay_meta = json.loads((self.replay / "run_metadata.json").read_text())
        for meta in (first_meta, replay_meta):
            for field in ("utc", "duration_seconds"):
                meta.pop(field)
        self.assertEqual(first_meta, replay_meta)

    def test_completed_metadata_has_correct_counts_and_source_hashes(self):
        expected_episodes = (len(self.config["scenarios"]) * len(self.config["seeds"])
                             * len(self.config["policies"]))
        for output in (self.first, self.replay):
            with self.subTest(output=output.name):
                self.assertEqual(
                    {path.name for path in output.iterdir()},
                    {"episodes.csv", "summary.csv", "example_traces.csv",
                     "raw_steps.csv.gz", "run_metadata.json"},
                )
                meta = json.loads((output / "run_metadata.json").read_text())
                self.assertEqual(meta["config"], self.config)
                self.assertEqual(meta["config_sha256"], sha256(self.config_path))
                self.assertEqual(meta["episodes"], expected_episodes)
                self.assertEqual(meta["sampled_transitions"],
                                 expected_episodes * self.config["steps"])
                self.assertEqual(meta["sampled_transitions"], len(self.raw))
                self.assertTrue(math.isfinite(meta["duration_seconds"]))
                self.assertGreaterEqual(meta["duration_seconds"], 0)
                # Check serialized keys directly: normalizing them here would hide
                # Windows separators that a POSIX reviewer cannot use as paths.
                hashes = meta["source_sha256"]
                self.assertEqual(set(hashes), {"run_experiments.py", "src/governor.py"})
                for name, digest in hashes.items():
                    self.assertEqual(digest, sha256(self.base / name))
                for recorded, exported in zip(meta["aggregation"], self.summary):
                    self.assertEqual({key: str(value) for key, value in recorded.items()},
                                     exported)
                self.assertEqual(len(meta["aggregation"]), len(self.summary))

    def test_episode_metrics_reconcile_to_raw_transitions(self):
        self.assertEqual(len(self.episodes), len(self.groups))
        outside_contract = {"model_violation", "stuck_low", "queue_mismatch"}
        for episode in self.episodes:
            key = (episode["scenario"], episode["seed"], episode["policy"])
            with self.subTest(episode=key):
                rows = self.groups[key]
                self.assertEqual([int(row["k"]) for row in rows],
                                 list(range(self.config["steps"])))
                self.assertEqual([int(row["decision_id"]) for row in rows],
                                 list(range(1, self.config["steps"] + 1)))
                self.assertEqual(episode["in_contract"],
                                 str(episode["scenario"] not in outside_contract))
                for metric, column in (("breach_steps", "breach"),
                                       ("interval_misses", "interval_miss")):
                    self.assertEqual(int(episode[metric]), sum(int(row[column]) for row in rows))
                self.assertEqual(int(episode["invalid_steps"]),
                                 sum(row["valid"] == "0" for row in rows))
                self.assertEqual(int(episode["missing_steps"]),
                                 sum(row["reading_C"] == "" for row in rows))
                self.assertEqual(int(episode["clipped_steps"]),
                                 sum(row["reading_C"] != "" and
                                     float(row["reading_C"]) == self.config["clip_C"]
                                     for row in rows))
                temperatures = [float(rows[0]["true_T_C"])]
                temperatures.extend(float(row["next_T_C"]) for row in rows)
                self.assertEqual(float(episode["max_T_C"]), max(temperatures))
                effort = sum(float(row["applied"]) for row in rows)
                requested = sum(float(row["requested"]) for row in rows)
                self.assertAlmostEqual(float(episode["effort_fraction"]), effort / requested, places=12)
                cumulative = 0.0
                for row in rows:
                    cumulative += float(row["applied"])
                    self.assertAlmostEqual(float(row["cumulative_effort"]), cumulative, places=12)
                    truth = float(row["true_T_C"])
                    contained = float(row["lo_C"]) - 1e-7 <= truth <= float(row["hi_C"]) + 1e-7
                    self.assertEqual(int(row["interval_miss"]), int(not contained))
                    self.assertEqual(int(row["breach"]),
                                     int(float(row["next_T_C"]) > self.config["limit_C"] + 1e-7))

    def test_summary_metrics_reconcile_to_episode_rows(self):
        expected_keys = {(scenario, policy) for scenario in self.config["scenarios"]
                         for policy in self.config["policies"]}
        self.assertEqual({(row["scenario"], row["policy"]) for row in self.summary}, expected_keys)
        for summary in self.summary:
            key = (summary["scenario"], summary["policy"])
            with self.subTest(summary=key):
                episodes = [row for row in self.episodes
                            if (row["scenario"], row["policy"]) == key]
                self.assertEqual(int(summary["episodes"]), len(self.config["seeds"]))
                self.assertEqual(int(summary["breach_episodes"]),
                                 sum(int(row["breach_steps"]) > 0 for row in episodes))
                self.assertEqual(float(summary["max_T_C"]), max(float(row["max_T_C"]) for row in episodes))
                self.assertAlmostEqual(float(summary["mean_effort_fraction"]),
                                       sum(float(row["effort_fraction"]) for row in episodes) / len(episodes),
                                       places=12)
                for field in ("interval_misses", "invalid_steps", "clipped_steps"):
                    self.assertEqual(int(summary[field]), sum(int(row[field]) for row in episodes))

    def test_raw_fifo_and_acknowledgment_are_consistent(self):
        mismatch_witnesses = 0
        for key, rows in self.groups.items():
            scenario = key[0]
            delay = 0 if scenario == "no_delay" else 20 if scenario in {"delay_20", "upper_corner"} else 8
            with self.subTest(episode=key):
                for k, row in enumerate(rows):
                    pending = json.loads(row["pending_json"])
                    expected_pending = [0.0 if index < 0 else float(rows[index]["accepted"])
                                        for index in range(k - delay, k)]
                    self.assertEqual(pending, expected_pending)
                    acknowledged = pending[0] if delay else float(row["accepted"])
                    self.assertEqual(float(row["acknowledged"]), acknowledged)
                    injected = scenario == "queue_mismatch" and 130 <= k < 140
                    actual = 1.0 if injected else acknowledged
                    self.assertEqual(float(row["applied"]), actual)
                    mismatch_witnesses += int(injected and actual != acknowledged)
                    if k:
                        self.assertEqual(row["true_T_C"], rows[k - 1]["next_T_C"])
        # Ensure this fixture really exercised an applied-versus-ACK mismatch.
        self.assertGreater(mismatch_witnesses, 0)

    def test_example_traces_are_exact_selected_raw_rows(self):
        expected = [row for row in self.raw
                    if row["seed"] == str(self.config["seeds"][0])
                    and row["scenario"] in {"delay_20", "upper_corner", "model_violation"}]
        self.assertEqual(read_csv(self.first / "example_traces.csv"), expected)
        self.assertTrue(any(row["reading_C"] == "" for row in expected))
        self.assertTrue(any(row["reading_C"] and float(row["reading_C"]) == self.config["clip_C"]
                            for row in expected))

    def test_policy_and_seed_order_do_not_change_paired_outcomes(self):
        config = dict(self.config,
                      policies=list(reversed(self.config["policies"])),
                      seeds=list(reversed(self.config["seeds"])))
        config_path = self.base / "config" / "reordered.json"
        config_path.write_text(json.dumps(config), encoding="utf-8")
        output = self.base / "results" / "reordered"
        result = self.run_cli(output, config_path)
        self.assertEqual(result.returncode, 0, result.stderr)
        key = lambda row: (row["scenario"], row["seed"], row["policy"], int(row.get("k", 0)))
        self.assertEqual(sorted(read_csv(output / "raw_steps.csv.gz"), key=key),
                         sorted(self.raw, key=key))
        self.assertEqual(sorted(read_csv(output / "episodes.csv"), key=key),
                         sorted(self.episodes, key=key))

    def test_existing_output_is_rejected_without_changes(self):
        output = self.base / "results" / "must-preserve"
        output.mkdir()
        (output / "nested").mkdir()
        (output / "sentinel.txt").write_bytes(b"pre-existing results\x00\xff")
        (output / "nested" / "notes.txt").write_text("Retain this file.")
        before = {str(path.relative_to(output)): sha256(path)
                  for path in output.rglob("*") if path.is_file()}
        latest_before = (self.base / "results" / "LATEST.txt").read_bytes()
        result = self.run_cli(output)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FileExistsError", result.stderr)
        after = {str(path.relative_to(output)): sha256(path)
                 for path in output.rglob("*") if path.is_file()}
        self.assertEqual(after, before)
        self.assertEqual((self.base / "results" / "LATEST.txt").read_bytes(), latest_before)

    def test_relative_output_completes_and_records_relative_latest(self):
        output = Path("results") / "relative-output"
        result = self.run_cli(output, self.tiny_config("relative"))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.base / output / "run_metadata.json").is_file())
        serialized = (self.base / "results" / "LATEST.txt").read_text()
        self.assertEqual(serialized, "results/relative-output")
        # Both path grammars must see two components, on either CI host.
        for grammar in (PurePosixPath, PureWindowsPath):
            with self.subTest(grammar=grammar.__name__):
                self.assertEqual(grammar(serialized).parts, ("results", "relative-output"))
        latest = Path(serialized)
        self.assertFalse(latest.is_absolute())
        self.assertEqual(latest, output)

    def test_external_absolute_output_completes_and_records_absolute_latest(self):
        output = self.scratch / "external-output"
        result = self.run_cli(output, self.tiny_config("external"))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((output / "run_metadata.json").is_file())
        serialized = (self.base / "results" / "LATEST.txt").read_text()
        self.assertEqual(serialized, output.resolve().as_posix())
        self.assertNotIn("\\", serialized)
        latest = Path(serialized)
        self.assertTrue(latest.is_absolute())
        self.assertEqual(latest, output.resolve())


if __name__ == "__main__":
    unittest.main(verbosity=2)
