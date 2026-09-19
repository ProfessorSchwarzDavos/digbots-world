# Wayworks workshop — local development

Twenty early workshop blocks, a Field Wrench, seven upgrade modules and measured
fluid/gas containers are implemented in the TypeScript edition. This is local,
unreleased Celestial Frontiers work. The wider expansion and comprehensive CFV
verification remain unfinished; nothing here implies deployment.

## First workshop

Craft a Hand Dynamo, Grid Cable, Field Battery and Charging Pedestal at a table.
Connect compatible faces directly or through cable. Each normal Dynamo effort
adds 2 kJ, at most once per second, if its buffer has room. Close the inspector
to let simulation run. Sunplate Arrays provide exposed daytime solar power.
All twenty blocks and portable parts also appear in Creative.

Select ingredients on the hotbar, open a processor and deposit into its input
or reagent slot. Its inspector lists exact recipes, time and upgraded energy
cost. Recipes start automatically when ingredients, power and output room exist.
Inputs remain reserved until completion. Paid progress survives reload; cancelling
releases ingredients but does not refund electricity. Named/metadata-bearing
ingredients are retained rather than silently consumed.

The six processors are Powered Crusher, Enrichment Mill, Electric Smelter,
Alloy Infuser, Plate Press and Precision Sawmill. Crush iron into two portions,
enrich each with water and smelt it for improved ore yield. Electric Smelter also
makes glass and fired clay. Crusher biomass recipes make Biofuel Pellets;
sawmill byproducts feed that route. Iron Sheet is a machine component distinct
from the existing Iron Plate armor.

## Power

| Block | Base capacity | Nominal generation / transfer |
| --- | ---: | ---: |
| Hand Dynamo | 8 kJ | 2 kJ per effort / 2 kW |
| Sunplate Array | 12 kJ | 600 W |
| Heat Engine | 24 kJ | 2.4 kW |
| Wind Rotor | 18 kJ | 900 W |
| Waterwheel Generator | 32 kJ | 1.6 kW |
| Biofuel Engine | 24 kJ | 1.8 kW |
| Field Battery | 120 kJ | 4 kW |
| Grid Battery | 1.2 MJ | 12 kW |
| Ship Battery Bank | 12 MJ | 24 kW |
| Charging Pedestal | 60 kJ | 2 kW |
| Grid Cable | no store | shared 4 kW |

Solar follows sky obstruction, daylight, eclipse, weather and body distance.
Wind requires atmosphere, sky/rotor clearance and weather; forests reduce
exposure. Waterwheels need adjacent flowing water, not still source blocks.
Heat Engines consume coal/charcoal carrying 80 kJ chemical energy per item;
Biofuel Engines consume 24 kJ pellets. Conversion is 25% electricity and 75% heat,
with finite unburned residue. Full buffers and excessive heat stop consumption.
Passive cooling is an explicit environmental heat sink; thermal modules help.

Batteries export starting energy before accepting generator recharge; they do
not charge each other. Branches share cable bandwidth and loops cannot create
energy. Quantities live in machine stores, never a second global pool. Cached
topology follows loaded, enabled faces, owner/location and channel; quantity
changes do not rebuild it.

Select a compatible EVA Power Cell/rig and choose **Charge selected cell / rig**,
or **Charge equipped back rig**. The pedestal spends up to 2 kJ per operation,
at most once per second. Full equipment stops transfer. Existing fractional
stores are preserved; a gap below 1 J is not rounded up. Charging does not make
oxygen or scrubber material. Future powered tools must implement finite capacity
before using this service; none is advertised as working here.

## Materials, fluids and gases

Fluid Pump removes a full water source directly below it to store one measured
litre, costing 1 kJ and one second. It does not consume a voxel when storage is
full. A Fluid Canister also collects one litre through normal source-block use;
it removes that source rather than sampling infinitely.

Base stores: pump 8 L, enrichment reservoir 4 L, Fluid Tank 64 L, Gas Tank
120 standard L; portable canister 8 L and cylinder 24 standard L. Gas is measured
at the reference condition, with pressure-equivalent telemetry. Different
resource identities never mix. Tank buttons transfer up to 1 L and preserve
container metadata. Gas Tank exchanges finite oxygen with compatible CF3 gear.
Venting requires explicit confirmation and irreversibly discards the gas.

Adjacent couplers support items, fluid, chemicals and heat with shared budgets:
4 items/s, 1 L/s, 2 standard L/s and 8 kJ/s. They honor faces, channel,
owner/location, filters and destination capacity. Item output requires auto-eject
or a receiving pull face. Long pipes, oxygen production and pressure zones belong
to CF5; distant logistics, factories and anchors are later dependencies.

## Wrench and controls

Hold the Field Wrench to rotate, configure faces/control/security, copy/paste
same-type settings or manage trusted operators. Front/back/left/right rotate with
the machine; top/bottom do not. The inspector resource selector also chooses the
nearby wrench overlay. Glyph shape encodes mode as well as resource color.

- Input/output/both: compatible automatic directions.
- Passive: exports only to a neighbor explicitly pulling.
- Pull: requests from compatible output/passive neighbors.
- Service: manual service, not an automatic network connection.
- Disabled: no transfer. Unsupported energy modes fail explicitly.

Control modes are always, signal-on and signal-off; the local signal button is
the current source. Disabled/control-stopped machines retain their stores.
Channels isolate connections. Public service allows materials, charging and
cranking, not configuration/pickup. Owners and up to sixteen explicitly trusted
player/drone IDs can configure or pick up machines. Trust survives cold reload.

Install actual hotbar modules, up to four per type. Speed reduces time but raises
energy cost superlinearly. Efficiency lowers cost and throughput. Capacity
expands energy/fluid/gas storage; seal increases gas capacity; thermal increases
heat capacity/cooling; filter chooses an item; muffling lowers machine sound,
never hazard alarms. Finish/cancel a cycle before changing upgrades. Occupied
capacity cannot be removed, and returned modules require pack room.

## Waygrid and custody

The existing vault/archive remain the sole digital item/creature authority.
Manual terminal transactions cost 50 J/item or 500 J/filled orb, supplied by an
adjacent battery/generator output, both or service face. Cable alone cannot
power a terminal. Processor auto-eject to an adjacent vault uses that same item
authority and spends 50 J/accepted item. Full stores, incompatible pack room or
missing power leave both sides unchanged.

Use the correct pickaxe in Survival for sealed pickup. The item retains energy,
materials, modules, residue, heat, paid progress and configuration. Placement
rebinds owner/location/facing. Creative placement starts empty; machines holding
resources cannot be deleted in Creative or with the wrong tool.

Guest operations are semantic host transactions, never uploaded machine
after-images. Host checks machine/player revisions, reach, live block, location
and access. Retry receipts and stale revisions prevent duplicate custody. Opaque
player updates cannot refill/transmute machine contents or pool CF3 reserves.
Guest placement consumes the host's matching item; pickup requires owner/trust
and an appropriate tool.

Agents discover `workshop:x,y,z`. `workshop_get` requires `container.read`.
`workshop_operate` needs `container.write` and `inventory.self.write`, the typed
operation, inventory slot and fresh machine/inventory revisions. `workshop_place`
and `workshop_pickup` require `build` and inventory write, reach and pack room;
pickup also requires a real tool. Bulk build/gather cannot flatten machines.
Agent placements remain host-owned and explicitly trust their placing drone.

Only loaded in-range machines run, with a 250 ms cadence and at most one second
of catch-up. No offline/unloaded production is claimed. The 256-machine location
cap is explicit. Stores/fractional budgets persist; models, audio and overlays
own no resources. Historical schema-1 power saves migrate to an empty workshop
extension without adding energy. Export a universe before development builds;
use that export for rollback instead of importing new fields into older builds.

Exact checks and reviewed screenshots belong to the CF4 development handoff.
Full multiplayer, performance, accessibility and long-soak campaign gates remain
required before final release acceptance.
