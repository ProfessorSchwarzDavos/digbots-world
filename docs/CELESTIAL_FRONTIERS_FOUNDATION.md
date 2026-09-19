# Celestial Frontiers: TypeScript foundation

Campaign: `celestial-frontiers-ts-20260918`, CF0 revision 1, September 2026.
Implementation source: `edition/typescript`; original specification: [Celestial Frontiers and Wayworks master plan](CELESTIAL_FRONTIERS_AND_WAYWORKS_MASTER_PLAN.md).

This is an architecture/content freeze for the full update, **not a claim that the update is playable or deployed**. CF0 does not change game behavior, save authority, package version or production settings. Existing TypeScript worlds still use the current localStorage implementation until the separately accepted CF1 migration is implemented and verified. The historical proposal's `main` references do not change the edition boundary.

## Scope decisions

The roster is one star, six primary worlds and eight moons. Ad Astra is a ninth moon-scale destination: a visitable inhabited station, not an extra moon. Adopt the recommended names Waystar, Cinderhymn, Morrow, Orison, Aerie, Rimehold, Vanta, Hollowmere and Wick while preserving fixed Talon, Hope, Suno, Jun, Styx and Ad Astra. Morrow can remain undiscovered as “the Moon” in the UI without changing its canonical identity.

Cinderhymn, Hollowmere and Wick are complete campaign content in CF11. Talon/Hope in CF7 and Suno/Jun/Styx in CF9 must deliver all their enumerated content; a sequencing “vertical slice” is not permission to leave a reduced destination. Orison and its moons belong to CF10. Deepstar Vessel is required; opening infinite other systems is not.

The core production table names 19 machines, supplemented by the explicitly required pressure controller/devices, generators, extraction machines and storage infrastructure. Five resource transport kinds use six named physical conduit blocks because Universal Service Trunk is a partitioned composite. Seven ships, four submarine classes and 70 creature concepts remain explicit obligations (64 proper names plus six described Rimehold/Vanta species). Registry presence does not prove content completion.

## Adopted system defaults

- Gas simulation begins with pressure, O2, CO2, inert gas and temperature; independent corrosion policy remains. Radiation equipment/policy hooks arrive with narrow warned outer-system uses. Trace toxins and nuclear generators are not added to initial scope.
- Use integer/fixed-point amounts, joules/watts, liters, kPa and Celsius presentation, tuned for play. All transfers conserve custody across revision/permission failures and full outputs.
- Wayanchors are cheap powered exact-one-chunk summary leases under a visible host soft budget; no remote natural spawning, full AI or rendering. Formed structures initially cap at 12³. Visible item pulses are bounded cosmetic samples of committed transfers.
- Travel combines short interactive ascent/descent/local orbit with planned journaled transfer. Ordinary damage/disabling is recoverable at a cost; permanent total loss requires an explicit high-risk setting, off by default. Atlas Freighters are assembled in orbit.
- Horizon Door is the futuristic pressure door name. Ordinary controls interlock; unsafe manual opening requires held confirmation and real decompression. Large submarines reuse AirZone topology; small ones have one persisted cabin zone.

## Persistence and authority contract

Every mutable object, cache/job result and location-sensitive command must have an immutable location owner. An active load epoch rejects late work without changing durable identity. Map layer and location are separate concepts. Universe/player custody records refer explicitly to current location.

The new TypeScript universe IndexedDB authority must be separate from disposable terrain caches and other editions. Migration retains exact original TypeScript save strings and hashes, writes/readbacks new records transactionally, then marks completion. It does not delete or mutate the legacy source. All old fields need an ownership/round-trip audit; preserve seed, generator profile/options, sparse edits, time, progression, maps, metadata and awake/sleeping creatures. Home generation must remain visually/gameplay compatible.

Catalog snapshots, seed derivation and body generators are versioned independently. Existing locations stay on their captured generator. Journals bind source/destination revisions, transaction IDs and exactly-once custody; interrupted transfers reopen to one valid state. Export/import validates every record, checksum and reference before replacing anything. Quota failures retain authority and offer recovery/export. A v2 rollback restores retained old data; it cannot losslessly represent new multi-location progress, and must not claim otherwise.

The host alone commits edits, inventories, machines, pressure, drilling, vehicles and travel. Validate actor grants, location/epoch and expected revisions before mutation. Workers return revisioned proposals, not authority. Clients predict presentation only. Negotiated wire/schema incompatibility fails clearly, including cross-edition attempts.

## Implementation sequence and evidence

CF1 location/persistence; CF2 environment/sky/gravity; CF3 back slot/life support/EVA; CF4 power/machines; CF5 fluids/gases/habitats/airlocks; CF6 Morrow/orbit/stations/first ship; CF7 Talon/Hope/Ad Astra; CF8 logistics/factories/anchors/drills; CF9 Suno/moons/submarines; CF10 Orison/moons/freight; CF11 remaining worlds/Deepstar; CF12 polish; CFV integrated acceptance.

Each phase needs actual player access, deterministic unit/integration tests, fault recovery, host/guest and agent checks, content/model/animation audits, manually reviewed visuals and bounded performance evidence. Final acceptance includes the full automated suite, fresh builds and 30-minute multi-location factory/pressure/anchor soak. Software-rendered visual tests cannot establish hardware FPS claims.

The manager's task-local evidence is retained under `work/celestial-frontiers-ts-20260918/`: full source-line coverage and content registry, sixteen decisions, exact-source architecture map, performance caps, detailed CF1 test proposal, synthetic fixtures, baseline logs and reviewed procedural concept sheets. These ignored artifacts are local evidence, not part of a public release. The source specification SHA256 is `2bbaacca785216d8d10896d89457738bed437951e8465e6ee12747aee60c7a82`.

CF1 is gated on director acceptance of CF0. Local commits are permitted; push, publication, provider changes and deployment require separate authority. The Rust repair campaign remains separately paused. Follow the [edition maintenance contract](EDITION_MAINTENANCE.md); no Rust/Wasm artifact or runtime dependency is introduced.
