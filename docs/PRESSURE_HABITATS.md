# Pressure habitats and chemistry (TypeScript edition)

CF5 development reference. Implementation is local; integrated browser acceptance
is tracked in `work/celestial-frontiers-ts-20260918/CF5/PLAN.md`. This document is
not a release or full-campaign completion claim.

## Build and operate

Use a crafting table and the recipe guide. Ceramic Membranes use fired clay,
Stone Dust and glass. Starter filter carbon uses coal/charcoal and Stone Dust;
the Carbon Scrubber later recovers carbon. The Electrolyzer, Condenser and
Reaction Chamber can be built before Pressure Polymer, avoiding a bootstrap
cycle. Filled or otherwise metadata-bearing ingredients are not consumed by
pressure crafts.

1. Connect workshop electricity to a Fluid Pump or Atmospheric Condenser, then
   water to an Electrolyzer. Electrolysis reserves 18 mL water and 12 kJ per
   batch, producing 12 standard L oxygen and 24 standard L hydrogen. Both
   outlets must have capacity before any new work is paid.
2. Use separate filtered Gaslines or manual containers for the two gases. A
   Gas Compressor moves primary gas into its physical output buffer. Its
   recipe chooses the gas; it does not multiply it. Empty containers and CF3
   O2 equipment retain their existing identity when filled.
3. Enclose a room, including roof and door upper halves. Reinforced Windows
   seal despite their transparent appearance. Place a Life-Support Controller
   facing an air cell, or link its Room sample to an interior coordinate.
   A worker checks the room; do not remove a helmet while checking or unknown.
4. Supply actual oxygen and inert gas through compatible input ports. The
   controller targets 21% oxygen/79% inert, paying electricity to warm supplied
   gas to 20 °C. Pure oxygen is not a safe substitute for a complete atmosphere.
   Once checked pressure, O2, CO2 and temperature are safe, ambient breathing
   consumes room oxygen and produces CO2 rather than spending helmet oxygen.
5. Face/link a powered Carbon Scrubber into the room. It draws CO2 into its
   finite process buffer. A Habitat Filter handles 240 standard L CO2, ten
   batches, and produces one Spent Habitat Filter; carbon output must fit too.
   A Thermal Regulator heats with electricity and cools with finite coolant.

The inspector pauses the local automatic simulation. Close it to run production
or automatic airlock cycles. Authoritative held manual controls still work while
it is open. Keep the Field Wrench selected for configuration and links.

## Ports, flow and custody

Ports use local front/back/left/right/top/bottom and rotate with their machine.
Set the supplying face to Output and the receiving face to Input. A pressure
machine's Both face only receives unless backflow is explicitly enabled.
Disabled and Service faces do not join automatic material routes. Resource
filters, channels, owner boundaries and unloaded chunks stop incompatible flow.

Pipes have real buffers. Shared per-node throughput counts arrivals and
departures; branching cannot multiply a pipe's allowance. Primary, secondary,
reagent and mixed-air reserves share the stated gas capacity. A full secondary
output therefore backpressures the process even if the primary looks empty.
The inspector lists each buffer separately. Venting discards only the primary
gas buffer, after confirmation.

Pickaxes recover one sealed machine with its stores/modules and paid process
progress. Filled pipes cannot stack. Empty cable stacks remain splittable.
Placement assigns a new installation identity: old links never operate newly
placed hardware at the same coordinates. Pressure-door placement/removal is an
atomic lower/upper pair, including typed host and agent operations.

## Airlocks and emergency controls

Build two distinct rooms with a chamber between them and one door on each side.
Every independently discovered space needs controller coverage. An Airlock
Controller contributes coverage at its Room sample; a Life-Support Controller
supports 2,048 cells, additive to a maximum 16,384 cells per discovered zone.
Open doors merge connected space; Equalization Vents transfer gas without
merging room membership.

On the airlock, link Inner door, Outer door, Chamber sample, Interior sample,
Exterior sample (or the literal `exterior`), Recovery pump and Reserve hardware.
All targets must be loaded and within 16 blocks. Hardware must share ownership;
the pump and reserve are separate devices. Provide power and enough upgraded
reserve capacity for the entire recovered chamber mixture. At 100 kPa and
20 °C, each cubic-metre cell holds about 41,000 mmol, roughly 984 standard L.
A base 240 L reserve is not enough for a human-sized chamber.

Cycle outward closes/locks the inner door, verifies current topology, recovers
gas or equalizes toward exterior pressure, then unlocks the outer door. Return
inward closes the outer door, releases recovered air first and equalizes with
the interior before opening the inner door. Both doors cannot ordinarily open
together. Power failure, obstruction, stale topology, missing/replaced links and
timeouts fail closed. Reset never assumes the chamber is already safe.

Safe manual opening needs an 8-second continuous pointer or Space/Enter hold,
a checked differential no greater than 5 kPa, and completed outer recovery.
It works without electricity and provides a saved 10-second open dwell. The
3-second dangerous override deliberately bypasses pressure/recovery checks,
causes a recorded decompression/equalization event, then faults and reseals.
Releasing, blurring, changing device, leaving reach, or losing the wrench stops
the hold. A client cannot supply its own elapsed duration. A continuous hold
executes once; release before starting another crank or override.

A Pressure Sensor can link an Emergency Shutter. A hazard closes and locks it;
a healthy room unlocks it but never opens it automatically. A formed Hangar
Pressure Gate needs the complete rectangular frame, including corners, sill
and header. Set width/height from 3–9; the controller is centred on the sill.
Missing frames fail closed and the inspector reports the error.

## Diagnostics and accounting

The panel reports pressure, oxygen partial pressure, composition, temperature,
occupants, reserve estimate, volume/capacity, revision/check age and first known
leak/unknown face. Hazard text accompanies color. Muffling never silences
critical life-support alarms. With a wrench, face arrows show configured flow,
lines show explicit links, a pale box shows room bounding extent (not proof of
a seal), and an orange marker/ray identifies the reported boundary face.

Gas uses integer mmol in rooms and standard-volume mL in machine stores:
24 mL = 1 mmol. Sub-mmol machine residuals stay in the machine. Liquid uses mL,
electricity uses J, and room thermal energy uses mJ. Room arithmetic runs at
5 Hz; bounded worker discovery runs only after relevant edits/source changes.
Location/generation/topology/request epochs reject stale worker replies.

Machine radiator heat enters a known adjacent room or dissipates outside.
Recovery carries exact species and heat. Boundary inflow/outflow and gas lost
through topology removal have explicit saved ledgers. Exterior inflow uses the
body's actual pressure, composition and mean ambient temperature; vacuum cannot
refill a breached room. Unknown topology never grants breathable air. Guests
receive bounded read-only geometry/atmosphere presentation, not another gas
simulation or the host's physical stores.

An opened guest inspector receives a separate bounded, host-authored view of
its device links, readings and cycle. It is tied to the active facility,
installation, location, generation and revision; trusted actions still go to the
host. Stale or mismatched inspector data removes the controls.

Ordinary loaded animals and NPCs in a known habitat accumulate exposure to low
oxygen, excessive CO2 or unsafe pressure. After a 15-second grace they take
environmental damage; safe room air reduces exposure. The dose survives saves.
Authored undead, constructs, summons and aquatic physiology are excluded from
this terrestrial-breathing rule and oxygen demand. Unknown discovery freezes
their dose. This does not add a general planetary-tolerance system.

Harvest traces refine the catalog's non-breathing fraction: Orison has 4%
methane and Rimehold 3%; suitable water-bearing atmospheres provide 1% moisture.
These are authored gameplay composition policies, not astronomical measurements.
Hydrogen recombination yields less electricity than electrolysis costs, even
with upgrades. Combustion/reforming outputs and finite coolant/filter costs are
defined explicitly in `pressure-chemistry.ts`.
