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
Other non-consuming guest after-images (soil, seed, bucket or bookshelf changes)
require typed host transactions and fail closed in this generic block channel;
their complete guest adapters remain part of the unfinished integration matrix.

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

Only the descriptor's bounded voxel region is claimed. Construction outside that
region remains ordinary orbital construction, not an infinitely extending claim.
Keep exports before moving between versions. Older binaries do not enforce the
new asteroid authority; importing new saves into them is not a supported rollback.

## Current integration boundary

Orbit gameplay uses these records. The pure local-coordinate projection and real
ChunkWorld reconstruction are tested, but separate engine travel into an asteroid
local frame is deliberately refused until attached containers, machine instances,
facings and other metadata have one canonical frame owner. No duplicate resource
view or debug travel path is opened. Runtime field expansion and the complete
Celestial Frontiers travel/agent/verification matrix remain separate unfinished
work; this checkpoint is not full expansion completion.
