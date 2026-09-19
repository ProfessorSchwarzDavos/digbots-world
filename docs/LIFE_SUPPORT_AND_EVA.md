# Life support and EVA — TypeScript edition

CF3 adds an independent **back** equipment slot. Chest armor remains equipped.
Legacy saves and peer snapshots without the slot load it as empty. This is local
development work, not a deployed expansion or a claim that later machines exist.

## Prepare a finite kit

Wear the Field Breather Helmet and a filled Light or Expedition O2 Tank. The
helmet alone supplies no oxygen. Pressure Weave protects against pressure,
temperature and corrosion but supplies no oxygen either. Radiation protection
reduces exposure rather than making it harmless.

In the inventory, put a Sealed Field O2 Reserve on the cursor and use the back
gear's transfer control. Each click transfers at most 120 L, bounded by the
source and destination. Dwarven traders carry finite reserves; no electrolyzer
or atmospheric oxygen production is implemented in CF3. Empty reserves stay
empty, including after save/reload. Life-support equipment cannot be sold back
as a fresh commodity.

| Equipment | Capacity / function |
| --- | --- |
| Light O2 Tank | 180 L, supplied empty |
| Expedition O2 Tank | 600 L, supplied empty |
| Twin-Tank Harness | Two exact removable tank instances |
| EVA Maneuver Rig | Two tank sockets, 60 kJ charge, 1,800 s scrubber capacity |
| Aurelian Spell-Rig | Same finite resource contract; distinct magical appearance |
| Dive Harness | 240 L and powered underwater propulsion; not vacuum-rated |
| Sealed Field O2 Reserve | 1,200 L factory supply |
| EVA Power Cell | 60 kJ factory supply; crafted from consumed materials |
| CO2 Scrubber Cartridge | 1,800 s factory supply; crafted from consumed materials |

Rig sockets exchange the cursor tank rather than copying it. Fill a socket from
a reserve; transfer charge or scrubber capacity from the appropriate cursor
supply. Spent cells/cartridges remain spent. Multiplayer supply crafting is a
host transaction over the exact staged ingredients, with a nearby table and
revision check. Generic pack updates cannot increase life-support resources.

## Survival feedback

The contextual O2 instrument shows source, estimated time at current draw, seal,
scrubber, leak and separate hazard labels. Normal breathing draws 1 L/s;
exertion/leaks increase it and a working scrubber reduces it by up to 35%.
Helmet wear increases leakage. Warning text, icon, color, a helmet-local dual
chirp and caption/toast convey thresholds without relying on color alone.

Outside breathable air, head/back and socket swaps open the seal for 1.5 seconds
after resuming play. Their countdown and hand-use animation are interruptible;
changing the participating item or cancelling leaves original custody intact.
No oxygen leads to impairment after 6 seconds and damage after a 12-second
grace period. Pressure, thermal, corrosion and radiation exposure are separate.
Creative mode and invulnerable drones expose diagnostics without taking harm.

## EVA controls

| Input | Action |
| --- | --- |
| I | Arm/disarm finite thrust; WASD / Space / Shift provide six signed axes |
| N | Enable magnetic boots; hold Shift while touching a hull to grip it |
| T | Anchor/release a carried Tether Spool against a solid surface within 24 blocks |
| Hold Y | Reel the anchor line at 2 m/s, collision-checked |
| O | Collect aimed loose cargo within 6 blocks, with a spool and unobstructed line |
| U | Stable-up/free-roll comfort; brackets roll in free mode |

Thrust consumes both oxygen and charge. An unarmed or empty rig does not grant
free vacuum WASD acceleration. Camera comfort never changes authoritative
velocity. Ordinary gravity movement and Creative flight remain separate.
HUD buttons expose the principal controls to pointer/touch users; existing
movement/crouch controls provide motion inputs.

Anchor lines belong to their location and cannot survive an invalid anchor or
a missing spool. Cargo uses the existing exact-metadata pickup transaction;
the short line is visual feedback, not a second inventory owner. Respawn clears
exposure, lines and pending swaps; ordinary death drops retain finite metadata,
including socket contents and cursor/crafting-grid items.

## Evidence and limits

Focused contracts live in `tests/life-support*.test.ts`, with related authority,
location, save and model tests. The task-local CF3 evidence folder records
normal-input synthetic equipment/survival/reload and reviewed visuals, including
failures and reruns. Full real-peer, accessibility/performance and full-expansion
integration gates remain separate; a focused pass does not waive them.

Future CF4/CF5 work will provide machine power, physical gas production and
habitat pressure. CF3 does not pretend these systems already exist. Rare-world
research/repair progression and full destination travel depend on later phases.
