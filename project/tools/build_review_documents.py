"""Render the current manuscript and review packet without rewriting old artifacts.

Requires the same ReportLab and Windows Arial fonts as build_documents.py.
The virtual validation runner itself requires only the Python standard library.
"""
from pathlib import Path
import sys

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
from build_documents import writepdf

AUTHORS = "Srinivas Nampalli; Saathvik Gampa (document authors; AI-assisted)"


def main():
    for name in ("RESEARCH_MANUSCRIPT", "PATENT_REVIEW_AND_VIRTUAL_VALIDATION"):
        source = PROJECT / "docs" / (name + ".md")
        content = source.read_text(encoding="utf-8")
        if name == "PATENT_REVIEW_AND_VIRTUAL_VALIDATION":
            for relative in ("research/PATENT_REVIEW_2026-09.md", "research/MOTOR_SPECIFICATION_INTAKE.md"):
                content += "\n\n[[PAGEBREAK]]\n\n" + (PROJECT / relative).read_text(encoding="utf-8")
        writepdf(name + ".pdf", content, author=AUTHORS)
        print("Built " + name + ".pdf")


if __name__ == "__main__":
    main()
