# TypeScript universe saves (development)

The Celestial Frontiers foundation is implemented but not fully accepted. Home is the only ordinary destination. Other locations currently require an explicit local test-admin session and contain synthetic test content.

## Ownership and durability

`location-address.ts` defines a strict canonical address: universe, system, body, kind and instance. `universe-save.ts` exhaustively assigns WorldSave fields to universe, player or location owners. Player inventory is singular; location terrain, containers, creatures, maps, rider bindings and drone custody are stored separately. Unknown additive legacy metadata is retained.

`UniverseStorage` owns IndexedDB `blockwild-typescript-universe-v1`. It hashes data before starting transactions, prepares journal/backup records, commits atomically, and acknowledges success on transaction completion. Writer leases prevent normal simultaneous writers. A failed checkpoint must leave the previous committed state readable. A newer heartbeat renewal is retained when an older checkpoint finishes.

`UniverseWorldStorage` adapts the existing catalog/engine interface to asynchronous persistence. It reads old TypeScript localStorage without rewriting or deleting it. Save & Quit does not close the current world after a failed checkpoint. Browser-close warnings report dirty state; they do not promise that an asynchronous unload save can finish.

## Recovery and compatibility

Export important universes from the Worlds screen. Exports contain all locations and exact legacy backup strings; imports validate checksums and ownership before creating a separate universe, never replacing an existing one. Browser storage can still be cleared or lost by the browser, operating system or device: IndexedDB is not an off-device backup.

The old TypeScript source strings remain available for rollback to the old reader. Export and retain them before changing browser storage. The old reader cannot consume the new universe archive directly. Generic/Rust namespaces are neither migrated nor deleted. Cross-edition conversion is unsupported.

## Wire identity

Multiplayer protocol4 envelopes and manual signaling require a location admission stamp. Its revision is fixed for that connection; autosave advances durable checkpoint revisions independently. Live action revisions remain separate authority checks. Agent protocol2 observations, commands and results carry the same location scope. Scope or protocol mismatch is rejected before gameplay dispatch. Request response/intent retention is bounded, currently20seconds; it is not a permanent transaction history.

## Verification status

Focused schema/runtime tests, real IndexedDB atomic-failure/reopen/archive checks, rich synthetic engine save/reload, and real human host/guest scoped-action/custody smoke tests are recorded in task-local evidence. Comprehensive all-field, actual quota/recovery UI, mobile, retention, remaining agent/network, full regression/build and rollback verification are deferred to integration gates. Do not describe this checkpoint as a fully verified expansion or a deployed release.
