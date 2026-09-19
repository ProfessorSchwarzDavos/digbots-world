# Blockwild changelog

Named releases summarize player-visible changes and the compatibility work that keeps browser-local worlds loadable. Dates use the repository release date.

## Unreleased - Celestial Frontiers foundations

- Added canonical location identity, location-owned runtime/cache state, and transactional TypeScript universe saves with exact legacy backups, writer leases, journaled checkpoints and validated whole-universe archives.
- Save & Quit now waits for durable browser storage; recovery/export remains available when saving fails. Generic/Rust saves are not imported automatically.
- Scoped multiplayer protocol4 and agent protocol2 to the admitted location/epoch/revision; preserved host-owned custody and blocked conflicting request replay within the bounded response window.
- Added frozen environment/sky policies, persistent universe time and local body clocks, analytic orbital positions, phase-aware bodies/rings, eclipse math and roof-aware rendering. Host snapshots now include the frozen celestial catalog.
- Generalized shared gravity for player, creature, projectile, drop and related motion, including zero-G inertia/contact push-off and location-owned saved drift. Added explicitly synthetic, local-only environment fixtures; ordinary off-world travel remains unfinished.
- Added an independent back slot, sealed helmet, finite oxygen tanks and twin-socket rigs, Pressure Weave, a vacuum-incompatible Dive Harness, measured finite-container refill/service, interruptible swaps and contextual oxygen/hazard feedback. Exact tank and supply contents persist through inventory, saves, drops and host transactions.
- Added finite six-axis EVA propulsion, crouch/contact magnetic boots, location-owned anchor/reel and cargo tether controls, and smooth stable-up/free-roll camera comfort. Machine-powered oxygen production and pressurized habitats remain later work.
- This is a partially verified local foundation checkpoint. Additional destinations, the remaining expansion, and comprehensive integration verification are unfinished; no release or deployment is implied.

## 1.12.0 - Field Archive - 2026-08-01

- Added a searchable public `/wiki` with stable article links and lazy category shards for 537 items, 232 creatures, 52 plants, 24 surface biomes, and ten maintained system guides.
- Rebuilt the in-game Item Wiki as the shared Blockwild Wiki while preserving the `?` context shortcut, detailed recipe boards, and direct handoff into personal Bestiary and Plant Compendium records.
- Kept public rules separate from character discovery: hidden field notes, variants, capture history, and research progression still unlock only through the Bestiary.
- Restaged standard Cardforge creature art in habitat-aware scenes and replaced anatomy-drifting creature Full Art with 38 deterministic scenes rendered from the exact production models. Three reviewed authored non-creature scenes remain.
- Added wiki and canonical-art generators, coverage/provenance tests, public architecture and development guides, contribution and security policies, MIT licensing, portfolio-facing engineering documentation, and a concise current README.
- Added GitHub Actions gates for static analysis, generated-content drift, the full deterministic suite, both production build paths, CodeQL, and dependency review, with weekly Dependabot maintenance.
- Added a title-screen Wiki link and preserved the shorter browser tab title, `Blockwild`.

## 1.11.0 - Kinship Accord - 2026-07-31

- Unified ordinary creature capture around one normal Capture Orb and one visible readiness contract, retaining the reliable aggressive-creature health threshold plus optional non-damage routes.
- Separated custody from companionship with the host-authoritative Creature Camp sequence: Stabilize, Nourish, Connect, then Form Bond.
- Normalized legacy capture items without losing stored specimens and made ineligible recruitment, faction, summon, commission, and covenant paths explicit.

## 1.10.1 - Seamwake - 2026-07-22

- Replaced the held-Space surface tread clamp with a repeatable swim-stroke cycle: submerged thrust produces a brief controlled breach, continuous recovery pulls the player back into the water, and another stroke rearms only after the swimmer dips beneath the surface. Players can keep their head above water in natural breathing bobs without standing or walking on the water.
- Preserved the stronger forward bank exit so a swimmer meeting a one-block dry ledge can carry the stroke into a small landward hop. Sprint-swim keeps its exact 20% vertical bonus; crouch dives, oxygen, drowning, and retained entry momentum remain unchanged.
- Made worker and restored chunks finish boundary-light reconciliation before their geometry is eligible for display. Arriving vertical sections now wait for already-visible neighbor edge replacements, presenting both sides atomically instead of briefly exposing a different light field, ambient-occlusion band, water wall, or terrain face.
- Advanced the derived terrain cache to v5 with a cached 3 x 3 edit-halo signature, preventing adjacent and diagonal light/geometry edits from restoring stale boundary presentation without adding a full relight to ordinary warm-cache reads.
- Added streaming diagnostics for pending seam presentations, bounded interrupted-work recovery, deep-start multi-cycle swim coverage, atomic late-neighbor geometry checks, worker-light presentation gates, and cache-halo regressions.

## 1.10.0 - Fieldglass Accord - 2026-07-22

- Added host-authorized AI companion drones as real multiplayer peers with explicit connection-bound capabilities, pause/stop/mute/revoke controls, four-drone admission, nonblocking invulnerable bodies, and ordinary host-owned inventories.
- Added the lightweight `/agent` client, a frozen typed browser bridge, bounded semantic observations, deterministic movement/following, exact revision-checked container transfers, safe workstation inspection, and human-readable terminal results.
- Added lease-protected area harvesting, atomic mature-crop harvest-and-reset, two-phase construction previews, exact material shortage reports, inventory reservations, incremental commits, cancellation refunds, and visible Blockwild-style work marks.
- Added sequenced human/agent chat that remains untrusted world dialogue, public task/waypoint records, a secret-filtered runner notebook, tagged local test worlds, paused fixture stepping, and engine-verifiable diagnostics with real transport and performance health.
- Added caption-first optional ElevenLabs speech generated only by the trusted runner, a separate bounded voice lane, spatial/universal/captions-only listener modes, and individual drone mute/volume controls. Text and gameplay transactions survive every voice failure.
- Added a repeatable 1/2/4-agent capacity soak, complete agent-player skill/manual/schema package, implementation and rollback ledger, and dedicated exact-runtime drone and agent-page release audits.
- Integrated Undertow Pass unchanged: tapered dynamic water, submerged tread behavior, reliable shore exits, faster sprint-swim ascent, retained dive momentum, and the generic Glow Scale name remain covered by the combined release suite.

## 1.9.2 - Undertow Pass - 2026-07-21

- Slowed dynamic liquid propagation to one pre-existing frontier per 0.2-second liquid step and rendered water's simulated source-distance levels as a closed seven-stage taper.
- Replaced held-Space surface skipping with a controlled submerged tread while preserving the explicit shore-exit boost, and increased sprint-swim vertical input by exactly 20%.
- Retained moderated long-fall entry momentum across multiple submerged frames so a real dive carries meaningfully below the surface.
- Standardized the shared aquatic drop's inventory name as Glow Scale instead of tying it to Gloomfin.

## Unreleased - Player-first terrain feedback

- Made local break, place, and tree-felling presentation authoritative inside the input transaction: stale combined terrain is detached before the edited source mesh or falling proxy appears, while seam and light work remains budgeted.
- Coalesced terrain consolidation by current render layer and delayed snapshots until source mesh and light state are stable, sharply reducing redundant merges, transfer churn, stale results, and retained geometry in the deterministic comparison.
- Reconciled canceled queue timestamps, froze static terrain transforms, reused same-cell mob spatial records, cached repeated model attachment lookups, and distributed habitat work across bounded slices.
- Added player-action timing telemetry, a deterministic edit benchmark, expanded performance-log analysis, and a tracked comparison ledger linked from the README and autoresearch case study.

## 1.8.8 - Packhand Hotfix - 2026-07-21

- Restored Minecraft-style double-left-click collection across visible inventory stacks without regressing ordinary cursor placement or multi-slot drag painting.
- Routed same-slot releases through the browser's click count before mutating inventory, with a bounded fallback for overlays that replace the clicked slot before its trailing click arrives.

## 1.8.7 - First Dawn Hotfix - 2026-07-21

- Corrected “A Fire Through First Dawn” to count a day only after it has been survived, and repaired old day-one quest states that had already been marked ready incorrectly.
- Made a held cursor stack commit to one inventory slot on a same-slot left-button release instead of leaving the pack stuck in drag-paint mode.
- Removed the original standing tree mesh before the falling proxy moves in local and multiplayer felling, while keeping neighboring seam and light-halo work on the frame-budgeted queues.

## 1.8.6 - Hearthmill Handshake - 2026-07-21

- Repaired guest furnace access by resolving and initializing authoritative nearby machines before rejecting an interaction, including older worlds whose furnace state had not yet been materialized.
- Rebuilt multiplayer drops around authoritative pickup transactions, backward-compatible velocity snapshots, smooth guest interpolation, and credited-removal ordering so a guest can collect a fresh drop immediately without watching it vanish or waiting for it to settle.
- Reduced tree-felling stalls with cached bounded tree discovery, no-op batch filtering, deferred halo lighting, queued remeshing, predicted-echo suppression, and delayed cleanup/save work while preserving the complete falling-tree animation.
- Added the passive one-input Wheat Mill, Flour, Flour Crates, and Bread Crates; renamed Field Bread to Bread, generalized shared meat drops, and moved bread, cookies, and pies onto a wheat-to-flour baking chain.
- Added a Hearthkin millhouse and farmer assignment, corrected resident floor spawns and gate/fence continuity, prevented gates from closing through players, and taught sentient residents to open and traverse doors and gates while visibly carrying their working tools.
- Embedded recipe boards directly in the Item Wiki, linked patterns back to a pre-filtered Recipe Book, added contextual Item Wiki and Bestiary/Plant Compendium hotkeys across inventory surfaces, and exposed those shortcuts through an optional default-on hint.
- Unified quest discovery around durable settlement facts, retroactive exploration credit, automatically available core journeys, hidden unmet branches, and a dedicated accepted Guild Journal.
- Added harvest-result glyphs, restored precise single-click inventory placement before drag distribution, extended map zoom-out limits by tenfold, verified projectile-forward conventions, and recentered the Capture Orb Rack artwork at its real inventory size.
- Added a runtime guard for overlapping item identifiers while retaining the one documented legacy block/item alias.

## 1.8.5 - Trailcraft Currents - 2026-07-19

- Rebuilt ground and aquatic pathing around measured body progress, swept corner sliding, stable bank avoidance, partial ledge support, and deliberate two-block threatened descents.
- Increased fish ecology headroom and shoal spacing while retaining bounded group sizes, independent population pools, and low-density fast paths.
- Added continuous inventory drag previews and made the first four blocks of player fall distance safe.
- Reworked Known Roads into a freely pannable world-coordinate viewport that opens at a stable 1,024-block scale and no longer clips rendering to an earlier discovery shape.
- Added the 522-entry searchable Trailcraft Guide with deterministic origins, descriptions, recipes, reverse uses, ingredient links, and pattern-board handoff from every relevant crafting facility.
- Added opt-in one-second local performance telemetry with editable emergency timeout and JSON downloads on stop, timeout, or Save & Quit.
- Reworked exploration streaming into resumable terrain, voxel-light, and mesh slices under a fair wall-clock frame budget. Existing terrain and packed geometry remain bit-exact while diagnostics now separate scheduling, generation, lighting, meshing, and queue pressure.
- Added a player-first streaming lane: crossing into an unfinished chunk now preempts and later resumes farther terrain and light work, prioritizes the player's vertical mesh band, and avoids redundant seam rebuilds for sections whose first build has not started. Telemetry reports the occupied chunk's exact generation, lighting, meshing, or ready state.
- Pulled the Giant Mooncap underside into a stout inset stem while retaining the full crown and full-block collision.

## 1.8.4 - Moonbrawn Motherlode - 2026-07-19

- Reworked Frostpear Leaves into noisy, clustered foliage with ragged openings, five-tone canopy depth, individually readable leaflets, and pale frost tips.
- Reduced desert cactus generation to 15% of its previous density, rebuilt cactus faces with ribbed sides and a distinct spined crown, and replaced Glimmerwood's borrowed flora art with dedicated Moonbough Leaves, Starfern, and Dreamcap textures. Starfern and Dreamcap now carry that same authored world art when held or dropped, and Palimpsest Vault stairs have full descending headroom.
- Rebuilt Star Crystal Ore around connected cyan crystal seams embedded in dark host stone, with bright facet cores, restrained violet glints, visible self-emission, and a soft cyan world glow below the strength of finished Star Crystal Blocks.
- Increased Iron and Copper Ore yields to one-to-four raw ore per block, raised conventional ore-generation rolls by 25%, and expanded deterministic vein cells from 2 x 2 x 2 to porous 3 x 2 x 3 seams while preserving the Living Vein ecology's bespoke rarity.
- Restored the legacy Worker Bee plus Royal Jelly Queen Cell recipe and made Queen Cells reusable as true Hive Queen spawn eggs while retaining their crafted-apiary insertion behavior.
- Retired bee crowning from the Waykeeper Chrysalis Loom in favor of a four-Moonberry plus Star Crystal Mossling morph. Old Loom saves cancel retired jobs safely and keep both orbs, Star Crystals, and Royal Jelly recoverable.
- Added the Moonbrawn Mossling as a high-detail, exactly grounded grove guardian with an articulated root-and-bark model, authored animation, Bestiary research, fixed stats and moves, keeper bonding, Capture Orb persistence, and true-form breeding.

## 1.8.3 - Bottles & Bundles - 2026-07-19

- Collapsed released ordinary Capture Orbs back to metadata-free shells so they stack with crafted empties, while preserving intentional lens upgrades as distinct singleton orbs.
- Returned an Empty Glass Bottle after every potion use and added non-destructive direct filling from source water.
- Expanded Alchemy Stand water detection to a five-block radius and exposed that catalyst to the workstation UI as well as the authoritative batch-start check.
- Added full-slot empty-bottle, water-bottle, and Alchemy Stand artwork sized for the real inventory and hotbar presentations.
- Valued Moonberry, Sunberry, apple, and Frostpear crates at ten times their underlying fruit's ordinary sale value, giving the nine-item packing recipe a modest processing premium.

## 1.8.1 - Hearthlands hotfix - 2026-07-19

- Corrected main- and offhand torches to rise upright from the fist at the end of the forward working arm, and restored the preferred 180-degree first-person presentation without coupling the camera and avatar transforms.
- Restored moving held-light illumination to voxel terrain through a shared shader uniform while retaining the new propagated placed-light field, bounded accent pool, and existing creature/drop PointLight response.
- Quarantined pointer-lock cursor-recenter deltas on inventory exit so menu mouse movement can never replay into a delayed camera turn.
- Culled implicit water skins where waterlogged flora meets solid floors and walls, removing the pale clipping patch while preserving seamless water above and around the plant.

## 1.7.1 - Frostpine Fieldcraft - 2026-07-19

- Added sparse Frostpine Taiga undergrowth, two harvestable berry species, and naturally generated Frostpear trees with plantable fruit, authored leaves, hanging harvest blocks, and deterministic regrowth.
- Added reversible nine-fruit Moonberry, Sunberry, apple, and Frostpear crates with product-specific atlas faces and inventory art; rebuilt Giant Mooncap top, side, gills, and icon art.
- Split stacked aquatic flora into species-specific connection groups and authored ribbon, reed, kelp, coral, bloom, vine, algae, and cave-water silhouettes with contextual lean and overlap.
- Reworked Creature Camp around a stable explicit specimen selector, corrected archive-slot removal, and propagated creature renames across deployed entities and Capture Orb metadata, including authoritative multiplayer Peelop inventory updates.
- Calmed Puddlehopper and hound secondary motion, restored Living Bestiary walking rigs such as Trufflehog, and expanded Clockwork Marmot to an 88-part grounded mechanism with animated gears, pistons, gauge, core, tail, whistle stack, and winding key.
- Moved the held torch into the shared ninety-degree tool pose, extended the opening control reminder to 8.5 seconds, separated V/Shift controls from pinned quests, and rebuilt Follower Orders as stateful dropdowns with multiplayer order replication.
- Advanced untouched terrain to generator v16 and expanded the strict adopted-theme release audit to 215 creatures and 293 blocks without invalidating edited terrain or existing saves.

## 1.7.0 - Wild Bonds & Hearthroads - 2026-07-18

- Expanded the production Bestiary from 178 to 215 creatures with 27 regular species, six regional legendaries, and four stable-lineage summoned beings. All 37 additions have explicit ecology, capture and care hooks, stats, level-and-bond move paths, rare-form rules, sound palettes, specimen history, and append-only research.
- Rebuilt the 37 expansion models in a full art pass totaling 1,298 meshes and 58,988 visible triangles, including layered silhouettes, curved topology, secondary motion, transparency, emissive details, negative space, and authored floating or rotating parts where the concept requires them. Regenerated every portrait and both before/after production sheets from the live rigs.
- Added a universal 21-type chart and one host-authoritative real-time resolver for every player, creature, summon, construct, resident, boss, projectile, spell, status, mounted, and PvP pairing. Mounts now use swept body-volume traversal and creature-specific move kits, while telegraph, active, recovery, cooldown, relationship, threat, and status state share one bounded contract.
- Reworked the Bestiary around composable multi-select facets, searchable specimens, research/care/Prime-route depth, append-only notes, summon origins, narrow-screen and 200%-zoom layouts, keyboard focus, and Escape behavior without allowing filters to run off-screen.
- Added seven faction-connected guilds, 21 principal NPCs, seven recruitable companions, 56 authored campaign chapters, six ranks, separate standing, doctrines, deterministic halls and rare lodges, recovery paths, schedules, dialogue, and exact objective proof. Membership requires discovering a hall or receiving a named invitation, and shared verbs cannot cross-credit unrelated chapters.
- Added sparse terrain-following saved road graphs, ferry landings, and persistent bounded event anchors. Contextual loot now resolves through structure, room, biome/depth, faction, danger, history, and ownership, preserving old inventories and host-only rolls while preventing duplicate unique issuance and recording private-container consequences.
- Expanded magic to 20 reusable spells and four realm-specific summons. Stable contracts prevent appearance and reward rerolls; concordance and a timed Worldpin act can ground one free persistent being without granting ownership, while temporary echoes cannot drop, breed, capture, or duplicate XP.
- Preserved v1/v2 Bestiary data, legacy cages and Capture Orbs, current worlds, generator-v15 terrain, ecology/spatial-index performance contracts, multiplayer host authority, and Dwarven mountain infrastructure. Added deterministic audits covering 10,000 containers, 50 road seeds, 50 Dwarven seeds, all guild campaigns, all legendaries, all summons, 24 surface biomes, and seven underground habitats.
- Hardened multiplayer authority with protocol-v2 semantic inventory intents, bounded retries and response caching, scoped mob/drop snapshots, reliable destruction tombstones, guest survival-mode enforcement, and downloadable redacted diagnostics while retaining compatibility with existing sessions and saves.

## 1.6.0 - Wildframe - 2026-07-16

- Halved chunk vertex-attribute memory by packing normalized normals, biome/light colors, and UVs while retaining full-precision positions; added section-local shade reuse and shared particle/leaf GPU resources.
- Added seam-safe radial streaming above twelve chunks. Radius sixteen now keeps 877 visible, 981 generated, and 1,093 retained chunks instead of the former 1,089/1,225/1,369 square windows; ordinary default-distance worlds remain unchanged.
- Replaced repeated whole-population creature broad phases with a deterministic frame-local spatial index for collision, enemy acquisition, companion response, and raycast lookup. The executable scaling benchmark removes 93.8-97.9% of candidate visits at 100-300 creatures without changing exact filters.
- Removed high-frequency UI and audio churn through direct frame-coalesced cursor presentation, deduplicated multiplayer view state, a shared visibility-gated avatar renderer, stable Bestiary snapshots, bounded overlay cadence, allocation-free cloud/settlement work, and meaningful-change audio automation.
- Cached validated world document shells so recurring autosaves avoid reparsing the previous full save, with same-realm revisions and cross-tab invalidation protecting concurrent metadata, options, and catalog changes.
- Expanded performance diagnostics with simulation, chunk, draw-call, geometry, texture, triangle, chunk, and entity telemetry. Added repeatable spatial scaling coverage and regression gates for streaming boundaries, packed visuals, pooled teardown, light influence margins, storage concurrency, and deterministic ties.

## 1.5.4 - The World Below - 2026-07-14

- Added bounded crafted-fence enclosure recognition and persistent lead history so ordinary penned creatures remain protected by the ecology sleep system without treating terrain hollows as pens.
- Raised only local overworld animal and ambient-life targets, refined rabbit scale and heavy-tail cadence, and expanded sensible hide or meat yields for selected larger wildlife.
- Reduced cave-mouth realization to the intended sparse rate, sealed dry graph tunnels from stray legacy aquifers, preserved authored flooded cave routes, and smoothed regional terrain height through biome transitions.
- Added a repeatable 178-creature ecology audit covering natural habitat assignment, resolved custom sound assets, and bounded drop yields.

## 1.5.3 - The World Below - 2026-07-14

- Rebuilt natural wildlife around six independent local population pools for surface animals, ambient life, large and small aquatic life, underground ecology, and monsters. Each connected player receives a fair nearby ecology target while one sublinear host ceiling bounds total simulation work.
- Added placement retries outside visible pop-in, local biodiversity deficit selection, and a sparse hunting-pressure ledger that temporarily lowers only the defeated species' local recovery chance before decaying over game days.
- Replaced the absolute wildlife age purge with distance relevance: ordinary off-range wildlife receives a grace period, while named, tamed, enclosed, authored, and rare creatures become lightweight sleeping save records and wake in bounded batches when a player returns.

## 1.5.2 - The World Below - 2026-07-14

- Added a metadata-preserving recoverable trash slot plus Minecraft-style whole-stack, half-stack, single-item, left-drag distribution, and right-drag painting controls across the pack and crafting grid. Dynamic health text is capped at two useful decimal places and the Bone Shard icon stays inside its inventory socket.
- Made guest block actions carry reliable selected-slot intent, removed false wrong-tool feedback from valid hand/instant breaks, and made guest Shift-click crafting exhaust the legal recipe batch before sending one committed player-state update.
- Routed guest item throwing through host authority with exact durability/metadata and synchronized world-drop/player images. Lead attachment consumes exactly once, returns the committed pack state, and led ground animals recover against keeper or fence terrain after an elevated state.
- Extended host ecology to all connected players through one round-robin spawn clock, bounded local density, square-root population scaling, nearby structure activation, nearest-player simulation/culling, and the existing radius-bounded peer snapshots.
- Closed Forest Temple walls around intentional windows and a working entrance. POI clearings now remove complete intersecting deterministic tree plans, preventing clipped trunks and floating crowns at clearance boundaries.
- Reworked leaf skylight as gradual canopy diffusion while preserving opaque roof/cave darkness. Expanded nearest-first light capacity, strengthened directional torch baked/dynamic illumination, and made lava a warm baked and dynamic light source with spatially coalesced pool lighting.
- Repainted Wild Rune Stone as natural weathered stone with sparse shiny green inclusions and only a restrained mineral glow. Fresh and legacy Lantern Piehouses now anchor their keeper indoors, repair stale brewer stock, and offer a new craftable, edible, tradeable Hearthberry Apple Pie with dedicated inventory and held art.

## 1.5.1 - The World Below - 2026-07-13

- Reworked all nine World Below signature creature models in a second art pass: branched root-antlers and traveling gardens for Grazers; layered fins, light organs and streamers for Lanternrays; genuinely avian prism feathers for Swifts; mineral cartilage, webbed feet and fine gills for Newts; an overlapping mineral-current sail for Skimmers; articulated membrane fingers and roost claws for Ashnose Bats; hollow chime plates for Chimewings; ember-veined thermal wings for Cinder Kites; and a lower, fractured, splayed living-ore silhouette for Veinlings. Species-specific lantern, nose, tail, chime, vent, sail, and heart motion preserves those details in flight and at rest.
- Kept later biome-decoration passes from replacing only the lower half of two-block meadow grass, and made submerged water and waterlogged-plant faces meet at exact block boundaries instead of inheriting the lowered surface-water edge. Slowed cultivated, orchard, sapling, and aquatic-flora growth schedules to one-fifth speed while doubling survival food expenditure for travel, sprinting, and natural healing.
- Replaced the crowded three-column title workspace with a centered main menu and dedicated character and world submenus. All seven playable races now use distinct modeled nose silhouettes, including broad Dwarven, rounded Hearthkin and Confectkin, streamlined Atlantian, pointed Goblin and Wood Elf, and restrained Wayfarer profiles.
- Added direct merchant quantity entry, ±1/±5 controls, safe Buy All and Sell All presets, exact order totals, and explanations for the active stock, purse, inventory, gold, space, or order limit. Every order still requires explicit confirmation, supports multi-stack quantities, and follows the same validated local and host-authoritative multiplayer path.

## 1.5.0 - The World Below - 2026-07-13

- Added the `world-below-v15` generator for new worlds while retaining generator-v14 and older saves on an unchanged `legacy-v14` profile. The world remains Y -64 through 127 with sea level 32 and stable linear block indexing.
- Replaced fragmented climate intersections with deterministic regional cores, transition belts, rare-biome reserves, biome-specific terrain modifiers, real shoreline classification, stronger Rainveil and Ember relief, Highlands around Y 65-100, and Snowcap peaks approaching Y 100-120. The default biome scale is 1.35×, but transition, rarity, and local-feature controls remain independent.
- Rebuilt natural caves around a deterministic three-depth graph. Explicit mouth connectors, looped horizontal and vertical edges, rooms, chambers, great and cathedral caverns, narrow routes, regional aquifers, streams, waterfalls, lakes, and landmark nodes now form one audited navigable system instead of unrelated pits and noise pockets.
- Added deliberately dark Stone Roads plus Rootweave Grotto, Starbloom Hollows, Glasswater Deeps, Pillarstone Reaches, Crystaldeep Gallery, and Emberdeep Fumaroles. Forty-one new blocks cover six coherent ecology/material families, Living Veins, rope traversal, cave markers, bridges, and Deepgear lifts with held, placed, map, lighting, mining, drop, and crafting paths.
- Added Grotto Grazers, Lanternrays, Prismtail Swifts, Glassback Newts, Sailfin Skimmers, Ashnose Bats, Chimewings, Cinder Kites, and Veinlings. All nine use production models and animation hooks, habitat-weighted population tables, custom sounds, staged append-only field notes, and family, flock, roost, pond, thermal, or colony behaviors.
- Replaced every player-facing Sunmetal reference with ordinary Iron while preserving historical numeric IDs and legacy string aliases. Added proper Raw Copper and Copper Ingots, preserved Gold's independent ore chain, and established rare pulsing Living Veins, inert flakes, careful Living Node extraction, bounded regrowth, defensive Veinlings, and deliberately unresolved Veinmetal lore.
- Added depth-band cave mapping that records only physically entered upper, middle, and deep layers. Added Delver's Rope, anchors, ladders, pitons, bridges, Wayfinder Markers, paired Deepgear lifts, biome ambience, fumarole telegraphs, and generated cave landmarks and rewards.
- Rebalanced settlement placement around bounded terrain site search before cultural assignment and spacing. All six cultures remain viable on ordinary audit seeds; unsuitable regions can leave inhabited wayposts. Dwarven holds now anchor the cave graph with civic rooms, forges, clear paired shafts, mountain gatehouses, discovery markers, and lit one-block-grade switchback mine roads.
- Moved chunk voxel fields and edit/network validation to unsigned 16-bit block IDs. Added old-save fixtures spanning inventory, equipment, shield, furnace, chest, quest, merchant, Waygrid, and multiplayer records; preserved legacy terrain fixtures; and added deterministic surface, cave flood-fill, ecology, material, map, Dwarf infrastructure, and generation-time release gates.
- Expanded the executable ecology tool with seven underground rows and custom-sound/POI coverage, and added a three-seed world audit reporting all 24 surface biomes, elevation and fragmentation, cave topology and aquifers, settlement/culture density, Dwarf infrastructure, ores, memory, and generation timing.
- Added two buyable Dwarven Golem Forge blueprints: the fast Clockwork Hound interceptor and the eight-legged Webspinner ranged controller. Deepgear Holds deploy faction-aligned defenders, while forge-built and neutral-orb specimens support taming, commands, capture, attunement, recall, and exact-metadata persistence.
- Added distinct production rigs, grounded idle/walk/attack animation, regenerated Bestiary portraits, and spatial metal-breath, metallic-bark, and pressure-steam voices sourced from four supplied recordings.
- Reworked dragon flight and combat around swept-back leg silhouettes, offset attack runs, species-aware distance bands, breakaways, lateral orbits, terrain clearance, and bounded sightline recovery instead of directly hovering above targets.
- Added the supplied player-damage recording for immediate external hits at a restrained mix. Reduced both the lossless rain bed and its procedural support layer by exactly 15% without changing open-sky exposure or crossfades.

## 1.4.5 - Dragon Renaissance - 2026-07-12

- Rebuilt the adult Fire, Steel, Sea, Gold, and Silver Dragon production rigs from their silhouettes outward while preserving the established adult Ice Dragon. Each family now has its own anatomy, wing language, head profile, tail treatment, materials, and fitted field gear rather than sharing a palette-swapped body plan.
- Added authored stage-one and stage-two forms for every dragon family. Hatchlings use larger expressive features, shorter proportions, reduced crests and wings, and species-specific juvenile details while retaining the same save-compatible lifecycle and stage-one shoulder carry.
- Expanded the dragon pose system with non-accumulating idle, locomotion, flight, attack, and follow-through motion across the chest, neck, head, jaw, wings, legs, tail, crests, and equipment.
- Reworked Dragonflight tack, panniers, type-fitted armor modules, dragon-scale equipment icons, and hoard presentation. Dragon Gold Piles now read as layered coins, ingots, gemstones, and scattered wealth in-world and at real inventory sizes.
- Greatly enlarged generated dragon lairs while keeping their cross-chunk plans deterministic and bounded. Mature stage-three-or-older dragons now leave at least one lineage-preserving egg when defeated; loose dragon eggs survive lava and remain in the world for at least one complete configured day/night cycle.
- Expanded staged Bestiary field notes from first sight through combat, egg recovery, incubation, hatching, bonding, shoulder carry, feeding, growth, riding, equipment, breeding, and renewable scale care.

## 1.4.4 - Harbor Homecoming - 2026-07-12

- Restored the same host-owned health, hunger, quests, unlocks, respawn point, and bounded personal progression whether a guest joins from the title screen or from a running world.
- Added validated guest launch, boarding, steering, dismount, and empty-hold packing actions for Wayfarer sailboats, with broader interaction targeting and authoritative inventory consumption.
- Unified guest pickup handling for placed beds and other eligible blocks so multiplayer placement and removal preserve inventory parity; host teardown now releases chest, furnace, and workstation contents instead of orphaning them.
- Flushes dirty guest progression before a deliberate disconnect, closing the final five-second reconnect-loss window.
- Made craftable ingredients inside the recipe board navigate to their own recipe without staging or crafting anything.
- Replaced undersized generic tome marks with full-frame, colored spell-book icons and a focused visual audit surface.
- Allowed all sapling families to plant on Meadow Grass and grounded the Saltwind Lighthouse table, chair, and sea chest on its floor.
- Integrated the latest pushed `design-1` explored-map optimization while preserving that branch.

## 1.4.3 - Shared Lanterns - 2026-07-12

- Separated high-frequency player poses, mob/drop snapshots, and time/weather presentation from reliable world and inventory transactions, while retaining host authority and rejecting stale player revisions. Hotbar selection now travels as a lightweight pose field and is excluded from the reliable player-state signature, so wheel-only changes do not upload the pack later.
- Made host facility state visible to guests across furnaces and creature/facility storage, with validated shared-container mutations, live block and creature checks, watcher refreshes, and player-specific lead and merchant actions. Furnaces validate their real block coordinates before returning shared slots and burn clocks.
- Routed guest dragon commands, shoulder carrying, and scale harvesting through typed host transactions with live owner/range checks, atomic player inventory changes, and immediate mob refreshes. Generic non-furnace production stations remain host-synchronized and read-only for guests until their distinct operations receive typed validators.
- Replaced the empty radial spell wheel with a quiet compact state and made releasing `Q` close it reliably. Removed text shadow from merchant buy/sell labels.
- Made filled Capture Orbs permanent singletons through inventories, containers, pickups, crafting, cursor actions, and digital storage; held and hover labels include the creature's name and species. Rebuilt the Surveyor Table icon.
- Raised nearby animated light capacity fourfold and baked-source participation more than threefold, selecting lights nearest-first rather than by camera direction. Rebuilt Wild Rune Stone and connected Wild Peppermint art, repaired Bloomrot Cathedral's complete cruciform walls, and halved cricket volume.
- Added focused regressions for multiplayer traffic and authority, shared facilities, trade/lead identity, orb conservation, Q-release behavior, lighting stability, texture ownership, and dungeon topology.

## 1.4.2 - Shared World Repair - 2026-07-12

- Advanced guest-side tree-fall and creature-remains presentation timers while retaining host authority over voxel removal, mob state, and loot.
- Made player block placement consume exactly one matching held item in the host-owned player snapshot, with guest upload suppression until the atomic placement response resolves.
- Sent shift-click inventory changes immediately and queued rapid follow-up chest transfers on top of the accepted shared-container revision instead of losing them to reconciliation.
- Added focused multiplayer regressions for transient destruction, placement consumption and validation, and in-flight chest transfer queuing.

## 1.4.1 - Wildlife Voices - 2026-07-12

- Merged the latest pushed `design-1` commit (`f24ae37`) without altering the branch or replacing newer v1.4 systems.
- Added six complete stereo PCM wildlife recordings for rabbits, small animals, Runeowls, and underwater leviathans.
- Routed the new calls through the existing spatial creature-audio system: rabbit variants now squeak, mosslings and other small companions share a gentler call, Runeowls alternate two owl recordings, and Worldshell Leviathans vary their underwater growls.
- Preserved the v1.4 HRTF positioning, environment loops, bounded voice management, and existing creature-specific audio while extending the asset and behavior regression coverage.

## 1.4.0 - Living Ruins - 2026-07-12

- Rebuilt Skyglass Observatory, Emberwatch Tower, Pilgrim Bathhouse, Clockwork Burrow, and Shattered Colossus with curved, broken, stepped, tapering, or asymmetric forms instead of rectangular massing.
- Replaced the four repeated underground dungeon shells with deterministic connected graphs of seven to eleven chamfered modules. Every layout retains a reversible entrance-to-vault spine, seeded side rooms, three stable stages, bounded cross-chunk generation, profile-specific decoration, encounters, caches, and master loot.
- Added craftable Wrought-Iron Doors with real spaces between their bars, a complete open/closed and orientation state family, two-block placement and drops, family-preserving interaction, collision, atlas art, a held model, and authored dungeon thresholds.
- Made every faction settlement vary its tile count within deterministic hamlet, village, or town bands. Rotated building footprints and doors now honor the semantic layout; civic halls gain chamfered corners; and faction-specific roofs or Dwarven arches replace the generic flat north-facing stamp.
- Merged the latest pushed `design-1` commit (`f8a0205`) while keeping that branch alive. The integration adds activity- and microhabitat-aware wildlife spawning, independent passive/hostile cadence, staged dragon field notes and milestones, richer discovery hints, Highlands and Volcanic flora, a 46-specimen Plant Compendium, and an executable whole-biome ecology audit.
- Advanced untouched-world generation to version 14 while migrating version-13 saves without moving player edits. The human-facing version is independently recorded as 1.4.0 in new and resaved worlds.

## 1.3.8 - Quiet Wayfinding - 2026-07-12

- Refined the Trail Compass to refresh four times faster, removed its duplicate heading readout, and added a softly fading POI name only when a visible landmark is centered. The map's detailed surface rendering is now an explicit toggle at every zoom level, and both ordinary and Exploration-mastery zoom limits extend farther outward.
- Added connected two-block wild grass with continuous lower and upper art, atomic harvesting from either half, ordinary fiber drops, and natural meadow generation. Darkened block-crack overlays while retaining the optional progress bar and tool-suitability settings.
- Rebuilt the Thimbledeer's antler crowns as connected root, post, branch, stem, cup, and rim chains, then regenerated its production portrait and field-guide sheet. Standardized Pack and Recipes backgrounds to the same maximum width.
- Replaced grass footsteps with the supplied softer authored recording and added the supplied wooden impact as the default sampled cue while mining or breaking blocks. Merged the final pushed `design-1` tip (`fbccf1a`) without altering the branch: its detailed wildlife upgrades, Lightning Bug ecology and jar, Iron Shears, held-light improvements, and five new creature calls bring the production field guide to 167 entries.

## 1.3.5 - Wayposts and Palimpsests - 2026-07-12

- Added eight deterministic destinations: the faction-aligned Lantern Piehouse, Switchback Tollcamp, Tideglass Embassy, Sugarwind Teahouse, Moonpost Listening Tree, and Skyshaft Depot, plus Whistlekite Roost and Clockwork Burrow creature landmarks. Each faction waypost has one named persistent merchant-guide, local quest identity, a traveller cache, and a dialogue action that marks the nearest known large settlement of their faction.
- Added the underground Palimpsest Vault with a reversible entrance, Errata Vestibule, Rewritten Stacks, Last Folio, staged encounters, spell loot, living-archive lighting, and an Inkmaw Curator boss.
- Added Mossback Kites, tameable Clockwork Marmots, and the hostile Inkmaw Curator with detailed 24-29-part production rigs, portraits, exact ground contact where applicable, distinct behavior, lore, drops, and field-guide entries.
- Added craftable Wayfarer Canvas, emissive Whisperglass, and Living-Ink-bound Storybook Brick, plus Wind Silk, Living Ink, and Clockwork Springs. Expanded the release-guarded adventure catalogue to 28 POIs, six dungeons, and 166 rendered creatures without changing the version-13 world-generator compatibility boundary.
- Merged the latest pushed `design-1` tip (`789bf43`) cleanly. Mythic Gold and Silver Dragons add distinct detailed rigs, five-stage lifecycles, rare lairs, celestial hatch conditions, breath effects, drops, armor modules, breeding catalysts, survey charts, merchant stock, and dedicated Bestiary portraits without colliding with the new waypost item or texture ranges.

## 1.3.0 - Echoes and Ruins - 2026-07-12

### Spatial sound and biome atmosphere

- Integrated all 18 supplied WAV recordings plus all 13 lossless creature calls from the merged `design-1` history: eight horse/bird calls and five cat/hound/crab calls. Rain, crickets, wind, winter wind, cave wash, ocean wash, and active swimming now lazy-load as environment loops; authored steps, splashes, dragon attacks, wingbeats, magic, achievements, UI taps, hostile grumbles, humanoid idles, and species calls are routed to their matching events.
- Added bounded HRTF positional playback with listener orientation, distance culling and rolloff, deterministic voice eviction, a 32-voice global ceiling, and a reusable 16-node spatial pool. The environment mixer crossfades by weather, daylight, biome, cover, depth, and movement instead of abruptly switching beds.
- Repainted nine main biome surfaces—Wildwood, Snowfield, Siltfen, Sunstep Savanna, Flower Meadow, Rainveil Jungle, Sakurabloom, Sugarplum Vale, and Glimmerwood—with deterministic 16-pixel top/edge motifs and matching vertex-tint atmosphere. Every recipe owns unique atlas tiles, including the isolated Glimmerwood pair.

### Echoes, ruins, and heirlooms

- Added exactly 20 sparse deterministic POI archetypes: eight tiny trail details, eight medium encounters, and four large destinations. Added exactly five three-stage dungeons on a separate sparse grid: the underground Rootbound Labyrinth, Starless Observatory, and Brassdeep Foundry, plus the aboveground Stormglass Citadel and Bloomrot Cathedral.
- Every dungeon carries a distinct material and lighting identity, reversible traversal from its entrance, persistent staged encounters, spell-tome opportunities, a midway cache, boss marker, master vault, and discoverable map heart. Cross-chunk placement remains bounded and deterministic.
- Added six detailed production creatures with runtime models, portraits, behavior, lore, concrete drops, and dungeon encounters: Auric Scarab, Rootwrithe, Bellroot Matron, Vaultwing, Cinder Maw, and Ossuary Keeper. Vaultwing keeps an explicit airborne pursuit profile; the other five rigs are grounded at exact contact.
- Added Dawnthread Saber and Deepdelver's Promise with semantic infinite durability, plus the 6,000-use Briarheart Crook. Their dungeon provenance, dedicated held models, loot keys, and situational combat or mining bonuses share the normal inventory and save paths.

### Creature design and navigation

- Rebuilt the Wildwood Courser and added Rimehoof, Sunscar, Mirestride, Starbough, and forge-built Deepgear Courser variants; brought Steel and Sea Dragons up to the newer dragon art standard; and rebuilt Emberjays, Canopy Larks, Tidewing Gulls, and Frostquills as distinct layered birds.
- Merged the prior `design-1` wildlife redesign and its pets, crabs, mosslings, foxes, harts, deer, longhorns, terrapins, fish, expanded sea-slug family, and core wildlife while preserving the v1.3 adventure and audio work.
- Attached both ears on all four rabbit variants through shared crown-root geometry. Birds now use a fixed-budget three-dimensional look-ahead router, safe-route caching, canopy recovery, and scored perch approaches; ground creatures reuse short proven routes, and size-aware melee reach lets larger attackers connect without standing inside a target.

### Compatibility and release assets

- Advanced deterministic generation to version 13 for the authored adventure grids and atmosphere pass. Version-12 worlds migrate while preserving player-authored edits, save metadata, and the independent human-facing game version.
- Expanded the production creature field guide to 161 runtime-backed portraits. Added dedicated creature-AI, adventure/model, fish/sea-slug, and biome before/after audit renders plus focused regression coverage for exact catalog counts, dungeon traversal, map labels, atlas ownership, positional audio, supplied assets, rabbit attachment, and bounded route probes.

## 1.2.0 - Trailbound - 2026-07-12

### Multiplayer identity and authority

- Added durable browser and character profile IDs shared by title-screen and in-world join paths. The host now reconnects the same character record with canonical vitals, inventory, equipment, off-hand, skills, appearance, Capture Orbs, companion state, and session progress.
- Fixed stale guest trees and dead creatures by pairing host-authoritative removal tombstones with immediate guest fall/death presentation. Shared containers now demand-sync on open, validate both chest and player revisions, and retain dirty state under transport backpressure instead of overwriting a newer pack.
- Repaired invalid remote combat payloads, guest creature feed/tame/breed/saddle/mount/capture/recall authority, follower ownership, full-tree edit replication, zero-heart joins, and duplicated player limbs. A waiting one-code host now remains visibly identified as the host before the first peer arrives, and the relay list avoids the repeatedly failing Halifax endpoint.

### Characters, navigation, combat, and interface

- Added a title-screen Character Studio with as many as twelve named profiles, seven playable races, two body variants, clothing/skin/hair colors, recent-character memory, faction alignment bonuses, and a twenty-point starting-skill allocation. Atlantian characters breathe underwater and trade land speed for faster swimming.
- Added sprint-swimming, momentum-aware water entry, bobbing and shore recovery, unified race/equipment poses, seated legs, mirrored wing animation, and a left-hand slot for Wildwood/Iron shields, torches, and Deepgear lanterns.
- Added a Skyrim-style heading rail with nearby landmarks, players, tracked destinations, and close-range through-wall guidance. Corrected map heading rotation, added biome names on hover, close-zoom surface colors, distant chunk summaries, and Exploration zoom progression.
- Reworked recipe browsing into independent list and pattern panes, added charcoal/coal recipe equivalence, four-orb crafting output, named ingredient tooltips, inventory/chest sort and transfer actions, wallet ingot conversion, a separate music slider, breaking cracks, optional progress bars, and tool-suitability outlines. Hybrid touchscreen PCs keep the desktop HUD while a fine pointer is available and switch only after actual touch input.

### Ecology, settlements, and world polish

- Added Field Cotton and its string/wool loop, Suncrest Carrots, Bluepod Beans, four breedable rabbit families, two sea slugs, Pocket Goldfish, fireplaces, and connected aquariums with bounded occupancy, exact resident records, plants/pebbles, slow movement, and capped same-species breeding.
- Expanded every faction's deterministic settlement planner into connected hamlet, village, and town tiers with roads, role-weighted buildings, lights, amenities, gates or culture-appropriate boundaries, resident circulation, seating, and patrol anchors.
- Added sky-exposure-aware daylight and moonlight, smooth cyclic dawn/dusk transitions, continuous cloud drift, overcast storms, rain ambience, thunder audio, rare non-burning lightning strikes, darker caves, normal nocturnal wildlife, wider and shorter leads, and a tenfold-nearer-priority baked-light budget.
- Reduced foliage and produce interaction bounds to their visible silhouettes. Capture Orb Racks now show only occupied sockets, while plant and creature journals separate humanoids, rabbits, and sea slugs and render all 123 creatures and all 42 plants from production geometry.

### Compatibility and performance

- Advanced generation to version 12 for the new ecology while preserving edited version-11 worlds through migration. Slowed routine autosaves, bounded aquarium simulation, retained adaptive streaming, and kept menu/model previews on disposable renderer resources.
- Added focused deterministic coverage for character identities, authority and reconnect paths, settlements, aquariums, shields, inventory convenience, navigation, weather/lightning, block interaction bounds, ecology, production portraits, and plant specimens.

## 1.1.0 - Shared Wilds - 2026-07-11

- Fixed guest tree felling and large connected-tree edit replication.
- Fixed host-authoritative ground-drop pickup for guests.
- Made shared chest transfers atomic with player inventory state and canonicalized adjacent chests into one 54-slot superchest.
- Added host-authoritative hostile-mob damage and full-health guest respawning.

## 1.0.0 - Realms and Recall - 2026-07-11

### Glimmerwood and the Wood Elves

- Added the cool, bioluminescent Glimmerwood biome with Moonbough trees, Moonpetals, Starferns, Dreamcaps, Lumenreeds, Glowfin ponds, Moonveil butterflies, Glimmerharts, and Runeowls.
- Added the Lethari Moonboughs as a selectable sentient faction with seven named professions, connected tiled surface enclaves, living walls, gates, luminous paths, role-aware schedules, aligned settlement creatures, neutral companion-orb stock, finite merchant inventories, faction quests, side jobs, reusable spell tomes, two formulas, and Glimmerbow progression.
- Added Verdant Volley and Starlight Snare with explicit mana, targeting, projectile, animation, effect, sound, tome, merchant, loot, and quest provenance. Leafwardens use the same three-leaf attack contract as the learnable spell.

### Snowcap Range and the Dwarves

- Added the snowcapped mountain biome and Deepgear Holds: connected subterranean settlement tiles with a guarded surface ramp, civic and industrial depth layers, carved galleries, high-brightness lanterns, brass-and-stone buildings, beds, furniture, shops, a powderworks, and a mana-fed Golem Forge.
- Added seven rendered Dwarven professions with deterministic names, entrance patrols, held tools and flintlocks, profession stock, quests, side jobs, neutral Copper Mole orbs, and aligned Copper Scout Golems.
- Added blueprint-gated Copper Scout, Stone Bulwark, and Aetherforged Sentinel construction. A forge validates the learned plan, complete resource bundle, output capacity, and committed mana before beginning a timed job. The three golems have distinct utility, defender, and guardian statistics and their own bestiary group.
- Added Deepgear Flintlock pistols, lead ammunition, blueprints, lanterns, alloys, gear clusters, furniture, and station blocks. Human settlements, human muskets, drills, broader factory machinery, and chunk loaders remain deferred.

### Sea Dragon and field-guide integration

- Added Sea Dragons to the persistent five-stage dragon lifecycle with sex, genetics, growth, eggs, breeding, husbandry, saddles, armor, two cargo modules, renewable scales, permanent world records, articulated production rigs, brine breath, ranged pressure attacks, and type-aware meat, scales, bones, hearts, skulls, and egg drops.
- Sea Dragon attributes favor fast swimming, useful shore movement, and slower flight. Rare open-water nests generate on a separate abyssal region grid with moon-slate ridges, luminous reef growth, eggs, a persistent guardian, a map landmark, and elder hoards.
- Atlantian Pearlbrokers can stock Sea Dragon Nest Charts. Charts scan the same deterministic nest planner as world generation, skip known nests and continental cells, and mark the nearest matching stage without loading the destination chunks.
- Added two Atlantian-assisted Sea Dragon quests for finding a nest and raising a tidebound hatchling. The production portrait catalog now exports Sea Dragons, both new sentient cultures, their creatures, and all three golems from the exact gameplay rigs.

### Journal, flora, and compatibility

- Quest books now support as many as three simultaneous HUD pins while preserving the legacy single-pin save alias. Static discovery quest **The Light Below** no longer binds acceptance or pinning to a transient Atlantian resident.
- Added a separate Lumenreed Frond planting item and a four-block aquatic growth cap, so the new waterlogged plant can be harvested, carried, replanted, and grown without displacing water. Moonpetals now cultivate into a distinct tall pollinator-compatible stage on hydrated farmland.
- Added deterministic tests for connected culture tiles, underground settlement depth, golem forge gates, full merchant/item/spell/quest/model rosters, three-pin migration, Sea Dragon travel attributes, chart scans, and real generated nest markers. Every new ground model passes the production inspector with exact floor contact.
- Advanced deterministic generation to version 11 for the two new biomes and cultures, Sea Dragon nests, sparser landmark grids, connected wild peppermint, cave-mouth plant exclusion, and the full rooted-tree rewrite. Supported generator-v10 worlds migrate without discarding authored edits or release metadata.

### Attuned recall, apiaries, and Waygrid storage

- Capture Orbs can be attuned to one conscious creature, summon or recall that exact state at any distance, and return a fainted companion automatically in a white sparkle. Fainted orbs cannot deploy or unattune until Healing Stations or passive archive healing restore the creature.
- Neutral Hive Queens accept Royal Jelly without first becoming hostile. Crafted apiaries accept exact neutral or bonded queen entities, accept and release friendly workers, reject angry or foreign-owned residents, and preserve nectar/home metadata in both directions.
- Added searchable Waygrid item and creature terminals. Tiered item cells hold 1,000, 10,000, or 100,000 units, report exact utilization, and spill deterministic legal overflow when removed. Creature archives keep exact Capture Orb metadata and heal more slowly than a dedicated station.
- Crafting now plans atomically across player inventory, digital storage, and nearby owned chests. No source mutates unless the whole ingredient plan succeeds.

### Multiplayer authority and renderer stability

- Made the host authoritative for each player's inventory, selected slot, equipment, variant, vitals, XP, skills, drops, PvP, mob damage/death, shared chests, held lights, and reconnect state. Joining no longer imports a guest's unrelated local-world character, and reconnecting restores the last host-owned state.
- Guests receive smoothed 5 Hz creature snapshots and complete death animation state. Placement rejects every player body, shared chest actions use revisions, transactions commit item and gold atomically, and ending the host session returns guests to the title screen while leaving the invite code reusable for legitimate reconnects.
- Replaced per-preview WebGL renderers with one delayed-release shared preview renderer and a Canvas2D fallback. Both the preview and live renderer explicitly dispose and lose their contexts, while world rendering pauses and recovers safely after a genuine context-loss event.
- Fixed immediate hotbar HUD feedback while moving, the chest-opening pointer race, double-chest seam/lid orientation, door closing through players, cow milking consuming buckets, sentient right-click context menus, and hybrid touchscreen control selection.

### World, interface, trees, and sound

- Added biome-inked map samples, 1x-12x zoom, drag/button panning, player heading, multiplayer markers, blocky layered daily cloud fields, cloud sun/moon occlusion, fade transitions, and rain columns that continue in open space around a roofed player.
- Rebuilt generated trees around face-connected trunks and fuller owned crowns. Wide roots, larger trunks, orchard fruit, historical malformed branches, and chunk-spanning crowns now belong to one bounded felling result without swallowing neighboring builds.
- Added a dedicated Golems bestiary filter, production Wood Elf/Dwarf portraits, ingredient names in recipe previews, three independently pinned quest HUD cards, and corrected full-size Wild Apple Remedy and Slatefin Shark icon framing.
- Added the Suno-generated `13_blockwild_moonbough_lanterns.mp3` and `14_blockwild_deepgear_hearth.mp3` settlement themes, routed respectively to Moonbough Enclaves and Deepgear Holds. Bee and bird wings now flap faster with mirrored left/right rotation, and Leafwardens cast a visible three-leaf helical volley.

## 0.9.0 — Wyrmweave — 2026-07-11

### Dragons and underground lairs

- Added Fire, Ice, and Steel Dragons as three persistent production creatures. One normalized lifecycle carries sex, genetics, age, five smooth 25-day growth stages, health, home lair, disposition, ownership, commands, equipment, cargo, breeding, renewable scales, and alive state across save/load and distance unloading.
- Added fully articulated shared rigs with animated eyes, jaw, chest, three neck joints, seven tail joints, two-part wings, jointed legs and claws, breath and projectile origins, sex markers, saddles, paired cargo, and fitted armor. All three use gameplay geometry for their field-guide portraits and inspection sheets.
- Added distinct autonomous attack profiles. Every type can bite or claw, use a short-range breath, and project a ranged attack; Steel Dragons breathe scalding steam and throw a modeled metal spear. AI chooses an envelope from target distance, altitude, line of sight, provocation, and lair distance.
- Added sparse deterministic stage-four and stage-five lairs on a 704-block region grid. Elemental dragonstone caverns contain permanent guardians, Gold Blocks and piles, three or four hoard chests, type-aware scales, rare tomes and blueprints, and eggs when the guardian is female.
- Added rare Fire, Ice, and Steel Lair Survey Charters to merchant stock. Each consumed charter scans deterministic region rings and records the nearest matching elder lair that is not already known, without forcing its chunks to load.

### Eggs, husbandry, flight, and rewards

- Added physical dragon eggs with exact type, sex, genetics, parent, lair, and incubation metadata. Fire eggs need open flame, Ice eggs need freezing water, and Steel eggs need heated metal plus active steam. Natural incubation hatches in place; a blueprint-gated Draconic Incubator instead prepares a stable hatchling egg for deliberate placement.
- Added defensive hatchling bonding, meat-based healing, one-day Dragon Meal growth, stage-one shoulder carrying, follow/stay/guard/wander orders, and same-type opposite-sex adult breeding with an elemental catalyst and persistent cooldown.
- Added stage-three flight and riding with a Dragon Saddle. Mounted controls reserve `Z`, `X`, and `C` for melee, breath, and projectile attacks while normal held-item use remains available; `Space` and `Shift` control altitude, and `F` dismounts.
- Added four fitted armor positions, two visible chest modules, a dragon care interface, and a save-backed scale reserve that produces new scales every three world days. Cargo capacity derives from the number of attached chest modules rather than a separate creature inventory flag.
- Added stage-, type-, and sex-aware corpse and lair rewards: raw dragon meat, dragon bones, elemental scales and hearts, typed skulls, and possible eggs. Higher stages produce substantially larger stacks. New treatises unlock Dragonbone Greatsword, Pickaxe and Axe recipes, twelve player scale-armor pieces, incubation, tack, dragon armor, breeding catalysts, and Dragon Meal.

### Dragonwake quests and magic

- Extended the Hearthroads main line with **A Rumor Under Stone**, **Teeth of the Deep**, **The Dragonwake Accord**, and **The Fifth Shadow**. The branch moves from elder-lair discovery through a stage-four kill and draconic equipment to mana attunement and an optional stage-five mastery fight.
- Added three abandonable Dragonwake Field Studies side quests for capturing different rare creatures, delivering an elemental scale to a living scholar, and recording all three lair types. Rewards include gold and reusable spell tomes.
- Added six initial spells across Destruction, Restoration, Alteration, Conjuration, and Utility: Flame Jet, Frost Lance, Steel Spear, Healing Light, Blinkstep, and Arcane Ward. Each definition carries targeting, mana, cooldown, effect, projectile, cast pose, particle, camera, and layered sound plans.
- Spell tomes teach durable knowledge without being consumed. Players can discover and learn spells before attunement, keep or sell duplicate tomes, place one on a Tome Display, or store as many as six visible books in an occupancy-rendered Archive Shelf.
- Completing the Dragonwake Accord attunes the player and enables mana. Tap `Q` to cast the selected favorite or hold it for a radial wheel that grows to ten slots. Mana regenerates, spell cooldowns persist, and each Manaheart Draught permanently adds five capacity.

### Skills and Ascendant foundation

- Added eight save-backed skills: Melee, Ranged, Mining, Crafting, Survival, Husbandry, Exploration, and Magic. Relevant play awards skill and character XP, while next-rank costs rise linearly rather than exponentially.
- Every skill reaches rank 1000 and contributes exactly one percentage point per rank to its core multiplier, for 11 times the base at rank 1000 before perks and other effects. Character level remains uncapped, and each 25 ranks grants a perk point.
- Added sixteen prerequisite-aware starter perks spanning all eight trees. The data model supports percent bonuses, flat bonuses, and ability unlocks without embedding future perks in the save format.
- Magic 1000 makes mana effectively infinite and hides the mana bar. Mastering all eight skills unlocks the opt-in Ascendant foundation, currently a floor that prevents health from falling below ten percent; broader Ascendant switches remain future work.

### World repair, compatibility, and coverage

- Advanced deterministic generation to version 10 for bounded dragon lairs and a final tree-connectivity pass. Authored trunk islands are bridged back to the rooted component, nearby crown pieces attach before leaves are emitted, truly floating leaf islands are pruned, liquid exclusions remain intact, and POIs keep a five-block tree-free margin.
- Supported generator-v9 Sugarcourt worlds migrate without losing edited blocks. Dragon, egg, archive, tome, magic, skill, and Ascendant fields use bounded normalization and safe defaults, while dragons are explicitly ineligible for ordinary permanent cleanup.
- Expanded the generated creature catalog from 90 to 93 entries: 86 core creatures plus seven butterflies. Added dedicated dragon lifecycle, model, effects, world, content, magic, skills, and responsive UI suites alongside the existing full release gates.

## 0.8.0 — Sugarcourt — 2026-07-11

### Sugarplum Vale and food liquids

- Added Sugarplum Vale as the twenty-second deterministic biome, with rolling Sugarplum terrain, connected Candywood trees, Gumdrop Bushes, Wild Peppermint, Lollipop Orchids, Marshmallow Shrubs, and sparse syrup ponds that remain coherent across chunk seams.
- Added Peppermint and Cocoa Puff as three-stage farmland crops with normal hydration, growth, harvesting, and scythe-replant behavior. Sugarplum forage and Candywood expand the plant journal from 32 to 39 entries.
- Added honey and syrup as placeable, bucketable liquids with their own saved liquid identities. Both use the bounded liquid work queue, spread more slowly than water, impede movement, and never create renewable source blocks.
- Advanced deterministic generation to version 9. Supported worlds from generator versions 2 through 8 continue to normalize into the current representation without discarding their edited blocks.

### Sugarcourt Concord

- Added the Sugarcourt Concord as the fourth NPC faction, with independent standing, diplomacy, quests, finite merchant inventories, role-aware demand, and seven rendered Confectkin professions: Crown Confectioner, Gumdrop Gardener, Sugarboiler, Candysmith, Sweetbroker, Kennelkeeper, and Brittle Guard.
- Added Bonbon Borough settlements with hard Boiled Sugarbrick walls, Candywood buildings, gates, lights, gardens, markets, kennels, smithies, Sugarworks rooms, furniture, schedules, guards, and population rules.
- Added village-only aligned Taffy Hounds and Praline Cats. Capture Orbs now preserve their faction provenance, so a borough animal cannot be laundered into a tameable neutral creature. Kennelkeepers instead sell explicitly unaligned hounds and cats in filled Capture Orbs.
- Added profession-specific stock for Peppermint and Cocoa planting material, Sugarplum forage, candy materials, honey and syrup buckets, finished arms and armor, four physical blueprints, two potions, and neutral companion orbs.

### Sugarworks, blueprints, and equipment

- Added the placeable Sugarworks and eight timed recipes. Open recipes produce Boiled Sugarbricks and Tempered Candy Alloy; learned blueprints unlock the Rockcandy Saber, Peppermint Pike, Sugarplate Crown, Cuirass, Greaves, and Boots.
- Sugarworks batches validate blueprints, ingredients, station state, and output capacity before consuming anything. Their selected recipe, active timer, and output stack use a bounded save-normalization contract.
- Added blueprint-gated Peppermint Rush and Marshmallow Ward formulas to the Alchemy Stand. Peppermint Rush grants a 24% movement increase for three minutes; Marshmallow Ward reduces incoming damage by 28% for three and a half minutes.

### Sugarplum wildlife and field guides

- Added herd-forming, tameable Taffalo as an adult saddle mount; harmless Sprinklebugs as small candy-pollen carriers; and syrup-only Syrupfins that cannot survive in water or honey.
- Added the Bonbonwing, a four-winged Sugarplum butterfly that releases with normal use and can be eaten with crouch-use. It remains compatible with the shared butterfly portrait, held-creature, and habitat systems.
- Expanded the generated bestiary from 77 to 90 entries: 83 core creatures and seven butterflies. The seven Sugarcourt professions bring the sentient roster from 18 to 25 entries.

### World options, compatibility, and coverage

- Added an advanced world-creation selector for Hobbits, Goblins, Atlantians, and Sugarcourt, with All and None shortcuts. The option controls deterministic settlement and aligned-resident generation; home biomes and ordinary wild ecology still generate when a culture is disabled.
- Saved and multiplayer world options use the same canonical faction order. Missing legacy data enables every faction, an explicit empty list creates a valid wilderness-only world, and network snapshots reject duplicate or unknown faction IDs.
- Newly written worlds record `0.8.0` as their last-saved game version while human release identity, generator version, and save-schema compatibility remain separate concerns.
- Added focused suites for Sugarplum generation and crops, Candywood topology, syrup ponds, honey/syrup flow and buckets, Sugarcourt creatures and production models, settlement/economy/quest rules, Sugarworks batches, blueprint wiring, world-option migration, multiplayer validation, UI rendering, and portrait assets.

## 0.7.0 — Tidelight — 2026-07-11

### Ocean and world generation

- Deepened and diversified ocean shelves, basins, and trenches, with the new bioluminescent Lumen Trench biome and sparse underwater Atlantian settlement generation.
- Added Rainveil Jungle and Sakurabloom Grove, bringing the deterministic biome roster to 21.
- Enriched Sunwash Coast with sparse Saltbrush, Coast Aster, Sunwash Crabs, and Tidewing Gulls.
- Made all seven aquatic flora types targetable and breakable while preserving the water in their cell. Harvested propagules can be replanted on valid submerged beds, and column-forming species grow to bounded heights.
- Added Lumen Kelp, Star Coral, Abyss Bloom, and Tidevine to deep-water ecology and the plant journal, with usable ingredient drops.
- Reworked authored tree forms so log layers are face-connected and rooted felling includes upper crowns and historical diagonal branches without claiming a neighboring tree.

### Sea life, companions, and leviathans

- Added Glassfins, Lanternjaws, benthic Abyss Skaters, rare hostile Dreadcoils, and tameable Tidepups to habitat-weighted ocean populations.
- Added the weak, tameable Sakurakit to Sakurabloom Grove and retained rarity-weighted group sizes so leviathans do not displace ordinary schools.
- Added physical Worldshell and Aetherbell eggs. Eggs incubate only while intact underwater, preserve exact metadata when collected, and hatch into persistent babies that grow through juvenile and adult stages.
- Adult bonded Worldshell Leviathans and Aetherbell Leviathans can be saddled and controlled. Worldshells accept six visible chest modules and move extremely slowly on land; Aetherbells accept one chest module and animate between sea and airborne forms.
- Unified the tame-owner-saddle checks used by Wildwood Coursers, Wargs, Reedstriders, Worldshells, and Aetherbells.
- Reattached shared fish fins to their bodies, increased Wildwood Courser eye contrast, and increased daytime butterfly flight relative to perching.

### Atlantians

- Added Atlantians as a water-breathing, aquatic-only sentient culture with independent alignment and diplomacy records.
- Added open, vertical Lumen Tidemoot layouts with reef homes, current lanes, luminous markers, nests, rest alcoves, safe approaches, and aquatic population capacity instead of surface walls and beds.
- Added six rendered professions: Tidewarden, Kelpkeeper, Coralwright, Pearlbroker, Glowmender, and Trident Guard.
- Added deterministic Atlantian names, profession equipment, aquatic schedules, succession, hiring and claim constraints, role-aware dialogue, finite merchant inventories, aquatic demand, a discovery questline, and repeatable settlement side-quest offers.

### Farming, building, and atmosphere

- Added renewable three-stage Moonrice and Sunroot crops.
- Let ordinary flowers planted on farmland mature into tall, pollinator-compatible forms that yield several flowers and return to their base planted stage after harvest.
- Added the five-minute Tidebreath Philter to the Alchemy Stand using a Water Bottle, Lumen Kelp Fronds, and Abyss Bloom Nectar.
- Added shared POI amenity planning for supported doors, directional torches, tables, stools, shelves, and barrels.
- Replaced discrete storm-cloud objects with a continuous dark overcast that hides the sun, moon, and stars. Fair weather retains layered puffy white clouds.

### Field guide, audio, and release assets

- Expanded the generated creature field guide from 60 to 77 production-model portraits and the plant journal from 18 to 32 entries.
- Added two Suno-generated **Tidelight Shelf** variants for coast/open-sea travel and two Suno-generated **Lantern Sea** variants for deep water and Atlantian settlements. All four ship as local MP3 assets and require no runtime Suno connection.
- Added focused asset checks for all ten declared Suno release tracks and all 77 browser-facing creature portraits.

### Compatibility and verification

- Advanced deterministic generation to version 8. Save normalization continues to accept supported generator versions 2 through 7 and migrates them to the current representation.
- Kept human-facing game version metadata separate from generator and save-schema versions; newly written worlds record `0.7.0` as their last-saved game version.
- Added focused suites for ocean generation, aquatic flora, crops, tree topology, weather, POI amenities, ocean creature lifecycles and models, Atlantian simulation/UI, portrait assets, and routed music assets.

## 0.6.0 — Hearthroads — 2026-07-11

- Added explored-world maps, Cartography Tables, wayshrines, charged fast travel, branching quests, plant discovery, alchemy, distilling, blueprints, gold, trade, banking, local ventures, and the first Hobbit and Goblin settlements.
- Added named residents, professions, schedules, faction alignment, merchant stock, crossbows, spears, Wargs, new wildlife, and the host-authoritative rules that Tidelight extends underwater.

See [ROADMAP.md](ROADMAP.md) for deliberately deferred systems rather than speculative release dates.
