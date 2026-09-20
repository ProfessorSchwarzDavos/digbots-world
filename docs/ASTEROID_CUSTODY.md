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

## Persistence

`WorldSave.asteroidFields` belongs to the universe partition. Each body/orbit-band
has one validated registry with finite voxel pages, discovery and claim metadata.
Normal world edits and player inventory are checkpointed atomically with those
pages. Older orbital saves migrate their existing edits on first load. Canonical
pages override stale location mirrors before chunk generation or cached terrain
is admitted, so returning to a location cannot regenerate extracted material.
Import remaps the universe identity and retires old command epochs without
refilling voxels or changing claims.

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
