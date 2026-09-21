# Asteroid claims and finite mining

In an orbital field, use a Field Wrench on solid asteroid rock within six blocks
to inspect that asteroid. Inspection records only the reached asteroid, not the
whole field. The current universe host can claim unclaimed rock and configure
independent construction and extraction permissions: owner, trusted identities,
or everyone. Claims add no materials, air, power or inventory.

Unclaimed asteroids permit extraction but require a claim before construction.
Authenticated guest and agent edits use the host's claim rules; a station claim
overlapping an asteroid is an additional gate. Multiblock edits require access
to all affected cells. Machine contents still use their existing, separate owner
and sealed-pickup rules. Normal mining tools, drops and item debits are unchanged.

Peer block placement is a clear-cell operation, not a solid-rock overwrite. The
host preflights every cell before changing terrain, metadata or inventory, including
extraction access for replaced foliage/other replaceable contents. One paid item
authorizes one ordinary block or one exact bed/door pair, not an arbitrary batch.
Omitted payment, duplicate cells, spoofed actors and partially occupied pairs reject
atomically. Existing gate/door toggles and wrench-facing rotation are resource-neutral.
Guest tilling, planting, bucket fill/pour and bookshelf insert/remove use semantic
host transactions. The host derives the exact block change, inventory debit or
return, growth schedule and shelf contents. Full-pack vessel/book returns reject
without dropping or losing resources; metadata-bearing tomes cannot enter a shelf
schema that stores only book identities. Arbitrary unfunded after-images still
fail closed. Multiplayer protocol5 rejects earlier clients before admission so
expanded generation context cannot be silently ignored. All peers need this build.
Bucket exchange updates the tracked liquid source together with the voxel: filling
removes it, and pouring installs the matching source. This applies to local players
and guest transactions; an old simulator record cannot recreate credited water.

## Persistence

`WorldSave.asteroidFields` belongs to the universe partition. Each body/orbit-band
has one validated registry with finite voxel pages, discovery and claim metadata.
Normal world edits and player inventory are checkpointed atomically with those
pages. Older orbital saves migrate their existing edits on first load. Canonical
pages override stale location mirrors before chunk generation or cached terrain
is admitted, so returning to a location cannot regenerate extracted material.
Import remaps the universe identity and retires old command epochs without
refilling voxels or changing claims.

Persisted field expansion levels also control main-thread and worker terrain
generation. Expanded chunks use distinct cache identities, while level-zero and
Home cache keys remain compatible. Public host snapshots carry only the bounded
generation level, never the private registry, discoveries or claims. Missing
legacy generation context means level zero; malformed context rejects before a
guest discards its active runtime. Generation-worker protocol 2 prevents an older
worker from silently generating the unexpanded field. Canonical asteroid IDs
determine their orbit band in local-coordinate reconstruction.

An owned, enabled Station Observatory in orbit can survey the next finite ring,
up to extent 3. Each survey converts 1 kJ of stored electricity into 1 kJ of
instrument heat and requires current machine/field revisions and container access.
Existing asteroid records, claims and excavation pages remain unchanged; new rock
is unclaimed and is not automatically discovered or credited to inventory.
Existing construction newly covered by a survey is captured into the new finite
pages before its old edit mirror can be retired. Uncheckpointed changes to old
asteroids reject the survey before any instrument debit.

The survey checkpoints the current world, commits the expanded field and paid
instrument together, then rebuilds the local view while paused. Resume explicitly
from the pause menu. Close any shared session first; shared-session regeneration
is not yet supported. If acknowledgement or reconstruction fails, use **Retry
checkpoint** in the pause menu or reload the page to reopen the last committed
world. The unchanged pending transaction is retained and cannot be overwritten
by an old-runtime autosave or charged a second time on retry.

Only the descriptor's bounded voxel region is claimed. Construction outside that
region remains ordinary orbital construction, not an infinitely extending claim.
Keep exports before moving between versions. Older binaries do not enforce the
new asteroid authority; importing new saves into them is not a supported rollback.

## Current integration boundary

Orbit gameplay uses these records. The pure local-coordinate projection and real
ChunkWorld reconstruction are tested, but separate engine travel into an asteroid
local frame is deliberately refused until attached containers, machine instances,
facings and other metadata have one canonical frame owner. No duplicate resource
view or debug travel path is opened. Shared-session field expansion and the
complete Celestial Frontiers travel/agent/verification matrix remain unfinished;
the solo observatory survey does not imply full expansion completion.

### Attached-frame development contract

The current coordinate-codec prerequisites are isolated from engine travel:
`asteroid-attachment-frame.ts` handles disjoint bounded cell views, whole machines,
aquariums and pressure; `asteroid-attachment-entities.ts` handles known entity
anchors and complete lead/passenger relationships; `asteroid-attachment-policy.ts`
classifies every location-owned save field. These are not save-owner adapters or
travel permission checks. Portable inventory metadata remains opaque.
`asteroid-attachment-entity-capture.ts` retains unchanged canonical fractional
axes against an exact whole-unit baseline, including live/sleep transfers and
reordered boats. Loose drops require explicit ephemeral host lineage because
the saved drop schema has no stable IDs; matching by item or array order is not
safe. This capture helper is not a spatial selector or resource authorization.
Physical creature bounds now share the engine's growth/rarity/contact-body and
foot-plane calculations. Footprint checks cover the whole body and known roost,
work and dragon-home anchors, including the dragon's X/Z guard area. Centered
voxel bounds are `[min-0.5,max+0.5)`; whole bodies touching an edge may fit, while
partial overlaps from either side reject. Authored/social/lead/passenger/agent
relationship closure and the remaining fleet/physical-field selectors are still
separate requirements; body containment alone does not admit an entity unit.

The pure relationship partition checks complete live/sleep social labels, lead
segments, riders, passengers, configured followers and shoulder creatures. Even
an outside rope with both endpoints outside is refused if it intersects the
frame. Historical idle owner IDs are preserved without fabricating an active
follower. POI, legendary/Prime/summon, settlement/resident, hive, deployed-orb and
lair links require explicit results from their canonical whole-owner selectors;
missing, unused, duplicated or crossing endpoints reject. Whole boat footprints
are derived from the authored hull/mast/sail model and conservatively cover every
capped bob/pitch/roll phase, not just its origin or forgiving pick radius. The
engine shares the unchanged visual-motion formulas with this bound. Actor geometry
and active links must come from the authoritative host at the same revision.
This helper does not establish those actor/owner inputs or consent. The
owner adapters are still incomplete, so it is not an admission or travel gate.

Pressure zone IDs are derived from location and membership, so projections must
remap their station/airlock references together. Gas, heat, installation identities,
airlock deadlines and finite cargo cannot change merely because coordinates do.
Unknown fields and components crossing frame boundaries must block admission.
The keyed-block and pressure projection/merge prerequisites retain untouched
outside components, reject stale baselines and identity collisions, and keep one
global pressure counter and boundary ledger. The planned canonical metadata owner
is per orbit field, with transient bounded asteroid views; station history must
not be split or reset to manufacture a local registry. These pure merges still
require the host's revision/lease and an atomic resource transaction.
The station view prerequisite is intentionally not a save registry: it has no
action journal. Rename, access and habitat proposals return to the canonical
permission/replay authority. Whole claims, collars, approach volumes and linked
rooms/anchors must fit; physical placement/docking and fleet-view integration
remain separate unfinished adapters. Voxel prerequisites translate chunk/index
edits and remove finite-page mirrors only after exact canonical readback.
The pure per-orbit owner record separates physical fields from view-local state,
rejects duplicate/missing custody and stale revisions, and explicitly reconciles
new finite regions during a one-ring survey. The repository now supports explicit
admission into an internal `UniverseData.attachmentOwners` catalog. It is not a
new `WorldSave` field: ordinary engine saves remain flat, while admitted physical
fields exist only in the canonical owner and are hydrated on load. Inactive orbit
owners remain unchanged. Legacy orbits are not automatically admitted, and unknown
extensions block admission without changing their existing save behavior.

Admission, later checkpoints, survey and origin capture use the existing atomic
universe journal and lease/revision checks. A checkpoint retry binds the original
request digest, not a reconstructed voxel array whose order may differ. Legacy
receipts retain their prior exact-save retry rule; they cannot authorize admission.
Import creates a new owner epoch and explicitly remaps known machine, station,
pressure-zone and airlock-zone identities, preserving finite quantities and opaque
portable metadata. Orphan owners and physical fields duplicated in a location row
reject even when archive checksums are valid.

This repository adapter is not activated by normal gameplay yet. Its structural
ownership checks are not a complete spatial selector or a substitute for each
subsystem's semantic and authorization checks. Complete physical/component and
entity/fleet/agent adapters plus ordinary local-frame travel evidence are still
required before entry opens. Synthetic storage tests are not gameplay acceptance.

The host now has a synchronous, read-only physical-custody preimage through
`snapshotAttachmentPhysicalCustodySource`. Its voxel reader combines the pinned
orbital generator, proposed finite pages and exact construction/facings, without
requiring loaded chunks or treating unknown terrain as air. Inventory paths are
joined to actual actor, boat, creature, drop, chest, machine, habitat and fleet
holders. A deployed orb and its body must stay on the same side. Shared digital
stores and inactive guest ledgers remain at their canonical owners; missing
agent bodies reject instead of inventing a position.

Recorded habitats require complete face-connected components (including the
neighbors of the twentieth cell), and their rails, decorations and fitted,
animated residents are checked separately from voxel membership. Basic holder
bounds include furnace trim and active healer fuel displays outside their cells.
The preimage binds the durable owner/catalog, original finite registry, covered
storage, actor/session bodies, pressure and navigation. Before a future async
commit it must be reread and compared exactly: dirty counters alone do not catch
all direct inventory, terrain or pose changes.

Covered holders are now enumerated from all canonical finite pages and
construction edits, not only saved inventories. Unopened chests receive the
complete lid/potential-pair checks; unopened habitats receive full component and
static-body checks; basic holders and hives retain their full physical/query
bounds. Missing inventories remain explicitly **unmaterialized**, not empty.
Missing machine configuration rejects instead of fabricating default resources
or ports. Recorded wild hives use their real block family. Other authored object
families still need their explicit physical and finite-state closure.

Canonical sky columns use the same opaque-full-cube predicate as the world.
Translated read-only environment queries can see outside the ownership box,
including roofs clipped from the local Y range. Shared actual simulation rules
preserve greenhouse versus solar obstruction, rotor clearance, eclipse/weather,
and explicit-flow versus implicit/waterlogged-source distinctions. Propagated
gameplay light requires an explicit canonical provider; missing light remains
unknown. This adapter does not create a second ticking pressure/fluid/light owner
or establish that provider's same-revision availability or climate provenance.

`VoxelEngine.snapshotAttachmentSource()` adds an exhaustive save-field source
preimage around the physical slice. This is comparison data, **not a WorldSave**:
maps retain their raw rows, creature gameplay fields bypass save normalizers,
histories are not capped, ecology is not decayed, and lead anchors are not
filtered or clamped. Every WorldSave field requires an explicit source except
`savedAt`, which belongs to a later commit. Optional undefined fields, absent
keys, null and negative zero remain distinct in the bounded tagged encoding.
Unknown extensions are observed exactly; observation does not permit their
admission. Body environment lookup does not warm or clear celestial caches.

Pending travel, projectiles, temporary effects, active agent work and liquid
propagation refuse capture. Pressure authority supplies its own exact preimage,
including topology caches, gas, devices, gates, holds and worker state. Pending
discovery, dirty topology, integrity scans and holds refuse capture rather than
being ticked or discarded. A missing worker is explicitly tolerated only for an
empty, never-used pressure authority. The raw field and pressure encodings stay
separate so large rooms are not repeatedly re-encoded. Structural overflow
fails closed. Direct changes with unchanged persistence counters invalidate the
snapshot on reinspection.

This preimage does not itself pause shared simulation, lease storage, settle
inactive owners, authenticate/consent actors, prove all authored footprints or
establish canonical propagated-light/climate authority. Those gates still have
to be joined to the same immutable proposal and existing atomic journal.

This remains a prerequisite, not a complete admission gate. Exhaustive authored
sites/environment integration, inactive location owners, transition consent and
atomic finite-resource transfer still require their integration checks.
Conservative all-phase model spheres may refuse an
installation very close to the frame boundary. There is no new local-entry UI,
save mutation or travel permission in this preflight.

The repository checkpoint also has a production-browser regression using an
explicitly admitted synthetic fixture: ordinary Continue, paid survey, Save &
Quit and fresh cold reload retain the canonical owner and finite stores. This
does not demonstrate ordinary admission or local-frame travel. Rapidly closing
an inspector and pausing must leave solo simulation frozen even if the browser
delivers an earlier pointer-lock request late; only an explicit resume may
reacquire input. Shared sessions still keep their authoritative simulation live.
