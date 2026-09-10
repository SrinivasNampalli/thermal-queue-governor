"""Compare reproducible research reports while allowing platform float last bits."""
from math import isclose


def compare_report(stored, actual, location="report"):
    if isinstance(actual, dict):
        assert isinstance(stored, dict) and stored.keys() == actual.keys(), location
        for key, value in actual.items():
            compare_report(stored[key], value, location + "." + key)
    elif isinstance(actual, list):
        assert isinstance(stored, list) and len(stored) == len(actual), location
        for i, (a, b) in enumerate(zip(stored, actual)):
            compare_report(a, b, f"{location}[{i}]")
    elif isinstance(actual, float):
        assert isinstance(stored, (int, float)) and isclose(stored, actual, rel_tol=1e-10, abs_tol=1e-8), location
    else:
        # Decisions, source hashes and rational certificate strings remain exact.
        assert stored == actual, location
