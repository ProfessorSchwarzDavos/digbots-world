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
generation. Expanded chunks use distinct cache identities. The authored-rule
cache namespace now versions all terrain, including Home; older derived entries
are misses and are rebuilt without deleting saved worlds. Public host snapshots carry only the bounded
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

Production-station selection covers Golem Forge, Alchemy Stand, Distillery and
Sugarworks blocks from the complete authored voxel source, including unopened
and finite-pages-only installations. Each recorded ledger must match its actual
block on either side of the frame. Canonical state is compared to the existing
pure normalizer, but any repair, dropped field, clamp or truncation **rejects**;
the original ledger is never replaced. Jobs, committed mana, fractional progress
and completed outputs remain unchanged. Unopened state stays unmaterialized.
All four models fit their unit voxel in every facing; these ledgers are not
inventories of already-created creature identities.

Alchemy binds the full 515-cell radius-five spherical water query, using the
same source predicate as normal gameplay. Waterlogged plants count as implicit
sources; explicitly tracked flow does not. Queries may read outside the owned
frame, and those blocks/source bits remain part of the comparison baseline.
This does not copy, consume or grant ownership of exterior water. The selector
does not tick production, initialize a station, allocate an orb, or transfer a
store. Other authored families and whole sites remain separate requirements.

Archive shelves and tome displays also join exact state to their canonical
installed blocks. Recorded shelves must match their visible zero-to-six-book
variant, retain book order and contain only their supported item codes. Lossy,
unknown or orphan state rejects rather than being repaired. A shelf without a
ledger retains the implicit BoundBook count of its authored variant; selection
records that provenance without generating an inventory. Missing display state
remains unmaterialized, distinct from a recorded empty display. The actual
separate tome mesh fits the unit-cell envelope at the analytic maximum rune
scale; its fixed tilt is preserved. No book is studied, removed, duplicated or
allocated by this selector. Whole authored sites and shared Waygrid capacity
provenance are still separate open requirements.

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

`snapshotAttachmentUniverseSource()` now joins that synchronous engine preimage
to a read-only repository observation. One native IndexedDB transaction reads
all persisted locations, players, global records, histories and the writer
lease. Raw record tags retain distinctions that decoded JSON may omit; checksum
verification and the ordinary pure load composition run after that transaction.
Missing/replaced/expired leases, backward expiry changes and prepared journals
reject without acquisition, renewal, recovery or saving.

The storage facade refuses queued/in-flight operations and pending vehicle/reload
states. An operation that starts and finishes during the read still changes its
operation epoch. Monotonic renewal of the same owner/lease epoch is allowed, but
the complete cached committed world, manifest, catalog and location stamp must
match the repository's normal load representation. The engine rechecks its live
source after the await. These checks do not create an atomic write barrier:
the eventual transaction must revalidate source, revision and lease at commit.
This observes inactive partitions; it does not yet establish the global semantic
creature/resource-custody join, shared physical capacity provenance or consent.

Creatures now have additive `specimenOriginLocationId` and
`encounterOriginLocationId` provenance. These are canonical birth/encounter
locations, not current holders. Only explicit new-creature producers establish
them; default spawning, legacy restoration and ambiguous reconstruction retain
unknown/absent provenance. Existing specimen and encounter IDs are unchanged.
Natural births, offspring, hatchlings and forge/habitat births use their actual
creation location. Apiary worker growth and direct queen-cell hatching likewise
stamp only the new resident, never its transported parent or existing colony.

Capture metadata, release, transformations, body saves, cold restoration and
apiary storage/display/release preserve known origins. An explicit nested bee
origin must agree with its captured creature. Deployed orb/body links and frame
capture refuse changed or missing known provenance; same-bee apiary capture
also refuses adding an invented origin to a legacy resident. Guest replicas
reconstruct when the host identity/origins change, so reused numeric IDs do not
carry old provenance into a later body. These presentation fields grant no
guest transfer authority.

`collectCreatureCustodyPartition()` now visits one actual save owner without
inventing empty tables belonging to other owners. Descriptor checks precede
field access, so hidden fields and getters cannot bypass partition ownership.
`collectUniverseCreatureCustody()` replaces only the manifest-bound active
universe/player/location slices with the complete synchronous runtime source;
all inactive players and locations come from the same verified repository view.
Shared archives, guests and fleet cargo occur once. Repository player `host`
is explicitly bound to its current transport actor rather than assumed equal.
Typed present human guests have the current holder location; offline guests and
archives remain unknown. Agents belong to their location and ships use their
recorded location. Canonical attachment owners hydrate inactive orbit rows;
duplicate mirrors and unsupported local-asteroid hydration still refuse.

`indexScopedCreatureCustody()` qualifies body IDs by actual location and specimen
IDs by explicit specimen origin. Different known origins may share a bare ID;
duplicate qualified owners or a repeated ID with unknown origin refuse. Filled
vessel copies also refuse rather than being deduplicated. A deployed orb links
only the matching body in its holder location, never a convenient numeric ID
elsewhere. Encoded vessels, nested paths, boat aliases and resident families
remain exact. Neither present holder nor historical coordinates invent origin.

The host raw producer is separate from the existing strict local reconciler.
It retains unfiltered body preimages alongside SavedCreature projections and
preserves raw sleeping/hive/metadata records before semantic checks. Unresolved
remote histories remain visible. The pure universe collector retains each
location's history. `reconcileUniverseCreatureCustody()` then associates every
Prime/legendary reference globally, before any per-location selection. Explicit
encounter origin chooses its history; unknown legacy origin requires exactly one
compatible state/species/specimen/custody-token/body match across all locations.
No match, multiple matches or multiple owners of one qualified history refuse.
The result preserves unknown provenance; it does not stamp an inferred origin.
Resident tokens use explicit storage-family provenance, not prefixed-path
offsets. Prime captured deployment stays orb-owned and legendary deployment
body-owned. Terminal and permitted unmaterialized histories remain ownerless.

`VoxelEngine.snapshotUniverseCreatureCustody()` exposes this read-only global
join without passing through the local encounter assumption. It binds the raw
runtime storage/body/actor/manifest/stamp preimage before and after the existing
verified repository read; pending transactions, source changes and facade
replacement refuse. Returned repository data is detached, not frozen in place.
That custody-only API does not observe every environmental source or grant
atomic rights. The separate `snapshotScopedAttachmentUniverseSource()` now
observes the complete existing attachment field/pressure/effect/liquid preimage,
joins the verified repository, reconciles every global owner and encounter, and
then performs whole-holder physical selection. Exact tagged physical sources
also retain manifest/catalog own-undefined and negative-zero changes. A changed
runtime or storage facade across the await refuses the result. Existing strict
local APIs retain their behavior; the new path does not flatten remote histories.

Physical results retain global storage paths, explicit local path provenance,
body location and recorded specimen origins. Only actual current holders enter
current geometry. Inactive players have no invented pose; other-location fleet
cargo never binds an equal current numeric body ID. Shared archives remain shared,
and a current deployed body requires a present holder on its same physical side.
Nested packed cargo still follows the actual outer holder.

Apiary, entity and relationship checks distinguish known-origin specimen
identities while retaining repeated unknown-origin refusal, body-ID and vessel-ID
uniqueness. Bee dependencies carry explicit origin through producer and consumer.
Capture does not infer lineage: repeated bare bee IDs require unchanged unique
holder bindings; ambiguous same-hive repeated worker IDs remain unsupported for
capture even when their read-only projection is valid.

These structural and actual-engine unit fixtures are not native persistence,
transport authentication, simulation pause or ordinary entry/return evidence.
Exact repository/lease and transaction checks remain required.

The exhaustive observation also binds architectural pairs and fence geometry
through `selectAsteroidArchitecture`: all ordinary door states, pressure-door
families and bed orientations require exact matching counterparts on one side.
Pressure-door halves must share facing. Missing/mismatched pairs refuse even
outside the selected frame. The shared bed counterpart function preserves normal
placement/break/respawn behavior. Shared fence renderer constants account for
posts extending above a voxel; gate poses retain the same conservative envelope.
Fence joins read and bind all four canonical neighbors, including unloaded and
outside cells, without turning those read dependencies into copied ownership.
This does not close other authored sites or Waygrid capacity ownership.

Waygrid capacity lifecycle now uses a canonical full location/cell/kind identity,
retained without the historical 80-character truncation. Local player, host-owned
guest and agent edits preflight both universe-owned stores before touching the
terrain, inventory or tool. Guests send intent only; reply/snapshot presentation
does not register capacity. Matching cell tiers require both store records.
Conflicting bare-coordinate legacy IDs refuse rather than guessing a location or
double-crediting the block. Unrelated legacy custom capacity remains unresolved.

Capacity reduction that needs overflow refuses with a withdraw-first message:
the ordinary 120-drop eviction pool cannot safely receive a full memory cell.
The pure planner computes bounded, exact overflow proposals, but the engine does
not emit them. Agent previews, reservation commits and queued batches validate
the actual removal-then-placement sequence, not only its final net capacity;
later conflicts cancel safely and return unplaced material reservations. This
is lifecycle integrity, not local-frame admission.

The separate global Waygrid selector now binds every installed capacity block to
one complete location/cell/kind/tier registration across both shared stores. It
hydrates every persisted owner before replacing the current row with exact live
voxels, reads finite pages and construction independently of loaded chunks, and
checks both saved and live field catalogs for missing locations. Pinned generator
18 and celestial terrain1 make this census explicit; unsupported versions and
local-frame views refuse. Scoped IDs, paired cells and whole-cube boundaries must
agree. Bare-coordinate legacy IDs may be associated only with one unambiguous
physical block across all locations; association does not migrate or rewrite them.
Orphan, duplicate, unregistered or unknown custom contributions block admission.
Known starter tier-one capacity remains explicitly nonphysical.

Both terminal types now participate in configured power boundary closure using
the same eligibility predicate as actual terminal operations. Every eligible
adjacent output/both/service face counts, even at zero energy or when another
source could supply the terminal. No battery/generator-only or channel restriction
is invented. Live operations still require positive finite payment and sufficient
energy. The runtime global source join rechecks exact inputs around repository
observation; these are read-only ownership/dependency guards, not authentication,
legacy migration, resource payment or atomic asteroid entry/return.

A separate isolated native IndexedDB check now covers a declared synthetic paid
vehicle transition, fresh repository/facade open, and ordinary save/reopen.
Origin-qualified equal specimen IDs, equal numeric bodies in different locations,
and a carried legacy Prime associated with inactive Home remain exact. Unknown
origin stays unknown; the observation does not mutate committed records. This
is not normal capture, actual-engine physical transfer or authentication proof.

This remains a prerequisite, not a complete admission gate. Exhaustive authored
sites/environment closure, native global persistence, transition consent and
atomic finite-resource transfer still require their integration checks.
Conservative all-phase model spheres may refuse an
installation very close to the frame boundary. There is no new local-entry UI,
save mutation or travel permission in this preflight.

The authored-site observation inventories every saved instantiated settlement and
merchant plus every active/sleeping body reference across repository locations.
Current raw ledgers replace only their own location after the persisted row is
checked. It uses neither loaded marker caches nor coordinates parsed from IDs.
Raw persisted fields are inspected before JSON hydration, including canonical
attachment-owner fields, so explicit invalid `undefined` values cannot vanish.
Whole additive owner state and exact source preimages remain intact. Bodyless and
off-frame owners stay visible and explicitly unresolved. Road/guild resident
history is classified separately, not converted into physical site geometry.
An empty census means only no records in these observed families, never full
generated-site clearance. Whole authored generation footprints, ownership links
and environment/transfer admission are still required.

The separate empty-site prerequisite binds the real reset-established orbital
generator to the repository's current location, generator18 source/profile,
normalized generation options, terrain1, field and exact asteroid frame. Every
loaded chunk must retain its matching producer provenance; pending generation,
unknown cached/worker producers, authored precursors and restored site markers
refuse. Worker protocol3 and the authored-rule cache namespace prevent reuse of
older derived contracts. These tokens identify producers, not cryptographic
authentication of arbitrarily forged cache contents.

Both persisted and live site views are checked globally, so an empty live map
cannot conceal an inactive, bodyless, off-frame or sleeping-only owner. Raw IDB
records must survive canonical JSON losslessly before decoding; otherwise this
read-only inspection refuses without changing the save. Unknown extensions,
synthetic or unsupported descriptors, nonempty road/encounter/site-loot owners,
and resident history not yet joined to its producer also refuse. Existing
once-only road/activation/origin history retains its explicit non-spatial
semantics. Non-generation setting changes such as day length remain supported.

This is not an entry grant or write lock. Complete environment/relationship
closure, authenticated membership and consent, simulation pause, finite resource
reservation, exact atomic revalidation, entry AND return remain required.
Positive authored-site support remains a separate mandatory CF6 obligation;
rejecting it here is an interim safety boundary, not completion.

The repository checkpoint also has a production-browser regression using an
explicitly admitted synthetic fixture: ordinary Continue, paid survey, Save &
Quit and fresh cold reload retain the canonical owner and finite stores. This
does not demonstrate ordinary admission or local-frame travel. Rapidly closing
an inspector and pausing must leave solo simulation frozen even if the browser
delivers an earlier pointer-lock request late; only an explicit resume may
reacquire input. Shared sessions still keep their authoritative simulation live.
