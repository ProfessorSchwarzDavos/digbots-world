# Wayworks power — historical five-block checkpoint

This page preserves the original five-block development description. For the
current twenty-block implementation, see [Wayworks workshop](WAYWORKS_WORKSHOP.md).
The limits and unsupported-operation statements below describe that older slice,
not the current local source.

This implements a small Home workshop loop, not the complete Celestial Frontiers
machine roster. It is local/host-only; guest and agent workshop operations are
not yet supported. Existing Waygrid item and creature storage remain unchanged.

Craft a Hand Dynamo, Sunplate Array, Grid Cable, Field Battery and Charging
Pedestal at a crafting table. All five are also in Creative. Place them face
adjacent, with cables connecting generator, battery and pedestal. A location is
limited to256 placed power blocks in this checkpoint. Disconnected, unloaded or
out-of-simulation-range blocks do not generate or transfer power.

Use a machine to open its inspector. Each Dynamo turn adds2kJ, at most once per
second, provided its8kJ buffer has room. Sunplate generation depends on direct
unobstructed sky, daylight, eclipse, weather and body distance; nominal output
is600W. Solar and Dynamo buffers transfer only into connected compatible ports.
The Field Battery holds120kJ and shares4kW between input and output. Grid Cable
has4kW shared bandwidth and no energy capacity. The pedestal holds60kJ and accepts
2kW. Full buffers backpressure; no energy is silently emitted into a global pool.

Select an existing EVA Power Cell or compatible rig in the hotbar, open the
pedestal and choose **Charge selected cell / rig**. Each operation transfers at
most2kJ from the actual pedestal, at most once per second. Empty equipment stays
reusable. Fractional CF3 equipment energy is preserved; a gap below1J is not
rounded up. Charging does not generate oxygen or refill scrubbers.

Select the Field Wrench to rotate or change any of the six local energy faces.
Front/back/left/right rotate with the machine; top/bottom do not. Generator ports
support output/disabled, pedestal ports input/disabled, and battery/cable ports
input/output/both/disabled. Invalid combinations fail explicitly. Toggle power
to disable a machine without erasing its stored energy. The inspector pauses
single-player simulation, so close it to let connected power move.

Break a machine with an appropriate pickaxe to recover its actual stored charge
in the dropped item. Replacing that item restores its finite contents and uses
the new placement orientation/owner/location. Creative placements start empty,
even when the selected item has charge. Saves preserve authoritative machine
buffers/configuration/remainders per location; topology is derived on load.

Still pending: other generators/batteries/processing machines/pumps/tanks,
power-coupled Waygrid endpoints, topology caching, richer shared buffers/upgrades,
guest/agent operation protocols, wrench copy/paste/overlays, formed structures,
ships and all later gas/pressure machinery. No oxygen-production claim is made.
The full expansion, long soak, broad multiplayer and accessibility/performance
matrices remain unfinished. No deployment is implied.
