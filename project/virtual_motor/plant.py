"""Independent illustrative four-state motor plant. SIMULATION ONLY; SI units.

This module never imports the scalar governor or uses its recurrence.
"""
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class Parameters:
    rated_current_A: float = 14.0
    current_time_constant_s: float = 0.08
    winding_capacity_J_per_K: float = 240.0
    housing_capacity_J_per_K: float = 1400.0
    winding_to_housing_W_per_K: float = 4.0
    housing_to_ambient_W_per_K: float = 3.0
    resistance_at_20C_ohm: float = 0.8
    copper_alpha_per_K: float = 0.00393
    sensor_time_constant_s: float = 0.65

    def __post_init__(self):
        for name, value in self.__dict__.items():
            if not math.isfinite(value) or value < 0:
                raise ValueError(f"invalid plant parameter: {name}")
            if value == 0 and name not in ("winding_to_housing_W_per_K", "housing_to_ambient_W_per_K", "copper_alpha_per_K"):
                raise ValueError(f"positive plant parameter required: {name}")


@dataclass(frozen=True)
class State:
    current_A: float
    winding_C: float
    housing_C: float
    sensor_C: float


@dataclass(frozen=True)
class Step:
    end: State
    peak_winding_C: float
    peak_offset_s: float
    rms_current_A: float
    joule_energy_J: float
    ambient_energy_J: float
    energy_balance_error_J: float
    integration_substeps: int
    actual_dt_s: float


def current_solution(initial_A, target_A, time_s, tau_s):
    """Exact first-order current response, including residual current at zero command."""
    return target_A + (initial_A - target_A) * math.exp(-time_s / tau_s)


def current_squared_integral(initial_A, target_A, duration_s, tau_s):
    """Exact integral of I(t)^2, in A²s, for a constant target over one interval."""
    delta = initial_A - target_A
    return (target_A * target_A * duration_s
            + 2 * target_A * delta * tau_s * (-math.expm1(-duration_s / tau_s))
            + delta * delta * tau_s / 2 * (-math.expm1(-2 * duration_s / tau_s)))


class VirtualMotor:
    def __init__(self, parameters, initial, dt_s=0.025, resolution_scale=1.0):
        if not math.isfinite(dt_s) or dt_s <= 0:
            raise ValueError("positive finite integration step required")
        if not all(math.isfinite(v) for v in initial.__dict__.values()) or initial.current_A < 0:
            raise ValueError("invalid initial state")
        if not math.isfinite(resolution_scale) or not 0 < resolution_scale <= 1:
            raise ValueError("resolution scale must be in (0, 1]")
        self.p, self.state, self.dt_s = parameters, initial, dt_s
        self.resolution_scale = resolution_scale

    def advance(self, drive_effort, ambient_C, load_factor=1.0, duration_s=1.0):
        """Advance four independent states; return resolved substep peak and energy audit.

        drive_effort is normalized commanded current, not measured RMS effort or torque.
        load_factor is a declared current-demand disturbance, not a mechanical model.
        """
        if not all(math.isfinite(v) for v in (drive_effort, ambient_C, load_factor, duration_s)):
            raise ValueError("finite drive inputs required")
        if drive_effort < 0 or load_factor < 0 or duration_s <= 0:
            raise ValueError("negative effort/load or nonpositive duration")
        p, initial = self.p, self.state
        target = p.rated_current_A * drive_effort * load_factor
        # Exact current endpoints alone do not resolve the I² heating quadrature.
        # Limit the integration step by electrical, sensor, and thermal rates too.
        max_current = max(initial.current_A, target)
        winding_rate = (p.winding_to_housing_W_per_K + max_current ** 2 * p.resistance_at_20C_ohm * p.copper_alpha_per_K) / p.winding_capacity_J_per_K
        housing_rate = (p.winding_to_housing_W_per_K + p.housing_to_ambient_W_per_K) / p.housing_capacity_J_per_K
        scale = self.resolution_scale
        resolved_dt = min(self.dt_s, scale * p.current_time_constant_s / 8, scale * p.sensor_time_constant_s / 4,
                          scale / (8 * winding_rate) if winding_rate else math.inf,
                          scale / (8 * housing_rate) if housing_rate else math.inf)
        count = max(1, math.ceil(duration_s / resolved_dt))
        if count > 1_000_000:
            raise ValueError("more than one million substeps required; shorten the advance interval or review plant time scales")
        h = duration_s / count
        tw, th, ts = initial.winding_C, initial.housing_C, initial.sensor_C
        peak, peak_time, joule, ambient_energy = tw, 0.0, 0.0, 0.0

        def rhs(winding, housing, sensor, current):
            resistance = p.resistance_at_20C_ohm * (1 + p.copper_alpha_per_K * (winding - 20))
            if resistance <= 0:
                raise ValueError("temperature outside positive-resistance model domain")
            power = current * current * resistance
            internal = p.winding_to_housing_W_per_K * (winding - housing)
            ambient_flux = p.housing_to_ambient_W_per_K * (housing - ambient_C)
            return ((power - internal) / p.winding_capacity_J_per_K,
                    (internal - ambient_flux) / p.housing_capacity_J_per_K,
                    (winding - sensor) / p.sensor_time_constant_s, power, ambient_flux)

        decay_half = math.exp(-h / (2 * p.current_time_constant_s))
        current = initial.current_A
        for j in range(count):
            ihalf = target + (current - target) * decay_half
            iend = target + (ihalf - target) * decay_half
            k1 = rhs(tw, th, ts, current)
            k2 = rhs(tw + h / 2 * k1[0], th + h / 2 * k1[1], ts + h / 2 * k1[2], ihalf)
            k3 = rhs(tw + h / 2 * k2[0], th + h / 2 * k2[1], ts + h / 2 * k2[2], ihalf)
            k4 = rhs(tw + h * k3[0], th + h * k3[1], ts + h * k3[2], iend)
            tw += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
            th += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ts += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
            joule += h / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])
            ambient_energy += h / 6 * (k1[4] + 2 * k2[4] + 2 * k3[4] + k4[4])
            current = iend
            if tw > peak:
                peak, peak_time = tw, (j + 1) * h
        if not all(math.isfinite(v) for v in (tw, th, ts, current)):
            raise ArithmeticError("nonfinite virtual plant state")
        self.state = State(current, tw, th, ts)
        stored = p.winding_capacity_J_per_K * (tw - initial.winding_C) + p.housing_capacity_J_per_K * (th - initial.housing_C)
        rms = math.sqrt(max(0.0, current_squared_integral(initial.current_A, target, duration_s, p.current_time_constant_s) / duration_s))
        return Step(self.state, peak, peak_time, rms, joule, ambient_energy, stored + ambient_energy - joule, count, h)
