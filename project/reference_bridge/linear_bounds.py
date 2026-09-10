"""Small, exact, certificate-producing linear bounds; no numerical LP dependency.

``certify_polytope(A, b, objectives)`` considers the closed set ``A x <= b``
in four variables. Inputs and outputs use :class:`fractions.Fraction`; integers
and other finite values accepted by ``Fraction`` are also accepted. A float is
interpreted as its exact binary value, so decimal observations should preferably
be supplied as ``Fraction(decimal_text)`` by the caller.

Every reported upper bound has nonnegative rational weights satisfying
``A.T @ weights == objective`` exactly. Multiplying the input inequalities by
those weights proves the bound. Lower bounds use the negative objective. A
separate feasible vertex is required before the result is called certified.

The routine deliberately does not classify missing vertices or certificates as
infeasibility or unboundedness. For example, a feasible set with a line may have
no vertex. Such cases are ``inconclusive``. Certification concerns the supplied
inequalities only; their physical assumptions and measurement-error bounds must
be established separately.
"""

from fractions import Fraction
from itertools import combinations


def _fraction(value, label):
    """Reject NaN, infinity, and unsupported values at the API boundary."""
    if isinstance(value, bool):
        raise ValueError(f"{label} must be a finite rational number, not bool")
    try:
        return Fraction(value)
    except (ValueError, TypeError, ZeroDivisionError, OverflowError) as exc:
        raise ValueError(f"{label} must be a finite rational number") from exc


def _vector(values, size, label):
    try:
        result = list(values)
    except TypeError as exc:
        raise ValueError(f"{label} must contain {size} entries") from exc
    if len(result) != size:
        raise ValueError(f"{label} must contain {size} entries")
    return [_fraction(value, f"{label}[{i}]") for i, value in enumerate(result)]


def _eliminate(matrix, right):
    """Solve an already validated square system with one or more RHS columns."""
    size = len(matrix)
    rhs_size = len(right[0])
    augmented = [list(row) + list(rhs) for row, rhs in zip(matrix, right)]
    for column in range(size):
        pivot = next((row for row in range(column, size)
                      if augmented[row][column] != 0), None)
        if pivot is None:
            raise ValueError("The matrix is singular")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        divisor = augmented[column][column]
        augmented[column] = [entry / divisor for entry in augmented[column]]
        for row in range(size):
            if row == column:
                continue
            multiplier = augmented[row][column]
            if multiplier:
                augmented[row] = [a - multiplier * p
                                  for a, p in zip(augmented[row], augmented[column])]
    return [row[size:size + rhs_size] for row in augmented]


def solve_linear(matrix, rhs):
    """Return an exact solution of a nonempty square system.

    Invalid dimensions, nonfinite input, or a singular matrix raise ValueError.
    This helper is also suitable for the four-state bridge point fit.
    """
    try:
        rows = list(matrix)
    except TypeError as exc:
        raise ValueError("matrix must be a nonempty square matrix") from exc
    size = len(rows)
    if size == 0:
        raise ValueError("matrix must be a nonempty square matrix")
    converted = [_vector(row, size, f"matrix[{i}]") for i, row in enumerate(rows)]
    values = _vector(rhs, size, "rhs")
    return [row[0] for row in _eliminate(converted, [[value] for value in values])]


def _dot(left, right):
    return sum((a * b for a, b in zip(left, right)), Fraction(0))


def certify_polytope(A, b, objectives):
    """Bound named linear objectives on a four-dimensional rational polytope.

    ``A`` contains rows of length four, ``b`` has one value per row, and
    ``objectives`` maps a name to a length-four coefficient vector. All
    constraints are non-strict ``<=`` inequalities, including any nonnegativity
    constraints needed by the caller. No domain bounds are added implicitly.

    Return shape::

        {
            'status': 'certified' | 'inconclusive',
            'feasible': bool,  # True only when an exact witness was found
            'witness': [Fraction, ...] | None,
            'bounds': {
                name: {
                    'lower': Fraction | None,
                    'upper': Fraction | None,
                    'lower_certificate': {
                        'indices': [int, ...],
                        'weights': [Fraction, ...],
                        'upper_for_negative': Fraction,
                    } | None,
                    'upper_certificate': {
                        'indices': [int, ...],
                        'weights': [Fraction, ...],
                        'upper_bound': Fraction,
                    } | None,
                },
            },
            'bases_examined': int,
            'nonsingular_bases': int,
        }

    Weights correspond to the four original constraint indices. For an upper
    certificate their weighted rows equal the objective, and their weighted
    right sides equal ``upper_bound``. For a lower certificate they equal the
    negative objective, with ``lower == -upper_for_negative``. Zero weights are
    retained so the basis can be reconstructed directly.

    ``feasible=False`` means *no witness found*, not a proof of infeasibility.
    Any missing witness or missing requested bound makes status inconclusive.
    Fraction results are intentionally not converted to JSON floats here.
    """
    try:
        input_rows = list(A)
    except TypeError as exc:
        raise ValueError("A must contain rows of length four") from exc
    rows = [_vector(row, 4, f"A[{i}]") for i, row in enumerate(input_rows)]
    rhs = _vector(b, len(rows), "b")
    if not isinstance(objectives, dict) or not objectives:
        raise ValueError("objectives must be a nonempty dict of coefficient vectors")
    converted = {}
    for name, coefficients in objectives.items():
        if not isinstance(name, str) or not name:
            raise ValueError("objective names must be nonempty strings")
        converted[name] = _vector(coefficients, 4, f"objectives[{name!r}]")
    result = {
        "status": "inconclusive",
        "feasible": False,
        "witness": None,
        "bounds": {
            name: {"lower": None, "upper": None,
                   "lower_certificate": None, "upper_certificate": None}
            for name in converted
        },
        "bases_examined": 0,
        "nonsingular_bases": 0,
    }
    identity = [[Fraction(int(i == j)) for j in range(4)] for i in range(4)]
    for indices in combinations(range(len(rows)), 4):
        result["bases_examined"] += 1
        basis = [rows[index] for index in indices]
        try:
            inverse = _eliminate(basis, identity)
        except ValueError:
            # Dependence between active rows is an expected basis candidate.
            continue
        result["nonsingular_bases"] += 1
        basis_rhs = [rhs[index] for index in indices]
        if result["witness"] is None:
            vertex = [_dot(row, basis_rhs) for row in inverse]
            if all(_dot(row, vertex) <= value for row, value in zip(rows, rhs)):
                result["witness"] = vertex
                result["feasible"] = True

        for name, objective in converted.items():
            current = result["bounds"][name]
            # basis.T * lambda = +/- objective, hence lambda = inverse.T * c.
            for direction in (1, -1):
                weights = [sum((inverse[j][i] * objective[j] * direction
                                for j in range(4)), Fraction(0))
                           for i in range(4)]
                if any(weight < 0 for weight in weights):
                    continue
                bound = _dot(weights, basis_rhs)
                if direction == 1:
                    if current["upper"] is None or bound < current["upper"]:
                        current["upper"] = bound
                        current["upper_certificate"] = {
                            "indices": list(indices), "weights": weights,
                            "upper_bound": bound,
                        }
                elif current["lower"] is None or -bound > current["lower"]:
                    current["lower"] = -bound
                    current["lower_certificate"] = {
                        "indices": list(indices), "weights": weights,
                        "upper_for_negative": bound,
                    }
    if result["feasible"] and all(item["lower"] is not None and
                                  item["upper"] is not None
                                  for item in result["bounds"].values()):
        result["status"] = "certified"
    return result
