# Orbital station controls

The TypeScript edition stores each station in its location-bound registry. Its
core, collars, cabin blocks, machine stores, spacecraft and inventories remain
separate physical authorities; a registry entry never supplies air or materials.

## Station-only operations

An intact claim core can be managed within eight blocks even when no spacecraft
is nearby. Name, icon, members, association, access grants and measured habitat
links use the current registry revision, not a vehicle revision. Cabin construction
consumes ordinary carried materials and preserves the supplied door's finite stores.

Place an Orbital Dock normally inside the claim, then use **Register a placed
collar** with its whole block coordinates while within eight blocks of it. The
host validates the intact core, claim, physical collar, machine ownership and
registry revision. It registers that existing block without another item debit,
new block, gas or energy. Duplicate coordinates and stale registrations reject.
Docking still checks the ship revision and a clear physical approach.

## Independent service grants

Build, container, airlock, dock, Waylink, life-support and administer remain
independent station grants. A shared pressure device requires both its relevant
station grant and machine owner/trusted-operator authority. Public material service
alone does not authorize pressure configuration. Emergency shutters use airlock
permission. Local machine security is not silently overwritten by station policy.

An operator with pressure service but no container permission receives only the
operational machine readings, installed hardware ratings and bounded pressure
inspector. Inventory, measured reservoirs, recipes, network channels and trusted
operator IDs are omitted. The panel hides those unavailable controls. The same
projection applies to opens, accepted actions, stale/rejected actions and updates;
revocation closes the subscription. Typed agent inspection and pressure operations
use the same projection and grants. Host validation still rejects crafted storage
or general configuration requests. The guest presentation is not durable storage.

## Craftable habitat kit

The crafting table provides Station Hull (eight panels per recipe), Station
Bulkhead (two), Habitation Bench and Greenhouse Tray. Hull and bulkhead are
ordinary stackable, airtight construction blocks, rendered in shared chunk
meshes; they do not consume machine capacity. The bench is a usable seat, not
life support. Reuse Reinforced Windows, pressure doors/airlocks, Sunplate Arrays,
batteries, gas tanks, life-support controllers and cargo containers as needed.

Collision is not an air seal. Open trusses, collars, radiators, observatories,
consoles, benches and planted trays leave their pressure cell open. **Existing
saves that used open flight hardware as a wall need a real enclosing wall.**
No migration adds replacement materials, air or power. Inspect an exported copy
before changing an occupied structure; keep EVA equipment available.

Each planted tray converts up to four millimoles of existing CO2 into oxygen per
200 ms pressure step. It requires daylight and an unobstructed sky column; a
Reinforced Window transmits light, opaque roofing does not. Darkness/eclipses and
empty CO2 halt conversion. It cannot pressurize an empty room or supply inert gas.

A radiator rejects heat already imported through the heat network: up to 8 kW
with verified exterior exposure, or 2 kW into a measured room, multiplied by
installed thermal modules. Unknown/unloaded boundaries retain heat. Disabled or
signal-gated radiators stop. The radiator does not create power or coolant.

The station console's **Measured habitat and power** disclosure reports actual
loaded room composition, pressure, temperature, occupants and rates, plus
authorized machine buffers and shortages. Summed buffers are not proof of a
connected power grid. Room oxygen reserve is not a prediction of CO2 or heat
safety. Storage permission remains separate from life-support access.

An owned, enabled observatory supplies a read-only System map and Orbital chart.
Each refresh costs 1 kJ of stored electricity and produces 1 kJ of heat. The
snapshot exposes the first-flight known bodies and current body, plus permitted
station points in the exact current location; it does not reveal the hidden
catalog. It does not authorize travel, discover new worlds or estimate routes.

## Current boundaries

Reinforced Windows now derive their visible shape from loaded neighbors: glazed
roof sheets lie flat, walls stay upright on either axis, and corner/T wall runs
meet at a mullion. Shared glass borders disappear; exposed ends retain a frame.
Isolated ambiguous panes use the saved wrench-facing as a stable orientation
hint. This applies to Reinforced Windows, not structural Hangar Frames. Collision
and pressure sealing still use the existing voxel authority, not the thin visual.

Liquid Pipe, Gasline, Heat Conduit and Grid Cable arms follow configured compatible
ports on all six sides. Wrong resource, owner, channel, location, unloaded/stale
blocks, disabled machines/control and disabled/service ports do not draw joints.
Empty buffers still show a configured joint. Material backflow rules remain in
force; existing saved port settings are not rewritten. Placement, removal,
rotation and port edits rederive presentation without changing any resource store.

Habitation benches use the ordinary non-solid seating policy: the seated pose
occupies the furniture cell without trapping a standing player or colliding on
reload. A bench is not a pressure wall. Radiator thermal limits describe boundary
capacity, not guaranteed instantaneous output; the visible stored heat is finite.

Association selection records policy; it does not prove membership. Remote faction
and guild membership remains fail-closed until authenticated host membership is
connected. Station-only mutations currently require the universe host; full typed
guest/agent station administration and travel are still part of the expansion.
Waylink leases remain references, not a completed station Waylink operation.

A cabin shell or recorded pressure-zone link does not establish sustainable life
support. Finite supply, CO2 removal, power generation/storage, heat control and
eclipse/depletion recovery require the separate integrated operating-loop checks.
