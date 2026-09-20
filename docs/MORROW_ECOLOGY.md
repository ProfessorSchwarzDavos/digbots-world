# Morrow ecology lifecycle

The four Morrow species share the destination's `surface-animal` population
budget. Slatefin shallow regolith swimming does not place it in Home's
underground encounter budget; a ground-resting Morrow Owl is not an ordinary
Home ambient bird. Birth and cold restoration both use `MORROW_NATURAL_POOL`.

`naturalPool` is persisted population-accounting state derived from the
destination/species policy, not a genetic or ownership attribute. A correctly
classified creature must retain its pool and weighted cost through save/reload.
Historical Morrow saves misclassified by generic Home restoration (Slatefin as
underground, Owl as ambient) normalize to the lunar surface pool on load. The
stored input is not edited in place; ordinary later checkpointing writes the
corrected copy. Specimen ID, genetic seed, progression, care/lineage, ownership
and all other durable metadata remain unchanged. Non-natural/owned creatures
do not acquire natural budget membership. Home's existing classification and
cave-water migration rules remain separate.

Generated terrain is a disposable cache, not the source of creature identity or
player edits. The memory tier is byte bounded; the current persistent tier
stores cloned chunk data on unload/disposal, and every16 successful write-count
positions schedules pruning to256 records by `accessedAt` (write recency).
Save & Quit waits for the authoritative universe checkpoint, not for every
still-loaded chunk to be cached. Absence of a cached row after Save & Quit is
not evidence of a lost edit or entity. Cache verification must observe actual
unloading and transaction completion; compare reconstructed voxels/edits under
the same location/seed/options/edit key, not preservation of every old record.

Tests: `morrow-population-persistence.test.ts` covers actual-engine metadata and
budget custody; `location-cache-lifecycle.test.ts` covers cache ownership,
generation agreement, old namespace rejection and stale callback isolation.
