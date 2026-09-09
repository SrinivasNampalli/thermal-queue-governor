/*
 * Educational component catalog for the Thermal Queue Governor schematic.
 * The geometry is a generic motor-and-drive illustration, not a validated
 * architecture, wiring diagram, parts list, or manufacturer product model.
 * Only the scalar thermal state, clipped observation and command FIFO are
 * simulated. Sources explain ordinary component functions, not this invention.
 */
window.THERMAL_COMPONENTS = [
  {
    id: "housing", name: "Motor housing and cooling fins", group: "Motor",
    summary: "The outer shell supports and protects the motor, with fins that expose more area to cooling air.",
    role: "Structure and heat path",
    modelLink: "The thermal colors represent one simulated motor temperature, not a measured surface-temperature map.",
    simulationStatus: "Illustrative hardware; no structural or spatial heat model"
  },
  {
    id: "stator", name: "Stator core", group: "Motor",
    summary: "The stationary core supports the windings and guides their magnetic field around the rotor.",
    role: "Stationary magnetic structure",
    modelLink: "The governor represents the whole motor with one thermal state rather than calculating heat inside the stator.",
    simulationStatus: "Illustrative hardware; no magnetic-field model"
  },
  {
    id: "windings", name: "Copper windings", group: "Motor",
    summary: "Current through these coils creates the magnetic field that drives the rotor and also produces heat.",
    role: "Electromagnetic drive and heat source",
    modelLink: "The demo approximates effort-related heating with an effort-squared term; effort is dimensionless and is not a measured current.",
    simulationStatus: "Scalar heating modeled; individual coil currents and temperatures omitted"
  },
  {
    id: "rotor", name: "Rotor", group: "Motor",
    summary: "The inner rotating assembly responds to the stator's magnetic field and turns the shaft.",
    role: "Rotating magnetic assembly",
    modelLink: "Rotation makes delivered effort visible, but its animation does not predict speed or torque.",
    simulationStatus: "Illustrative motion; no mechanical or magnetic simulation"
  },
  {
    id: "shaft", name: "Output shaft", group: "Motor",
    summary: "The shaft transfers the motor's rotation to an external load through a coupling or other mechanism.",
    role: "Mechanical output",
    modelLink: "The governor limits a scalar effort request; it does not model load motion or verify a safe mechanical stop.",
    simulationStatus: "Illustrative hardware; no load dynamics"
  },
  {
    id: "bearings", name: "Shaft bearings", group: "Motor",
    summary: "Bearings support the rotating shaft and help keep it aligned while allowing it to turn.",
    role: "Shaft support",
    modelLink: "Bearing condition and friction are not measured or diagnosed by this prototype.",
    simulationStatus: "Illustrative hardware; no wear or vibration model"
  },
  {
    id: "fan", name: "Cooling fan", group: "Motor",
    summary: "A fan moves air over the motor to help carry heat away.",
    role: "Cooling airflow",
    modelLink: "Cooling is represented by the thermal model's decay toward ambient, not by an airflow or fan-speed calculation.",
    simulationStatus: "Aggregate cooling modeled; fan geometry and airflow illustrative"
  },
  {
    id: "encoder", name: "Position encoder", group: "Sensors",
    summary: "An encoder reports shaft position and can support speed feedback in a motor drive.",
    role: "Motion feedback",
    modelLink: "This thermal governor does not use encoder pulses, and the displayed rotation is not an encoder measurement.",
    simulationStatus: "Illustrative sensor; no position or speed feedback loop"
  },
  {
    id: "temp_sensor", name: "Temperature sensor", group: "Sensors",
    summary: "A temperature sensor gives the controller information about motor heat.",
    role: "Thermal observation",
    modelLink: "When this simulated reading reaches its ceiling, the governor keeps the model's upper bound because the true temperature may be hotter than the reading.",
    simulationStatus: "Clipped observation modeled; physical sensor type and placement illustrative"
  },
  {
    id: "terminals", name: "Motor terminal box", group: "Connections",
    summary: "The terminal box provides protected connection points for the motor windings and associated wiring.",
    role: "Electrical connection enclosure",
    modelLink: "These connections explain the drive-to-motor path; the governor does not calculate terminal current, voltage or contact heating.",
    simulationStatus: "Illustrative hardware; not a wiring diagram"
  },
  {
    id: "earth", name: "Protective earth connection", group: "Connections",
    summary: "This connection bonds the motor's exposed metal frame to protective earth as part of an electrical protection system.",
    role: "Protective bonding",
    modelLink: "The thermal governor does not replace electrical protection or model earth-fault behavior.",
    simulationStatus: "Illustrative protection hardware; no fault-current simulation"
  },
  {
    id: "phase_cables", name: "Motor phase cables", group: "Connections",
    summary: "These conductors connect the inverter's three phase outputs to the motor windings.",
    role: "Electrical power path",
    modelLink: "Their colors identify the schematic connection path, not current magnitude, voltage or installation wiring requirements.",
    simulationStatus: "Illustrative conductors; no cable or circuit model"
  },
  {
    id: "inverter", name: "Inverter power stage", group: "Drive electronics",
    summary: "A motor inverter switches a DC supply into controlled phase outputs that energize the windings.",
    role: "Electrical power conversion",
    modelLink: "The governor admits a dimensionless effort command before execution; switch timing, PWM and semiconductor heating are not simulated.",
    simulationStatus: "Illustrative power stage; scalar effort interface only"
  },
  {
    id: "dc_link", name: "DC-link capacitors", group: "Drive electronics",
    summary: "These capacitors buffer electrical energy on the inverter's DC supply link.",
    role: "Electrical energy buffer",
    modelLink: "The governor's thermal headroom is a temperature margin, separate from the electrical energy stored in these capacitors.",
    simulationStatus: "Illustrative hardware; no capacitance, bus-voltage or ripple model"
  },
  {
    id: "current_sensor", name: "Current sensing stage", group: "Sensors",
    summary: "A current sensor gives a motor drive feedback about the electrical current flowing through its power stage.",
    role: "Electrical feedback",
    modelLink: "This prototype uses an assumed applied effort and does not use this illustration to verify the physical actuator or its command acknowledgements.",
    simulationStatus: "Illustrative sensor; no measured current or authenticated actuator feedback"
  },
  {
    id: "controller", name: "Governor controller", group: "Drive electronics",
    summary: "The governor maintains a temperature interval and predicts the effect of commands already accepted into the FIFO queue.",
    role: "Thermal estimation and command admission",
    modelLink: "It uses the predicted upper temperature to admit or reduce the next effort; the optional wait-for-headroom scheduler is a demo extension.",
    simulationStatus: "Thermal and queue logic simulated in software; controller board illustrative"
  }
];

window.THERMAL_COMPONENT_SOURCES = [
  {
    title: "Oriental Motor: servo motor structure and encoder function",
    url: "https://www.orientalmotor.com/servo-motors/technology/servo-motor-overview.html",
    supports: ["stator", "windings", "rotor", "shaft", "bearings", "encoder"]
  },
  {
    title: "Infineon: motor control power board, inverter and current sensing",
    url: "https://documentation.infineon.com/aurixtc3xx/docs/fog1707895108274",
    supports: ["inverter", "current_sensor", "phase_cables", "controller"]
  },
  {
    title: "ABB: low-voltage motor installation manual, terminals, earth and cooling",
    url: "https://library.e.abb.com/public/cc86b1e29b794453ae6ca2fd4ea5b945/Standard_Manual_Low_Voltage_EN%20rev%20G%20web.pdf",
    supports: ["housing", "fan", "terminals", "earth"]
  },
  {
    title: "ABB: motor winding temperature sensors",
    url: "https://new.abb.com/low-voltage/products/electronicrelays/monitors/thermistor-motor-protection-relays",
    supports: ["temp_sensor"]
  },
  {
    title: "TDK: practical DC-link capacitor energy buffering",
    url: "https://www.tdk-electronics.tdk.com/download/3669958/001151774afe321a6036969b42431e69/tp-practical-use.pdf",
    supports: ["dc_link"]
  }
];
