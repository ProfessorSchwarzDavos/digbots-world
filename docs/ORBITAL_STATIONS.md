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

## Current boundaries

Association selection records policy; it does not prove membership. Remote faction
and guild membership remains fail-closed until authenticated host membership is
connected. Station-only mutations currently require the universe host; full typed
guest/agent station administration and travel are still part of the expansion.
Waylink leases remain references, not a completed station Waylink operation.

A cabin shell or recorded pressure-zone link does not establish sustainable life
support. Finite supply, CO2 removal, power generation/storage, heat control and
eclipse/depletion recovery require the separate integrated operating-loop checks.
