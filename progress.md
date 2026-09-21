Original prompt: Rework recipes and the pack GUI/avatar; fix twitchy Ridgebacks; add double-tap-forward sprinting; build scalable butterfly exhibit blocks with inventories, flowers, landing behavior, and capacity up to about 20 connected blocks; make recipe-book hover previews and click-to-fill crafting, fix crafting/furnace arrows, add recipe search and mirrored recipes; animate and flow water, improve swimming/shore exits, add oxygen; add ocean, river, and underground fish; add a larger two-seat sailboat with crouch-use chest storage; fix third-person vertical controls and interaction; allow mobs through open doors; remove tree-growth notices; add five surface mobs, birds, desert plants/features, desert and forest temple POIs with chests, a new enemy, and rare magical durable loot; add a tameable breedable banana-rabbit pet with naming and commands; add metadata-preserving creature cages; add male/female player choice with multiplayer, armor, and held-item representation; add a banana-rabbit POI; add visible game versions and save-version metadata plus title-screen fullscreen; add skeleton archery; optimize and benchmark 10-default/16-max render distance with separate 6-8 simulation distance; rework clouds and biome-sensitive weather; enrich meadow grass, flowers, butterflies, and a large butterfly POI. Do all of it thoughtfully and report only when entirely done.

## Celestial Frontiers CF6 — asteroid runtime integration

- Read-only stored-creature inspection now preserves exact orb/cage/jar payloads
  and legacy mirrors without clock reads, new IDs, stock migration, lens removal
  or lossy normalization. Apiary preflight uses this reader instead of the
  stateful inventory migration path. Legacy species stock requires explicit
  migration before admission.40focused/212expanded/static112/lint95PASS; lint94's
  three unused test bindings are retained and corrected.100reads preserve old
  absent optional fields and opaque metadata. Global container enumeration,
  deployed-body reconciliation and atomic custody remain integration gates;
  no local entry, production build or browser acceptance is claimed here.
- Once-only authored history now retains all original road-event/activation IDs,
  quiet outcomes, insertion order and the historical starting-settlement binding.
  Append/retry cannot replace an old event or evict it at the existing4096 save
  limit.100cold captures preserve absent/null distinctions; explicit undefined
  history/navigation fields reject instead of disappearing in the shared JSON
  clone.25focused/200expanded/static110/lint93PASS. The road validator and old
  serializer limit are shared unchanged. Physical generated geometry, actual
  spawn/reward/observation proof and atomic authority remain integration gates;
  this host-private history is not guest knowledge or a new structure owner.
- Navigation selection/capture now binds the actual host human body, exact
  occupied seats, inertial velocity and the full physics/rendered EVA tether.
  Solid integer anchor custody and both outside-to-outside line crossings are
  checked. Distant spawn points and absent legacy bindings stay exact;100cold
  cycles preserve fractional coordinates. A non-mutating engine snapshot shares
  the existing serializer's binding construction and refuses active cargo lines.
  36focused/229expanded/static108/lint91PASS. Static107's readonly source/test
  mutation errors are retained and corrected without casts. Actual render height
  and save semantics are unchanged. Respawn actions, guest maps, whole vehicle/
  follower closure and atomic owner/resource/consent authority remain separate;
  local entry is still closed and no new build/browser is claimed.
- Attached map views retain original discovery keys, marker identities and
  world-elevation cave bands. Only already-known local information is projected;
  host observations merge through the original map reducers.100cold cycles keep
  fractional markers, outside discoveries/bed binding and all17 travel charges.
  Forged/stale views, lossy metadata and revision overflow reject.216expanded,
  static106/lint89PASS. Static105's real coordinate-narrowing type errors are
  retained and fixed with explicit numeric guards. This private chart is not
  guest knowledge-sharing, observation proof, fast travel or atomic ownership;
  complete navigation/capture integration remains. No new build/browser claim.
- Full machine selection/capture now also checks conservative analytic bounds
  from the actual workshop/pressure/space-infrastructure geometry and rigs.
  Hidden alternatives, all rotation phases, piston strokes, crane lift, fill
  scales, connector reach and maximum legal gates are included. No model/GPU
  resources are retained by the numeric cache. Existing crane equations,
  connector reach and gate clamps are shared unchanged.42focused then238expanded
  tests/static104/lint87PASS: every machine's vertices across poses, all49 gate
  sizes, inside/outside intrusion refusal and100cold network+body captures.
  Routing-only helpers are explicitly named; full machine APIs compose both.
  This leaves environmental queries/pressure and global event/resource authority
  as separate admission gates; no local travel, build or browser claim.
- Machine components now use the same exact power/material topology inputs as
  the live runtimes. Selection checks every canonical boundary pair (not the
  loaded256-node slice), all five resources, complete neighbor/voxel custody and
  physical Waygrid terminal export coupling. Capture rechecks the whole merged
  after-image and refuses missing-state machine voxels.100cold cycles retain
  buffers, paid cycles, remainders and opaque cargo.238expanded/static102/lint86
  PASS, including connected-window/pipe regressions. R1 Gasline-name and r2
  installation-ID fixture errors retained/corrected. Physical model envelopes,
  environmental queries, pressure links and atomic resource authority remain
  separate integration gates; no local entry or new build/browser claimed.
- Apiary selection now reconciles canonical hives, saved free/sleeping bees and
  the live hive visuals omitted by normal serialization. Whole foraging queries
  and visual bodies must stay with their hive; duplicate bees/orbs and stale or
  mismatched ownership fail closed. One hundred cold captures preserve products,
  clocks and exact encoded orbs. The runtime snapshot is detached/frozen and
  host-only, without calling the mutating world serializer. A real orb-factory
  bug (an absent owner emitted as nested undefined) is fixed without changing
  serialized bytes.63focused/213expanded/static101/lint84PASS. R1's orb failures
  and static100's negative-fixture type error are retained and corrected.
  Global inventory, defense links, voxel ownership and event/resource authority
  remain integration gates; this does not enable local-frame entry.
- Non-settlement resident histories now resolve against canonical road events
  and guild recruitment books, using the same authored spawn definitions as the
  engine. Historical links do not drag distant roads/halls across a frame;
  physical POIs, homes, social groups and active followers remain separately
  enforced. The persistentPoiResident retention flag no longer invents a POI
  for hatched pets or companions.44focused/159expanded/static99/lint81PASS,
  including actual engine spawn/once-only/guest-refusal checks and100cold entity
  captures. Static98's test-only physical/history union error retained/corrected.
  Pure history resolution is not complete authored selection or atomic authority;
  no new build/browser, handoff or local-entry claim.
- Loot/spell adapters preserve unique-reward history, historical container
  ownership/theft data, optional absent/null spell fields and exact deadlines.
  Tidemend's actual16-block XZ cooldown keys remain canonical (shared history-grid
  helper also retains ecology64 behavior). Ironwake follows only the actual local
  human body, never an inferred station aura or drone grant.100cold cycles retain
  values; timer/history loss and stale/crossing actor bindings reject.18focused
  then165expanded/static97/lint79PASS before commit. R1 named a nonexistent loot
  suite that Node did not run; r2 explicitly includes contextual-loot-world.test.ts.
  Pure adapters still require authoritative event/resource/clock validation and
  atomic complete-frame integration; no fresh build/browser/travel claim.
- Full Survey Hopper bounds now derive from its actual capsule/gear/cockpit/
  plume model under arbitrary rotations and conservative all-phase sweeps.
  Rendering shares unchanged gear/flutter constants, checked against original
  equations and actual vertices. Fleet display remains a transient non-save
  view: canonical location/journal/trip/resource owner is not copied or rebased.
  Whole hull/dock/passenger relations, literal local alias and active-flight
  refusal are explicit; consent/access use original canonical reducer/revision/
  replay rules.35focused/176expanded/static96/lint78PASS. Static95 test-only
  readonly tuple-union spread error retained/corrected. No resource/boarding/
  flight attachment action or durable capture authority, fresh build/browser,
  or local-entry opening is claimed; integrated gates remain next.
- Liquid exact-array selection/capture preserves original slots/flow flags and
  checks complete voxel before/after images, waterlogged flora, cross-frame
  tracked/untracked source adjacency and duplicate/unknown state. Removing a
  flow record while retaining a liquid voxel refuses implicit source creation.
  Ecology history retains canonical sector keys with translated local queries:
  the half-sector offset and fractional negative border must never split or
  duplicate hunting history.100cold cycles preserve exact unnormalized state;
  sector clocks cannot rewind.26tests/static94/lint76PASS; r1 nonexistent flora
  fixture failure retained/corrected to actual Lumen Kelp. These are pure
  adapters, not engine/event/resource/atomic authority; full integration remains.
- Agent task/waypoint/custody selection and same-membership capture now preserve
  exact records, old array slots, opaque inventory metadata and unchanged
  fractional axes through100cold cycles. Whole waypoint groups cannot straddle
  frames; unanchored tasks/cargo follow only authenticated selected drone bodies.
  Reconnect/join/leave, outside identities, global enablement changes and lossy
  normalization reject. Shared stable-slot merge is extracted without changing
  entity behavior. Regression uncovered and fixed createAgentTask.filter(isId)
  passing array indices as ID length limits and silently losing references.
  Focused32/expanded143/static93/lint74PASS read before commit; r1 invalid Stone
  test fixture and r2 real reference-loss failures retained. No new build/browser
  or local entry claim; actor consent/resource authority and full canonical
  authored/fleet/environment integration remain required.
- Complete entity-array selection/capture now composes physical bounds, actor/
  dependency relationship partition and exact unit/drop codecs. It preserves
  outside rows and old slots, handles live/sleep moves, appends new records, and
  revalidates the complete merged identities/social/passenger/lead/dependency
  graph. Undefined legacy lead keepers use the explicit local actor, preserving
  the stored record. Focused32PASS incl100cold whole-array cycles; expanded274,
  static92/lint72PASS before commit. This remains a pure entity-collection layer:
  canonical authored/agent/fleet adapters, authentic host preimage/resource/consent
  binding and durable local capture are still required. No build/browser/entry
  opening or fullCF6 handoff for this intermediate increment.
- Live actor-body preflight now reads the engine's actual transport/model/seat
  maps, checks current host identity/peer tokens/drone admission, derives human
  or full animated drone bounds, and refuses active agent tasks/build/previews.
  It copies no cargo/capabilities and grants no consent or transition. Drone
  hover/scanner/lens equations remain exact; actual visible vertices fit initial
  and animated poses across variants/races/headings. Focused40 then46/47PASS;
  expanded agent/multiplayer148PASS, static91/lint71PASS. Static90 nullable-role
  type and readonly-test assignment failures retained/corrected. No fresh build
  or browser claim for this increment. Next integrate complete entity selection/
  capture, canonical owners/agent/fleet and atomic gates; entry remains closed.
- Runtimeeea6415 passes committed232 regressions and productionbuild34
  HAjF9PsEvRWj0yZZxC5aR. Official34 and normal/fresh-cold Morrow audits pass;
  both2500ms pauses retain clock/EVA/workshop/nearby creatures, both012 saves
  retain18 old IDs/specimens/seeds and checked finite fleet/inventory/blocks/
  containers/inactive locations exactly. Three screenshots personally reviewed.
  These ordinary load/pause/save checks contain no loose-cargo journey; actual
  drop coverage is vertex/animation and pure capture/lineage tests. No full
  ecology/cache/performance or local-travel claim. All jobs and4338/4339 ports
  drained01:36:48UTC; generated tsconfig restored exactly. Authenticated actor,
  authored/agent/fleet adapters and atomic authority remain next; fullCF6 open.
- Drop/human prerequisites now share the exact old engine scale, animation,
  terrain probe and sex/race/stance height formulas. Conservative drop envelopes
  cover every vertex of643catalog items plus filled Capture Orb under animation;
  complete feet-anchored human bodies reject partial frame intersections. Pure
  full-array drop projection/capture retains outside order/canonical JSON and
  exact unchanged fractional axes, even with identical drops and reordered live
  objects. Host-owned selected-source lineage is mandatory; no saved IDs added.
  Drop-capture-r1:19PASS, expanded drop-human-r2:232PASS, static89/lint70PASS read
  before commit. Earlier CSS-loader harness failure and lint69 unused-import
  warning retained; task-only CSS adapter is not visual evidence. Production
  build/ordinary regression remains next. This is not authenticated actor or
  resource authority, full cross-field capture, cargo gameplay or local travel.
- Runtime001a22e passes committed220 regressions, build33p02aSBKdDZHeS7bFWi-3i,
  official33 and ordinary normal/cold Morrow smoke. Both2500ms pause intervals
  retain clock/EVA/workshop/nearby creatures; both saved012 outputs retain18old
  identities/specimens/seeds and exact checked finite stores/inactive locations.
  Final boat model pose sheet and3browser images personally reviewed. Visual
  script-r1 import path failure and r1 generic creature caption retained; r3
  generates correctly labeled finalsheet-r2. Browser smoke contains no boat
  journey: boat coverage is unchanged-formula/actual-vertex tests plus model
  inspection, not normal docking/travel. Jobs/ports drained; selectors/authority/
  drops/actors remain incomplete, fullCF6/CFV open and CF7 gated.
- Whole sailboat footprints derive from the actual authored model, including
  hull/mast/sail/rails/chest/rudder local rotations, and bound every capped
  bob/pitch/roll phase around exact yaw. Engine delegates unchanged equations
  with the original three clock samples. Vertex oracle spans6headings/5gravities/
  6phases; relationship selection now derives boat sides directly instead of
  trusting a supplied boolean. Vehicle-r1:43PASS, expanded-r2:220PASS and
  static87/lint68PASS read before commit. Production build/browser still next;
  drops/authenticated actor/canonical dependency adapters and travel remain open.
- Pure relationship partition now rejects split live/sleep social labels, leads,
  mounted/boat passengers, configured/host-declared followers and shoulder pets.
  Explicit canonical-owner endpoints are mandatory for POI/legendary/prime/
  summon/settlement/resident/apiary/orb/lair references, including outside entities.
  Historical idle ownership alone does not force movement. Whole outside ropes
  use slab intersection: two outside endpoints cannot hide a segment through the
  selected frame. Relationship-r1 fixture import failure retained; corrected
  expanded-r3:107PASS, static86/lint67PASS. This is not the missing canonical
  owner/boat/actor adapter or authenticated revision/consent proof; no runtime
  travel or browser acceptance is claimed for this unconnected prerequisite.
- Runtime2996e17 passes committed281 tests, static85/lint66 and isolated build32
  L0e24VZjLMmaFCa6zFD5S. Unchanged official32 and ordinary Morrow Continue,
  pause, native SaveQuit and fresh cold reload pass. Both2500ms pause intervals
  retain clock/EVA/workshop/nearby creatures exactly;18 original creature IDs,
  species/specimens/genetic seeds and finite fleet/inventory/blocks/containers/
  inactive locations survive both saves. Three final images personally reviewed.
  Input is an unchanged historical synthetic checkpoint, not new content or
  full ecology/cache/performance acceptance. All owned jobs/ports drained.
  Entity capture/centered bounds/body footprint checkpoint is bounded; complete
  relationship selectors and local-frame travel remain closed and unfinished.
- Shared creature-body formulas now serve the engine and saved-record footprint
  checks, preserving exact adult/baby/phenotype/prime/dragon/leviathan/shade
  geometry and existing live override hooks. Whole contact-body AABBs and known
  roost/work/home anchors reject either-direction boundary intrusion; dragon home
  guards use their actual X/Z area, including diagonal outside-origin overlap.
  Body-r1:136PASS, footprint-r1:23PASS, combined-r2:281PASS; static85/lint66PASS.
  This is physical-footprint coverage, not complete authored/social/lead/agent/
  fleet selection or local travel. Source-bound build/browser check is next.
- Continuous frame bounds now match centered voxel ownership[min-0.5,max+0.5),
  correcting the old half-cell offset before engine integration. Retained
  centered-bounds-red-r1:0PASS/3FAIL proves left-edge valid points rejected and
  right-edge outside points accepted. Corrected54PASS checks every axis/both
  views/all252columns; static83/lint64PASS completed before commit. Integer keys,
  ore pages, resources and accepted runtime remain unchanged. Full body/guard and
  cross-identity selection still required; no local travel opening.
- Repository checkpoint5969ed9/runtimebe0d4b4/build31 independently accepted by
  Wildkeeper23:46:37UTC. Next whole-unit entity capture prerequisite preserves
  exact unchanged canonical axes across known body/roost/work/dragon/boat anchors,
  live/sleep transfers and reordered arrays. Drops have no saved stable ID, so
  host-owned ephemeral source lineage is mandatory; no metadata-based identity
  guessing or saved-schema change. Real naive arithmetic red-r2 changes0.1 to
  0.10000000000000142; r1 was a retained nonexistent-descriptor fixture error.
  Capture-r2:51PASS, including100cold JSON cycles; static82/lint63PASS. Static81
  readonly test mutations retained and replaced with immutable fixture copies.
  This helper is not integrated or a complete collider/guard/POI/agent selector;
  host authority, revision-bound finite changes and ordinary travel remain open.
- Final correctionbe0d4b4 passes committed combined247/static80/lint61 and
  build31z2xopHBtFbwOnGLyxeQ7r. Unchanged official31 and normal browser r2 pass;
  keyboard survey60-to140 retains old60, exact1000J electrical debit/heat gain,
  all other observed machines/equipment/pose exact at the paused boundary.
  Ordinary pointer SaveQuit and fresh cold reload retain the sole canonical
  metadata owner, finite field, inventory/fleet/guests/station history and inactive
  places. Cold rapid Escape now freezes clock/EVA/machines across2500ms, then
  native center mouse SaveQuit succeeds. Custody-r3 PASS; seven final screenshots
  personally reviewed. All browser/preview jobs drained, Windows+WSL4338/4339
  absent23:37UTC. Source fixture is explicit synthetic prior admission, not
  ordinary acquisition/admission/EVA/local-frame travel or performance proof.
  Earlier build30 pointer failures and red tests remain retained. Repository
  checkpoint ready for director review; complete selectors/local travel/fullCF6
  remain unfinished. No CF7, publication or provider action.
- Committed metadata sourcec386a74/build30 passed134 focused checks, official30,
  normal paid60-to140 survey and final cold custody-r2 with one canonical owner.
  Cold rapid Escape exposed a separate delayed pointer-lock grant that resumed
  the engine behind its visible pause menu and intercepted pointer controls.
  Keyboard SaveQuit retained the checkpoint; all failed attempts remain evidence.
  Executable pause-red-r1:1PASS/3FAIL reproduces the race. Late grants now reject
  behind overlays/title/stopped/pending transitions; lock loss synchronously marks
  the overlay guard. Explicit resume and shared simulation semantics retained.
  Corrected pause-r1:125PASS; static80/lint61PASS. Fresh build31 and normal mouse/
  paused-clock/cold replay are still required; no clean UI acceptance claimed yet.
- Repository integration now supports explicit canonical orbit metadata admission,
  atomic catalog/stripped-row checkpoints, normal flat facade save/load, exact
  original-request retry despite hydrated voxel ordering, origin capture and
  new-universe import. Legacy orbits are not auto-migrated. Airlock zone identities
  now import with their rooms; resources/heat/timers/portable cargo remain exact.
  Survey captures newly covered construction without rewriting old asteroid
  records. Combined repository-r1:134PASS; real IndexedDB storage-r3 passes all
  seven admission AND survey fault stages, cold/two-orbit/Home/import custody,
  unknown-extension refusal and valid-checksum orphan/duplicate archive rejection.
  Static79PASS and lint59/60PASS (lint60 finished22:57:48UTC). Retained
  storage-r1 wrong-band fixture and static76/78 fixture
  typing failures; corrected fixture/types, no production validator weakening.
  No fresh production build or normal UI/cold proof yet. Explicit admission is
  repository-only; local-frame engine guard and full CF6/CFV gaps remain.
- Pure per-orbit metadata-owner proposal now rejects duplicate location mirrors,
  stale revisions, omitted prior custody, unknown extensions and wrong field scope.
  All classified fields have explicit physical-vs-view-local disposition without
  opaque metadata rewriting. One-ring scope reconciliation requires new-region
  construction to reach canonical pages before its mirror disappears, retaining
  all prior asteroid records. Record-r4:21PASS; static74/lint57PASS.
  This remains unconnected structural ownership code, not a complete selector or
  persistent catalog. Next repository catalog will be internal UniverseData so
  flat engine saves do not echo stale owner revisions back into storage.
- Station/voxel attachment prerequisites pass combined136 tests (owner-r5).
  Station read models are not persisted registries; metadata proposals use the
  original canonical permissions/replay history, including occupied-dock cargo
  custody. Whole claims/collars/approaches and room/anchor references are checked.
  Retained boundary-r1 red exposed a diagonal outside-approach overlap; full-volume
  intersection replaces the corner-only test. Voxel chunk/index projection and
  merge preserve outside edits; finite ore mirrors strip only after canonical
  page readback and reconstruct on cold projection. Static71 test tuple inference
  error retained and explicitly annotated; static72/lint54PASS. Lint55 was still
  running at commit7cad02f (its premature PASS label is corrected here); it finished
  PASS at22:11:17UTC. Committed7cad02f owner-r6 repeats136PASS.
  No engine/storage/travel integration
  or production/runtime acceptance is claimed for these isolated prerequisites.
- Attached block/pressure projection and merge primitives now retain outside
  components exactly, reject stale/cross-boundary/duplicate-identity state, and
  preserve one pressure counter/flux ledger with explicit gas+heat balances.
  Focused attachment-owner-r3:90PASS; static68/lint51PASS. Retained owner-r1 fixture
  failure (missing process initialization), static67 fixture type error, and
  corrected reruns. Still unconnected to engine/storage/travel. Canonical design
  refined to one orbit-field metadata owner in orbit coordinates, so global
  pressure ledgers and station history are not duplicated among asteroid owners.
- Survey54c02c2/runtimeb3efd23/build29 independently accepted by Wildkeeper.
  Attached-frame prerequisite now covers disjoint252-cell coordinate contracts,
  whole machine/aquarium/pressure rebasing, exact gas/heat/deadline/identity custody,
  real PressureTopology cold hydration, live/sleeping/boat/drop/lead transforms,
  and exhaustive current location-field classification. Expanded82tests PASS.
  A new actual-station-validator test exposed old-location pressure zone IDs
  (zone-binding-r1 red retained); derived zone IDs and airlock references now
  rebase with membership, while molecules/heat/installation identities stay exact.
  No engine/storage/travel imports these new codecs; local-frame refusal remains.
  Canonical owner catalog, complete component selector, durable split/compose,
  all transaction faults and ordinary travel/visual proof are still unfinished.
  No new browser/build/runtime acceptance is inferred from pure prerequisite tests.
- Final survey runtimeb3efd232f84865ac7d2f450668e6c53c6c3a46b1/build29
  ABA8dhdUwNLNbrWF_dRlg passed committed79/static61/lint42-44, focusedUI19,
  unchanged official29 and normal/cold custody-r1. Exact paused1000J debit/heat,
  old60records retained in140, equipment/pose/othermachines exact; cold inventory,
  fleet, inactiveguests/locations and field exact. Final desktop/mobile focus,
  committed pause, depleted instrument and fresh cold images personally reviewed.
  R2 retained one exact-Continue locator timeout (actual accessible name includes
  world title); cold normal Continue and SaveQuit pass. First cold right-click
  only acquired input, second opened the real inspector. No source workaround.
  Both browser jobs and preview drained; Windows+WSL4338/4339 absent20:53UTC.
  Official29 software9.3FPS is NOT performance acceptance. Pose-only synthetic
  setup is not acquisition/EVA-return evidence. Frozen field-survey handoff
  follows; attached local-frame travel/shared regeneration/fullCF6 remain open.
- Survey3151163/build28 jMl6A6sS0jKlukMXr5-yx passed committed79/static61/lint43
  and unchanged official28. Normal keyboard UI survey60→140 asteroids passed
  boundary audit:1000J electricity→1000J heat, all other observed machines and
  paused equipment/pose exact; inventory/fleet/guest states/inactive places exact.
  Desktop/mobile reviewed; narrow keyboard focus outline crowded status text.
  Bounded16px section spacing correction underway, followed by fresh build and
  exact normal/cold replay. R1 evidence retained; fullCF6 remains incomplete.
- Guest checkpoint de50da5 independently accepted by Wildkeeper. Solo ordinary
  Observatory survey now prepares one finite ring, exactly converts1000J to heat,
  commits before runtime reconstruction, and retains an exact retry receipt through
  acknowledgement/hydration failure. Autosave/other transitions cannot overwrite
  a pending candidate; shared sessions are explicitly refused. Focused37PASS,
  expanded79PASS, static59+60/lint41+42PASS; final candidate deep-copy added against
  nested live-metadata aliasing, recheck pending. Real IndexedDB
  seven fault stages plus exact retry/cold/Home-orbit custody PASS. Initial UI-test
  import failed because CSS loader was missing (64PASS1FAIL); existing adapter
  corrected without runtime weakening. Pose-only fixture retains60asteroids and
  existing1000J instrument. Source-bound build/normal UI/mobile/cold replay remain
  pending; separate local-frame travel and fullCF6 remain incomplete. Zero helpers.
- Typed guest checkpoint0f028e7/build27 FbED-5hbZ7V6B5ess6EDS locally verified:
  committed123PASS/static58/lint39+40/build27/unchanged official27PASS. Fresh native
  two-browser protocol5 accepts six ordinary till/plant/fill/pour/insert/remove
  actions exactly once. Normal savedr3/058 and freshcold/008 pass exact onehoe/seed
  debit, returnedvessel/tome, hostinventory/fleet/inactiveplaces/claims and23625voxel
  checks. Final six images personally reviewed, no captured browser errors;
  jobs/ports drained. Early cooldown-suppressed seedclick/observer timeout retained,
  no duplicate request/debit. Synthetic stagedboard/finiteguestkit, NOT progression,
  cargo or comprehensivepeer/performance acceptance. FullCF6 continues.
- Bucket-corrected00d9787 passed committed111/static56/lint38/build26 and official26.
  Real two-browser r2 connected protocol5 and accepted five semantic operations;
  withdrawal exposed same-frame Shift/stale guest shelf cache. Red12PASS1FAIL
  retained, correction now uses immediate modifier and public block count while
  host retains actual tome authority. Expanded r6:122PASS1FAIL (new shelf test
  PASS; old Wayworks presentation fixture omitted its machine location scope).
  Matching-scope fixture plus explicit foreign-scope rejection now gives123PASS
  (r7), static58 and runtime lint39 PASS; final fixture lint40/build27/fresh replay
  pending. Both browser attempts, saved partial state and failures
  retained; preview/browser drained. No full compatibility/CF6 acceptance.
- Typed guest runtime5020c6f's committed97PASS was followed by actual-handler
  guest-liquid-red-r1 10PASS/1FAIL: a credited bucket fill left its tracked source.
  Build25 intentionally stopped before acceptance; output/failure retained. Shared
  local/host/guest source clear-rebind correction now passes111 focused/liquid
  tests (guest-interactions-r4) and static56. Final lint38/commit/build26/browser
  still pending. Synthetic multiplayer board/finite kit is explicitly disclosed;
  it is not normal progression or resource acquisition evidence.
- Generation checkpointc7793d accepted by Wildkeeper; frozen manifest1dc33745.
  Required guest-compatibility continuation now adds host-derived till/plant,
  bucket fill-pour and shelf insert-remove transactions; guest inputs no longer
  optimistically mutate those resources. Protocol5/lanes reject older clients.
  guest-interactions-r1 87PASS/r2 97PASS with actual host resource/rejection and
  transport replay tests. static54 test-only enum/liquid annotation errors retained;
  static55/lint37 PASS. Final committed build25/browser checks pending. No new
  helpers, local-frame unlock or fullCF6 claim.
- Generation routing3303e56, build24 rqxUHoGs1fb9ld9453Vha: committed112PASS,
  static52/lint36/build24/unchanged official24 PASS. Expanded synthetic field
  browser normal ice mining/save/fresh cold passed exact canonical page/claim,
  pickaxe248->247, Home/fleet/inventory/metadata audits (expanded-custody-r2).
  Four screenshots personally reviewed; software-rendered3.6FPS sample is NOT
  performance acceptance. Jobs/ports drained. Fixture-helper seed mismatch stop
  retained; corrected bounded helper passed. Source-bound packet under
  CF6/r14-asteroid-frames/generation-checkpoint. FullCF6/CFV remain incomplete;
  normal unlock UI, attached-frame travel, cargo recovery and typed guest adapters
  plus explicit old-client protocol/capability cutover remain required.
- Director accepted the bounded orbit runtime and peer correction at34b884e.
  Next generation slice routes persisted expansion into ChunkWorld/cache/worker
  and public host snapshots, infers canonical non-low asteroid bands, and rejects
  invalid reset state before disposal. Worker protocol2 refuses old workers.
  generation-r1 retained3expectedFAIL; r2 41PASS; r3 112PASS, including actual
  worker byte equality and cold expanded-field depletion. static52/lint36 PASS.
  Source-bound build24/official/browser evidence pending; ordinary expansion
  unlocking and attached-metadata local-frame travel remain unfinished/closed.
- Director review held asteroid acceptance for a concrete host-peer overwrite
  gap. New actual-handler red r1 reproduced build-only rock overwrite, mixed
  cells, missing material intent and rejected selection mutation (2PASS/4FAIL).
  Bounded engine correction preflights every cell, exact one-item object shape,
  authenticated actor and duplicate cells before any resource mutation.
- Peer r5 134PASS; static51 PASS. Native door/gate toggles, real-wrench window
  rotation, normal one-item bed/door placement and typed machine/pressure paths
  retained. Raw unfunded soil/seed/bucket/bookshelf after-images now fail closed;
  their typed guest adapters remain unfinished full-integration work. Earlier
  missing-host-identity/bed-stack/type-only fixture failures retained. Final
  lint/committed build/official smoke pending. Generation routing's three expected
  red tests are preserved separately; no runtime generation changes yet.
- Peer correction2f76f9a final committed-source r6 134PASS, static51/lint35 and
  isolated build23 P87GhMOQKiW9kgSFNJ6ED PASS. Unchanged official23 cold-saved
  orbit smoke PASS; screenshot personally reviewed, health10/rig energy exact,
  canonical copper hole still targets y42. No captured browser error files.
  Preview21858 stopped; all owned jobs/helpers drained. Source/evidence handoff
  in CF6/r14-peer-correction; director acceptance still required, fullCF6 open.
- Connected geometry checkpoint9b236bf/runtime3c5c95b/build18 is frozen and
  director accepted; evidence remains unchanged in CF6/r14-connected-geometry.
- New universe-owned asteroid fields migrate ordinary orbit edits and project
  canonical depletion before chunk hydration. Nearby Field-Wrench host discovery,
  claim and independent build/extract grants now use normal inventory/tool rules.
  Multiblock human/peer/drone mutations check all relevant claim cells.
- asteroid-runtime-r3: 50 combined tests PASS; r1's three fixture/oracle failures
  retained and corrected. static46 PASS. Final static/lint/build/browser pending.
- Broader asteroid-runtime-r4: 73PASS/1FAIL found the existing sealed spaceflight
  machine catalog missing from custody validation. Added the same authoritative
  spaceflight catalog used by placement; retain this red receipt and recheck.
  Initial build19 at6dfd449 passed, but final corrected build/browser is pending.
- Preliminary normal browser build19 caught an omitted HUD admission path: rock
  discovery opened the overlay but the mission payload still required a nearby
  ship. Preserved r1 screenshot013/save015; stopped preview/browser/build20.
  Both HUD/text consumers now share a tested current-mission accessor that admits
  the active asteroid inspector without a ship. Build20 cancellation retained.
- Separate engine asteroid local-frame travel remains fail-closed until attached
  metadata has one owner. Runtime field expansion/full CF6/CFV remain unfinished.
  See docs/ASTEROID_CUSTODY.md and CF6/r14-asteroid-runtime/PLAN.md.
- Final runtime313c8a1/build22 YvEMSfzfwuhoh5vp-SyzD:74 focused tests, static49,
  lint33, UI3, unchanged official22, seven-stage actual-IDB fault/import/retention,
  mining-custody-r2 and cold-custody-r1 PASS. Normal r2 claim/trusted-public grants,
  copper/slate mining and one finite dirt placement survive fresh r3 cold load.
  Exact two pickaxe durability uses/one dirt debit, fleet/Home, canonical pages,
  station claims and cold machine/pressure/facing/terrain metadata retained.
  Desktop/mobile/focus/labels personally reviewed; all jobs/ports drained.
- No loose-cargo conservation claim: fixture lacks Tether Spool and normal
  pickup rejects; three observed Raw Copper are absent in finalr2, while one
  Moon Slate remains through cold. Ordinary drift/expiry is an inference only.
  Fixture changes only initial pose, not supplies/terrain; no normal travel claim.
  No publication/deploy, phase completion, new helpers or evidence cleanup.

## Celestial Frontiers CF6 — station kit integration

- Habitat b96771f/build16 checkpoint frozen separately: actual natural eclipse,
  second normally crafted tray recovery, CO2-limited conversion and exact cold
  gas/heat/material custody. Manifest9d0fa4f records28 Git-blob sources/188 evidence
  files and4 preserved roots. All earlier failed receipts retained, no fullCF6.
- Revision14 connected geometry in development: neighbor-derived Reinforced
  Window roof/wall/corner panes, six-face resource-compatible pipe/cable arms,
  chart immediate-selection transition removed. Initial48 focused tests PASS;
  cable envelope red and test-only reader typing failure retained. Build/browser
  visual verification and normal edits/cold reconstruction pending.
- Build17/0ba8d7b passed and cold habitat showed flat ceilings/upright walls;
  immediate chart selection is readable at desktop/390px. Personal visual review
  found glass-box ghost seams and off-center machine socket gaps. Follow-up uses
  two-sided glass surfaces and reusable exact-socket elbows, preserving stores.
  Fifty expanded tests/static43/lint27 pass before final low-wall-corner refinement;
  final runtime/browser/custody evidence remains pending.
- Revision14 runtime3c5c95b/build18 verified:50 focused tests, static44/lint29,
  official18b and final cold custody PASS. Personally reviewed seamless flat roof,
  both upright wall axes, exposed/rejoined frames, all four transport families,
  exact socket elbows, port/rotation/remove/replace and cold saved connections.
  Mobile390px no overflow; EVA HUD still occludes upper view. Synthetic-only,
  finite ordinary actions; mined pipe loose cargo expired/absent after normal
  EVA recovery and is not claimed conserved. FullCF6 remains open; geometry
  source-bound manifest/handoff is separate from accepted prior habitat evidence.

- Browser-r1 crafted/placed all four parts from finite raw inputs, measured a
  breathable142m3 room, exhausted/recharged a paid observatory, and transferred
  the radiator's finite40kJ into the room. Disable retained33650J; reenable
  exhausted it without electrical/coolant consumption. Saved173 is retained.
- Actual seating exposed a collision trap: the bench's seated feet lay inside
  its half-height box. Red engine regression reproduced it; bench now follows
  ordinary non-solid stool policy, retaining explicit zero sealing. Radiator
  stored heat/thermal limit and chart layout/selected-hover contrast corrected.
  Focused rerun and corrected-build cold replay pending; no eclipse claim.

- Added append-only craftable station hull/bulkhead/bench/greenhouse (708–711),
  authored held/world/icon presentation and usable seating. Sealed panels use
  ordinary culled chunk meshes; open furnishings use bounded scene models.
- Explicit seal policy separates open flight hardware from pressure walls.
  Greenhouse converts finite CO2 only under real daylight/sky exposure; radiator
  cooling uses measured room/exterior/unknown boundaries and finite imported heat.
- Station readings aggregate only authorized physically present local rooms and
  stores. Observatory refresh atomically spends 1 kJ into heat for filtered
  read-only System/Orbital charts, without requiring a spacecraft.
- Integrated station-kit-r5:84 PASS; static-r39 PASS. Earlier frozen test-fixture
  mutation failure corrected; all failed receipts preserved. Lint/build/browser
  and occupied endurance are pending; this is not full CF6 acceptance.
- Fresh chart helper completed four nonoverlapping files/12 tests; one fresh
  endurance helper owns only a new test file. Parent retains runtime, shared
  integration, builds, Git and browser. Full remaining CF6/CFV and CF7 gate persist.

## Celestial Frontiers CF6 — placement preflight correction

- Strict station cold-custody audit caught a real rejected-placement side effect:
  the engine wrote a solid block, notified world/pressure observers, then restored
  air on collision. Validation now reads proposed cells before any mutation,
  preserving exact door/furniture collision geometry and rejecting either local
  or remote occupancy before edits, facing, machine creation or inventory debit.
- Three actual-engine red regressions became green; strengthened four-case suite
  also proves a clear original room and thin-door geometry. Combined station,
  pressure and world suite passes 196 cases. Three old world fixtures now specify
  Home-only biomes, an actual Home context, and non-player-facing paired door
  uppers; failed receipts remain available. Static-r34 caught a test-only Item
  type annotation, corrected to ItemCode. Static-r35/lint-r22 and exact b2d2404
  build-r14 (SfYIsDbP4KPDiBT0XfR4h) plus unchanged official-r14 pass.
- Previous station67284ba build-r13/lint-r21/official-r13 passed. Normal desktop
  and390px UI, name/icon/association/grants, physical collar registration and
  duplicate/unplaced rejections passed. Fresh normal-input browser-r2 (75 actions)
  and custody-r3 now pass on the unchanged synthetic input: rejected placement
  leaves exact original inventory/edits/facings/room gas/heat, then normal window
  removal/collar placement spends one collar and one pickaxe durability, retains
  the drifting window drop, and preserves registry14/two collars through cold074.
  Fleet/Home exact; health10, finite suit oxygen/scrubber. Custody-r2's incomplete
  gas equation omitted the controller's existing66.192L inert and paid16171J
  heating; retained failed oracle/receipt, corrected full-system balance passes.
  Desktop/mobile/cold images personally reviewed; all owned preview/browser jobs
  drained and4338/4339 absent. Exact handoff: CF6/r13-stations/HANDOFF.md.
  No fullCF6, sustainable habitat, crafting, clear docking approach or real-peer
  acceptance claim. All browser/preview jobs from that first replay are drained.

## Celestial Frontiers CF6 — independent station console and service grants

- Station-only intents now use registry revision and intact-core reach without a
  nearby ship. Name/icon, members/association, grants, habitat refresh and cabin
  controls render independently. A normally placed, owned collar can be registered
  nearby without generating or debiting a second block; stale/duplicate/remote
  requests reject and finite machine/fleet/inventory stores remain unchanged.
- Shared pressure admission uses the airlock or life-support grant plus machine
  owner/trust. Pressure-only peers receive an allowlisted presentation without
  private inventories, reservoir contents, channels or trusted IDs. Open, reject,
  transact and sync share that projection; revocation closes access. Guest view
  reconstruction retains its marker/installation and real hardware capacity.
- Red grant regressions1pass/3fail retained; console28PASS, first grant/runtime34PASS,
  combined53PASS and focused-r3 84PASS. Final human/agent batch85PASS and
  static-r33PASS. Lint-r20PASS before final agent adapter; final lint/build/browser
  still pending at this source checkpoint. Correct inspector .tsx tests included
  in53/84; an earlier nonexistent .ts argument was omitted by Node, not tested.
- Noah explicitly approved standing Wildkeeper coordination; recovery/progress
  message sent12:30UTC. No publication/deployment/spend scope changed. FullCF6
  remains incomplete: remote membership and typed station/travel authority,
  Waylink, complete kit/seals/operating loop and other full-scope packages remain.
- Browser input is a hash-bound derivative of retained co2-r1/050 with exactly
  one empty Orbital Dock added to an empty inventory slot. No world/ship/pose/
  pressure/equipment changes; not crafting proof. Original untouched. One failed
  final suite receipt reflects a missing agentBuildJobs test-harness map; adding
  the normal empty map produced85PASS without weakening the authority assertions.

## Celestial Frontiers CF6 — revision13 recovery and full continuation

- Explicit97%weekly resume replaces the old50%pause; director privately owns
 92/94/97 action gates. Same primary/integration/local-only preservation bounds.
 Source-backed recovery: Morrow birth and restore now share surface population
 accounting (Slatefin/Owl generic-family reclassification reproduced red2/4).
 Unnamed owned creatures also retain non-natural status (red1/6 reproduced).
 Full specimen metadata and budget-cost assertions retained, not dropped.
 Canonical fixture repair retains unchanged Home generation under distinct
 universes and uses blockwild/morrow for actual lunar transitions; red3/7 to13PASS.
 Integrated64PASS including final unnamed-owner guard; static-r30/lint-r19 PASS.
 Runtime b121c16 isolated build-r12 SDNk794Q0RNnzEeCmWobL/official-r12 PASS.
 Normal original138 copy SaveQuit14, Continue/unload19, pagecoldreload23,
 finalSave33/close34: strict stable metadata for all16originals (includingpool),
 exact fleet/inventory/edits/wayworks/facings, finite O2/scrubber and health10.
 TargetMoon2,0 absent14 but persisted19 and33 withheight33; all5oldbelowworld
 specimens ordinarilyregrounded. Final17includes1legalbirth; generatedcache
 276to256 with157oldkeysabsent is explicitly disposable, notallpreserved.
 Three screenshots personallyreviewed; no capturedbrowsererrors. Testbrowser
 andexactpreviewdrained. Recoveryevidence inCF6/r13-recovery, fullCF6unaccepted.
 Real IDB cache lifecycle PASS: automatic oldest-write-recency pruning to256,
 permitted266 between prune batches, clone-before-await and unload/commit/cold
 edited-voxel equality. Retained103missing keys are all oldest-prefix,93newv2;
 SaveQuit does not cache every still-loaded chunk. No cache source rewrite or
 manual delete; prior failed receipts/frozen originals unchanged. FullCF6 follows
 this safety checkpoint, not reduced to it. Fixture helper andreadonlystation
 audit completed;0active. Nextindependentstationconsole/grants integration:
 nearbyshipdependency andprematurecontainerpermissioncoupling documented.
 Cross-taskprogressreport blockedbyappapproval; specificuserquestionpending,
 no retry/workaround, localworkcontinues underunchangedauthority.

## Celestial Frontiers CF6 — revision12, first transaction checkpoint

- Director-approved bounded cache correction: focused-r34 reproduced12 failures
  in16 tests (wrong outgoing keys both directions, invalid-scope epoch mutation,
  v1 cache eligibility and8 invalid spawn supports); stale callback/boundary
  controls passed. Reset now validates first, invalidates old work early, disposes
  with outgoing scope/seed/options/edits, then installs incoming scope. Derived
  terrain-location-v2 ignores poisoned v1 entries without deleting them. Native
  Morrow support and Owl refuge scans require integer in-world ground plus two
  clearance cells. focused-r35:48PASS/3FAIL (unchanged legacy location-runtime
  fixtures use unsupported bare morrow body ID); all16 new regressions PASS.
  focused-r36 bounded44PASS; static-r28/lint-r17 and green historical-column
  cache-correction-r1 PASS, y33.5 and old-v1 rejection. Exactdad6640 build-r11
  vLaqMvaj7J7EOxeZKRpM4/official-r11 PASS; legal fresh Lantern y34.5. One normal
  cold copy retained16 original specimen identities and ordinary restoration
  regrounded all5 invalid creatures, plus2 legal births. Exact fleet/inventory/
  edits/wayworks/facings. Strict audit remains partial: three Slatefin naturalPool
  fields normalized to underground, persisted target2,0 row absent,103 original
  disposable keys absent from test cache (immutable originals intact). Initial
  locator/command/name-collision failures retained; no follow-on repair. Both
  screenshots reviewed. Save013/close14; all jobs drained, ports4338/4339 absent.
  Director budget-drain ACK: paused checkpoint, no new work or automatic resume.
- b4d529d build-r9/official-r9 and normal cabin-r4/r5 interaction custody PASS:
  old east window rotated, upper-door inspection and nearby habitat refresh,
  exact facing/link persistence, original fleet/inventory/gas/heat retained.
  Late unscrubbed CO2 crossed the breathing limit; not sustainable habitat.
  Repeated pause-menu hit-test diagnosis found aligned desktop/mobile targets;
  normal mobile SaveQuit twice succeeded, including scrolled return. Earlier
  transition/pointer failure retained; no unsupported layout patch. The actual
  oxygen-rich CO2 failure was mislabeled HYPOXIA; small warning-only correction
  keeps exposure/damage/custody unchanged and explains CO2 removal or sealed O2.
  Exact838d27b focused-r32 61PASS/static-r27/lint-r16/build-r10/official-r10 PASS.
  Normal co2-r1 desktop5/mobile8 warning and finite-suit recovery44 reviewed;
  strict browser-co2-warning-r1 PASS exact inventory/fleet/room custody. First
  quick equipment sequence cancelled the required1.5s unsafe-air swap; sequential
  resumed swaps completed normally. Save50 retains recovered finite gear, not a
  scrubbed room. Director hold: no new large integrations/helpers until cleared;
  CF6/CFV remain incomplete. Owned preview/browser closed; checkpoint handoff.
- Exact851b875 build-r8/official-r8 PASS. Cabin-r3 normal battery attachment,
  door entry/closure, controller enable and suit-free breathing PASS. Save335/
  cold344/save347 strict browser-cabin-pressure-custody-r1 PASS:99.311kPa,
  health10 without helmet/back, exact600LO2+2400Linert custody and electrical
  heating with0.154J rounding. No ship resupply. Oxygen feed empty; CO2 grows,
  so this is not sustainable-habitat proof. Screenshots314/326/330 reviewed.
  First r2 browser startup raced preview readiness and is retained as failed.
  Visual review found the east blueprint window edge-on; new facing records
  align windows, with normal wrench rotation for existing structures. Upper-door
  inspection and station administration from inside a sealed cabin are repaired;
  focused-r31 33PASS. Failed-r29 frozen fleet mutation was a test setup error;
  r30 exposed an invalid synthetic pressure-zone ID. Static-r25 found the
  publisher's missing optional-facing signature; it now reuses the actual
  BlockAction edits type. Static-r26/lint-r15 PASS; fresh build/browser pending. FullCF6
  remains incomplete.
- Exact a20dd9e build-r7/official-r7 PASS. Normal cabin-r1 built42 physical
  blocks, preserved door12kJ and placed the disabled finite controller at its
  real socket, rotated south with the wrench. Desktop14/mobile17 reviewed:
  fixed close header stays visible;390px has no overflow. SaveQuit195 retained.
  Same-frame Shift+use opened the inspector before the crouch pose updated;
  placement now consults live Shift keys as well as pose. Focused-r28 19/19 and
  static-r24 PASS; failed-r27 lacked an empty lead registry in the test stub.
  Battery attachment and finite room breathing remain unverified.
- Exact97d56f4 build-r6/official-r6 PASS. Normal browser-station-r1 founded the
  finite deck, docked the original ship, renamed/trusted/public-dock configured,
  SaveQuit49/cold54 retained exact custody; strict browser-station-custody-r1 PASS.
  Undock59/redock61/leave62/save67 also observed. Desktop/mobile screenshots
  personally opened; focus wraps both directions, width390 has no overflow.
  Header scrolled out of reach; source now keeps it outside the scrolling body.
  Empty deck has no gas/power; sealed station breathing remains next, not passed.
- Added a finite cabin-shell blueprint:37 stone/2 windows/1 door/1 truss,
  preserves packed door stores and leaves a real north-wall controller socket.
  Focused-r24 33/33, static-r23/lint-r12 PASS. Broader-r25 44/45 failed because
  the geometry test omitted the controller capacity annotation; corrected
  focused-r26 45/45 PASS, including real engine placement and flood-fill geometry.
  Three finite packed machines disclosed in a separate cabin
  fixture; no room/gas/ship state injected. Actual breathing remains unverified.
- Station foundation/docking checkpoint now consumes the real finite kit,
  places ten physical blocks, persists a location-owned claim, moves the original
  ship into a registered collar and blocks launch until undocked. UI exposes
  name/member/independent grants/measured habitat links. Focused-r20 44/44 and
  static-r22/lint-r11 PASS; broader focused-r22 99/99 PASS after updating the
  explicit hardware recipe roster (failed-r21 retained). Real IDB station-storage-r1 passes all seven injected
  checkpoint boundaries plus docked archive remapping; gas/machines remain bound
  to the imported location. Corrected r2 encodes negative-z chunk boundaries and
  repeats all eight PASS; focused-r23 42/42 includes exact dock pose/zero drift.
  Browser station construction/pressure still pending.
- Asteroid helper revised the pure contract to bounded schema2 pages covering
  every maximum-field voxel, lossless schema1 migration, expansion with retained
  depletion/claims and an indexed read snapshot;14tests/strict/lint PASS. It is
  not yet the terrain/save/edit authority. No live shared-view extraction claim.

- Exact8f44fc8 build-r5/official-r5 PASS. Normal browser-return-r2 rebuilt the
  Morrow pad from all nine carried tiles, boarded without a console, piloted
  ascent, reached Morrow orbit/Home orbit/Home surface and disembarked healthy.
  Strict browser-return-custody-r1 PASS: original ship/cargo/modules/hull/crew,
  three route costs once, original berth, exact final saved ship;30Lfuel/45Loxid/
  45.928LO2/133.456kJ remain. No return resupply or replacement ship staged.
- Jar-r3 normal release and cold reload preserve exact name/health/genetic seed,
  progression/capture history/exposure/work, one world owner and one empty jar.
  Both strict receipts PASS; second SaveQuit pointer interception is retained,
  not claimed successful. Screenshots personally reviewed. Perch audit found
  Morrow Owl missing from bird eligibility; focused-r19 36/36, static-r19 and
  lint-r9 PASS after correction. Station/asteroid runtime/rescue/maps/typed
  authority and natural ecology browser gates remain; no fullCF6/CFV claim.

- Exact6d91ce6 build-r4/official-r4 PASS, indoor release screenshot confirms
  floor32.5 rather than roof36.5. Strict storage comparison exposed changed
  progression/genetic seeds; source now preserves those through real spawn,
  serialize and restore. Normal equipped EVA reboarding exposed an erroneous
  console prerequisite; nearby boarding now retains host/location/access/stale
  gates without needing a console. Full return remains unproven. Shared Lantern
  relationship policy now explicitly names jar-only relocation, not Orb bonding.
  Retained failed focused-r15/r16 and browser attempts; fresh checks pending.

- Exact249e093 build-r3/official-r3 PASS. Ordinary synthetic lab jar craft,
  capture and cold custody passed; release exposed a real roof-teleport bug.
  Bounded local Morrow release grounding now rejects blocked/unknown footprints;
  incomplete pressure suits warn before damage. focused-r14 30/30, static-r17
  PASS; fresh visual recheck pending. Original flight fixture lacked pressure
  jacket/leggings, so normal surface-return remains unproven, attempts retained.
- Station policy helper plus primary real-air-zone integration check supplies
  strict per-location grants, dock ownership, replay and receipt contracts;
  12 focused policy tests PASS. Physical station/runtime/save/map integration
  remains next; this policy checkpoint alone does not complete stations.

- Rebuilt9d812ae normal browser-r3 now reaches Morrow orbit/surface and EVA;
  SaveQuit082-storage retained. Cockpit/third-person/mobile/focus fixes personally
  reviewed, official-r2 PASS. No new resource/ship state staged after first craft.
- New Morrow ecology integrates all four authored rigs and bestiary portraits,
  regional budgeted spawns, sealed native bodies, persisted finite Owl veil and
  roost flights, real non-destructive regolith movement, crafted pressure-only
  specimen jars with exact identity. focused-r11 41/41 and lint-r5/static-r14 PASS;
  fresh build and ordinary ecology/capture/return browser remain next. Station,
  asteroid custody, rescue, maps/agent/multilocation authority still open.

- First normal synthetic-profile craft/deploy/load/board/consent/abort/relaunch,
  piloted ascent and actual orbit arrival observed at582f994. Midflight
  SaveQuit/page reload retained identity, exact metadata-bearing cargo and paid
  costs. Evidence CF6/browser/browser-r1; final orbit checkpoint103-storage.json.
  The unchanged official client passed its execution but reproduced real hull
  occlusion. Visual review found first-person shell, tight chase framing,
  fallback Hopper icon and mobile gauge wrapping. Corrected source adds local
  cockpit interior,8.2-block chase,11 icons,2-column gauges, modal focus/feedback,
  accurate orbit HUD label and a temporary fail-closed occupied-origin guard.
  focused-r6 22/22; focused-r7 27/27; static-r11/lint-r4 PASS. static-r10 caught
  private-field access in the new test; corrected using reflection. Fresh build
  and normal visual recheck pending. Four Morrow rigs helper7/7/lintPASS, not yet
  live species/ecology. Full station/asteroid/Morrow/maps/return scope remains.

- CF6-B/C source checkpoint: distinct hardware/Hopper crafts, real bio-oil and
  refined rocket fuel recipes, paired finite gantry debits, normal host mission
  deploy/cargo/board/consent/abort/relaunch controls and persisted pilot timing.
  Parked cabins consume O2/power; authored capsule/ten hardware models integrated.
  Actual orbit/Morrow generation and worker location scope replace Home terrain
  at these destinations; five named regions/resources/sites, no Home fauna.
- Focused-r5 62/62, static-r9 and scoped lint-r3 PASS. Integrated host tests use
  staged machines/ingredients; production visual/normal-input proof is pending.
  Earlier r4's one failure expected old Ice rather than new Mineral Frost;
  corrected named-material expectation, retaining the failed receipt.
- Still required within CF6: complete stations/permissions/docking/asteroid edit
  custody, rescue, four Morrow creatures/ecology/capture, full maps/agent paths,
  full normal journey and visuals. Source checkpoint is not CF6 completion.

- CF5 accepted at4dda43e/runtime8e601fa; frozen evidence unchanged. CF6 full
  spacecraft/orbit/station/Morrow/return dispatch ACKed; CF7 not authorized.
- Added one universe-owned ship table and strict finite-resource/cargo/crew
  contracts. Production arrival shares the CF1 IDB journal; failed or uncertain
  commit keeps origin paused, blocks autosave and supports exact retry/reopen.
- Initial focused33/static checks pass; real browser15 storage scenarios pass
  with all seven journal fault stages and five phase cold-resume cases. Fixtures
  explicitly stage ships/resources; these are not normal craft/launch claims.
- NEXT: normal pad/supply/mission/interactive ascent and authored ship visuals,
  then real station/asteroid/Morrow/return integration and full CF6 evidence.
  Full peer/soak gates remain CFV. No deployment, real-save changes or deletion.

## Celestial Frontiers CF3 - 2026-09-19 (local development checkpoint)

- Fifth back slot, all15 named gear/supply entries, finite oxygen/charge/scrubber and exact tank sockets integrated across inventory, character/held models, save/network/drone custody. Normal Home inventory equip/refill/socket/service browser actions passed; rig240L/60kJ/1800s checkpoint retained under CF3/browser. Service-panel clipping found and corrected; desktop visuals reviewed.
- Survival HUD, interruptible swaps, separate hazards, finite6axisEVA, crouch/contact boots, location anchor/reel and six-block cargo pickup implemented. Respawn exposure/line reset and cursor/grid death custody covered. Host finite-supply crafting uses staged ingredient custody, nearby-table/revision validation, and rejects replay.
- Focused-r7:75/75pass; final visual-routing-r9:15/15pass, including all15 first-person authored models. Final productionbuild-r5, TypeScript and scopedlint pass. Earlier159/160 broad run failed only on a CSS import in UI tests; stylesheet moved to globals and targeted7/7rerun passed. Failed checks/drafts retained.
- Normal root-route browser controls prove finite thrust/inertia, missing helmet damage, timed back replacement/socket insertion, oxygen depletion and120Lrefill, filled Dive Harness rejection, crouch/contact boots, anchor/reel, aimed cargo recovery and smoothroll without velocity changes. Exact consumed gas/charge and health survive a fresh-context reload. Official skill client reached gameplay without errors. Desktop HUD, service panel, rig/spell/dive character visuals reviewed; final built390pxHUD/captions fit without overlap and first-person tank/rig framing is corrected and reviewed. Test-admin stages synthetic location/camera only; deterministic elapsed-time hook accelerates depletion and is not a real-time soak. No release/real-save/Rust changes; CF1/CF2 deferred gates unchanged.

## Celestial Frontiers CF2 - 2026-09-19 (local development checkpoint)

- Shared frozen environment policies, persistent universe/body clocks, bounded Kepler ephemeris, phase-aware Three.js bodies/rings/aurora and enclosure occlusion are integrated. Space instances use deterministic authored orbital bands; orbital skies remain vacuum rather than inheriting a planet's atmospheric color.
- Shared gravity reaches player/creature/projectile/drop/swimming/debris/boat paths. Zero-G player contact push and inertial motion are real; saved player/drop/creature drift belongs to the location. Host snapshots carry validated catalog and coarse universe time. Equipment and pressure compartments remain later packages.
- Current evidence: TypeScript-r3, 18-file lint-r2, focused-r4 151/151 and final policy/save-r5 17/17 pass. Equal impulse over0.3s rose1.30 blocks on Home and2.23 on Morrow; orbit retained [2,1,-0.5] for1s; keyboard Space contact push produced [0,3,0]. Clock12345.5 and velocity survived cold reload after writer-lease expiry. Reviewed Home/Morrow/Orison/Aerie/roof screenshots and official web-game client gameplay; no recorded browser errors.
- Retained failed drafts include overly strict floating-point assertions, an initially wrong moon-side/ring orientation, pre-RAF/occluded screenshots and an expected reload lease denial. These are not passes. See ignored CF2/README.md for evidence and scope limits. Full CF1/CFV regression/build/mobile/retention/multiplayer/performance gates remain deferred, not waived. CF3 proposal covers back slot, actual O2 equipment/refilling/alarms and EVA; not implemented at this checkpoint.

## Celestial Frontiers CF4 resume - 2026-09-19

- Revision10 explicitly resumes full CF4 without a time cutoff; director privately monitors half-new-usage boundary. Earlier cutoff notes are historical. Exact89986 recovery accepted: isolated production build, normal finite charging/controls/break-replace/cold reload and official client. All recovered evidence is frozen under CF4-resume-20260919/recovery-manifest.json.
- Full-machine work continues under CF4-resume-20260919/development/PLAN.md. Primary owns additive resource stores, recipes, runtime, UI and typed operations. Two bounded helpers own cached topology and authored models only. No real saves, release, Rust, cleanup or CF5 start.
- 17:49UTC:20machine models/kernel integrated,12processor recipes debit exact inputs/power, finitefuel/pump/storage/7upgrades and normalinspector added. Initial32kernel+13machine/integration tests pass; integratedTS passed beforelaterWaygrid wiring. Independent pure-moduleaudit found fractional item starvation, signalcharger bypass and metadata alias; fixes and regressions added. Combined60test receipt retains one obsolete passiveport-negative assertion (corrected), not a pass. Guest/agent semantic operations, final visual proof and fullCF4handoff remain open.

## Celestial Frontiers CF4 - 2026-09-19 (bounded checkpoint, full phase unfinished)

- Revision9: Home power loop with integerjoule buffers, finite cell transfer, sixface inspector and authored procedural models. Full roster/dependencies accounted in task-local CF4/ROSTER.md; user contract docs/WAYWORKS_POWER.md.
- Primary integrated engine/data/save/placement/removal/sharedUI. Isolated helpers delivered kernel/models/UI; all stopped. Cleanup preservation review accepted an empty deletion list.
- Focused49tests pass after updating explicit WorldSave field count91→92; fullTypeScript and scopedlint pass. Productionbuild and normalgameplay visualpass pending at this entry.
- Continue from CF4 evidence and current director report. No general polish, release or full-CF4 claim. Fixed11:21UTCdrain/11:31UTCpause controls.

## Celestial Frontiers CF1 - 2026-09-19 (partial verification deferred)

- Scope: revision 4 location identity, real IndexedDB universe authority, exact legacy backups, runtime/wire ownership and normal player recovery. Home only; all additional locations in validation are synthetic. Fixed pause11:31:05UTC September19 or<=5%remaining. No release or provider action.
- Visual thesis: retain the field-journal/brass game shell; persistence feedback is quiet during play and explicit on failure.
- Content plan: existing world catalog and gameplay remain primary; one compact state line reports opening/migration/checkpoint/error, with retry and recovery export in the existing pause/catalog surfaces.
- Interaction thesis: Save & Quit waits for durable commit; failure keeps the session open; browser-close warnings expose unsaved work without claiming unload can finish an asynchronous save. Existing transitions and focus behavior remain, without decorative new motion.
- Evidence so far: identity/catalog 7 focused tests, ownership 3 focused tests, 14 real-IDB diagnostic groups and two-page lease takeover pass. All integrated game/connected-wire/visual gates remain pending. Actual browser quota proof is deferred to the UI boundary under the accepted bounded replan; reported CDP quota alone is not a pass.
- Lifecycle batch: 30 focused world/cache/map/renderer/drone/edition/migration tests pass, including identical coordinates and late A-B-A callbacks. Drone inventories and reserved build materials are now location-owned durable fields; normal disconnect retains them. Unknown additive legacy metadata survives engine serialization. Test-admin travel calls the real atomic transition/load path; normal players still see Home only. Full browser transition, wire, mobile recovery, quota and final regression gates remain open. Early web-game loading screenshots are retained but not accepted as gameplay visual proof.
- Wire batch: protocol4 transport and protocol2 agent messages require a canonical location admission stamp. Scope revision is fixed for a connection, separate from live action revision. Wrong-scope/epoch/revision and changed-intent replay checks pass in113 focused tests;68 guest-admission/runtime/storage/stability checks also pass. Official game client reaches the synthetic placement gallery with no recorded errors; latest screenshot reviewed. Real connected peers, all-field roundtrip, normal/mobile recovery, quota, retention, full regression/build remain pending.
- Real-peer smoke: human host/guest CONNECTED, normal chat and manual title-to-game entry, scoped block action/negative packets and shared-chest duplicate/changed-intent item conservation. Found and fixed initial guest-shell entry and older checkpoint lease overwriting a concurrent renewal. Final connection lasted312707ms through saves, then host Save & Quit committed revision39;guest catalog remained empty;zero pageerrors. TypeScript-wire-r6 and93focused/11lease checks pass. User prioritizes forward expansion: multiplayer matrix now stopped; agent extension/mobile/long stability explicitly unverified. All browsers closed06:47:38UTC; await director sequencing amendment and minimum save-integrity checkpoint beforeCF2.

## Wiki scrolling and Creative-mode polish - 2026-08-03

- Active request: restore reliable scrolling throughout the dedicated wiki; make Creative worlds consistently invulnerable and empty-starting; provide complete searchable access to every player-facing item; add Minecraft-like Creative flight; and allow a saved world's Creative/Survival rules to be changed from the title-screen world catalog before loading.
- Acceptance source: the current prompt is preserved verbatim in the ignored `work/acceptance/` directory and must be deleted only after every requested validation passes.
- Visual thesis: retain Blockwild's field-guide and brass workshop language, using visible, bounded scroll regions for the archive and a compact rules editor for saved worlds.
- Content plan: treat the wiki as a fixed-shell archive with independently scrollable navigation and reader panes; treat Creative as a coherent ruleset spanning authority, persistence, movement, inventory, HUD messaging, and multiplayer-safe state.
- Interaction thesis: every long wiki surface scrolls under mouse, touch, and keyboard; world-mode changes are explicit before load; the Creative catalog searches the canonical item registry; double-tapping jump toggles flight, jump ascends, and crouch descends.
- Wiki repair: the route now owns a fixed-height shell with bounded, independently scrollable desktop navigation/index/reader panes and one vertically scrollable mobile workspace. Entry changes reset the reader to the top; visible scrollbars, touch momentum, overscroll containment, and explicit mobile width constraints prevent both the original dead scroll and horizontal article clipping.
- Creative rules: new Creative worlds start with 36 empty slots, keep health/hunger/oxygen normalized, ignore direct and creature damage at local and host-multiplayer authority boundaries, do not generate hostile player aggression, and recover from the void without a death event. Existing Creative saves keep their earned inventory.
- Catalog and movement: Creative now derives 523 player-facing items from the canonical 537-entry registry, excluding only retired migration artifacts. Search covers names, ids, use/tool/equipment/rarity, placed blocks, and presentation families. A deliberate double-tap of Space toggles collision-aware flight; Space/Shift move vertically and Ctrl accelerates, with visible HUD and onboarding guidance.
- Save rules: the world catalog exposes an explicit Survival/Creative editor before load. Changes update catalog and saved-document mode atomically, preserve edits, inventory, and options, normalize vitals when entering Creative, and remain reversible.
- Verification checkpoint: native TypeScript, changed-file ESLint, whitespace validation, 137 focused wiki/Creative/storage/engine tests, 75 multiplayer/authority tests, the 537-entry presentation audit, and the Next/Webpack production build pass. The official game client and a responsive exact-runtime browser audit prove desktop index/reader scroll, mobile workspace scroll, top reset, empty Creative start, catalog search, actual flight ascent, and reversible save-mode editing with zero browser errors; six reviewed screenshots live in ignored `work/visuals/wiki-creative-live/`.

## Seam, item-presentation, and Cardforge pack-opening release - 2026-08-02

- Active request: eliminate remaining visible ground/water seams at chunk boundaries; audit the complete item registry and replace unjustified fallback world, held, and inventory presentations; redesign Cardforge pack opening around a centered, click-through physical reveal with clear new-card feedback; validate and publish one exact release to GitHub, Vercel, and Sites.
- Acceptance source: the current prompt is preserved verbatim in the ignored `work/acceptance/` directory and must be deleted only after every requested validation passes.
- Visual thesis: preserve Blockwild's field-journal materials and block-built identity, while making each card reveal feel like a single deliberate tabletop moment rather than another inventory grid.
- Interaction thesis: the unopened lineup establishes pack order; one card occupies the visual focus; each click advances exactly one reveal with restrained lift/turn motion, tactile audio, and immediate ownership state such as NEW or duplicate count.
- Seam diagnosis: the late-neighbor geometry handoff was already atomic, but biome tint was owned by individual faces. Water and terrain could therefore meet without a literal gap while still exposing chunk ownership as a hard color line. Terrain tint is now averaged at world-space vertices, so both chunks produce byte-identical shared-edge colors; water, ground, hidden-face, and late-neighbor regressions pass.
- Item presentation audit: all 537 catalog entries now resolve a semantic inventory icon and a non-empty held/drop model. Solid blocks use atlas-ready voxel geometry, 2031 authored mesh parts replace the old generic world-drop cubes, and immutable per-item drop templates share geometry/materials for bounded runtime cost. `npm run audit:items`, the exhaustive item test, crafting/avatar tests, and TypeScript all pass.
- Cardforge reveal: a committed pack now opens into a modal tabletop sequence with one centered card, a sealed/revealed lineup, click or right-arrow progression, rarity-sensitive light, authoritative first-owned `NEW` labels, live owned totals, a final collection summary, keyboard/reduced-motion support, and responsive layouts for desktop, short screens, and 390 px phones. The existing deterministic five-card order and optional sixth Wildlight bonus remain host-owned; presentation cannot reroll or alter custody.
- Manual visual review: the official browser audit was inspected at 1440×900, 760×620, and 390×844. The opening card, five-card progression, automatic post-open launch, final summary, all 537 inventory icons at both production sizes, 18 held-item socket examples, and the flowing-water world scene are overflow-free and console-clean apart from expected blocked canonical favicon requests in the network-restricted local browser.
- Verification checkpoint: all 1,082 TypeScript gameplay/content checks and 10 rendered-page/audio checks pass, alongside native TypeScript, changed-file ESLint, whitespace validation, the 537-entry presentation audit, and the final Next/Webpack production build. Browser acceptance covers the flowing-water seam scene, every inventory icon at both production sizes, 18 held-item socket examples, and the Cardforge reveal at 1440x900, 760x620, and 390x844; publication is gated only on committing this exact validated tree and proving that same SHA across GitHub, Vercel, and Sites.

## Field Archive screenshot gallery and main protection - 2026-08-01

- Active request: preserve nine supplied v1.12.0 in-game captures as dated repository assets, use them selectively to make the public README more representative of the playable game, and protect GitHub `main` from accidental deletion.
- Visual curation: the title-screen capture is the repository hero; eight additional captures form a compact two-column gallery covering exploration, timber physics, survival workstations, the World Below, cartography, the Living Bestiary, skills, and Cardforge.
- Provenance: source PNG bytes are preserved exactly in `docs/assets/screenshots/2026-08-01-field-archive/`, with descriptive filenames, dimensions, SHA-256 hashes, capture date, and release context recorded beside them.
- Safety boundary: GitHub confirms `main` is the repository's default branch, so both the web UI and Git-reference API refuse its deletion until an administrator deliberately changes the default branch first. Repository rulesets and classic branch protection are unavailable while this personal repository remains private on its current plan; changing visibility was deliberately left as a separate owner decision.
- Validation checkpoint: all nine repository copies are byte-identical to the supplied PNGs, and the focused public-readiness suite verifies that the hero, gallery, dated provenance record, and production-size assets stay connected.

## MIT and public repository release - 2026-08-01

- Active request: release Blockwild under MIT, add maintainable CI checks, make the GitHub repository publicly legible and technically compelling, validate the exact result, and synchronize GitHub, Sites, and Vercel.
- Licensing: the former evaluation-only boundary is replaced by the standard MIT text in `LICENSE`, with matching package metadata, contribution terms, README language, and a regression check that prevents the public identity from drifting back into contradiction.
- GitHub automation: CI now separates static/generated-content checks, the complete deterministic suite, and the Vercel production build; CodeQL, pull-request dependency review, weekly Dependabot updates, and CODEOWNERS provide ongoing maintenance and security coverage.
- Portfolio evidence: the README now leads with the playable release and a source-derived scope snapshot, then explains how canonical registries connect simulation, persistence, the Bestiary, wiki, Cardforge, tests, and deployment. `docs/ENGINEERING_OVERVIEW.md` provides a concise reviewer path through runtime ownership, deterministic saves, bounded streaming, multiplayer authority, agent capabilities, validation, and exact-SHA release engineering.
- Validation: 261 focused pretest checks (including the two new repository-contract checks), 10 rendered-page/audio checks, and all 823 gameplay/content checks pass. Native TypeScript, zero-warning native ESLint, generated wiki/art drift checks, YAML parsing, whitespace checks, the Vercel production build, all five Vinext stages, and the packaged Sites Worker/manifest validation pass. The Vercel build retains two non-fatal pre-existing webpack circular-chunk warnings; no new runtime code was introduced in this release.
- Release contract: publish one exact commit to GitHub, independently build that SHA for Sites, and verify both public endpoints and Vercel provenance before reporting completion.

## v1.12.0 Field Archive - 2026-08-01

- Active request: make the repository public-ready, improve canonical creature representation in Cardforge without adding runtime 3D or inefficient arbitrary art, unify the in-game item reference and a maintained public `/wiki`, clean the public documentation, validate the complete result, and publish one exact commit to GitHub, Sites, and Vercel.
- Shared knowledge: `wiki-content.ts` now projects the live item, creature, plant, and biome registries into 855 stable entries plus ten maintained system guides. The website lazy-loads a compact index and per-category shards; the game retains exact `?` item lookup and can hand creature/flora entries into personal discovery records.
- Discovery boundary: the website documents stable rules and ecology without revealing locked Bestiary research, variants, or character-specific progress.
- Cardforge identity: standard cards stage canonical portraits in ten habitat treatments. Thirty-eight selected Full Art creature scenes are rendered offline from the exact production models, average roughly 82 KB, and replace anatomy-drifting creature backgrounds; three authored non-creature scenes remain.
- Public hygiene: the root README is concise and current, ROADMAP no longer presents the v1.3 boundary as the present roadmap, and new architecture, development, contribution, security, MIT license, and asset-provenance documents make ownership and release expectations explicit.
- Release validation: 259/259 focused pretests, 10/10 rendered-page and audio checks, 823/823 gameplay/content checks, native TypeScript, zero-warning ESLint, whitespace validation, responsive browser acceptance with zero console errors, and both production build targets pass.

## Cardforge and Kinship integration - 2026-07-25

- Active request: cleanly merge `tcg-cardforge` into `main`, preserve the independently released Kinship Accord capture/bonding system, validate the combined runtime, and publish one exact merge commit to GitHub and Sites.
- Merge strategy: retain Kinship's normalized Bestiary capture entry and capture-route diagnostics while awarding Cardforge's first-species-capture printing in the same authoritative capture transaction. Preserve both feature histories and exclude local `.blockwild-agent/` session metadata.
- Integration regression: the real Capture Orb engine path now proves one successful capture increments the normalized Kinship Bestiary entry and grants exactly one idempotent Cardforge species printing to the same local keeper.
- Final validation: 19/19 Cardforge-focused checks, 37/37 focused capture/orb-safety/multiplayer/persistence checks, 259/259 standard pretests, 10/10 rendered/audio checks, and the complete 1,069/1,069 TypeScript gameplay/content suite pass. Native TypeScript, whole-repository ESLint, whitespace validation, and all five verified Vinext production stages plus Worker/manifest validation pass.
- Browser acceptance: the official deterministic game client loaded the combined `CARDFORGE-AUDIT` world and emitted matching paused-world text state with no error artifact. The desktop Binder and 390×844 responsive Binder were manually reviewed; reviewed Full Art cards load, filters remain legible, mobile controls fit without page-level overflow, and the post-load browser console reports zero errors.

## v1.11.0 Kinship Accord - 2026-07-24

- Active request: implement and validate `docs/CAPTURE_ORB_AND_CREATURE_BONDING_SIMPLIFICATION_PROPOSAL.md`, then publish the exact validated `main` commit to GitHub and Sites.
- The normal Capture Orb is now the only obtainable custody tool across ordinary fauna, monsters, butterflies, Lightning Bugs, Honeybees, fish, and sea slugs. Legacy cages, lens orbs, and species stock decode safely, normalize once, preserve exact specimens, and provide one summarized migration notice.
- Aggressive capture keeps the visible 40%-health/one-heart route as the predominant fallback. Break Its Tempo (two distinct committed-action evades plus three seconds clear) and a four-second undisturbed Calming Offering are optional, host-owned routes into the same ten-second ready state.
- Capture never silently tames. Creature Camp now exposes Stabilize, Nourish, daily Connect sessions, explicit Form Bond, policy-specific exceptions, and companion-only commands/attunement. The Bestiary keeps authored research depth while showing Seen/Captured/Bonded state and basic capture rules immediately.
- Connected keepers can explicitly transfer a bonded companion through an offer-and-accept transaction. The host revalidates source ownership, recipient consent, expiry, exact orb identity, deployment state, and pack capacity before atomically moving the companion and rewriting canonical plus compatibility ownership records.
- Fixed-size diagnostics report capture attempts, successes, readiness routes, blockers, rehabilitation transitions, transfer, and legacy migration classes without adding background scans, free-form text, or unbounded logs.
- Release validation: 245 standard pretest checks, 48 focused capture/inventory/storage/multiplayer checks, 10 rendered-page/audio checks, 823/823 gameplay/content checks, native TypeScript, zero-warning ESLint, whitespace validation, manual model-sheet inspection, and all five verified Vinext production-build stages.

## Cardforge TCG full implementation - 2026-07-24

- Active request: implement the complete approved `docs/BLOCKWILD_TCG_CARDFORGE_PROPOSAL.md` on `tcg-cardforge`, including complete content coverage, acquisition, collection/custody, Card Dex, decks, packs, town matches, UI, persistence/migration, host-authoritative multiplayer, deterministic layout, testing, build/browser verification, review, and one unpushed implementation commit.
- Correction checkpoint: the proposal-only commit was superseded before it happened. The proposal was briefly staged, then returned to an untracked worktree file. No history rewrite was needed.
- Acceptance contract: do not stop at planning or a vertical slice; preserve world-save compatibility; keep card mutations host-owned and revision/idempotency checked; ship with existing deterministic portrait assets; do not generate production art; verify focused tests, full tests/build as appropriate, browser state/screenshots, and final diff before committing.
- Completed the full catalog and deterministic presentation layer: all 231 live mobs plus authored support cards resolve into 253 definitions and 775 immutable printings across three sets, with complete guild/type/rarity/variant/finish coverage, stable collector numbers, existing creature portrait fallbacks, bounded layout audits, and an optional future illustration-key replacement path.
- Completed host-owned acquisition and custody: tutorial/starter claims, deterministic five-card boosters, Cardwright stock, dungeon/vault and boss rewards, first-species capture printings, physical/archived duplicate holdings, three archive tiers, loose-card container tokens, deck locks, atomic reciprocal trade escrow, value-limited economy simulation, persistence normalization, quarantine diagnostics, and idempotent claim/revision guards.
- Completed the playable game: legal thirty-card Open/Core decks, deterministic mulligan/draw/energy/three-lane turn flow, ten structured keywords, NPC legal-action planning, six town opponent identities with settlement-scoped 2–4-seat selection, first-win rewards, replay logs, hidden-hand projections, 90-second turn clocks, 120-second reconnect grace, peer challenges, and protocol-versioned host-authoritative TCG intents/projections.
- Completed the integrated UI and progression: physical Cardforge items, Binder/Dex/Decks/Packs/Market/Battle/Exchange/Guilds/Rules surfaces, duplicate and set completion filters, pack reveal sequencing, deck legality feedback, battle targeting, responsive 390×844 presentation, plus eight authored chapters each for the Cardwrights and Waytable Circuit.
- Verification is complete. The standard pretest matrix passed 256 checks; rendered/audio checks passed 10/10; the complete gameplay/content tail passed 822/822; Cardforge-focused tests pass 16/16; native TypeScript, changed-file ESLint, whitespace validation, all five Vinext production stages, and packaged Worker/manifest validation pass. The repository's Bash wrapper cannot launch on this machine because WSL has no distribution, so the exact Vinext build and post-build test commands were run natively on Windows.
- The official browser client and a longer-timeout DOM probe exercised seeded Binder custody, selected-card mulligan into live play, a committed five-card reveal, the rules surface, and the 390×844 responsive view. Screenshots were manually reviewed; page and console errors are zero and measured mobile page overflow is zero.
- Final TODO: optional future ImageGen illustration replacements remain deliberately outside this implementation and must preserve immutable card rules/layout keys. No required Cardforge implementation work remains before the requested local commit.

## Cardforge Wildlight Full Art follow-up - 2026-07-24

- Active request: add a genuine Full Art chase tier with generated backgrounds, a broad launch roster, complete pack/catalog/UI integration, verification, and an unpushed commit on `tcg-cardforge`.
- Art direction: created and manually reviewed twelve original Blockwild scenes at 768×1152 across Wildroads Core, Halls & Hearths, and Vaults Below. The roster deliberately spans common and rare wildlife, a migration event, cultural leaders, a guild hall, places, dragons, leviathans, and a legendary watershed being. Production assets live under `public/cardforge/full-art/`; every Full Art printing is required to resolve there.
- System design: Full Art is a new rules-identical variant with an etched finish, generated edge-to-edge illustration, Wildlight acquisition tag, 5× reference modifier, distinct full-bleed deterministic SVG/DOM layout, and Binder/Dex filtering. Existing Showcase, foil, capture, and boss-signature identities remain separate.
- Pack design: the original five deterministic rarity slots remain guaranteed. A host-authored 1.5% Wildlight roll may add a sixth Full Art bonus card, never replacing a base pull; the bonus is sorted to the final reveal. Merchant singles remain ordinary printings, so Full Art circulation begins through sealed product and then uses the existing host-owned custody/trade ledger.
 - Final verification: 19/19 Cardforge checks, 259/259 standard release-pretest checks, 10/10 rendered/audio checks, and the full 1,063/1,063 TypeScript suite pass. Native TypeScript, changed-file ESLint, whitespace validation, all five Vinext production stages, and packaged Worker/manifest validation pass. The official browser client and a persistent DOM probe exercised the Cardforge audit world at 1280×720 and 390×844; Full Art assets load at 768×1152, the filtered Binder and inspector show the full-bleed treatment, body/shell horizontal overflow is zero, and page/console errors are zero.

## v1.10.2 Combat, traversal, caves, and distant world - 2026-07-22

- Active request: fully implement and validate `docs/COMBAT_TRAVERSAL_CAVE_VISIBILITY_PROPOSAL.md`, release version 1.10.2, and publish the exact validated commit to GitHub and Sites.
- Acceptance contract: reliable shared melee contact behavior; 2x direct-hit horizontal knockback, stronger hurt audio, and a controlled hop; visual interpolation over ground steps; deterministic full-footprint river-bank cave entrance safety; underground celestial/background correctness without rewriting voxel lighting; a visual-only Basic Render Distance tier with `simulation <= render <= basic`; focused/full/performance/browser validation.
- Initial state: `main` at `83240bd`; the proposal document is the only untracked file. Implementation is proceeding phase-by-phase with the proposal's acceptance matrix as the release gate.
- Combat checkpoint: contact attacks now share one body-aware acquire/commit/active envelope across selection and hit validation, plant their feet during alignment/windup, track bounded target motion, require facing/vertical overlap/line of sight, and distinguish hit, dodge, obstruction, and invalid cancellation. Player impacts use the requested 2x horizontal recoil with expanded caps, a grounded 3.8-velocity hop, reduced water response, and one louder mixed hurt cue. Focused combat/engine tests pass.
- Traversal checkpoint: each ground mob now owns an authoritative collision root and a separate presentation root. Valid one-block snaps accumulate the inverse visual offset and settle monotonically in about 0.18 seconds; recovery teleports clear it. Model renderers, pathing, combat authority, saves, and network coordinates continue to use the unsmoothed root.
- Cave and sky checkpoint: surface mouths resolve one deterministic alternative site only after validating the complete padded footprint for water, low banks, and relief; generation and cave graph connectors consume that same descriptor. Wet river-bank roofs receive additional lateral protection. Propagated skylight still drives voxel illumination, while separate direct-exposure, enclosure/depth, and sparse celestial rays now drive an eased cave backdrop that can become fully dark.
- Basic-distance checkpoint: settings now enforce `simulation <= render <= basic` with desktop 10/8/20 and resource-light agent/touch fallbacks. A single low-priority module worker builds capped multiresolution water-aware surface heightfields and sparse depth-local cavern silhouettes outside full chunks; the main thread installs at most two non-interactive draw calls and retains the last complete mesh under load. Generation/upload time, queue state, stale/cancel counts, triangles, calls, and bytes are exposed in telemetry. Native TypeScript and 161 focused tests pass, including new proxy geometry bounds.
- Swimming-bob hotfix complete: v1.10.2 keeps its responsive first surface breach, deep ascent, sprint multiplier, and low-bank exit while the held-Space maintenance arc now averages 1.194s/1.208s/1.215s at 30/60/120 FPS (about 3.5x the former cadence). All three deterministic runs keep the breathing point above water and oxygen at 12; the official browser audit loaded the authored swim basin without console or page errors and its screenshot was manually reviewed.

## v1.10.1 Seamwake swimming and chunk presentation - 2026-07-22

- Active request: remove temporary visual differences at chunk boundaries while neighboring chunks load; replace the near-surface held-Space equilibrium with Minecraft-like repeated swimming strokes that let the player's head breathe, bob naturally, briefly breach, and climb a low bank without walking on the water; publish v1.10.1 to GitHub and Sites.
- Initial diagnosis: worker-generated chunks are currently eligible for meshing before their boundary-light reconciliation finishes, so baked vertex light can briefly disagree across the new seam. The current swim controller intentionally damps a held swimmer toward a small negative surface-tread velocity after one breach, which explains the reported submerged equilibrium and weak shore recovery.
- Reference behavior: Minecraft's official Update Aquatic notes make sprint the underwater swimming transition, while Mojang's 18w15a notes explicitly prioritize smoother transitions into and out of swimming. Blockwild will keep its existing continuous Space ascent control, but model the surface as a stroke/recovery cycle governed by water thrust and air gravity instead of a positional or velocity clamp.
- Swimming implementation: held Space now runs a 0.62-second submerged stroke/recovery cycle. A 0.14-second breach preserves a modest upward crossing velocity, 13.5 blocks/s² of continuous surface recovery produces the return arc, and another stroke cannot arm until the head is submerged and the cooldown is complete. Release still rearms immediately; crouch diving, entry momentum, sprint's exact 1.2 vertical multiplier, oxygen, and the stronger forward bank exit remain intact.
- Streaming implementation: worker and restored chunks now complete boundary-light reconciliation before any section mesh can become eligible. Each arriving vertical section also waits on the matching already-rendered neighbor edge rebuild, making the old/new swap atomic rather than briefly showing a stale face, AO band, or light field beside the corrected side. A bounded orphan-blocker recovery prevents interrupted/unloaded mesh work from stranding a section.
- Cache implementation: terrain cache namespace v5 includes cached signatures for the complete 3 x 3 edit halo. Adjacent or diagonal edits that can affect edge faces, corner AO, or level-15 light now invalidate the derived presentation without forcing every ordinary warm-cache lookup to rehash edit maps.
- Verification checkpoint: native TypeScript and 114/114 focused liquid/world tests pass. The repeatable 720 + 720-frame streaming benchmark ends player-ready with zero queued generation/light/mesh work and zero pending seam-presentation sections; cold update average is 4.64 ms with 7.11 ms p95, and warm backtracking retains a two-frame maximum readiness delay.
- Final release gate: native TypeScript, changed-file ESLint, whitespace validation, all standard pretest matrices, all five Vinext production stages plus Worker/manifest validation, rendered HTML/audio checks, 819/819 gameplay and content tests, and the exact-runtime swimming audit all pass. The final 1280 x 720 underwater scene is console-clean and was manually reviewed after the v1.10.1 build.
- Breathing-height hotfix: the held-stroke controller now measures signed eye clearance with a bounded four-cell waterline probe and reverses the descending arc at 0.34 blocks of clearance. Across deterministic 30, 60, and 120 FPS runs, the breathing point stays above water with full oxygen while the body remains substantially immersed; the first breach, ordinary deep ascent, crouch dive, sprint multiplier, and bank exit are unchanged. Native TypeScript, changed-file ESLint, whitespace validation, the official web-game client, all standard pretest matrices, all five Vinext build stages, rendered HTML/audio checks, and 819/819 gameplay/content tests pass.

## AI Companion Drone Platform - 2026-07-21

- Active request: fully implement `docs/AI_COMPANION_DRONE_PLATFORM_PROPOSAL.md`, verify every promised behavior or explicitly document a deliberate tradeoff, then publish the exact finished commit to GitHub and Sites.
- Acceptance contract: phases 0-7 and the proposal's requirement traceability table. The normal human game must remain playable without an agent, TTS key, or special runner.
- Initial state: clean `main` at `2fe6d7c`; GitHub and Sites were synchronized before implementation. The unrelated active `codex/water-physics-fixes` worktree remains untouched.
- Current phase: Phase 0 architecture and fixture audit. TODO: typed shared contracts, host capability authority, command executor, agent UI and drone representation, deterministic work commands, tasks/memory, TTS routing, telemetry, manuals, browser QA, release audit.
- Phase 0 complete: added dependency-light command/result/observation/chat/voice/task/diagnostics contracts, strict bounded validators, host capability authority, terminal replay cache, work leases, four-agent admission, chat throttling, public-save normalization, and merged-interest planning. Added repository skill, full manual/recovery/command references, JSON schemas, runner notebook/TTS/browser helper, and secret-free environment template.
- Phase 0 gate: 12/12 focused agent-platform tests pass; native TypeScript is clean; all JSON schemas parse; `git diff --check` is clean apart from the repository's existing Windows line-ending notice. No runtime behavior changed in this phase.
- Phase 1 complete: migrated manual WebRTC to explicit protocol v3 labels and added a bounded ordered voice lane isolated from gameplay. Agent identity now carries runner metadata and least-privilege capability requests; the host owns approval, capability toggles, pause/resume, mute, revoke, stop, four-drone admission, connection binding, reconnect checkpoints, and lease cleanup. Added sequence-normalized/rate-limited human and agent chat, an in-world Enter chat HUD, multiplayer chat inbox, and a host drone authority panel. Chat remains inert untrusted dialogue and cannot mutate authority or acquire leases.
- Phase 1 gate: 119 focused agent/platform/multiplayer/authority/UI tests pass with jitter, multiple peers, reconnect replay, spoof rejection, voice-lane routing, malicious chat, and legacy fixture coverage; native TypeScript and whitespace validation pass.

## Moonbough settlement repair - 2026-07-20

- Reclassified Moonbough Leaves and Moonwells as glowing cutout surfaces. Their transparent atlas pixels remain intact, while adjacent logs, walls, and other full blocks retain their touching faces instead of being culled.
- Added a permanent `MoonboughChairItem` inventory identity and explicit block alias. Breaking or collecting a Moonbough Chair can no longer resolve through numeric id 173 to a Lava Bucket.
- Rebuilt settlement furniture placement around one local room coordinate system. Rotated houses now rotate their doors, chairs, tables, workstations, and other decor together; authored beds use the correct north/east/south/west foot and head pair.
- Expanded the compact Moonbough living home to a minimum 7 x 7 footprint, kept its entrance aisle clear, moved its chair behind the central table, and oriented its bed toward the rear interior instead of into a wall.
- Distributed same-role residents across eligible buildings, assigned clear interior floor anchors, and tagged generated settlement residents with exact authored interior heights so runtime grounding never promotes a furnished center to its roof. The same correction applies to every faction.
- Derived the Wood Elf perimeter gate facing from its actual north/east/south/west entrance and selected the matching rail axis. The related Deepgear Webspinner service bay now rotates with its forge interior as well.
- Added the Moonberry Cookie as a complete trail-bake family: four cookies from Wheat-Moonberry-Wheat, five food points, dedicated inventory-scale pixel art, a decorated shared held/drop model, and a reversible nine-cookie Moonbough storage crate with bespoke baked-goods atlas faces. Packed cookies retain the established ten-item trade-value premium.
- Verification: native TypeScript, repository ESLint with zero warnings, whitespace validation, the exact Vinext production build, all pretests, 783 broad gameplay/content tests, and 54 focused Moonbough/world/theme/farming/economy tests pass. The official production-browser client loaded the remote Wood Elf origin and the cookie inventory audit without console/WebGL error artifacts; screenshots were manually reviewed for visible leaf-adjacent walls, clear door approaches, terrain-level residents, legible real-slot/held cookie art, and exact nearest-filtered cookie-crate atlas faces.

## Player-first streaming follow-up - 2026-07-20

- Active request: analyze `blockwild-performance-2026-07-20T05-14-07-674Z.json`, fix intermittent failure to render the chunk occupied by the player, make further significant optimizations, verify continuous exploration, and push `design-1`.
- Initial telemetry finding: the first streaming rewrite successfully reduced the end-of-capture rolling frame average to 16.75 ms (59.69 FPS), but the 227-second run ends with generation empty while 93 visible chunks are still waiting for initial light and 61 sections are waiting for meshes. Lighting alone averages 4.20 ms/frame at the end, proving the remaining symptom is primarily stage/priority backlog rather than terrain generation.
- Acceptance contract: the player chunk and its current vertical section must preempt farther initial-light and mesh work; queue priorities must be recomputed after new entries are enqueued; stale active work must be safely resumable; diagnostics must expose current-chunk readiness; deterministic terrain, packed lighting, and geometry parity must remain exact.
- Implementation checkpoint: terrain and initial-light tasks now pause/resume across re-centering, light and mesh selection compare live distance instead of trusting enqueue order, and the player's current vertical section plus supporting section define an explicit readiness state. A bounded critical path follows generation -> lighting -> height-relevant meshing until that state is drawable, then returns to the existing fair background rotation.
- Mesh amplification fix: a newly generated neighbor now remeshes only sections that were already rendered (or were mid-build). Previously it dirtied every occupied section even when the first queued build had not started and would already see the neighbor, manufacturing redundant backlog during travel.
- Deterministic 720-frame stress result at one chunk per 72 frames: player-not-ready time fell from 590 to 132 frames, average transition readiness fell from 55.75 to 13.2 frames (76.3%), maximum fell from 67 to 22 frames (67.2%), and completed transitions rose from 8 to 10. P95 world-update time remained approximately 10.1 ms. Focused regressions also prove resumable two-chunk lighting is byte-exact after preemption.
- Production-browser checkpoint: the first high-frequency audit exposed an orphaned mesh entry that could wait for the periodic three-second rescan. The critical lane now self-heals only the occupied chunk's current and supporting sections each frame, and it can bypass unrelated urgent edit meshes. Two fresh 24-second traversals covered 65.6 and 63.8 route blocks; each observed just one 250 ms unfinished sample and then readiness, versus the reproduced 2.75-3.5 second gap. Both ended ready with zero console/page errors, and the final coast/ocean frame was manually reviewed with continuous terrain.
- Final verification: all standard pretests pass; the complete TypeScript gameplay/content run passes 780/780; rendered metadata and audio pass 10/10; native TypeScript, scoped zero-warning ESLint, whitespace validation, all five Vinext production phases, manifest/Worker validation, focused deterministic streaming benchmarks, the official web-game client, and two repeated production traversal audits are clean. Evidence is under ignored `work/streaming-followup/`. TODO: none.

## Patchy river and sea flora - 2026-07-20

- Replaced the axis-aligned aquatic fertility/species cells with separated, rotated, softly lobed fertility islands and jittered nearest-bed species territories. Rivers use tighter pockets while coasts, oceans, deep oceans, and Lumen Trenches breathe across progressively broader beds.
- Kept every public habitat species weight unchanged and centered each habitat's new density multiplier on its prior average spawn chance. Local twelve-percent species intermixing and all vertical growth limits remain intact.
- The production browser audit now uses the real submerged-flora planner rather than hand-arranged rows so future visual checks exercise natural placement.
- Deterministic 160 x 160 audits land at 18.7% river, 17.4% coast, 23.4% ocean, 26.1% deep-ocean, and 33.7% trench coverage against the former 18/18/24/26/33% targets. Two-axis support rises to 57-93%, proving patches have area rather than single-cell lines. A conservative radial broad phase keeps the exact generator's isolated 3 x 3 world gate at 840 ms.
- The final exact-runtime browser review shows separated dense flora islands on both sides of open navigable seabed, with no console/page error artifact.

## design-1 streaming integration - 2026-07-20

- Integrated the latest GitHub `design-1` head into `main` without moving or deleting the design branch. The merge brings in resumable chunk generation, lighting, and meshing plus bounded high-distance streaming priorities.
- Preserved the dedicated Moonfelt Mycelium texture correction through the overlapping world/engine merge.
- Release verification is clean: native TypeScript, repository-wide ESLint, 109 focused world/lighting/performance/theme checks, the exact production build, and all 778 broad gameplay tests pass. The official browser client exercised the built artifact with movement, reported the resumable streaming stages through `render_game_to_text`, produced no console error artifact, and its gameplay screenshot was manually reviewed.

## Moonfelt Mycelium texture correction - 2026-07-19

- Replaced Moonfelt Mycelium's accidental shared Glowmoss Carpet cell with a dedicated opaque atlas tile. The new muted lavender substrate uses wrapping fungal grain and hyphae without a grassy top, directional border, or transparent plant silhouette.
- All six cube faces share the same tile so floors, walls, ceilings, inventory models, and multi-block builds remain visually consistent. The deterministic placement gallery includes a 2 x 2 seam swatch for browser review.
## Ordinary ocean flora redesign - 2026-07-19

- Active request: establish a small set of attractive dominant ocean plants, greatly reduce glowing flora across ordinary oceans, add restrained diversity, and guarantee clean vertical joins under the adopted handcrafted-voxel-naturalism theme.
- Visual brief: `output/ocean-flora-redesign/BLOCK_VISUAL_BRIEF.md` defines Brinegrass and Sailkelp as matte ecological staples, with Featherwrack and Pearlfan as less-common accents. Lumen Trench remains the deliberate bioluminescent center.
- Implementation checkpoint: four append-only waterlogged block ids and inventory cuttings are registered with dedicated 16 x 16 atlas cells, distinct aquatic mesh profiles, bounded column growth, replanting, harvesting, creative access, and Plant Compendium entries.
- Generation checkpoint: ordinary Ocean weights are now 94% Brinegrass/Sailkelp and only 1% luminous flora; Deep Ocean is 89% staples and 0.5% luminous; coast is 82% staples and 1% luminous. Seven-cell habitat patches create coherent beds with sparse local intermixing instead of one-cell visual static.

## v1.8.1 held-light and input hotfix - 2026-07-19

- Diagnosed the held-light failure as a boundary regression from the voxel-lighting rewrite: the dedicated local PointLight still existed, but terrain's shader-backed `MeshBasicMaterial` no longer consumed it. Added one shared moving held-light uniform for terrain while retaining the PointLight for dynamic meshes and leaving propagated placed light, chunk dirtiness, and the nearest-source accent pool untouched.
- Corrected the shared avatar torch from a forearm-aligned shaft to an upright hand-relative grip. Main- and offhand first-person torches remove that articulated-arm counter-rotation and retain the preferred 180-degree camera-facing reversal.
- Added a two-event pointer-lock reacquisition quarantine and strict overlay/lock checks so cursor-recenter movement accumulated over inventory panels cannot become a delayed camera rotation.
- Matched waterlogged flora's implicit-water face visibility to ordinary water, suppressing hidden faces against opaque floors and walls while retaining open surfaces and seamless stacked water.
- Added focused regression coverage for exact third-person shaft direction, first-person reversal, moving-light uniforms, pointer-lock delta quarantine, solid-adjacent aquatic seams, and existing stacked-water continuity. Final focused model/world/lighting coverage passes 85/85; native TypeScript, repository-wide ESLint, verified five-phase production build, artifact validation, and the broader release suite are clean.
- Official and directed Playwright passes exercised the exact production artifact. A first browser gate exposed and fixed a conditional Three.js shader variable; the rebuilt opaque, transparent, and waterlogged permutations compile with zero console/page errors. Manually reviewed first- and third-person screenshots show the restored reverse FP presentation, an upright third-person torch rising from the forward fist, and terrain/character illumination. A delayed post-inventory check retained yaw/pitch at exactly 0/0 after 2.5 seconds.

## Hearthlands & Frontiers implementation - 2026-07-19

- Active request: completely integrate `work/settlement-heartlands-and-origin-proposal.md`, including functional faction-guide directions to seed-derived settlements beyond loaded chunks, and publish the verified release to GitHub and Sites.
- Release contract: one pure deterministic settlement index must own generator placement, off-map guide/map lookup, road nodes, and settlement-origin resolution. Existing generator-16 saves remain pinned to the legacy scattered layout; new worlds use the semantic heartlands profile.
- Visual thesis: the new-world controls should feel like a compact cartographer's folio embedded in the existing handcrafted field-kit UI, with presets carrying the hierarchy and mathematical tuning kept subordinate.
- Content plan: settlement-pattern preset; optional fine tuning; enabled cultures; origin choice and resolved public-arrival preview; compact explanations for disabled or impossible combinations.
- Interaction thesis: preset changes coherently update semantic controls; origin results resolve asynchronously without freezing seed entry; rumored/charted settlement markers fade into the existing map and Wayfinder without revealing terrain.
- Acceptance focus: a faction guide at an isolated POI must locate the nearest qualifying faction settlement through the seed index, create truthful limited map knowledge, and later match the exact settlement generated at that coordinate.

### Implementation checkpoint

- Added `settlement-index.ts` as the pure, bounded, deterministic authority for province class, cultural clustering, exact settlement candidates, nearest/ring queries, origin selection inputs, and local/regional/trunk road ownership.
- Generator 17 defaults new worlds to Hearthlands & Frontiers; generator 16 and older saves are explicitly pinned to the legacy scattered pattern during both catalog and runtime migration.
- World creation now includes four readable presets, fine controls for density/clustering/roads/towns, culture toggles, and wilderness/any-community/chosen-culture origins with an exact debounced seed preview and safe public arrival.
- Guides no longer depend on loaded settlement state. They query up to 48 settlement regions, chart the nearest same-culture town/village, and report rounded distance and cardinal bearing. Road signs chart their destinations; the new Hearthroads Route Folio charts four still-unknown communities without revealing terrain.
- Road graphs persist their tier and deterministic owner; heartland signs and road encounters use the same graph. Settlement map knowledge upgrades monotonically from rumored to charted to visited, and only visited settlements are fast-travel targets.
- Added a release audit that compares legacy scattering with heartland clustering, spacing, town sizes, culture counts, road tiers, scan cost, and cache size. The visual was manually reviewed after correcting its XML escaping.
- Final verification: the exact release tree passes the full build/pretest pipeline and all 711 primary tests, including 12/12 dedicated Hearthlands tests and block-by-block Deepgear hold audits under both active settlement patterns. Native TypeScript, repository-wide ESLint, and `git diff --check` are clean. Official browser-client smoke produced `render_game_to_text` v1.8.0 with no console errors; manually reviewed screenshots confirm the collapsed setup, expanded presets, culture controls, deterministic origin preview, and enabled Generate action are legible at 1440x1000.

## v1.7.1 Frostpine Fieldcraft - 2026-07-19

- Finished the taiga/content pass: Frostpine has berry forage, Starfern, grass, and generated Frostpear orchards; four fruit families pack reversibly into product-painted nine-item crates; Giant Mooncap art now has authored world faces and a dedicated icon.
- Replaced the shared aquatic column with species-specific connection and silhouette profiles. Generated verification found 573 Frostpine sample columns, 2,820 undergrowth blocks, 61 Frostpears, and 1,632 Frostpear leaf blocks in the deterministic review region.
- Rebuilt Creature Camp around a stable orb selector, corrected exact-slot archiving, and synchronized naming across stored/deployed records. Follower orders now show their current state through dropdowns and replicate stance, distance, movement, and pet naming through the host snapshot path.
- Calmed Puddlehopper and hound travel motion, restored Living Bestiary gait application for Trufflehog and related animals, and expanded the grounded Clockwork Marmot to 88 visible parts with animated mechanisms.
- Exact production front, side, and three-quarter model renders were manually reviewed for Puddlehopper, Rimecoat Hound, Clockwork Marmot, and Thornhide Trufflehog. The Frostpear Plant Compendium portrait and 293-block production atlas were also reviewed; strict visual-theme audit reports zero creature or block violations.
- Focused gameplay/model/multiplayer verification passes 81/81. All 151 standard pretests and all 711 broader gameplay/render/audio tests pass; native TypeScript and changed-file ESLint are clean; the five-phase Vinext production build and packaged Sites Worker validation pass.
- Added an explicit generator-15 to generator-16 save migration so v1.7.0 World Below saves retain their intended profile and edits. The reviewed new-world screen now reports Generator 16 instead of stale copy.
- Browser QA generated a real Survival world, observed live rabbit ecology through `render_game_to_text`, kept the starting controls visible after four seconds, opened the Pack, and emitted no console or page errors. Title, new-world, gameplay, inventory, exact model, Frostpear, Mooncap, and material-atlas captures were manually reviewed before publication.

## v1.4.5 Dragon Renaissance - 2026-07-12

- Preserved the complete current request verbatim in `V1_4_5_USER_PROMPT_VERBATIM.md` for final clause-by-clause acceptance before deletion and publication.
- Captured and manually reviewed the untouched six-dragon production baseline in `output/v1-4-5-dragons/before`: all six share a visibly similar low, rectangular quadruped/wing plan, giving the redesign an honest comparison target.
- Release intent: rebuild Fire, Steel, Sea, Gold, and Silver adults from their silhouettes outward while retaining the established Ice adult; derive distinct cute stage-one/two forms only after those adult designs are settled; deepen animation, equipment, hoard presentation, progression guidance, egg guarantees, persistence, and lair scale; validate in the production renderer and browser before v1.4.5 publication.
- Dragon gameplay/world systems complete: breeding maturity is now the canonical stage-three threshold for death inheritance. Every Fire, Ice, Steel, Sea, Gold, and Silver dragon defeated at stage three or older produces a deterministic one-to-three egg clutch with unique IDs plus exact type, sex, genetic seed, parent, laid tick, and lair lineage metadata; younger dragons produce none. Stage-five females alone can add up to two bonus legacy eggs, keeping the guarantee bounded.
- Added a typed portable-egg policy: dragon eggs are explicitly fire/lava immune and bypass both generic two-minute age cleanup and 85-block distance cleanup for at least one complete configured world day. Protected eggs also cannot be evicted by the 120-drop soft cap; in lava they float at the source surface instead of sinking out of reach. All six canonical egg types now pass placed, portable, incubated, and ready-spawn metadata validation (the old validator omitted Gold and Silver).
- Rebuilt subterranean lairs from one small ellipsoid into connected great-vault, treasury, rookery, and entrance chambers. Stage-five homes now span 65x25x57 blocks and roughly 25,000 deterministic placements, carry 58-piece hoards, six chests, elemental vault ribs, and remain below the explicit 42,000-placement ceiling. Chunk reach increased to 32 and an eight-plan LRU avoids rebuilding the same large lair for every intersecting chunk.
- Enlarged the separately planned Sea Dragon nest too: stage-three/four/five abyssal homes now use 34/37/40-block radii (roughly four times their former area), scaled central bowls, and a seam-safe 40-block chunk scan.
- Dragon Bestiary progression now reveals eight practical field notes in lifecycle order: sighting; mature defeat and egg recovery; incubation; hatching/bonding/shoulder carry; feeding and growth; stage-three saddle, matching armor, panniers, riding and attacks; renewable scale harvesting; then same-type/opposite-sex breeding and inherited lineage. New milestones are append-only (`mature-defeated`, `egg-recovered`, `scale-harvested`) and preserve old saves.
- Focused verification: TypeScript passed; scoped ESLint passed with zero errors/warnings; 59/59 dragon, lair, engine, Bestiary, and Sea Dragon culture regressions passed. Dedicated assertions cover all six mature-death clutches, exact metadata, bounded uniqueness, fire/lava policy, one-day age/distance protection, Gold/Silver metadata acceptance, 65x57 deterministic chamber bounds, exact chunk reconstruction, enlarged Sea Dragon nests, and complete staged Bestiary unlocks.
- Dragon hoard/equipment visual pass: Dragon Gold Blocks and Piles no longer borrow Gold Ore. Three dedicated atlas cells paint hammered ingots, loose coins, and multicolor gems; the world pile is an irregular arrangement of individual ingots, coin towers, and jewel accents instead of three slabs. The inventory/held/drop family uses matching sealed-block and loose-hoard semantic models.
- Dragonflight Saddle and Pannier now have production hand/drop models with quilted tack, cantle, pommel, sunmetal buckles, girths, bedroll, reinforced bag, and harness clasp. All six barding modules have independent silhouettes and palettes: Ember flame-lamellar, Rime glacier harness, Steel riveted pressure plate, Sea tideglass carapace, Gold solar regalia, and Silver moonmirror weave. Wearable Ember/Rime/Steel armor icons and hand models also carry per-element details rather than color alone.
- Manually reviewed the 28px inventory / 22px recipe audit in `output/v1-4-5-dragon-assets/browser-client-final/shot-0.png` and the reconstructed-before/live-after model sheets in `output/v1-4-5-dragon-assets/blockwild-models-iso.png` and `blockwild-models-front.png`; all tack and hoard silhouettes remain legible and visibly distinct. Asset verification passes 20/20 focused regressions plus 72/72 with world-engine coverage; native TypeScript, scoped ESLint, and patch-integrity checks are clean.

## World Below creature second pass - 2026-07-13

- Rebuilt the nine signature-creature silhouettes with species-specific anatomy and surface detail instead of shared rectangular wing plans. Added branch-antlers, cephalic lobes, layered feathers, mineral cartilage, overlapping sails, membrane fingers, hollow chimes, thermal vents, and fractured living-ore anatomy while preserving every spawn, behavior, capture, sound, field-guide, and compatibility contract.
- Added secondary motion for alternating Lanternray organs, Prismtail feathers, Ashnose heat noses, Chimewing pendants, Cinder Kite vents, Sailfin sails, and the Veinling heart. Kept the existing Grazer root, Newt gill, flight, tail, and seam animation paths intact.
- Corrected the World Below showcase so its PNG is rasterized from the same labeled field-guide SVG rather than silently copying the unlabeled raw model sheet. Manually reviewed the labeled second-pass sheet and a 2200-pixel before/after comparison under ignored `output/world-overhaul-second-pass/`.

## Flora pacing and underwater seam repair - 2026-07-13

- Made generated two-block meadow grass atomic across every later decoration pass. Replacing either half with a flower or other authored placement now clears the matching counterpart; the former `WILDERNESS` orphan fixture and a wider generated-region scan retain only complete pairs.
- Fixed the apparent air lines beside underwater plants by applying the lowered liquid edge only to the actual top water cell. Submerged waterlogged flora and stacked water now meet on the same exact block plane.
- Applied one shared 5× timing multiplier to crops, berry bushes, cultivated flowers, ordinary and apple saplings, orchard fruit, and vertically growing aquatic flora. Doubled both passive/sprint hunger drain and the hunger cost of natural healing.
- Focused farming, liquid, meshing, world-engine, schedule, and survival regressions pass. The official browser loop and a purpose-built underwater gallery were reviewed in first and third person; plants, block edges, and the avatar's trouser/leg silhouette are seamless, and the page/console logs are empty. QA artifacts remain ignored under `output/plant-growth-water-qa/`.

## Main menu and playable-race faces - 2026-07-13

- Replaced the crowded three-column title workspace with one centered vertical main-menu list. Characters and browser-owned worlds now open as dedicated title submenus with explicit Back controls; Escape returns either submenu to the main list.
- Kept new-world creation, multiplayer, help, settings, fullscreen, sound, world import/export/rename/duplicate/delete, and the complete Character Studio accessible without loading their full workspaces onto the first screen.
- Added unique multi-block nose silhouettes for all seven playable races. Dwarves now use a broad bridge, squared tip, and modeled nostrils; Hearthkin and Confectkin use distinct rounded/button shapes; Atlantians use a low streamlined form; Goblins and Wood Elves retain different pointed profiles; Wayfarers use a restrained baseline nose.
- Focused character, avatar, model-polish, and title SSR checks pass. Desktop and phone menu/submenu captures plus a seven-race close face sheet were manually reviewed under ignored `output/main-menu-redesign/`; final browser QA reported no page or console errors.
- Final gate: native TypeScript, targeted ESLint, the verified production build, artifact validation, all three pretest suites, and all 615 gameplay/rendering tests pass.

## Merchant quantity and confirmation QoL - 2026-07-13

- Added direct quantity entry plus −5, −1, +1, and +5 controls. Buy All and Sell All are safe presets: they set the largest currently legal quantity, update the exact order total, and never execute until the separate purchase/sale confirmation is pressed.
- The legal maximum now explains whether stock, player inventory, player gold, merchant purse, free pack space, or the bounded order ceiling is the limiting factor. Selecting another item or changing sides resets the draft to one.
- Removed the old hidden 64-item transaction clamp. One reviewed order can now preserve a quantity spanning several pack stacks through local and host-authoritative multiplayer paths. The panel also quotes the same Bartering/alignment modifiers used by the engine.
- Focused economy, adapter, panel, and multiplayer coverage passes 70/70, including a 130-item Sell All transaction; native TypeScript, scoped ESLint, and the verified production build/artifact gate pass. Official desktop captures before and after Buy All, the populated Sell side, and a narrow phone capture were manually reviewed under ignored `output/trade-qol/`; clean-server runs produced no page or console error artifact.

## v1.2 character-profile slice — 2026-07-12

- Added a normalized, browser-persistent multiple-character catalog with one stable browser ID and one stable ID per profile. Profiles retain name, sex, faction race, five customizable appearance colors, recent selection, and a bounded 20-point starting skill allocation.
- Added explicit playable-race traits for Wayfarers, Hearthkin, Goblins, Atlantians, Confectkin, Wood Elves, and Dwarves. Atlantians carry the requested 0.75 land-speed modifier, faster water travel, water breathing, and a +25 native-faction alignment contract.
- Extended the shared production player rig with race-aware proportions, customizable clothing accents, pointed Wood Elf/Goblin ears and noses, forward seated legs, and a horizontal alternating-arm swim pose. Legacy female height and black-hair behavior remain intact until an explicit saved appearance overrides color.
- Focused character/profile/model/UI regression run passes 29/29. Multiplayer protocol serialization is owned by the parallel authority pass and has received the exact optional profile/race/color/pose field contract.
- Completed title-screen Character Studio integration: live production-model preview, up to 12 remembered profiles, race/sex/name controls, five color palettes, and a collapsible ten-skill starting allocation editor alongside play actions and the existing world catalog.
- Preserved existing multiplayer identities by migrating `blockwild-multiplayer-player-id` into the first default profile; later profiles receive distinct browser-plus-character authority IDs.
- Corrected the reported duplicate/wide arms at its source: torso scale was accidentally replacing the 0.56-block base width with a near-1.0 multiplier. The torso and clothing accent now preserve base dimensions, with a regression assertion for arm ownership and torso width.
- Wired Atlantian land/water speed and water breathing, race-aware eye/collision height, sprint-swim horizontal animation, remote swim/seated pose blends, forward seated legs, and moderated falling momentum through the water surface.
- Final focused browser QA at 1280×720 shows the balanced three-part title workspace and complete production avatar with no console-error artifact. Final character/model/liquid run passes 18/18; the wider focused run passes 37/37 and targeted ESLint is clean.

## Release direction

- Visual thesis: a compact field-kit workbench layered over a bright, handcrafted voxel world.
- Content plan: avatar-led pack; searchable recipe workspace; creature and vehicle storage; versioned title/world management.
- Interaction thesis: live avatar/creature previews, recipe plan hover/fill transitions, and animated world feedback with restrained motion.

## Work log

- 2026-07-12: Built the v1.2 Wayfinder/progression slice. Engine yaw now maps clockwise on map arrows; a restrained top compass shows cardinal bearings, nearby POIs/players, tracked targets, and a short-range through-wall destination cue. Map hover names biomes, close zoom uses four bounded averaged top-block color samples per chunk, far zoom retains biome ink, and cartography shares both layers.
- 2026-07-12: Expanded progression to ten rank-1000 skills with explicit mechanical descriptions, Bartering and Luck pricing/loot hooks, alignment-sensitive spread convergence, and independent OP capstones. Exploration perks now unlock farther map zoom, persistent POI/compass legibility, and mastered free map-charge travel policy.
- 2026-07-12: Added a normalized timed status/passive contract plus HUD adaptation for existing potion, spell, ward, burning, scald, slow, and water-breathing buffs. Quest offers now model individual versus faction-mayor ownership, persist exact return routes, hide unaccepted personal work outside its giver interaction, and can place a tracked return marker for the exact giver or nearest known matching mayor.
- 2026-07-12: Focused verification passes: native TypeScript plus 49/49 map, quest, skills, economy, weather, and panel checks.

- 2026-07-10: Began release audit. Existing foundations include meadow biomes, butterflies, multiplayer snapshots, sleep rules, adaptive resolution, player models, and procedural terrain.
- 2026-07-10: Reworked recipe-book behavior: typed material/output search, hover/focus 3×3 previews, structured missing/table/full feedback, click-to-stage without direct crafting, and mirrored axe recognition/consumption. Crafting and furnace arrows now use contained silhouettes that cannot clip into their output slots.
- 2026-07-10: Replaced the pack's CSS mannequin with a live Three.js production-player preview carrying the selected male/female variant, equipped armor, and held item. Variant and armor/held state persist in saves and travel as backward-compatible optional multiplayer pose fields.
- 2026-07-10: Added v0.2.0 Menagerie release identity, save/catalog `lastSavedGameVersion`, title/world-catalog labels, title fullscreen control, global character selection, weather/performance readouts, oxygen bubbles, cage metadata tooltips, and semantic inventory artwork for the new Menagerie items.
- 2026-07-10: UI-focused TypeScript and ESLint checks pass. Five new crafting/avatar/version tests pass. Wider focused suite reached 60/62; two pre-existing placement harnesses need the new liquid simulator stub or an optional-safe notification path (reported to the engine owner).
- 2026-07-10: Browser title QA confirmed visible version/fullscreen controls, responsive world catalog version metadata, and persisted character-selection state. Pack/recipe browser capture remains queued until concurrent engine HMR settles enough to stay in-world.
- 2026-07-10: Added the Peelop companion command/name panel with rendered portrait, health, age/tame state, follow/sit/stay/wander controls, and responsive layout. Mounted Wayfarer players receive a compact sail/dismount HUD hint.
- 2026-07-10: Desktop pack visual QA passed: the female rig's long hair, live held Grass Block, equipment sockets, stats, 2×2 grid, and contained craft arrow all render cleanly. Mobile title QA at 390×844 passed with stacked menus, character selection, catalog, and world versions legible without horizontal overflow.
- 2026-07-10: After liquid-test integration settled, the full 63-test crafting/avatar + engine/storage/multiplayer/player/lighting focus set passes. TypeScript passes. Targeted UI ESLint passes; whole-repo lint has only engine integration warnings after correcting the projectile test's prefer-const error.
- 2026-07-10: Added a standalone two-seat sailboat model and deterministic water-constrained movement/storage/passenger helpers in `app/game/boats.ts`; three focused tests pass. Engine placement, mounting, multiplayer pose, save, and chest integration remain queued.
- 2026-07-10: Added swept, visibly modeled arrow projectiles with ballistic aiming in `app/game/projectiles.ts`; focused projectile and boat suites now pass 5/5. Skeleton fire cadence and player damage integration remain queued.
- 2026-07-10: Expanded the canonical fauna catalog from 8 to 22 non-butterfly creatures: five distinct surface animals, two perch/flee bird variants, two ocean fish, one river fish, one underground aquatic, the tameable Peelop, a Reliquary Sentinel temple enemy, and a ranged Skeleton Archer. Every creature has a unique shared Three.js production/bestiary/render-tool model.
- 2026-07-10: Fixed Ridgeback rotational twitching at blocked routes with a deterministic held avoidance turn in `fauna.ts`, integrated narrowly into mob spawn/update. Added pure bird behavior, fish habitat, and protected-despawn helpers.
- 2026-07-10: Added metadata-exact creature cages, full Peelop tame/feed/name/command/breed persistence helpers, and face-connected butterfly exhibit topology/inventory/motion helpers. Exhibits cap at 20 blocks and one butterfly per block, generate flowers on lower tiers, and expose landing poses.
- 2026-07-10: Consolidated Skeleton Archer visuals with the shared swept projectile system, added the arrow to the model inspector, and rendered/visually reviewed a 28-specimen field guide at `output/fauna-creatures/blockwild-creatures.png`.
- 2026-07-10: Regenerated `public/creatures` with deployable SVG portraits for every new bestiary key and refreshed the complete 28-specimen SVG field guide.
- 2026-07-10: Fauna/model verification passes: 19 focused tests across fauna, butterflies, models and projectiles; targeted ESLint passes. Whole-repo typecheck is temporarily blocked only by concurrent test fixtures (a SynthAudio mock cast and a missing `simulationDistance` setting), not by the fauna files.
- 2026-07-10: Added isolated deterministic simulation systems: bounded queued liquid flow with renewable water sources, animated-water samples, oxygen/buoyancy/shore exit rules; 10/8 default and 16-max view-distance policy, rolling benchmarks, and adaptive work budgets; biome weather with nine states and poofy instanced-cloud plans; explicit cross-chunk desert/forest temples, Sunbun grove, butterfly sanctuary, chest/guardian/resident markers, rare Sunward Compass loot, and desert/meadow vegetation plans. Integration and complexity guidance is in `app/game/SIMULATION_SYSTEMS.md`; repeatable CPU baselines are in `scripts/benchmark-simulation.ts`; 16 focused tests pass. Engine/world wiring remains queued for the owning agent.
- 2026-07-10: Completed live Menagerie engine integration. Biome spawning now covers five new surface animals, two perch/flee birds, four habitat-specific fish, Peelops, Reliquary Sentinels, and ranged Skeleton Archers with visible swept arrows. Ridgebacks use held deterministic avoidance turns; mobs traverse open doors; tamed, named, enclosed, and POI-resident creatures persist and save.
- 2026-07-10: Integrated exact-metadata Waykeeper Cages, Peelop food/taming/healing/naming/follow/sit/stay/wander/breeding, deterministic grove/sanctuary/temple spawn markers, and persistent creature serialization. Golden Bananas are the strongest Peelop care food; birds and fish now have distinct useful drops.
- 2026-07-10: Integrated connected Butterfly Conservatories as fused glass habitats with one resident per block, a 20-block cap, dynamic flower/branch tiers, container restrictions, animated flight/landing residents, merge/split behavior, drops on downsizing, and save support.
- 2026-07-10: Integrated the two-seat Wayfarer into placement, water-constrained steering, mounting/dismounting, crouch-use 18-slot cargo, save/load, multiplayer pose/passenger snapshots, targeting, and mounted HUD. Added metadata-safe item/drop stacking so filled cages survive containers, drops, death, and saves intact.
- 2026-07-10: Wired flowing/source-renewing water, animated atlas water, oxygen/drowning/shore exits, 10/8 default and 16-max render/simulation settings, adaptive work budgets, biome weather, poofy clouds, desert/meadow flora, four deterministic POI families, and rare magical structure loot into the production engine/world.
- 2026-07-10: Added `render_game_to_text` and deterministic `advanceTime(ms)` browser hooks for gameplay automation. Updated the GitHub README for v0.2.0, the 28-creature roster, new systems, current repository layout, benchmarks, controls, persistence, and runtime boundaries.
- 2026-07-10: Native TypeScript and ESLint checks pass. All 108 TypeScript tests pass, plus four focused engine-integration checks. Repeatable benchmark: liquid settle 10.49 ms; 1,000 structure plans 184.36 ms; 250 weather/cloud plans 203.14 ms; radius-16 ordering of 1,089 chunks 0.72 ms on this machine.
- 2026-07-10: Final Linux/Sites-equivalent verification passes: the Vinext production build and artifact validation pass, rendered HTML passes, all 113 TypeScript tests pass, and whole-repository ESLint passes.
- 2026-07-10: Final browser QA passes with no console errors across title/settings, character selection, world setup, gameplay, pack avatar, recipe search/preview, third-person sprint/interaction, and deterministic gameplay-state hooks. The final 28-creature field guide was regenerated and manually reviewed.

## Release handoff

- Runtime, content, browser, visual, benchmark, and production-build verification are complete.
- This validated source tree is ready for the v0.2.0 GitHub and Sites publication step.

## v0.3 UI pass

- Visual thesis: keep Blockwild's field-journal materials, but make every inventory silhouette readable at its real 22px recipe size and 28px pack/hotbar size.
- Content plan: immediate hotbar feedback; audited item artwork and food tooltips; deeper, filterable bestiary records; lean pause/settings and one-code multiplayer surfaces.
- Interaction thesis: synchronous slot-selection feedback, fast category switching without costly remounts, and keyboard shortcuts that never escape focused text fields.
- 2026-07-10: Added backward-compatible bestiary progress fields (`tames`, `breeds`, `secretUnlocked`), care/discovery metadata slots on mob definitions, an immediate selected-slot event hook, and the FPS preference schema entry. UI wiring and visual QA are in progress.

## v0.3 release brief — 2026-07-10

New request: fix live hotbar-selection feedback; audit and resize every displayed inventory icon; add plantable/harvestable berry bushes and fruit trees; sparse falling leaves; creature sounds, general breeding data, richer dynamic bestiary knowledge, and two forest/meadow music concepts; add four varied surface creatures; remove destructive pause actions and keep multiplayer simulation running behind menus; add biome blocks; correct all creature ground alignment and pathing; improve butterfly roaming; animate held/world torches; add generic hit and terrain-step audio; FPS toggle; correct closed-chest visuals; remove manual weather settings; add optional compute/memory performance modes; suppress gameplay hotkeys while typing; simplify multiplayer to an invite-code flow; show food values; finish farming, hydration, scythes, buckets, fences, gates, and leads; deepen cave/terrain generation; improve menu performance and bestiary filtering/framing; add full Shadecrawler tame/grow/saddle/ride progression. Publish the completed release to GitHub and the existing live Sites project.

Release direction:

- Visual thesis: readable full-scale inventory art and a field-journal bestiary layered over the existing handcrafted voxel world.
- Content plan: cultivation and husbandry, surface ecology, cave renewal, practical building systems, then creature mastery.
- Interaction thesis: immediate hotbar state, restrained menu motion, living foliage/torch feedback, and knowledge that unfolds as creatures are encountered and tamed.

Work begins from clean v0.2.0 commit `2a47c8f` with `render_game_to_text`, `advanceTime(ms)`, production Sites packaging, and the 28-creature render pipeline already verified.

### v0.3 fauna, grounding, and navigation

- Replaced the model inspector's hidden auto-grounding with a truthful runtime spawn-offset audit. Corrected every ground creature's foot offset, including Shadecrawler penetration, Woolhorn penetration, Zombie floating, and subtler errors on Mossling, Cave Blob, Rattlekin, Peelop, Reliquary Sentinel, Skeleton Archer, and all Menagerie surface animals. Old saves are locally re-grounded without mistaking overhead leaves for a floor.
- Added foot-anchored scaling so young creatures and the three-times-size Shadecrawler keep their feet on the same terrain plane. The 32-creature audit manifest reports exact contact for every ground model; flying and aquatic models remain explicitly marked as reference-ground renders.
- Added Thimbledeer, Lanternshell, Puddlehopper, and Reedstrider as non-evil surface fauna with unique production models, habitat-weighted spawning, discovery/utility notes, diets, breeding foods, behavior tuning, drops, and deployable bestiary portraits.
- Reworked creature ground navigation around a bounded local ledge search. It ignores tree canopies above the current floor, checks every occupied clearance cell, steps onto one-block ledges, permits controlled drops for hopping creatures, respects open doors, and retains one deterministic avoidance turn long enough to route around trunks without Ridgeback twitching.
- Added generic husbandry state and persistence for eligible fauna: diet feeding, healing, love state, paired breeding, inherited baby metadata, maturation, foot-anchored young models, cages, saves, and bestiary breed counters.
- Added the Shadecrawler bond path: six Moonberry trust feeds, a rare Nocturne Heart catalyst, post-tame feeding to 3x size/health, Trail Saddle equipment, owner-only riding, default third-person mount camera, WASD movement, Space dismount, save/cage persistence, and hidden bestiary progression counters.
- Multiplayer mob snapshots now carry backward-compatible scale, baby, tame, and saddle appearance hints so guests see grown Shadecrawlers and young fauna at the same size as the authoritative host.
- Wild butterflies now choose independent roaming targets more often, remain airborne significantly longer, and rest for shorter flower visits.
- Added stable per-creature sound-event metadata for Ridgeback, Woolhorn, Shadecrawler, Peelop, Lanternshell, Puddlehopper, and Reedstrider, with generic hit/ambient/feed fallbacks until generated WAV assets land.
- Focused fauna/model verification passes: 26/26 tests plus full TypeScript. Regenerated and manually reviewed the full isometric/front/side 32-creature audit and field guide; all new silhouettes are readable and every ground-contact badge is exact.

### v0.3 world, farming, and building slice

- 2026-07-10: Added deterministic staged Moonberry/Sunberry bushes and wild wheat, edible-fruit planting, attractive batch-planned apple trees with separately harvestable hanging fruit and bounded regrowth, hydrated/dry farmland, hoe/scythe/bucket/lead contracts, connected fences and four gate orientation/open states. Added recipes, item semantics, food/plant hooks, flora world-texture hooks, and content blocks/items through BlockId 99 / Item 177.
- 2026-07-10: Reworked generator v4 with sparse overworld cave funnels, distinct chamber/chimney features, climate-weighted local relief, natural limestone/moon-slate/sunbaked-clay strata, and substantially rarer wild wheat. Generator-3 edits migrate unchanged; generator-2 keeps its vertical-index migration.
- 2026-07-10: Rebuilt the closed chest's atlas treatment and six-face mapping; added procedural bush/crop/fruit/fence/gate/stone textures and connected partial-block fence/gate geometry. Closed fences/gates declare 1.25-block collision and open gates are walk-through.
- 2026-07-10: Added capped deterministic falling-leaf planning/physics with immediate ground-impact removal plus shared held/world torch flicker parameters. Exact engine integration ordering and bounded update guidance is recorded in `app/game/FARMING_SYSTEMS.md`.
- 2026-07-10: New farming/world suite passes 9/9 and existing generation-options suite passes 3/3. A 25-chunk content scan verifies exposed cave mouths, biome accent blocks, vertical variance, and wild wheat below 9% of sampled flora in about 1.7 seconds on this machine.
- 2026-07-10: Final focused verification passes: full TypeScript, targeted ESLint for all changed farming/data/world files, 12/12 farming plus generator-option tests, the wider 52/52 world/engine/farming regression set, and scoped `git diff --check`. Cave-mouth columns now reject trees/flora so openings stay visually and physically clear.

### v0.3 UI, inventory, and bestiary slice

- 2026-07-10: Hotbar number-key selection now sends a synchronous lightweight `onSelectedSlot(slot)` signal before the larger HUD snapshot, so the selected border and held-item label update immediately even while movement input is active. Slots expose matching `aria-pressed` state for UI regression checks.
- 2026-07-10: Added a query-gated actual-size icon audit (`?icon-audit=1`) that renders every registered item at its real 28px inventory/hotbar size and 22px recipe-book size. Rebuilt undersized silhouettes including Stick, Rotten Flesh, Wild Wheat, Crafting Table, ores, materials, tools, buckets, fences, leads, produce, and Shadecrawler equipment. Cross-plane flowers reuse their recognizable world-flora treatment. The reviewed audit is `output/ui-icon-audit-final.png`.
- 2026-07-10: Consumable hover labels now include explicit food value, durability/creature metadata remains visible, held/world torch artwork shares a restrained flicker, and the HUD includes an optional compact FPS counter plus a Shadecrawler mount hint.
- 2026-07-10: Reworked the Bestiary as a field journal with a high-contrast black title, zoomed-out production portrait, completion rings, discovery-location hints for unknown entries, and dynamic All/Surface/Birds/Butterflies/Aquatic/Monsters/Tameable filters. Care records read creature definition data for tameability, breeding, diet, sentience, and post-tame notes; progress incorporates seen/captured/defeated/tamed/bred/secret states without describing peaceful sightings as kills.
- 2026-07-10: Removed Delete and Regenerate from the in-world pause menu and removed player-facing weather controls. Settings now offer an FPS toggle and Auto/CPU boost/Memory cache resource reserve. Menu panels use bounded containment and restrained backdrop work to reduce UI repaint pressure.
- 2026-07-10: Simplified multiplayer around one short normalized room code with Host, Join, Generate, Copy, and rendezvous status. The manual offer/answer exchange remains tucked into an advanced fallback. Gameplay hotkeys are suppressed for input, textarea, select, contenteditable, and ARIA textboxes, verified by typing `e` in the player-name field without opening or closing inventory.
- 2026-07-10: Live browser QA passed in a fresh Builder world: keyboard slot 4 selection immediately changed the pressed hotbar slot; pause contains no destructive world buttons; Settings exposes FPS/resource modes and no weather option; the FPS readout appears when enabled; Bestiary filters, hints, completion rings, black title, and framing render cleanly; one-code multiplayer remains open while typing. Actual-size icon, Bestiary, and multiplayer visuals were manually reviewed.
- 2026-07-10: Final UI verification passes full TypeScript, 17/17 focused crafting/avatar/invite/lighting regressions, scoped `git diff --check`, and targeted ESLint with no errors. Seven current warnings are the concurrently added farming/leaf/torch helper imports awaiting production engine use; they are outside the UI slice.

## v0.4 pathfinding and habitats brief — 2026-07-10

New request: add collision for medium/large creatures; replace direct follower chasing with speed-matched, spaced group formations and long-distance teleport recovery; revamp creature pathing; fully overcast storm skies; richer darker meadow grass; held Butterfly Net and butterfly visuals; move held items forward in third person and multiplayer; reverse Wayfarer horizontal steering; restore Minecraft-like sinking/swimming/shore exits; deepen and vary rivers while preventing flora from replacing water; exclude trees around POIs; make leaf blocks visually full; repair and optimize Butterfly Conservatory rendering and containment, extend it to appropriate small birds/creatures with bounded breeding, and allow invite-code joining from the title screen. The supplied screenshot shows internal conservatory frame faces and transparent layers overlapping into a torn/z-fighting presentation.

Release direction:

- Movement thesis: creatures choose bounded local routes, maintain physical space, and recover from irrecoverable follower separation without rotational thrashing.
- Habitat thesis: connected conservatories render only meaningful exterior structure and simulate residents in one bounded component budget.
- World thesis: water owns river cells, POIs own their clearings, storm cover owns the whole sky, and denser foliage remains readable without holes.
- 2026-07-10: Added the isolated `creature-pathing.ts` movement policy: young/scale/dimension-aware medium and large ground collision profiles; stable follower fan slots beginning at least 2.8 blocks behind the player; sprint-speed matching with bounded catch-up; deterministic 20-block or stuck-distance teleport recovery; safe landing search; and a bounded candidate-fan route scorer that respects scaled clearance, open doors, ledges, water, hazards, creature crowding, and anti-twitch route hysteresis. Birds and aquatic creatures bypass the ground planner. Sixteen focused fauna tests, full TypeScript, targeted ESLint, and diff checks pass. Production integration remains intentionally centralized in `engine.ts` by the root owner.
- 2026-07-10: Fixed Bestiary specimen framing after browser QA exposed a 560×323 replaced-image sizing cycle inside the 820×213 stage. The hero viewport now explicitly reserves its 38px navigation chrome and constrains every portrait to a transform-free 560×203 contain box. Fresh 1280×720 captures show the complete Ridgeback and airborne Emberjay; a focused CSS contract regression keeps feet, ridges, wings, and crests from being cropped again.
- 2026-07-10: Wayfinder v0.4 integration now passes TypeScript and 113 focused tests. Verified in code: scaled medium/large creature collision, stable obstacle routing and follower formation/recovery, idle sinking and active shore exit, reverse Wayfarer steering, full thunder overcast/celestial hiding, darker meadow grass, dense leaf tiles, deep variable rivers without submerged flora, POI tree clearings, production net/butterfly held models, exact-metadata small conservatory residents and bounded breeding, and generator-v4 to v5 edit-preserving migration. Browser and full-release verification remain pending.
- 2026-07-10: Real-browser Wayfinder QA reached an authored five-cell connected conservatory with three live residents; `render_game_to_text` reported capacity 5/residents 3 and the inspected screenshot shows fused panes and clean component rails without the supplied screenshot's overdraw tearing. First-person net mesh, full thunder-gray sky with no celestial sprite, title invite-code join, denser leaves, and darker meadow ground were visually reviewed. A four-Peelop recovery test teleported distant followers into a widened paired fan; the first browser pass exposed a rear-camera center-slot occlusion, so the formation now reserves the camera lane and the second pass keeps the player visible between left/right companions. Focused pathing/menagerie tests and TypeScript pass after the correction.
- 2026-07-10: Rebuilt connected conservatories as fused unframed exterior glass plus one topology-derived perimeter rail set, removing coplanar pane seams and per-block transparent overdraw. Resident motion is now O(residents) per frame with a 0.65-second topology scan, and every resident is deterministically assigned to one interior cell so concave components cannot be escaped or crossed through glass.
- 2026-07-10: Conservatories now accept exact-metadata Waykeeper Cages containing Mosslings, Puddlehoppers, Emberjays, and Canopy Larks. Their production models fit the habitat cell, retain cage metadata on removal, and same-species adult pairs can produce one metadata-complete baby per 90-second component cycle up to the hard block capacity.
- 2026-07-10: Added a cross-threaded production Butterfly Net model and actual production butterfly models for held specimen items in first person, third person, paper-doll previews, and remote-player rigs. Shifted the shared hand socket 0.205 blocks forward to stop all held geometry intersecting the arm, with a query-gated `?held-audit=1` visual review surface.
- 2026-07-10: Title-screen guests can now open a dedicated Join with Invite Code flow without creating or loading a local world. Host controls and manual offers stay pause-only; the guest remains on the non-persistent preview until an authoritative host snapshot is applied, then React enters gameplay. Failed joins tear down the transient session without saving or exposing the preview as a playable world.
- 2026-07-10: World/water/weather verification is complete: 75 focused tests cover generated river depth/variation, no flora in water, named and legacy POI clearings, engine storm visibility, idle sinking, shore exit, and reversed boat steering. Full TypeScript, targeted ESLint, and `git diff --check` pass. The official web-game client rendered the v0.4 title and world-setup without console errors; `output/v0.4-world-qa/setup2/shot-0.png` was manually reviewed.
- 2026-07-11: Final Wayfinder release verification passes. The bounded Vinext production build and Sites artifact validator succeed; native TypeScript, whole-repo ESLint, rendered HTML, and all 156 TypeScript tests pass. The isolated benchmark records 27.36 ms liquid settle, 442.57 ms for 1,000 structure plans, 503.39 ms for weather/cloud plans, and 1.24 ms for radius-16 ordering on this machine. Regenerated and manually reviewed all 44 production model/tool/player/butterfly entries in isometric, front, and side sheets with exact ground contact for ground creatures. The mixed Windows/WSL workspace requires the production build under WSL and TSX tests under native Windows because `esbuild` is platform-specific; both halves of the release gate completed successfully.

## v0.5 apiary and multiplayer brief — 2026-07-11

New request: repair real invite-code multiplayer failures (`React 418` hydration text mismatch, Trystero missing local offer, close/abort race) and hybrid touchscreen UI detection; unify chest closed/open geometry and add chest inventory/held art; make tree felling reliable across every tree form with textured fall visuals; correct drop origins; reduce and slow hostile spawning, suppress it near torches and in the player's near view; improve held-tool, swing, Rattlekin club, butterfly, skeleton bow, zombie, female-player, target-outline, water-crouch, placement, planting, respawn, combat-tail, door, instant-break, damage/place audio, and title-held-item behavior; add a complete bee/apiary/queen/nectar/honey/royal-jelly loop; replace cages visually with original metadata-preserving capture orbs plus a display rack and healing station; extend Peelop, Reedstrider, horse, cow, grazer, Puddlehopper, herd/shoal, dragonfly, fish and aquatic-plant ecology; restore fuller non-solid leaves with more tree forms; add two POIs and one biome with its own creature; generate new combat music; publish as v0.5.

Release direction:

- Networking thesis: deterministic first render, one owned signaling attempt per action, recoverable guest waiting, and no error state caused by normal WebRTC cleanup.
- Interaction thesis: the item or face the player sees is the one the engine actually uses; fragile world objects respond immediately; furniture and held silhouettes share production geometry.
- Ecology thesis: apiaries are bounded state machines with visible inhabitants and provenance-preserving capture, while new herds, shoals, mounts, pollinators, and biome life reuse generic behavior contracts rather than one-off frame logic.
- Performance thesis: new simulation work is event-driven, spatially bounded, save-versioned, and benchmarked before the v0.5 deployment.
- 2026-07-11: Hardened the v0.5 client shell and signaling path: SSR and the first browser render now begin from the same deterministic settings snapshot before persisted preferences load; touch controls support Auto/Off/On and follow the actual primary pointer on hybrid PCs; target-outline opacity is configurable; title mode disposes first-person held geometry. Room-code hosting caches one offer/answer flight per peer, guests can start first and retry transient handler/transport races, normal Trystero close/abort cleanup cannot overwrite a successful join, and ICE setup cancellation no longer emits a false transport error. Host/join actions share a UI single-flight gate with actionable retry text. Female production rigs now use black hair and an exact 0.8 height scale, with exported eye-height helpers for engine camera/interaction integration. Twenty-eight focused hydration/UI/player/multiplayer tests and full TypeScript pass.
- 2026-07-11: Added the v0.5 Apiary, Capture Orb Rack, and Healing Station interfaces as backward-compatible optional HUD workstations. The Apiary journal shows queen residency, eight worker cells, nectar-return status, 0–12 honey and royal-jelly stores, three transfer slots, and live production progress. Rack and healer surfaces keep four exact-metadata orb transfer slots visible with production creature portraits, names, health, tame/age/hostility state, and empty/ready distinctions; the healer adds Cave Gel reserve plus a timed pulse per wounded orb, while fully healed hostile specimens remain clearly secured and removable. Audit surfaces at `?workstation-audit=apiary|orb-rack|healing-station` were captured and manually reviewed in `output/v0.5-workstation-qa`; all three are legible at 1280×720 with no new console errors, and the Apiary/Healing Station were additionally reviewed at an emulated 390px touch viewport with clean single-column flow and no horizontal clipping. Seventeen focused UI tests, full TypeScript, targeted ESLint, and diff checks pass. Engine integration now emits `activeApiary`, `activeOrbRack`, or `activeHealingStation`, routes `machineClick` through each workstation, and uses the requested 12-unit Royal Jelly cap.

### v0.5 core mechanics, world rendering, and audio

- Replaced trunk-type-specific felling with bounded rooted-tree discovery across catalog-driven log/trunk/stem and canopy variants. Branching and mixed-log trees fall as atlas-textured instanced segments, preserve neighboring trunks and attached non-canopy builds, batch their edits, and return exact per-species log drops.
- Unified standing and animated chest proportions. Open chests temporarily suppress only their static chunk geometry, so the textured articulated body/lid does not overlap or z-fight; closing restores the standing mesh without changing the block. Chest held/drop silhouettes use the same recognizable production form, and glass has a dedicated low-opacity render layer.
- Tightened interaction contracts: fragile flora and fruit break in one click; crouch-use places held blocks against doors, gates, chests, furnaces, beds, tables, and conservatories; beds persist a safe adjacent respawn; Moonberry planting consumes the selected berry; block drops originate inside the broken voxel; crouching accelerates underwater descent; target outlines now respect depth; and door/gate actions reuse the open/close samples.
- Reduced hostile pressure with a 30% lower hostile allowance and 50% slower spawn attempts, torch-light suppression, near-view/line-of-sight spawn rejection, and explicit opaque-block line-of-sight acquisition before chase or ranged fire. Adult tamed Peelops now defend their owner from visible nearby hostiles and shed bananas on a bounded deterministic cycle.
- Reworked held tool/net presentation to a forward 90-degree working angle with stronger first-person swing motion, extended combat music persistence to 22.5 seconds, and added deterministic alternating hooks for the two Suno-generated `blockwild-ironbloom-skirmish` variants, with the existing sky-battle score as a safe missing-asset fallback. Default unarmed damage and placement sound presence are explicit.
- Focused core verification passes 78/78 tests across farming/world, liquids, engine, held models, and Menagerie integration. Scoped ESLint passes without errors; final whole-tree TypeScript verification is waiting on the concurrently expanded fauna catalog to finish defining its newly registered mob keys.

### v0.5 bounded ecology and Waykeeper workstations

- Added a bounded Apiary simulation with a queen-only bootstrap, queen-grown worker population up to eight, explicit outbound/nectar/return state, one-day path-loss disconnect and two-further-day death, slow queen-only honey, returning-worker acceleration, and 12-unit honey/Royal Jelly caps with Jelly exactly four times slower. Wild hives deterministically hold zero to eight workers; breaking one preserves products and releases every survivor angry. Queen net/orb eligibility, Royal Jelly taming, stronger sting/owner defense, worker flower/landing/dusk-return decisions, Queen Cell insertion, and bee-to-Queen-Cell crafting have pure integration contracts.
- Replaced the Waykeeper Cage presentation with the original metadata-preserving Capture Orb while keeping save id 156 and `capturedCreature` compatibility; short-lived id 178 also migrates. The original cage recipe now yields two orbs. Added a four-orb rack and four-orb healer; deposited creatures heal passively every 20 seconds, while Cave Gel optionally adds the intervening 10-second pulse.
- Added Wildwood Courser horses, Cloverback cows, Cloudreed Mistmanes, Wild Honeybees and Hive Queens, Reed Dragonflies, and four thin habitat-specific fish. Reedstriders now expose trust/taming/saddle/ride contracts, Peelops only defend themselves or keepers and shed Bananas, Puddlehopper rain/startle jumps are livelier, Sunstep Grazers are larger and herd in groups of four to seven, and herd/shoal steering remains bounded to eight nearest neighbors.
- Added waterlogged River Ribbon, Glow Kelp, and Reed Bloom contracts that coexist with Water instead of replacing source cells; Cloudreed Glen turf/bells/Mistmane content; dense rounded/layered/windswept/ancient tree plans that preserve the original cutout leaf texture while using fuller crown geometry and selective internal faces; and distinct Abandoned Apiary and Waykeeper Healing Grotto POIs with deterministic loot and residents.
- Upgraded canonical models for the larger Grazer, horse, cow, Mistmane, four fish, bee/queen, dragonfly, Skeleton bow/nocked arrow, Rattlekin stone club, and readable emissive Zombie eyes. Added semantic chest/apiary/orb/rack/healer model specs and butterfly antenna dimensions. Regenerated all 42 browser bestiary portraits and manually reviewed the 42-specimen field guide plus isometric/front model sheets; all new grounded creatures report exact contact.
- Focused ecology/fauna/model/structure verification passes 47/47 tests, native TypeScript passes, and targeted ESLint is clean. The new suite covers queen-only production and worker failure timing, product caps, wild-hive break anger, queen catch/tame/defense, exact cage migration, passive/accelerated healing, social groups, waterlogged flora, cutout crown density, content registration, production models, and both new POIs.
- Integrated the v0.5 ecology contracts into the live engine and save/HUD paths. Apiaries, four-orb racks, and four-slot healing stations persist exact state; advance on a bounded round-robin clock with offline elapsed-time clamping; expose normal cursor/shift transfers; and migrate legacy cage metadata throughout inventories, containers, drops, equipment, boats, and saves. Wild hives release their exact queen/workers and stored products, bound workers forage/return at dusk, filled Hive Queen orbs can seed empty apiaries while returning the same empty orb, and capture/release now rebuilds filled/empty held visuals with cyan crystal feedback.
- Live ecology now includes Reedstrider and Wildwood Courser trust/saddle/riding, bounded herd/shoal steering, Puddlehopper hops, persistent Peelop defense/shedding, Cloverback milking with a 90-second per-cow cooldown, and a real Cloudglass Reliquary pulse that heals nearby owned companions, recalls separated followers, or points toward the nearest creature/habitat. All new POI loot keys resolve through the engine, including the rare Cloudglass item and Capture Orbs. Focused engine/ecology/world verification passes 81/81 tests; native TypeScript and targeted engine/test ESLint pass.
- Regenerated and manually reviewed all 42 production bestiary portraits after the final bee-scale correction. Worker Honeybees are smaller than butterflies in all three measured dimensions, while the Hive Queen remains a larger encounter. Occupied Capture Orbs now propagate their filled appearance to local and remote third-person rigs through a backward-compatible pose hint.
- Generated one Suno Advanced instrumental combat brief in the existing Blockwild workspace and preserved both completed variants as the two runtime cues. Clip `4d55a0f5-798d-4aac-b18d-9844b991c33e` runs 2:43 and clip `8b944988-2d75-410a-86d2-6da7f1698999` runs 3:08; both MP3s were locally verified with stable sizes and SHA-256 provenance before being copied into `public/music`.
- The real two-browser QA harness reproduced the reported invite failure exactly. Chromium returns a native `RTCSessionDescription`, but the protocol validator had required a plain-object prototype and therefore rejected valid gathered SDP as "Missing local offer description." Validation now accepts browser-native description objects while preserving type, nonempty SDP, and size bounds. A native-prototype regression was added.
- Post-fix host-first and guest-first Chromium sessions both reached CONNECTED, entered the authoritative host world with two players online, and produced zero React, page, console, or asset errors. Hybrid touch switched cleanly from mouse layout to touch controls and back; a touch-only viewport began enabled. The official browser client, 156-item actual-size icon audit, Apiary, Orb Rack, Healing Station, held chest, title cleanup, and audio-unlock gameplay surfaces were manually reviewed.
- Final isolated benchmark on this machine: four-source water settle 20.38 ms; 1,000 POI plans 350.72 ms; weather/cloud plans 432.32 ms; radius-16 ordering of 1,089 chunks 1.21 ms; 64 fully staffed apiaries across twelve-minute cycles 140.56 ms; and 16,000 herd/shoal motions plus 90,318 planned tree blocks 135.72 ms. All workloads remain deterministic and bounded.
- Final v0.5 release gate passes: native TypeScript, whole-repository ESLint, 200 focused TypeScript checks plus production metadata and Suno-asset tests, the WSL/Vinext production build, Sites artifact validation, model generation, deterministic benchmark, official-client QA, and real host-first/guest-first multiplayer sessions.
- Final appearance propagation now carries an optional backward-compatible `heldItemFilled` pose bit, so occupied Capture Orbs rebuild correctly in local third person and on remote player rigs as well as in first person, inventory, and drops. Wild Honeybee production geometry is uniformly scaled below Meadowwing bounds in every dimension while the Hive Queen remains deliberately larger. Fifty-six affected engine/ecology/avatar/model/multiplayer tests, native TypeScript, targeted ESLint, and diff checks pass; the three-view bee/queen/butterfly audit in `output/v0.5-bee-scale-audit` was manually reviewed.
- 2026-07-11: Final real-browser QA found and fixed the release's remaining live signaling failure. Chromium returns `RTCPeerConnection.localDescription` as a native `RTCSessionDescription`, while the transport validator accepted only plain JSON records; this rejected a valid gathered SDP with the user's exact `Missing local offer description` error. The validator now accepts native description prototypes while retaining offer/answer type, non-empty SDP, and size bounds. A native-prototype automatic offer/answer regression passes, and fresh isolated-browser host-first and guest-first runs both reach `CONNECTED`; the guest enters the authoritative world with `2 ONLINE`, with zero React, page, console, or asset-load errors. Proof is in `output/v0.5-browser-final/qa-multiplayer-host-first-results.json`, `qa-multiplayer-guest-first-results.json`, and the paired connected screenshots.
- 2026-07-11: The official web-game client and focused Playwright passes verified the v0.5.0 Wildbond title, eighteen-biome labels, no title-held item before or after Save & Quit, all 156 inventory icons at their real 28px/22px sizes, the Apiary/Orb Rack/Healing Station audit panels, a real builder world, `render_game_to_text`, `advanceTime`, first/third-person chest holding, and the two generated combat MP3s after audio unlock. Manual icon review exposed the new bee products as tiny shared dots; Honeycomb, Wildflower Honey, Queen Cell, and Worker Bee now have distinct full-size silhouettes and the recaptured audit is clean. Desktop and hybrid PCs start without touch controls, actual touch input enables them, returning to mouse hides them, and touch-only tablets still start enabled. Final focused browser runs report zero console/page errors.

## v0.6 Hearthroads creature and faction visuals

- 2026-07-11: Added twelve sentient production variants with explicit faction/profession metadata: seven Hobbits (Hearthwarden, Tiller, Delver, Provisioner, Goldkeeper, Hammerguard, Boltwatch) and five Goblins (Roadboss, Grower, Sparkdelver, Bottlesage, Spearwarden). Each shares a race-readable base rig while retaining unique clothing, tools, trade notes, behavior and portrait geometry.
- 2026-07-11: Added forward-projecting shared hammer/crossbow/spear contracts, role-ready NPC poses, and canonical held Hearthguard Crossbow/Goblinsmith Spear specs. The crossbow and spear use local -Z as their ready direction; held runtime code must not apply the legacy generic -90-degree tool tilt to either.
- 2026-07-11: Added the non-sentient Road Warg with Goblin affinity, unaligned-only taming metadata, hidden saddle geometry and ride anchor; Burrowbell and Dewback Tapir surface wildlife; Redfin Salmon and Blue Mackerel schools; and a sparse deep-ocean Slatefin Shark whose behavior explicitly ignores occupied boats.
- 2026-07-11: Expanded bounded habitat/group tables with a dedicated `deep-ocean` fish table so sharks cannot appear in ordinary coastal water. Sentient races remain POI-only rather than ambient surface spawns.
- 2026-07-11: Regenerated all 60 deployable bestiary portraits in `public/creatures`. The 18-new-creature portrait field guide and 20-entry three-view weapon/grounding audit are in `output/v0.6-hearthroads-portraits` and `output/v0.6-hearthroads-review`; both were manually inspected after shortening/broadening Hobbits and correcting nested Warg/Tapir feet. Every grounded newcomer reports exact contact.
- 2026-07-11: Verification passes: 27/27 focused fauna/model tests, full TypeScript with the release branch's in-progress BigInt work checked under ES2020, targeted ESLint, and scoped diff checks. The base project still targets ES2017, so the concurrently added economy BigInt literals must be converted or the release target raised before the normal no-override TypeScript gate.
- 2026-07-11: Integrated the Hearthroads React surfaces with the live HUD/engine contract: M map and cartography sharing, J branching quest journal, pinned quest HUD, alchemy/distillery recipe stations, sentient dialogue, arbitrary-item merchant trade, Hobbit banking/stocks, settlement role directory, and follower-order controls. The Bestiary now has a separate categorized Plant Compendium with dynamic discovery, habitat hints, growth, utility, and harvest records. Added responsive parchment-and-hearth styling across desktop and compact viewports; targeted ESLint and scoped diff checks pass. Full type/build/browser verification is queued behind the concurrently edited engine's remaining integration errors.

## v0.6 Hearthroads release documentation

- 2026-07-11: Bumped the human-visible and package release identity to `0.6.0 Hearthroads` in `version.ts`, `package.json`, and the lockfile while keeping save-schema and generator versions independent. Updated the release-identity test and repaired its lightweight crafting harness with the new default blueprint state.
- 2026-07-11: Reworked `README.md` around the actual repository: Hearthroads map/quest/travel, settlements, sentient residents, faction standing, trade, gold/banking/ventures, blueprints, alchemy/distilling, ranged controls, 60-creature catalog, 18-entry plant journal, multiplayer cartography boundary, save contents, runtime ownership, tests, and the expanded module layout.
- 2026-07-11: Added `ROADMAP.md` to keep the post-release boundary explicit. Full settlement management, player-founded towns, formation-level raiding parties, broader autonomous diplomacy/war, spellcasting and magic expansion, and fishing remain later systems rather than implied v0.6 promises.
- 2026-07-11: Documentation/version verification passes: native TypeScript, targeted ESLint, scoped diff checks, all 18 crafting/avatar/UI checks, and all 36 Hearthroads map/quest/alchemy/faction/economy/settlement/plant/adapter checks.
- 2026-07-11: Generated four Suno settlement instrumentals in the existing Blockwild workspace: two warm Hearthroad/Hobbit cues and two brass-and-percussion Brassroot/Goblin market cues. All four locally verified MP3s are registered as owner-sensitive settlement scenes without changing the existing combat score.
- 2026-07-11: Final browser QA created a real Builder world and exercised the v0.6 title, pinned main quest, M map, J quest journal, dedicated gold wallet, creature Bestiary, separate Plant Compendium, placed Alchemy Stand, blueprint-gated Distillery, and a live 1/2-seat Cartography Table. Desktop began without touch controls and the run produced no React or page errors. Two local headless peers reached the expected rendezvous waiting state without reproducing the prior offer-description failure; native WebRTC offer/answer and host-first/guest-first behavior remain covered by deterministic tests.
- 2026-07-11: Regenerated all 60 deployable creature portraits after brightening the Goblin spear shaft and cleaned the QA contact-sheet footers so long activity/part labels no longer collide. The 18-newcomer field guide and three-view 20-entry grounding sheet were reviewed again; every grounded newcomer still reports exact contact.
- 2026-07-11: Final v0.6 release gate passes the verified Vinext/Sites build, artifact validation, 237/237 TypeScript gameplay checks, 2/2 rendered metadata/audio checks, native TypeScript, repository ESLint, diff/encoding checks, model export, deterministic simulation benchmark, and the full browser walkthrough.

## v0.7 Tidelight ocean expansion — 2026-07-11

New request: deepen and diversify oceans; enrich Sunwash Coast with crabs, gulls, sparse flora and fuller connected aquatic plants; make every water plant breakable, replantable and vertically growable; repair generated-tree wood continuity and whole-tree felling; improve Courser eyes, fish-fin attachment, daytime butterfly flight, POI doors/lights/furniture, and clear-weather clouds while replacing storm cloud objects with a dark full-sky overcast. Add Rainveil Jungle, a Japanese-inspired Sakurabloom Grove, two crops, cultivated multi-yield flowers, a bioluminescent trench biome, deep-sea flora/fauna, two fish, a benthic creature, a rare sea monster, sea and land tameables, water breathing, a rare rideable six-chest Worldshell turtle leviathan, morphing sea/sky Aetherbell leviathans with underwater eggs and aquatic babies, and a distinct underwater Atlantian faction with settlements, professions, trade, quests and population rules. Generate aquatic Suno score if available, then fully test, publish to GitHub and deploy the same release to Sites.

Release direction:

- World thesis: coast, shelf, trench and open ocean should differ in depth, terrain, plants, light, sound and ecology while every generated tree remains one physically connected authored object.
- Creature thesis: eggs, growth, taming, saddles, cargo, amphibious/airborne transitions and leviathan rarity are reusable state contracts rather than one-off animation flags.
- Faction thesis: Atlantians are a genuinely aquatic civilization with open illuminated settlements and water-adapted schedules, while player settlements remain the only naturally mixed land/aquatic faction.
- Performance thesis: ocean ambience is spatially bounded, large creatures use sparse caps and slow ticks, vertically growing flora uses queued events, and all new simulation remains save-versioned and benchmarked.

- 2026-07-11: Closed the Tidelight settlement scaling failure. Authored POI residents no longer consume the roaming-wildlife cap, so visiting a 26-resident town cannot permanently shut off natural spawning. Every sentient role now has a five-mesh, faction-colored, role-readable middle-distance proxy; full production models and 60 Hz behavior remain inside 18 blocks, proxies simulate at exactly 5 Hz across the active town, and residents outside the simulation window sleep in place without losing saved state. Atlantian estimates fall from 232/493/856 resident draw calls to 35/75/130 for a hamlet/village/town (about 84.8% lower), while distant AI work falls 12x. The ISO and two-column front sheets in `output/v0.7-sentient-lod-audit` were manually reviewed. Whole-project TypeScript, scoped ESLint, diff checks, the deterministic benchmark, and 90/90 focused engine/ocean/settlement/model/performance tests pass.

- 2026-07-11: Release integration audit repaired four live Atlantian gaps: all eight market and quest goods now resolve to production inventory items; the engine exposes the authored Lumen Tides questline and delivers its rewards; Tidewardens can authorize hires with Trident Guards consistently priced at 180 gold; and structure-spawn activation preserves authored aquatic marker heights instead of grounding residents through surface pathfinding. Five new live-engine regressions cover adapters, merchant purchases, quest completion and rewards, hiring, and underwater spawn activation. Focused Atlantian checks pass 21/21, native TypeScript passes, and targeted ESLint is clean.
- 2026-07-11: Final integration audit closed the remaining live boundaries. Atlantian and legacy merchant goods now have concrete inventory identities (including a distinct stronger Tempered Rootspike), Lumen Tides is part of the live quest catalog, Tidewarden hiring uses aquatic profession predicates and exact guard pricing, Glowmender Salve heals intentionally, and every authored side quest uses observable combat or inventory delivery criteria with resolvable rewards. Added renewable Glowroot, an atomic Rare Seed Pouch, and useful Wargkeeper Feed. Aquatic columns now preserve water, clear unsupported upper segments, and re-arm surviving tops; Star Coral grows to three cells. Generated trees compose wood before leaves, and underwater settlements re-anchor to their real seabed and fit every roof, path, and light below local water. Exact HEARTHROADS and seed-A regressions pass alongside broader scans. Final focused release checks pass 93/93 plus the Suno asset test; native TypeScript, scoped ESLint, and repository diff checks are clean.
- 2026-07-11: Integrated Atlantians across the Hearthroads React surfaces with an exhaustive six-role presentation registry, generated-portrait paths with graceful glyph fallbacks, profession-safe Hobbit/Goblin routing, Lumen-specific dialogue and trade language, and a responsive reefglass civic theme. Underwater settlement directories now identify Tidewardens, kelp reserves, reef homes, open-current approaches, vertical aquatic context, and Atlantian role equipment without pretending the town has surface walls or gates. Three focused SSR checks pass; targeted ESLint and diff checks pass. Official-client dialogue/trade/settlement captures in `output/v0.7-atlantian-ui` were manually reviewed at 1280×720. The only browser error is the expected portrait 404 until the reviewed `output/v0.7-ocean-portraits/atlantian-*.svg` files are copied into `public/creatures` during release integration.
- 2026-07-11: Completed the final Tidelight release audit against the deployable source. A headed Builder-world walkthrough exercised the 441-chunk map, quest journal, title/HUD, world rendering, and hotbar; official-client captures then rechecked Atlantian dialogue, trade, and settlement-directory surfaces with zero page or console errors. All 77 production creature portraits and the newcomer/model/LOD sheets were manually reviewed. Four locally verified Suno ocean cues are registered for coast, deep-sea, and Atlantian scenes. Native TypeScript, whole-repository cached ESLint, patch integrity, verified production build, Sites artifact validation, two rendered metadata/audio checks, and all 298 gameplay tests pass. The deterministic benchmark completed with 22.58 ms water settling, 422.59 ms for 1,000 structure plans, 568.70 ms for weather/cloud plans, 1.35 ms radius-16 ordering, 169.50 ms for 64 staffed apiaries, and 216.51 ms for 16,000 herd/shoal motions plus 90,318 planned tree blocks.

## v0.8 candy faction expansion — 2026-07-11

New request: add a candy-based sentient faction and its own biome, settlement culture, hard-candy walls, fauna, flora, crops, syrup ponds, fish, edible butterfly, village-only aligned candy dogs and cats plus neutral tameable Capture Orb stock, a tameable rideable biome creature, a candy crafting facility, two blueprint-gated potions, blueprint-gated candy weapons and armor sold by the faction, placeable/bucketable flowing honey and syrup, and advanced world-creation toggles that independently enable or disable faction generation.

Release direction:

- World thesis: the new biome should feel materially different through terrain, plants, liquids, ecology, settlement materials and color—not merely through renamed grass.
- Faction thesis: aligned village companions remain part of their culture while explicitly unaligned specimens sold in Capture Orbs enter the ordinary tame/breed/follower system.
- Craft thesis: crops, honey and syrup feed one coherent Sugarworks progression whose equipment and potions obey the existing physical-blueprint rules.
- Save thesis: faction-spawn choices and both new liquids are deterministic, migration-safe and host-authoritative; missing options in older worlds default to every faction enabled.

- 2026-07-11: Added a focused v0.8 integration suite covering legacy/default/empty/canonical faction options through world-generation projection, Sugarcourt-aware multiplayer snapshot validation (including duplicate and invalid rejection), Sugarworks blueprint/input/output/save normalization, concrete candy registry and recipe wiring, honey/syrup bucket contracts, and explicit aliases for every breakable candy block that overlaps the legacy item namespace. The 10-test focused run, native TypeScript, targeted ESLint, and diff checks pass.
- 2026-07-11: Updated the repository-facing release documentation for v0.8.0 Sugarcourt. The README now explains Sugarplum Vale, Bonbon Boroughs, aligned versus unaligned companion provenance, Taffalo riding, the eight-recipe Sugarworks, candy equipment and formulas, nonrenewing honey/syrup flow, and the saved/multiplayer faction-selector boundary. Code-derived catalog counts are 22 biomes, 83 core creatures plus seven butterflies (90 total), 25 sentient roles, 39 plant-journal entries, and four selectable NPC factions. CHANGELOG and ROADMAP now carry the same release boundary without claiming a publish or deployment.

## v0.9 dragon, magic, and skills expansion — 2026-07-11

New request: ship Fire, Ice, and Steel dragons as persistent five-stage lair guardians with eggs, elemental hatching and incubation, baby taming/shoulders, adult breeding, flight, rider-directed melee/breath/projectile attacks, equipment and cargo, renewable scale reserves, tier/sex/type loot, map-reveal charters, dragon quests, dragon-material equipment, an attunement-gated Skyrim-inspired magic system with reusable tomes and a ten-spell wheel, placeable libraries/books, and an extensible level-1000 RPG skill tree with basic Ascendant unlocks. Repair disconnected generated-tree pieces, fully test, then publish v0.9 to GitHub and Sites.

Release direction:

- Dragon thesis: age and sex are persistent simulation state; stage changes drive size, health, AI, loot, riding, shoulder carrying, breeding, lair defense, and render detail instead of using separate one-off mobs.
- Combat thesis: wild dragons reason about home, line of sight, altitude and attack envelopes; mounted dragons reserve Z/X/C for melee, breath and projectile attacks so the player can still use held items normally.
- Magic thesis: tomes teach durable knowledge without being consumed, while the main quest gates attunement and mana rather than knowledge. Tap Q casts; holding Q opens a bounded radial favorites wheel.
- Progression thesis: skills use linear next-rank costs through rank 1000, each rank contributes one percent to its core multiplier, character level remains uncapped, and full mastery unlocks opt-in Ascendant safeguards.
- World thesis: rare underground lairs are deterministic map POIs with treasure, eggs and persistent guardians; keyed survey charters reveal only the nearest still-unknown matching lair.

- 2026-07-11: Published the validated v0.8.0 Sugarcourt source as commit `64886d7`, pushed tag `v0.8.0` to GitHub, saved Sites version 18 from the same commit, and deployed it successfully. Live browser verification reports `0.8.0` / `Sugarcourt` on the production title screen.
- 2026-07-11: Added the pure v0.9 magic/RPG slice: six reusable-tome spells across all five schools with faction/lair/loot/quest provenance, explicit projectile/effect/animation/SFX plans, `main-dragonwake-attunement` casting gate, persistent unbounded-practical mana upgrades, Magic-1000 infinite mana, configurable ten-slot Q wheel and deterministic tap/hold input, spell discovery journal, eight rank-1000 skills with exact 1% per rank, linear XP, sixteen prerequisite perks, uncapped character levels, and the opt-in ten-percent Ascendant health floor. A self-contained responsive Spell Journal/Skills/radial-wheel React surface uses the `dragon-magic-` class prefix. All 15 focused pure/SSR tests, isolated TypeScript, targeted ESLint, and scoped diff checks pass. Desktop and 390×844 audit captures of the journal, skills, mana HUD, and six-spell wheel were manually reviewed after tightening the compact two-pane layout; no client errors were reported.
- 2026-07-11: Added the persistent Fire, Ice, and Steel dragon core plus all three shared production rigs. The save-normalized lifecycle has five smooth 25-day stages, Dragon Meal growth, three-feed hatchling bonds, stage-one shoulder carrying, stage-three riding, two cargo chests, four armor sockets, renewable carried scales, same-type/opposite-sex breeding, elemental world incubation and incubator spawn eggs, lair-home AI, unload-without-delete persistence, deterministic tier/sex/type loot, and independent Z/X/C melee/breath/projectile plans. Steel uses a scalding steam cone and a modeled long-range spear. Every dragon exposes animated chest, jaw, eyes, three neck joints, seven tail joints, two-part wings, three-joint legs/claws, breath/projectile origins, sex markers, saddle, cargo, and armor visuals. The 12 focused dragon tests and 79-test fauna/model/portrait regression set pass; scoped ESLint and diff checks are clean. Isometric/front/side/action sheets and the three-creature field guide in `output/v0.9-dragon-models-review` were manually reviewed after removing detached wing markings, and the 93-creature public portrait catalog was regenerated and byte-verified against the production rigs.
- 2026-07-11: Added the v0.9 Dragonwake world/content slice. Generator v10 plans rare bounded underground Fire/Ice/Steel lairs on a 704-block region grid, with stage-4/5 persistent guardian markers, deterministic sex, female-only eggs, elemental shell blocks, hoard piles/Gold Blocks, explicit chest loot, map landmarks, chunk-seam slicing, and bounded survey-charter scans that skip known or mismatched lairs. Content includes natural/incubator hatch contracts, Dragon Meal, three catalysts, typed loot, dragon tack/modules, dragonbone tools, twelve scale-armor pieces, occupancy-rendered six-tome archive shelves, tome-display/incubator blocks, six reusable tome items, Manaheart Draught, rare merchant stock, four blueprints, four main quests through `main-dragonwake-attunement` and stage-five mastery, plus three archive side quests. Generated trees now bridge authored log islands, attach nearby crown components, prune truly floating leaf islands, respect liquid exclusions, and clear with five-block POI padding. The 15 focused world/content/tree tests pass across real generator stamping, archive capacity/normalization, all tree forms, representative seeds and chunk seams; full integration typecheck awaits concurrent HUD/magic edits.
- 2026-07-11: Finished the v0.9 storage/alchemy glue. Device-local saves from generator v9 now migrate to v10 without reindexing or dropping authored edits. The Alchemy Stand brews one Manaheart Draught from a Water Bottle, four Raw Gold, and any one typed Fire/Ice/Steel Dragon Heart; grouped ingredients share one clean recipe, report aggregate readiness in the station GUI, and consume the exact numeric heart used. The focused storage/alchemy/adapter/dragon-world run passes 39/39, targeted ESLint and diff checks are clean; whole-project TypeScript is currently blocked only by concurrent engine/HUD integration (`castSelectedMagicSpell` and initial magic/dragon HUD fields).
- 2026-07-11: Updated the repository-facing release documentation for v0.9.0 Wyrmweave. README now explains the three five-stage dragons, lairs and charters, elemental incubation, care/flight/rider controls, draconic equipment and loot, Dragonwake quests, reusable tomes, attunement, the six-spell Q wheel, rank-1000 skills, save ownership, architecture, and the 93-entry production portrait boundary. CHANGELOG records the same player-visible and migration contract. ROADMAP now moves spellcasting out of the deferred list and explicitly reserves cross-type hybrids, additional dragon families, deeper magic/enchantment, expanded perk trees, and broader Ascendant switches for later work. Documentation diff checks pass; final release test/deploy evidence still belongs to the integration handoff rather than these notes.
- 2026-07-11: Completed the Wyrmweave release gate. Full native TypeScript, scoped ESLint, all 391 TypeScript gameplay/content/migration tests, both rendered metadata/audio checks, the deterministic simulation benchmark, patch-integrity checks, and the verified production build pass. Independent code, test, and visual audits closed exact dragon-state multiplayer replication, held-Q pause/cooldown behavior, Dragonwake side-quest delivery, elemental statuses and armor, shoulder/collision/provocation behavior, dynamic stage badges, and distinct dragon trophy/egg art. The final Sites-compatible Worker artifact was manually exercised in Chromium: title CSS/version, world creation, gameplay HUD, first-person egg framing, Spell Journal and Skills overlays all rendered cleanly with zero console or page errors. The inventory icons were reviewed at their real 28px and 22px sizes, and Fire/Ice/Steel eggs were reviewed in both first- and third-person production sockets.

## v1.0 generated-tree surgery — 2026-07-11

- Rebuilt rounded, layered, windswept and ancient production plans around a face-connected wood skeleton, solid crown cores with edge-only variation, seed-driven height/fullness/direction, supported crown peaks, plausible branches, and terrain-aware ancient buttresses. The world now uses a coarse jittered tree lattice whose scaled biome probabilities preserve forest cover while keeping neighboring authored wood at least eight blocks apart; Sugarplum clipping is calculated over the entire crown footprint rather than one chunk-local pond slice.
- Replaced the four-step canopy cutoff and single-root route pruning in felling. Discovery now partitions malformed/touching log graphs by natural rooted footprint, retains every rooted vertical buttress, follows all canopy-support paths, claims a bounded full crown by nearest tree skeleton, preserves unrooted attached beams, and remains compatible with old diagonal branch steps. Maximum natural crown capacity is 1,024 leaves rather than 384. Hanging orchard fruit is now part of the falling model and lands as its exact Apple drop instead of remaining suspended after its leaves disappear.
- Added `tests/tree-systems.test.ts`: 4,032 deterministic topology combinations (24 seeds × seven species × four forms × six seam origins), 18 variable-ground ancient trunks, full-felling samples for every form/species, orchard attachment ownership, legacy touching-tree ownership, 320 clipped-plan cases, four real five-by-five chunk fields, and an engine-level cross-chunk ancient felling test. Existing tree/world suites remain green; whole-project TypeScript is temporarily blocked only by concurrent v1 faction/dragon/multiplayer integration outside the tree files.
- Added `scripts/render-tree-audit.ts` and manually reviewed `output/v1-tree-audit/tree-forms.png` at full audit size. All four silhouettes are distinct, the ancient footprint reads as a wide tapered trunk, crowns are visibly fuller without becoming opaque textures, and every panel reports rooted/face-connected topology.
- Regression follow-up reproduced the exact `HEARTHROADS` orphan at `(-2067,35,-3038)`: an ancient Wildwood tree centered at `(-2066,36,-3037)` had extended a three-log diagonal root collar from living Wildwood soil onto Beach sand. Fresh plans now gate every ancillary buttress through the same living-soil contract as felling, while legacy multi-log 3×3 collars are recognized as natural only when a wide rooted footprint or multiple tapered columns prove ownership. The fresh target is Air and its center resolves as one 31-log/311-leaf tree; reconstructing the old plan from the reported fragment resolves all 45 logs. The exact-coordinate regression plus all focused tree/world suites pass 53/53, scoped ESLint is clean, and the manually reviewed before/after sheet `output/v1-tree-audit/biome-edge-roots.png` shows invalid low sand roots falling from 12 to zero.

## v1.0 realms, attunement, and authority expansion - 2026-07-11

Release contract: `V1_USER_PROMPT_VERBATIM.md` is the temporary verbatim acceptance source and must be audited, then deleted before the release commit.

- Visual thesis: luminous Wood Elf calm and subterranean brass-and-stone Dwarf density frame quiet operational storage and creature-management interfaces.
- Content plan: exact colony/attunement foundations; searchable item and creature networks; two new cultures and biomes; Sea Dragon progression; world and multiplayer repair; final contract audit.
- Interaction thesis: white-sparkle creature recall, restrained storage utilization/search transitions, and readable magical/automaton state cues rather than decorative panel noise.

- 2026-07-11: Added pure v1 attuned Capture Orb state. An attuned orb remains linked while deployed, can recall its exact current creature state with a shared white-sparkle effect, records active/fainted/owner state, cannot deploy or unattune while fainted, and becomes usable again only after in-orb healing. Healing stations now clear the fainted lock when health returns.
- 2026-07-11: Added exact apiary resident transfers. Neutral or correctly bonded queens can activate a crafted apiary as preserved entities; angry or foreign-owned queens are rejected. Friendly colonies accept exact worker capsules and allow home workers to be removed, while away workers and queens supervising workers stay protected.
- 2026-07-11: Added the pure digital-storage foundation: 1,000/10,000/100,000-item cells, searchable deposits and withdrawals, deterministic legal overflow when capacity blocks break, a searchable tiered Capture Orb archive with slower passive healing, and atomic player -> digital -> nearby-chest area-crafting plans. The new and legacy apiary/capture focused suite passes 18/18 and scoped ESLint is clean; whole-project TypeScript is temporarily waiting on concurrent faction/multiplayer schema adapters.
- 2026-07-11: Rebuilt the map presentation contract around exact chunk-space terrain samples. Old maps normalize without loss; newly rendered chunks can persist numeric or named biome ink (green land, blue ocean/river, pink Sugarplum/Sakurabloom, luminous Glimmerwood, snowcapped ranges), cartography shares those samples, and the parchment now supports bounded 1x-12x zoom, pan buttons, drag panning, wheel zoom, player heading, and optional named/color-coded multiplayer markers. Added deterministic daily cloud height/density/layer profiles, larger snapped blocky-puff lobes, fade targets, cloud/celestial occlusion, and per-column rain segments that stop at roofs while nearby open rain and muffled global ambience continue. All 36 focused/legacy map-weather tests pass and scoped ESLint is clean; whole-project TypeScript is blocked only by concurrent dragon/faction adapters outside this slice.
- 2026-07-11: Completed the v1 multiplayer authority/stability pass. Host-owned per-player inventory, equipment, selected slot, health/hunger, XP, rank-1000 skills, character variant and metadata now replace a guest's local-world state on join and persist by stable player ID across reconnects. Shared chest revisions, authoritative guest drops/pickups, PvP and mob damage/death, placement collision around every player, remote held lights, 5 Hz smoothed mob poses, guest session termination when the host closes, manual guest return-to-title, reusable one-code reconnects, and main-menu female identity are integrated. Merchant buy/sell direction and inventory/payment commits are atomic; cow milking keeps the bucket; chest-open input no longer picks up the slot beneath the pointer; sentient tools use ready arm poses; bee and bird wings flap faster in mirrored directions. Character previews now share one delayed-release off-screen WebGL renderer with a Canvas2D fallback, preventing menu remounts from evicting the world renderer; the main renderer pauses safely on context loss and restores without discarding the world. Ten rapid title-screen character swaps completed with five clean manually reviewed captures and no console/WebGL errors. The 16 focused multiplayer/invite/trade tests, scoped ESLint, diff checks, and full native TypeScript pass.
- 2026-07-11: Completed the v1 culture and Sea Dragon slice. Glimmerwood now supports connected tiled Moonbough Enclaves, seven Wood Elf professions, living lights and walls, Glowfin ponds, Glimmerharts, Runeowls, Moonveil butterflies, role commerce, two spells, formulas, quests, side jobs, and neutral orb stock. Snowcap Range now supports guarded subterranean Deepgear Holds, seven Dwarven professions, lanterned galleries, a powderworks, flintlocks, Copper Moles, three visually distinct golems, and a blueprint/resource/mana-gated timed Golem Forge. Rare Sea Dragon nests share one deterministic planner with Atlantian charts and stamp moon-slate ridges, reef growth, eggs, hoards, landmarks, and permanent guardians into real ocean chunks; Sea Dragons join the five-stage husbandry/combat/loot/model lifecycle with swim-first travel attributes. Quest saves migrate to three pins and The Light Below is journal-acceptable. Lumenreeds are independently replantable and Moonpetals have a cultivated stage. The focused six-test v1 suite, native TypeScript, existing faction/dragon/magic/model regressions, and production model audit pass; revised isometric/front/side sheets were manually reviewed after fixing exact floor contact and role silhouette clarity, and the browser portrait catalog was regenerated from the same production rigs.
- 2026-07-11: Closed the culture-side reachability audit: every new merchant, quest criterion/reward and Golem Forge ingredient resolves to a concrete inventory ID; Moonstep and Verdant Renewal have blueprint-gated Alchemy recipes and live effects; Wood Elf tomes fit archive shelves; Deepgear and Glimmerwood lights enter the actual light index; settlement spacing uses a chunk-order-independent tie-break; and open Moonwell courtyards contain source water, connected Lumenreed and an aligned Glowfin shoal. The standalone responsive Golem Forge ledger/cradle was browser-reviewed at 1440x900 and 640x900 in `output/playwright/golem-forge-audit`, then wired into the live station lifecycle by the release integrator. The focused culture/forge/dragon UI suite passes 17/17 with native TypeScript and scoped ESLint clean before the shared engine merge.
- 2026-07-11: Finished the v1 quest/UI integration pass. Three quest pins now toggle independently through engine, journal, save compatibility alias, and a stacked HUD journey board; static The Light Below remains journal-acceptable and pinnable. The Bestiary has a dedicated Golems category with constructs removed from Surface/Monsters, Wood Elf and Dwarf residents use their production portrait assets, recipe previews name every ingredient and alternative, gameplay context menus are suppressed without blocking text fields, the Wild Apple Remedy has a full-slot bottle silhouette, and the Slatefin Shark mini portrait is contained. Native TypeScript, scoped ESLint, and 31 focused crafting/culture/portrait/UI regressions pass; the actual-size icon audit was browser-captured and manually reviewed in `output/v1-quest-ui-icon-audit`.
- 2026-07-11: Closed two final compatibility regressions: aliased Tidebreath resources now encode to the canonical `tidebreath-philter` id while legacy `water-breathing-potion` still decodes, and remote-player raycasts safely return no hit before the multiplayer registry exists. The 12 focused adapter/menagerie tests, TypeScript, scoped ESLint, and diff checks pass.

### v1.0 verbatim contract audit and release gate — 2026-07-11

- Re-read every clause in `V1_USER_PROMPT_VERBATIM.md` before release. Apiary acceptance is covered by exact neutral/tamed queen insertion, friendly worker transfer in both directions, faster mirrored bee/bird wing poses, and sparser 16-by-16-chunk landmark regions. Attunement acceptance is covered by persistent orb ownership, distance recall, white-sparkle return, fainted locks, Healing Station recovery, and slower archive healing.
- Storage/crafting acceptance is covered by searchable 1,000/10,000/100,000-unit Waygrid cells, exact utilization, deposits/withdrawals, deterministic capacity overflow, a separate searchable exact-metadata creature archive, and atomic area crafting across the pack, Waygrid, and nearby owned chests. Human settlements, human firearms beyond the requested Dwarven flintlock, Mekanism-style factories/drills/chunk loaders, monster evolutions/hybrids, and full legacy-town tile retrofits remain explicitly recorded in `ROADMAP.md`, matching the prompt's future-only boundary.
- Culture/content acceptance is covered by selectable Wood Elf and Dwarf factions; Glimmerwood/Snowcap biomes; luminous flora, fauna, ponds, fish and butterflies; connected tiled Moonbough towns; guarded underground Deepgear Holds; bows, tomes, spells, formulas, neutral/aligned companions, flintlocks/ammunition, lanterns, furniture, three golem tiers, ready-made/aligned golems, Golem Bestiary filtering, and mana/resource/blueprint-gated forging. Sea Dragon acceptance is covered by individual level/attribute presentation, swim-first AI, slower flight, shore movement, five-stage persistent care, abyssal nests, Atlantian charts, quests, eggs, equipment, attacks, loot, and production portraits.
- World/UI acceptance is covered by connected full-tree topology/felling, cave-mouth plant exclusion, Meadow Grass saplings, 1-3-block connected peppermint, flush stacked water flora, both glowing Dreamblossoms, a polished forest temple and Hearthkin thatch, sitting furniture, repaired butterfly travel direction, full-size potion/shark icons, shared Moonberry art, recipe ingredient names, three quest pins, The Light Below acceptance, brighter/narrow directional torches, atomic merchant trade, and the chest-opening pointer gate. Map/weather acceptance is covered by biome ink, water blue, Sugarplum pink, stable chunk coordinates, 1x-12x zoom/pan, player heading, remote-player markers, roof-aware local rain, layered fading block clouds, and sun/moon occlusion.
- Multiplayer/runtime acceptance is covered by host-owned player inventory, equipment, selected slot, variant, vitals and skills; shared revisioned chests; guest block drops; out-of-pack dropping; placement collision around every player; PvP; host-authoritative mob health/death; smoothed remote creatures; held lights; reconnect restoration; female title identity; reusable invite codes; and forced guest exit when the host ends the room. Door occupancy, double-chest seam/lid orientation, renewable water, nonrenewing flowing syrup, preserved milk buckets, house-safe music selection, natural-spawn capacity, per-skill Ascendant effects, mining/melee/ranged/magic scaling, and browser context-menu suppression are separately covered by focused tests.
- White-canvas acceptance is covered by one delayed-release shared preview renderer, explicit disposal, Canvas2D fallback, and live renderer context-loss pause/restore. A real Chromium session repeatedly traversed title, avatar selection, advanced creation, generated gameplay, map, quests, Bestiary, moving hotbar selection, save, and return-to-title with zero errors or WebGL warnings. The visual pass caught and fixed the last mismatch: Deepgear now reads `Subterranean mountain holds` in the faction selector.
- Final verification: production build and Sites artifact pass; all 446 release tests pass; native TypeScript and whole-repository ESLint pass; 28 affected UI/culture tests pass after the final copy repair. Benchmark on this machine: four-source liquid settle 28.00 ms, 1,000 structure plans 400.85 ms, weather/cloud plans 904.62 ms, radius-16 chunk ordering 1.58 ms, 64 apiary cycles 169.61 ms, and herd/shoal/tree plans 305.17 ms. Desktop, 390-by-844 creation, gameplay, map, Bestiary, female avatar, culture portraits, Golem Forge, and tree-form visuals were manually reviewed.
- Suno workspace `29fdaafd-20f2-48d2-868e-2e89d77a783c` produced Moonbough clips `3b127a4a-fc82-48e6-81c1-068ade28ff67` / `c89a09b2-580a-46b7-901f-0e51bdbce18f` and Deepgear clips `baa014b6-e20a-46ca-a6d2-a7dbbb1b8e26` / `24b51a3c-5818-4629-90c3-dcceb04e21c6`. The selected local MP3s are wired to their settlement scenes and validated by the release suite.

## v1.1 Shared Wilds multiplayer hotfix (2026-07-11)

- Raised bounded block-action batches to 2,048 edits and expanded batch reach so complete generated trees replicate instead of being rejected while their local fall animation continues.
- Stopped guest tree animations from creating non-authoritative phantom drops.
- Preserved guest pickup cooldowns across frequent host drop snapshots and targeted pickup acknowledgements to the collecting peer.
- Bundled cursor/player state with shared-container changes so chest and inventory transfers commit atomically on the host.
- Canonicalized adjacent placed and legacy chest inventories into one 54-slot superchest before replication.
- Added host-side hostile-mob melee damage for remote players, including inventory-aware death handling and full-health guest respawn.
- Bumped the release to v1.1.0 Shared Wilds and updated README/changelog metadata.
- Verification: 71 focused multiplayer/tree/world tests pass; production Sites build passes.

## v1.2 character and world polish (2026-07-12)

- Preserved the complete current request byte-for-byte (plus one terminal newline) in `V1_2_USER_PROMPT_VERBATIM.md`; it is the temporary release acceptance source and must be deleted only after the final audit.
- Release direction: a cleaner field-kit title/customization workspace; durable browser/player identity; host-authoritative shared-world actions; restrained Skyrim-style navigation; warmer settlement/world polish without reducing simulation depth.
- Added a canonical `ANY_COAL` recipe ingredient so charcoal substitutes everywhere coal is accepted, including torches and Deepgear powder recipes. Capture Orb crafting now yields four. The focused 20-test crafting/avatar suite passes.
- Stabilized the v1.2 multiplayer authority path: fixed the fatal synthetic mob combat actor, guarded transport failures from the render loop, added stale-mob tombstones plus immediate authoritative mob/drop images, and added replicated full-tree fall effects so accepted guest felling removes the voxels while every peer sees the animation. Guest player/chest sync now runs at 80 ms and uses expected host revisions so stale health/inventory images cannot resurrect old state.
- Character sessions now use durable browser-profile network ids across title and in-world join, carry sex/race/colors/profile data through identity, pose and saved player state, migrate legacy browser-owned player records, and repair legacy zero-heart reconnects. Capture/release/recall and companion follow/hold/distance commands are host-owned creature actions; owner/name/command/attunement travel in mob images and remote-owned followers form up on their actual keeper. The wide/duplicate-arm illusion was traced to torso scale overwriting and fixed in the shared player rig.
- Multiplayer verification: native TypeScript passes; 20 focused multiplayer/identity/player-model tests pass; the full tree regression slice previously passed 9/9 in the same worktree.

## v1.2 connected settlements (2026-07-12)

- Extracted one deterministic frontier-grown tile graph shared by every culture planner. The graph guarantees every tile reaches the civic center while allowing seed-specific branches, loops, and courtyards.
- Expanded Hobbit, Goblin, Sugarcourt, and Atlantian layouts to the same 13/21/31-building scale as the newer Wood Elf and Dwarf planners. Surface cultures now use connected grid roads, multi-gate square perimeters with true openings, gate patrol anchors, bounded monster-safe lighting, and complete role/furniture pools; Atlantians retain an open, vertically layered reef topology with connected current approaches and no inappropriate walls.
- Preserved schema 1, population targets/hard limits, resident role/routine inputs, faction palettes, and host-owned settlement state. Focused settlement/culture verification passes 35/35; scoped ESLint is clean. Native TypeScript currently reports only concurrent engine/UI fixture integration errors outside the settlement files. A browser smoke capture loaded the current title/world scene with valid `render_game_to_text` and no console-error artifact.

## v1.2 ecology and homestead content (2026-07-12)

- Added a complete Cotton -> String -> Cloudwool farming loop plus Suncrest Carrots and Bluepod Beans, including stable block/item ids, hydrated growth stages, sparse natural placement, scythe replanting, recipes, creative entries, drop contracts, and Plant Compendium records. Surface flora now rejects water, syrup, honey, lava, waterlogged cells, and cave-mouth air.
- Added four passive, skittish, food-lured rabbit variants (Meadow Cottontail, Russet Rabbit, Frost Hare, and Chocolate Bunny), including taming/breeding/capture metadata, biome spawns, exact ground contact, readable production models, and animated hops. Added two bottom-dwelling Sea Slugs and a Pocket Goldfish with production models and aquarium motion contracts.
- Added a canonical connected-aquarium state module: every cell in one connected component resolves the same stable key, capacity scales one resident per block up to twenty, swimmers remain suspended, slugs remain on pebbles, and same-species adults can repopulate only below capacity. Added seam-free connected aquarium and warm fireplace world geometry.
- Added craftable Wildwood and Sunmetal shields plus complete item metadata/recipes and the v1.2 aquarium/fireplace content contracts. Generator v12 preserves v11 authored edits while adding the new sparse content.
- Verification: 134/134 focused world/content/model/storage/shield regressions pass; native TypeScript and `git diff --check` pass. The production ecology sheet and portraits in `output/v1-2-ecology-review` were manually reviewed after correcting rabbit ground offsets; all four rabbits now contact the ground plane exactly and the slugs/goldfish remain legible at field-guide scale.

### v1.2 verbatim acceptance audit and release gate - 2026-07-12

- Re-read the complete 15,756-byte, 145-line `V1_2_USER_PROMPT_VERBATIM.md` acceptance source (SHA-256 `30F988C5E67F1269ACCFF3768BEC06B57A6BEAB7DF45E5DF7556D13E57DD5C42`) after integration. The clause audit found no omitted v1.2 feature. The final follow-up closed the only audit gap by enabling food-lure behavior for six appropriate non-rabbit herd/mount species.
- Multiplayer acceptance covers immediate authoritative guest tree/mob removal and fall/death feedback; durable browser/character identity across both join routes; canonical vitals, inventory, equipment, appearance and starting skills; revision-safe shared containers; demand-sync for arbitrary chests and boat holds; dirty retries under backpressure; host-owned PvP, drops, feeding, taming, breeding, saddling, mounting, milking, leads, Capture Orbs, aquariums and companion panels; full weather state; and a visible pre-peer host waiting state. Focused multiplayer/invite/identity/aquarium checks pass 40/40, with the authority stability slice passing 17/17.
- Character, UI and world acceptance covers the seven-race/two-sex Character Studio, twenty-point creation budget, Atlantian movement/breathing, sprint-swimming and water entry, off-hand shields/lights, recipe pattern board and search, inventory/chest utilities, Waygrid systems, corrected map heading/compass/tracking, active effects, Bartering/Luck/Exploration perks, direct quest/trade routing, all-culture tiled settlements, cotton plus two crops, four rabbit families, fireplaces, connected aquariums, 80-source nearest-first lighting, smooth sky/cave/weather transitions, block cracks/tool hints, reduced flora bounds, food lure, and hybrid-touchscreen controls that defer to a fine pointer until actual touch input.
- Production visuals were reviewed at delivery scale: the v1.2 title, HUD, map, inventory, recipe book, skills/effects journal, Bestiary, Plant Compendium, all-creature field guide, all-plant field guide, and final isometric/front/side model sheets. The title reports `v1.2.0 Trailbound`; the guides contain 123 creature renders and 42 plant renders including full-tree examples; tools/shields, dragon armor, crafting table, seated limbs, Wood Elf features, Dragonfly wings and Taffalo rear feet use the corrected production rigs.
- Final validation passes: verified Sites build/artifact; 521/521 tests across all 67 test files with no failure, skip or todo; native TypeScript; clean whole-repository ESLint after excluding the already gitignored `work/` scratch root; and `git diff --check`. Final benchmark: water settle 14.08 ms, 1,000 structure plans 184.67 ms, weather/cloud plans 431.07 ms, radius-16 ordering 0.65 ms, 64 apiaries 83.58 ms, and 16,000 herd/shoal motions plus 136,161 tree blocks 132.98 ms.
- The temporary verbatim prompt has served its acceptance purpose and is deleted immediately after this record, before the v1.2 release commit, as requested.

## v1.2 multiplayer authority hardening (2026-07-12)

- Extended the reliable creature protocol with host-resolved interactions. Guest feeding, taming, breeding, saddling, riding, companion panels/commands/renaming, Capture Orb lifecycle, aquarium moves, cow milking, and leads now mutate the host mob plus host-owned inventory before the result returns; mount identity also travels in player poses so the host's 5 Hz mob image follows the approved rider instead of rubber-banding.
- Shared chests now open through a targeted authoritative request. General snapshots no longer truncate/send the first 32 arbitrary containers, guests clear local-world chest state on join and display inert placeholders while waiting, and each mutation validates both the chest revision and the matching host-owned player revision. Host changes are delivered only to peers actively viewing that container.
- Reliable `send() === 0` is no longer treated as success: player/container signatures remain dirty, pickups remain retryable, and bounded retry queues cover critical guest block/combat/creature requests plus host player/combat/creature acknowledgements.
- Character starting allocations now travel in the validated peer identity and are applied only for a genuinely new host-owned player record; reconnects retain their saved skills.
- Added regression coverage for the pre-peer one-code host UI state, demand container selection beyond the old prefix, dual revision rejection, send-zero dirty semantics, host-owned companion feeding, and host-approved mounting. Native TypeScript, scoped ESLint, and the focused 17-test multiplayer suite pass.

## design-1 integration (2026-07-12)

- Merged the latest pushed `github/design-1` tip (`53cb880`) into v1.2 `main` without checking out, modifying, or deleting the separately active design worktree.
- Preserved Trailbound's v1.2 item allocations and assigned the Deepgear Courser blueprint/orb new non-colliding ids. Combined v1.2 rabbit and aquarium ecology with the branch's Courser ecotypes, Frostquill coveys, bird/audio polish, dragon redesigns, Dwarven forge commerce, portraits, and regression contracts.

## v1.3 atmosphere and adventure release (2026-07-12)

- Preserved the complete 61-line, 3,401-byte current request in `V1_3_USER_PROMPT_VERBATIM.md` with SHA-256 `49FF9ECE14BDABA3A849D5A0AB3D936464893B4A2B91966F4ACA0A1FF5FC8B42`. It is the temporary acceptance source and must be audited clause-by-clause, then deleted immediately before the v1.3 release commit.
- Visual thesis: denser hand-painted voxel materials and warmer local light should make each biome read by atmosphere at a glance, while caves, storms, oceans, and winter remain distinct without crushing visibility.
- Content plan: integrated spatial/environment audio; grounded rabbit and improved navigation behavior; twenty landmarks and five dungeons; detailed dungeon fauna and legendary rewards; biome texture comparison artifact; final branch merge and release audit.
- Interaction thesis: sound fields crossfade by biome and enclosure, positional events locate creatures and impacts, birds steer through sparse look-ahead probes, and POIs reveal themselves through silhouette, lighting, sound, and bounded encounters rather than extra HUD clutter.
- Audio pass: preserved and semantically renamed all 18 supplied lossless WAVs, kept every `design-1` creature sound in one audited manifest, and added bounded HRTF spatial voices with 30 Hz listener updates, distance culling/rolloff, pooled Panner/Gain nodes, deterministic eviction, and complete disposal. Rain, crickets, wind, winter wind, cave, ocean, and active-swimming beds now lazy-load and crossfade by weather, time, biome, enclosure, and movement. World emitters such as creatures, dragons, magic, chests, and doors use position-aware cues; player-local snow/dirt steps, water entry, quests, achievements, and UI stay direct. The 12 focused audio asset/runtime tests, native TypeScript, scoped ESLint, and audio diff checks pass.
- Added a production terrain-atmosphere module for nine main surfaces: Wildwood, Snowfield, Siltfen, Sunstep Savanna, Flower Meadow, Rainveil Jungle, Sakurabloom, Sugarplum Vale, and Glimmerwood. Each owns deterministic top/edge motifs with stronger material separation while retaining the 16px atlas and nearest-filter performance contract; biome vertex tints now reinforce the same atmosphere.
- Rendered and manually reviewed `output/v1.3-biome-atmosphere/blockwild-biome-textures-before-after.png`. The final comparison keeps all labels clear and shows the exact legacy/current texels used by the game. Three focused palette/atlas tests pass.
- Set the human-facing release identity to `v1.3.0 Echoes and Ruins`; save and generator schemas remain independently versioned.

### v1.3 creature attachment and navigation pass

- Rebuilt the ear roots shared by Meadow Cottontail, Russet Rabbit, Frost Hare and Cocoa Truffle Bunny so each articulated shaft overlaps a crown-root tuft in every pose; Frost Hare tips now inherit their ear pivots. Regenerated all four deployed Bestiary portraits from those production rigs.
- Added a fixed-budget 3D bird router (maximum 15 heading/altitude probes on a replan), short safe-route caching, deterministic side hysteresis, canopy climb choices, blocked-route recovery, and low-cadence scored perch searches that reject tight or obstructed approaches. Birds now reach a perch before entering slow perch mode and use correct foot-offset grounding instead of steering laterally through tree crowns.
- Extended the existing ground router with a 55 ms proven-route cache while preserving follower recovery/formation behavior. Melee reach now includes a bounded species/scale body allowance for local, remote-player, aquatic, resident and construct attacks, so medium and large attackers stop short of target overlap.
- Deterministic fauna/model verification passes 27/27; native TypeScript and scoped ESLint pass. The required web-game client loaded v1.3 with a valid `render_game_to_text` snapshot and no console-error output. `output/v1-3-creature-ai/v13-creature-ai-audit.png` was manually reviewed after two layout corrections; its JSON audit reports exact rabbit ground contact, both ears attached on all four variants, a stable tree detour, only 55 route probes over 105 simulated frames, and a measured 15/15 maximum replan budget.

### v1.3 authored adventure content

- Added exactly twenty deterministic landmark archetypes—eight tiny trail details, eight medium encounters, and four large destination silhouettes—on a sparse 12-by-12-chunk grid. Added exactly five distinct three-stage dungeons on a separate 36-by-36-chunk grid: Rootbound Labyrinth, Starless Observatory, and Brassdeep Foundry underground; Stormglass Citadel and Bloomrot Cathedral aboveground. Every dungeon has three named room objectives, at least four persistent encounter markers, a midway cache, a resolved master-vault, a boss marker, spell-tome opportunities, its own material/light identity, and a natural map heart. Generation 13 applies bounded cross-chunk slices without changing older landmark seeds.
- Added six detailed production encounter rigs and Bestiary records: Auric Scarab, Rootwrithe, Bellroot Matron, Vaultwing, Cinder Maw, and Ossuary Keeper. All five grounded rigs now audit at exact contact; Vaultwing remains an explicit airborne reference. Their 19–29-part Three.js rigs, portraits, behavior/lore, encounter spawns, persistent ids and concrete drops share the runtime/Bestiary/field-guide path.
- Added three authored legendary heirlooms with save-stable ids and dungeon provenance. Dawnthread Saber and Deepdelver's Promise have semantic infinite durability; Dawnthread gains 35% damage against undead/constructs, Deepdelver gains 50% mining speed on stone/ore/crystal, and the 6,000-durability Briarheart Crook gains 20% damage against hostile creatures. Each has a unique five-to-seven-part held model, dedicated loot key and UI legend.
- Focused adventure verification passes 13/13, including live coast stamping, reversible underground routes, grounded dungeon spawns, hostile airborne pursuit, exact map names, legacy dragon-spawn compatibility, and neutral/motion limb-axis contracts for Auric Scarab, Rootwrithe, and Bellroot Matron. Native TypeScript passes, and the generated public field guide contains all six new production portraits. The final isometric/front/side mob-and-heirloom sheets and 25-panel deterministic blueprint atlas were manually reviewed at `output/v1-3-adventure-final`; the corrected neutral/stride limb sheet at `output/v1-3-limb-audit-final` confirms attached joint chains and planted feet.

### v1.3 release documentation

- Updated the repository README, changelog, and forward-looking boundary for `v1.3.0 Echoes and Ruins`. The docs now reflect the merged `design-1` tip `aaa5fbf`, 31 integrated v1.3 WAVs (18 supplied plus all 13 from `design-1`), HRTF audio, exact 20-POI/5-dungeon catalogs, six encounter creatures, three legendary items, fixed-budget creature routing, attached rabbit ears, nine biome-surface recipes, 161 production portraits, and generator-v13 migration from version 12.

### v1.3 verbatim acceptance audit and release gate - 2026-07-12

- Re-read the complete 61-line, 3,401-byte `V1_3_USER_PROMPT_VERBATIM.md` acceptance source after the final `design-1` integration. Its SHA-256 remains `49FF9ECE14BDABA3A849D5A0AB3D936464893B4A2B91966F4ACA0A1FF5FC8B42`. Every requested audio, AI, POI, dungeon, creature-detail, legendary-item, biome-atmosphere, comparison-artifact, branch-merge, documentation, release, and publishing clause is represented by production code or a checked release artifact.
- The follow-up visual audit confirmed that Auric Scarab's prior inverted limb axes and Rootwrithe/Bellroot Matron's incorrect shoulder parenting were real. Auric now uses six attached hip-to-knee-to-foot chains that bend downward; Rootwrithe's hands inherit their elbow pivots; Bellroot's paired arms and intentional rear third arm all originate at shoulders. Neutral and stride/windup poses were reviewed in front and three-quarter sheets, and the exact pivot/axis contract is covered by the thirteenth adventure regression.
- Final validation passes: production Sites build/artifact; all 553 repository tests with no failures, skips, or todos; native TypeScript; whole-repository ESLint; and `git diff --check`. Benchmark on this machine: four-source water settle 17.58 ms, 1,000 structure plans 250.86 ms, weather/cloud plans 511.88 ms, radius-16 ordering 0.88 ms, 64 apiary cycles 97.75 ms, and 16,000 herd/shoal motions plus 136,161 tree blocks 163.56 ms.
- Browser QA covered the v1.3 Character Studio/title, advanced world creation, generated gameplay, 441-chunk Known Roads map, inventory/avatar/crafting panel, and the 161-entry Bestiary. The in-app browser reported no warnings or errors; the deterministic web-game client produced a valid v1.3 title-state snapshot and clean visual capture. The biome before/after atlas, creature AI audit, corrected limb sheets, adventure blueprint atlas, detailed model/heirloom sheets, and latest aquatic-design sheet were all manually reviewed.
- The last pre-release fetch confirms local `main` contains the exact current pushed `github/design-1` tip `aaa5fbfddb01a7bc72afd9f9b5dd142a55aa9c08`; the separate design worktree remains untouched and the branch remains alive. The temporary verbatim prompt has served its acceptance purpose and is deleted immediately after this record, before the v1.3 release commit, as requested.

## v1.3.5 wayposts and Palimpsest expansion - 2026-07-12

Original prompt: Add 8 more interesting POIs and another dungeon. Be clever and fun. Add at least one more monster and 2 more mobs. Make the models detailed. Add new blocks and things as needed. Add some POIs with humanoids. These ones should be somewhat unique. Still aligned to a faction, and able to trade and give some directions to the nearest large town of their faction. Maybe even some quests and such. Just an incremental update to 1.3.5. Report back when done and synced. You might even want to check for any commits to merge in from design-1.

- Release direction: six small culture-specific wayposts make the long roads feel inhabited without replacing towns; each has a deterministic named faction resident, finite merchant stock, individual side-work generation, and a conversation action that points toward the nearest viable larger settlement of the same faction. Two wildlife curiosities and the Palimpsest Vault add the stranger adventure half of the update.
- Content plan: Lantern Piehouse, Switchback Tollcamp, Tideglass Embassy, Sugarwind Teahouse, Moonpost Listening Tree, Skyshaft Depot, Whistlekite Roost, Clockwork Burrow, and the three-stage underground Palimpsest Vault. New production creatures are the flying Mossback Kite, tameable Clockwork Marmot, and hostile Inkmaw Curator. New build materials are Wayfarer Canvas, Whisperglass, and Storybook Brick.
- Branch audit: a final fetch found pushed `github/design-1` commit `789bf433f05cf717157762856bdc5deb48a08ba2`. It is merged into this release while the separate `work/dragon-redesigns` checkout remains untouched. The merge preserves both content sets by allocating distinct waypost and mythic-dragon block, item, atlas, and audio ranges.
- Implemented all six faction wayposts with named persistent aligned residents, finite merchant creation, normal individual side-quest offers, traveller caches, and a direct dialogue choice that marks and tracks the nearest known settlement of the same faction, preferring a town over a village or hamlet. Whistlekite Roost and Clockwork Burrow carry their own persistent creature populations and silhouettes.
- Palimpsest Vault now contributes a fourth underground three-stage route with Errata Vestibule, Rewritten Stacks, Last Folio, reversible stair access, two stage-two encounters, an Inkmaw Curator boss, spell-bearing living-archive loot, and a discoverable map heart. The release guard now requires exactly 28 POIs and six dungeons.
- Added save-stable ids, recipes, atlas art, aliases and creative entries for Wayfarer Canvas, emissive Whisperglass and Storybook Brick; Wind Silk, Living Ink and Clockwork Springs connect the three creature drop tables back into crafting and utility lore.
- Regenerated the deployed creature portrait sheet at 166 entries. Manually reviewed the nine-creature field guide, front/side/isometric model sheets, 34-panel blueprint atlas, and Gold/Silver dragon-egg audit. Mossback Kite, Clockwork Marmot and Inkmaw Curator carry 29, 24 and 28 visible boxes respectively; both ground rigs audit at exact floor contact.
- Final verification: production build and Sites artifact pass; 555/555 repository tests pass with no failures, skips or todos; native TypeScript passes; scoped ESLint over every changed source/test/script passes; and the official web-game browser client loads the v1.3.5 title/Character Studio with a valid render-state snapshot and no console-error artifact. The initial production-server smoke exposed only a stale in-process manifest after rebuilding under a running server; a fresh Vite browser smoke was clean.

## v1.3.8 Quiet Wayfinding - 2026-07-12

Original prompt: Have the new Skyrim GUI stuff visually refresh 4x faster. Take off the bit above the bar that tells you the direction, as that's also handled by the built in compass Skyrim thing. But you can have it show the name of a POI if I'm pointed straight at one that is being shown on the Skyrim thing. And have it fade in/out a bit more cleanly. Please just change it so the new more detailed map mode is toggleable at any scale. And let me zoom out more. Make the thimbledeer antlers better. They have floating parts right now. Make the recipes and pack GUIs the same size (at least the background). Add a taller grass variant where they are broken together and the bottom part connects well to the top block. Make the cracking effect darker. Switch out the walking sound with the new one. Make this one even a little softer than it is. Add in the hit sound when breaking things or hitting blocks in general, this one as a default. Take any new commits from design-1 and merge them in. 1.3.8 update. Commit and push to all.

- The Trail Compass now receives HUD snapshots every 35 ms instead of 140 ms. The redundant heading readout is gone; only a centered natural POI gets a transient focus label, with retained text and opacity, motion, and blur transitions for a clean exit.
- Detailed terrain is an explicit map toggle independent of scale. Ordinary maps zoom out to 0.5x, Trail Memory to 0.25x, and Exploration Ascendant to 0.1x while preserving normalized legacy map state.
- Added a naturally generated lower/upper tall-grass pair with matching edge pixels, shared cross-plant connection geometry, one atomic removal plan from either half, and one normal Fiber drop roll. Block cracks now use a substantially darker staged stroke.
- Rebuilt both Thimbledeer crowns as overlapping root/post/branch/stem/cup/rim chains and manually reviewed the regenerated isometric, front, and side model sheets. Pack and Recipes share the same 1,220-pixel responsive panel width.
- Integrated `step-grass-soft.wav` at reduced grass-step gain and `block-hit-default.wav` as the sampled mining/breaking fallback. Both supplied PCM WAVs pass the asset validator and are each registered exactly once in the lazy audio manifest.
- The final release fetch discovered a newer pushed `github/design-1` tip, `fbccf1a0237d0a36863966b8b8c8b135caca0088` (`Upgrade wildlife and lighting`). It is merged without checking out, modifying, or deleting the design branch. Save-stable collisions were resolved by preserving the v1.3.5/v1.3.8 allocations and assigning Lightning Bug Jar block 201 plus Shears/Lightning Bug Jar items 461/462.
- The merged release includes Lightning Bugs, jarred/off-hand light, Sunmetal Shears, upgraded wildlife anatomy and behavior, improved held lighting, and five lossless creature calls. Regenerated all 167 deployed portraits from the combined production model source, retaining the attached rabbit ear roots and connected Thimbledeer crown.
- Pre-merge validation passed the production Sites build/artifact, whole-repository ESLint, native TypeScript, and all 558 tests. Browser QA at 1440 by 900 measured Pack and Recipes at the same 1220 by 752 background, exercised the detailed terrain toggle at 0.5x zoom, confirmed the compass heading duplication is absent, and reported no page or console errors.
- Final merged validation passed the production build and Sites artifact plus all 568 repository tests with no failures, skips, or todos. The full gate exposed two stale integration expectations (the expanded pollinator roster and lost rabbit hop translation); both were repaired, then all 568 tests, native TypeScript, scoped merge lint, and patch-integrity checks passed on the corrected tree.

## v1.3.9 Living Ruins structure pass - 2026-07-12

- Preserved the current request verbatim in `V1_4_USER_PROMPT_VERBATIM.md` for the final acceptance audit. Initial branch fetch found `github/design-1` at `fbccf1a`, already contained by `main`, so the provisional release lane is v1.3.9; this must be rechecked immediately before release.
- Replaced the four shared underground three-box plans with deterministic 7-11-cell connected dungeon graphs. Every plan retains a fixed entrance-to-vault spine, adds seeded same-level side chambers inside the existing one-neighbor generation envelope, keeps reversible stairs and stable encounter/loot anchors, and gains profile-specific roots, constellation nodes, assembly bays, or archive stacks.
- Reworked Skyglass Observatory, Emberwatch Tower, Pilgrim Bathhouse, Clockwork Burrow, and the Shattered Colossus with curved, broken, stepped, chamfered, or asymmetric silhouettes rather than rectangular massing.
- Added a complete save-stable wrought-iron door family at block ids 202-209 and item 463: two orientations, open/closed, lower/upper, real separated bar geometry, crafted/held forms, correct family-preserving toggle/drop behavior, and authored dungeon thresholds. Generator version 14 migrates version 13 saves without moving edits.
- Every faction settlement still uses the shared connected tile graph, but hamlets/villages/towns now choose deterministic counts within 10-16, 17-25, and 26-36. The world stamper now honors planned facing, rotates footprints and entrances, chamfers civic corners, and uses faction-specific roof silhouettes plus arched Dwarven ceilings.
- Focused structure, dungeon, settlement, door, save-migration, world, ecology, ocean, and dragon validation passes 131/131. Native TypeScript passes. The generated `output/v1-3-9-structure-design/adventure-blueprint-atlas.png` was manually reviewed: the five revised landmarks have readable organic silhouettes and the underground set visibly branches into distinct connected module footprints.
- A later release fetch found new pushed `design-1` commit `f8a020513a3d6aa8dc782554eed50642da08a34e` (`Finish living world redesign`), so the requested conditional version advances to v1.4.0. Its living-world ecology, spawn activity/microhabitat rules, dragon field-note milestones, discovery hints, biome flora, plant renders and audit suite are merged while the branch remains intact.
- The one real merge overlap was the rabbit hop pose. The combined fix preserves v1.3's attached rabbit ears, Thimbledeer crowns, adventure rigs, and non-accumulating design-branch hop translation; the focused model/fauna regression passes 49/49 after reconciliation.
- Final prompt audit: the five-line verbatim request was preserved as `V1_4_USER_PROMPT_VERBATIM.md` (SHA-256 `B64592C03B5E19779BBDDE703334CEDF24BE72F5662A64C228392F27794B5E43`) and checked clause by clause. Revised organic landmarks, 7-11-cell tiled dungeons, see-through wrought doors, all six variable tiled settlement cultures, optional new blocks, the latest pushed `design-1` tip, v1.4 versioning, GitHub/Sites release steps, and prompt cleanup are each accounted for.
- Final validation: the bounded production build succeeds; metadata/audio checks pass 7/7; the complete TypeScript gameplay suite passes 565/565; the release-focused metallic/ecology pretests pass 7/7; TypeScript, ESLint, and `git diff --check` pass. The official game client reports v1.4.0 with valid state, and manual reviews cover `output/v1-4-living-ruins/adventure-blueprint-atlas.png`, the regenerated 46-plant sheet, the v1.4 title screen, and the held wrought-door model.

## v1.4.1 Wildlife Voices sync - 2026-07-12

- Merged `design-1` commit `f24ae37` through Git ancestry while preserving all newer v1.4 content and leaving the design branch intact. Reconciled its audio registry addition with the current spatial/HRTF playback options.
- Added and routed six complete wildlife WAVs for rabbit variants, small creatures, Runeowls, and Worldshell Leviathans, with focused asset and creature-cue regression coverage. Release metadata advances to v1.4.1 Wildlife Voices.
- Final merged validation passes the Sites production build, 565/565 full gameplay tests, 7/7 release pretests, 7/7 complete audio-asset checks, 59/59 focused audio/fauna/release checks, native TypeScript, scoped ESLint, and patch-integrity checks.

## v1.4.2 Shared World Repair hotfix - 2026-07-12

- Diagnosed frozen guest tree and creature visuals: the guest simulation branch deliberately skipped host-authoritative world simulation but also skipped the presentation-only falling-tree and mob-remains timers. Both presentation timers now advance on every peer while loot, block state, and mob state remain host-owned.
- Diagnosed guest placement stack restoration: placement voxel edits and player inventory revisions were separate asynchronous messages. Player-initiated placement now declares its consumed item, the host validates it against the placed block family, consumes one unit in the authoritative player snapshot, and returns that state with the action lifecycle. The guest suppresses its generic optimistic pack upload until the placement resolves.
- Shift-click changes now sync immediately. If another chest revision is already in flight, the newer local transfer is marked for replay on top of the accepted authoritative response and submitted as the next revision.
- Focused multiplayer, world, and protocol regression suite passes 77/77. The complete production build and all 568 repository tests pass with no failures, skips, or todos; release pretests pass 7/7; native TypeScript, scoped ESLint, patch integrity, and Sites artifact validation pass. The official web-game client reports v1.4.2 at 60 FPS with a valid title-state render and no console-error artifact; the title and world-creation screenshots were manually reviewed. Release publication remains to be completed below.

## v1.4.3 multiplayer/runtime pass - 2026-07-12

- Mouse-wheel hotbar selection is now purely client-predicted and rides the 20 Hz unordered pose lane; older host acknowledgements cannot snap the selected slot backward. High-rate interest-filtered mob/drop/time images also use the reconstructable unordered lane, while host AI, combat, loot, inventories, facilities, and trading remain authoritative.
- Shared furnaces now use the same revisioned atomic container protocol as chests, including burn/progress clocks and exact pack+container item-conservation validation. Dragon/leviathan cargo keys require a live nearby cargo-capable creature. Generic facility overlays receive host-authored open/live/close snapshots and reject opaque guest state replacement; aquariums retain their typed interactive actions.
- Leads persist an owner id, render to the acting keeper on every peer, never jump to the host when a guest disconnects, and use host-validated hitch/unhitch actions for real nearby fences. Merchant open/trade/close is host-authoritative with per-player persistent wallets and inventories, shared merchant stock, range/liveness revalidation, and atomic buy/sell responses.
- Focused TypeScript, ESLint, and 47 multiplayer/farming/transport regressions pass. Remaining intentional boundary: generic non-furnace workstation mutation APIs need typed per-operation multiplayer intents before guests may author changes; their current network surfaces are synchronized read-only rather than accepting forgeable opaque state.

## v1.4.3 Shared Systems polish - 2026-07-12

- Preserved the current request and both follow-up additions verbatim in `V1_4_3_USER_PROMPT_VERBATIM.md`; the explicit completion goal remains active until the final clause audit, prompt-file deletion, dual push, and Sites deployment finish.
- Spell-wheel visual thesis: a quiet occult dial with a single gold focus and no decorative rings when empty. The no-favorites state is now one compact framed prompt rather than a full 640-pixel radial interface with overlapping center copy. A capture-phase Q key-up handler closes it reliably even while the engine is paused/unlocked by the overlay. Merchant submit labels explicitly opt out of the global pixel-button text shadow.
- Parallel passes are in progress for multiplayer/client authority and shared facilities/trading, world/dungeon/light/texture/flora rendering, and orb/audio/icon content polish.
## v1.4.3 inventory/content slice — 2026-07-12

- Halved the authored cricket-loop base gain from 0.24 to 0.12 while preserving the existing weather/night crossfade mix.
- Centralized inventory stack compatibility: filled Capture Orbs are singleton records in cursor clicks, shift transfers, chests/furnaces, pickup/drop merging, multiplayer inventory normalization, and digital storage. Plain crafted empty orbs still stack to 16.
- Filled-orb held and hover titles now show a creature's custom name plus friendly species name.
- Added a dedicated isometric Surveyor/Cartography Table inventory icon with a parchment chart, coast/route ink, compass mark, brass ruler, and table legs; inspected at real 28 px and 22 px sizes.
- Focused verification: 37/37 inventory/orb/storage/audio tests pass; `npx tsc --noEmit` passes. Official web-game client title/icon-audit capture has no runtime errors, and the dedicated Cartography Table card capture was manually reviewed.

## v1.4.3 world rendering slice - 2026-07-12

- Raised animated environment-light capacity from 8 to 32 on desktop and from 4 to 16 on touch, while raising nearest baked voxel-light participation from 80 to 256 sources. Dynamic selection is now stable and nearest-first rather than view-ray-biased, so a nearby torch keeps lighting its room after the player turns away.
- Rebuilt Wild Rune Stone tile 72 as layered weathered slate with fractures and a hand-cut green mineral sigil. Wild Peppermint lower/middle blocks now select a dedicated full-height repeating cane tile while the top keeps the crowned tile; tile 162 is renderer-only and a regression proves that no save-stable block owns it.
- Repaired Bloomrot Cathedral's topology: its nave and both transept gardens now share a complete cruciform perimeter, explicit passable crossings, a protected public entrance, and root buttresses. Stormglass Citadel's complete gate-court perimeter was audited alongside it.
- Focused TypeScript, ESLint, and 28 lighting/world/adventure checks pass. The official web-game client produced a valid 60-FPS v1.4.2 title snapshot on a clean Vite server with no console errors. Manually reviewed `output/v1-4-3-world-rendering/world-texture-audit.png` and the regenerated `adventure-blueprint-atlas.png`; the rune/cane silhouettes and repaired cathedral footprint are clean.

## v1.4.3 Shared Lanterns final acceptance - 2026-07-12

- Re-read the complete 30-line, 1,799-byte `V1_4_3_USER_PROMPT_VERBATIM.md` acceptance source. SHA-256: `A970B20202D5302A3CB4252F9BB56BC1272DE73C831CF6F7875A635222AA000A`. Every spell-wheel, multiplayer traffic, cricket, orb, icon, rune, lighting, dungeon, lead, peppermint, shared-inventory, torch-facing, merchant-trade, text-shadow, verification, cleanup, and publishing clause is represented by production code, a focused regression, or a reviewed artifact.
- The final authority audit found and closed four integration gaps before release: selection-only wheel changes were still dirtying the reliable full-pack signature; furnace reach was parsing its prefixed id instead of its raw coordinates; dragon panel commands/shoulder/scale harvest were still local on guests; and generic facility-local edits could leak after close. The repaired paths use lightweight pose selection, real Furnace block validation, typed owner/range-checked dragon actions, and authoritative pack rollback for read-only shared workstations.
- Shared furnaces, chests, conservatories, aquariums, boats, and dragon/leviathan cargo are interactive host-owned containers. Apiaries, orb racks, healing stations, both Waygrids, Golem Forge, Alchemy Stand, Distillery, and Sugarworks expose live shared host state but remain read-only to guests until each heterogeneous operation receives a typed host validator; opaque machine replacement is rejected rather than allowing item or timer forgery.
- Final local verification passes: all 598 TypeScript gameplay/content tests and all eight rendered-metadata/audio tests; native TypeScript; whole-repository ESLint; `git diff --check`; the production vinext build; and Sites artifact validation. The official web-game client reports v1.4.3 with a valid state and no error artifact.
- Manual visual QA covers the compact empty spell panel in `output/v1-4-3-spell-wheel-final/shot-0.png`, the real-size Surveyor Table icon card, Wild Rune Stone and connected peppermint audit, and the repaired adventure blueprint atlas. The empty wheel reads as one quiet framed prompt with no radial noise or overlapping copy.
- The temporary prompt copy has completed its acceptance purpose and is deleted immediately after this record, before the release commit and dual publication, as requested.
## Map performance and projection pass - 2026-07-12

Current request: Optimize the increasingly laggy explored-world map, make detailed terrain show water as blue instead of the ground beneath it, and use one uniform horizontal/vertical scale so map chunks remain square.

- Replaced the per-chunk detailed SVG tree with a retained canvas terrain layer. Terrain redraws only when exploration, view, detail mode, or viewport size changes; hover no longer allocates event handlers for every explored chunk.
- Added viewport culling, visible marker/player culling, cached explored-set lookups, and a no-clone/no-sort steady-state path for the 720 ms discovery update.
- Added a shared aspect-correct map projection for terrain, pins, and hover hit-testing. Wide or tall panels now center the map rather than stretching chunk cells.
- Detailed sampling now gives water precedence whenever any bounded quadrant sample contains water; legacy ocean/river samples are forced to their blue biome ink during canvas rendering.
- Focused TypeScript, scoped ESLint, and 32/32 map/quest/weather tests pass. A 65,536-chunk benchmark retains the full initial build but makes 5,000 steady 256-chunk discovery batches average 0.0436 ms each while reusing the same state.
- Official-client startup QA and a dedicated fresh-world browser pass report no console/page errors. Manual review at 1.0x and 1.8x confirms square cells, centered letterboxing, aligned player pins, working zoom, and zero per-chunk terrain DOM nodes; the canvas backing size exactly matches its inner viewport.
- Final production verification passes the bounded Sites build/artifact, 568/568 gameplay tests, 7/7 release pretests, TypeScript, scoped ESLint, and patch-integrity checks. Ready to commit and push `design-1`.

## v1.4.4 multiplayer character and Wayfarer repair - 2026-07-12

- Diagnosed the title-join zero-vitals fault as a stale client revision stream: a previous session revision could make the new host's initial health/hunger image return early. New sessions reset the stream and the initial snapshot has an explicit force-apply path.
- Player journals now persist separately from the hot 80 ms pack/vitals state. Quest history and referenced side-quest definitions, full explored map, bestiary/plant discoveries, blueprints, magic/favorites, buffs, ranged loads, and bed respawn are normalized, UTF-8/base64 chunked under the reliable-message bound, host-saved by stable character identity, and restored on reconnect. Transfer state expires after 30 seconds and is capped per actor/direction.
- Wayfarer lifecycle is host authoritative for guests: launch/board/leave/pack are typed reliable intents, the selected boat item is consumed exactly once, only an empty unoccupied hold can return one boat item, and seat-zero helm input rides the low-latency pose lane with 400 ms stale-input expiry. A forgiving bounded ray volume makes the bobbing hull easier to board.
- Guest block breaks now leave loot creation to the host. Beds, doors, and double-tall plants collapse to one canonical pickup from either half; ordinary blocks retain mapped drops. Guest-triggered tree felling uses the complete textured fall on every peer, but only the host aggregates logs/attachments plus leaf-derived drops at the landing point.
- Final focused verification passes 59/59 across multiplayer transport, maximal 65,536-chunk progression transfer, reconnect persistence, stale-transfer bounds, title vitals, boat lifecycle/steering/targeting/packing, tree felling, and multi-block pickup. Native TypeScript and scoped ESLint pass; root integration owns the final release browser and publication gates.

## v1.4.4 meadow planting and Saltwind grounding - 2026-07-12

- Diagnosed the Meadow Grass failure as a split contract: `canPlantSaplingOn` already recognized Meadow Grass, but live block placement carried a second stale hard-coded soil list. `VoxelEngine.placeBlock` now delegates to the canonical farming validator, so Wildwood, Rainveil, Sakurabloom, and Candywood planting all share one living-soil policy.
- Grounded the Saltwind Lighthouse keeper table, chair, and sea chest at local Y=1 directly above the authored Temple Sandstone floor at Y=0. The chest marker moved with its chest, preserving loot interaction and save identity.
- Added live-engine placement coverage for every generic sapling family, Candywood's planting path coverage, and a complete Saltwind furniture/support/marker audit. The focused 77-test world/adventure/polish run, native TypeScript, scoped ESLint, and patch-integrity checks pass.
- Official web-game client QA on a clean Vite server produced a valid v1.4.3 title/create-world state without console errors. The new-world setup screenshot was manually reviewed; full release browser QA remains with the integration owner after the parallel multiplayer/UI changes settle.

## v1.4.4 recipe navigation and tome icon slice - 2026-07-12

- Recipe pattern cells now become accessible buttons only when their displayed ingredient is the output of another known recipe. Activating one clears any search filter or staging feedback and drills the pattern board into that recipe without moving materials or crafting.
- All eight reusable spell tomes now use a dedicated full-canvas colored book, visible page block, binding, and luminous rune silhouette instead of the undersized generic blueprint treatment.
- Focused verification passes 22/22 crafting/avatar/UI checks, native TypeScript, scoped ESLint, and patch integrity. The official web-game client reported valid title state and no console-error artifact; `output/v1-4-4-recipe-tome/browser/shot-0.png` was manually reviewed at the exact 28px inventory and 22px recipe sizes.

## v1.4.4 prompt acceptance and release audit - 2026-07-12

- Re-read the 1,155-byte, 18-line verbatim request copy immediately before release audit (`SHA-256 1002007D3B47E33A42A5873C2B48D9C4C5AD805E904509DC9B86F4857F46E5FA`). Every requested clause is represented below; the temporary copy is deleted only after this audit and before the release commit.
- Meadow planting: live placement delegates to `canPlantSaplingOn`; engine coverage plants Wildwood, Rainveil, Sakurabloom, and Candywood saplings on Meadow Grass.
- Recipe navigation: craftable ingredients on the pattern board drill into their own recipe, clear the filter/feedback, and never stage or craft. A real browser flow moved the board from Wooden Sword to Sticks with an empty query and zero console/page errors; the reviewed image is `output/v1-4-4-browser/recipe-drilldown.png`.
- Main-menu joins and reconnects: the new-session revision stream resets and the first host image force-applies health/hunger. Stable character identity now restores host-saved quest history, referenced side-quest definitions, explored map, Bestiary/Plant Compendium progress, blueprints, magic/favorites, buffs, ranged loads, and bed respawn through a separate five-second dirty, bounded chunk channel rather than the 80 ms pack/vitals lane.
- Saltwind Lighthouse: the keeper table, chair, sea chest, and chest marker moved down one block onto direct Temple Sandstone support, with exact structural assertions.
- Tome icons: all eight spell tomes use full-canvas colored books, bindings, pages, and runes. Both 28 px inventory and 22 px recipe sizes were reviewed in `output/v1-4-4-final-browser/shot-0.png`; the official client reports v1.4.4 and no error artifact.
- Design integration: fetched `github/design-1` immediately before the release gate; pushed tip `4c90e97603c37d65844767755e901072f176395c` is an ancestor of `main`, while the branch remains alive and unchanged.
- Wayfarer boats and pickup parity: guests send typed host-validated launch, board, leave, and empty-hold pack intents; launch consumes one selected boat, the bounded hull target is more forgiving, and fresh seat-zero guest input drives the host simulation with stale-input expiry. Host-owned guest breaking produces canonical ordinary drops and one pickup for a bed, door, or double-tall plant; guest tree felling keeps the full textured animation and aggregates harvest at its landing point.
- Release gate: after the final independent review, guest breaking gained the same persistent-container teardown/content release as local breaking and graceful disconnect now flushes dirty progression before transport closure. The bounded production build and Sites artifact validation pass; 609/609 gameplay/content tests, 8/8 rendered/audio tests, and 7/7 pretests pass. Native TypeScript, whole-repository ESLint plus scoped post-review lint, focused multiplayer/world/UI tests, and `git diff --check` are clean. Publication and live URL verification are the only remaining operational steps.

## v1.4.5 dragon visual rebuild - 2026-07-13

- Rebuilt the mature Fire, Steel, Sea, Gold, and Silver dragons around distinct anatomy and silhouettes: volcanic runner, armored foundry beast, manta-serpent swimmer, solar regent, and lunar blade-glider. Adult Ice geometry remains the visual control, with only its riding equipment brought into the new system.
- Added independently authored Stage I hatchling and Stage II fledgling forms for all six species rather than scaling adult geometry. Each young form carries recognizable species motifs, and Stage I rigs are explicitly shoulder-carry compatible.
- Upgraded the shared `dragon-v2` pose contract with stable breathing, idle accents, sleep, multi-phase attacks, head/neck follow-through, asymmetrical wing power strokes, tail motion, jaw motion, and complete young-form articulation. Live engine state now selects the authored form before animation so hatching and loading do not flash the adult rig.
- Reworked saddles, armor, reins, and cargo around each species' identity, including obsidian/ember Fire tack, crystalline Ice tack, industrial Steel cases, knotted Sea panniers, gilded Gold coffers, and crescent Silver fittings.
- Regenerated all six deployed dragon portraits directly from the production rigs. The reviewed before/after, Stage I, Stage II, adult, pose, and equipment sheets are under `output/v1-4-5-dragon-rebuild/`.
- Focused dragon verification passes 8/8, scoped ESLint is clean, native TypeScript is clean, and patch integrity passes.

## v1.4.5 Dragon Renaissance final acceptance - 2026-07-13

- Re-read the complete 13-line, 1,713-byte `V1_4_5_USER_PROMPT_VERBATIM.md` immediately before the release audit. SHA-256: `36891EAC6FA588E74C72FA006CA4D982FE076CE9EF641DC22227E722FE202F26`. Every requested clause is accounted for below; the temporary copy is deleted only after this record and before the release commit and dual publication.
- Mature forms: Fire, Steel, Sea, Gold, and Silver are ground-up authored rigs with species-specific body plans, head profiles, wings, tails, materials, and silhouettes. The existing mature Ice geometry remains the control; its only integrations are the shared stage wrapper, young forms, animation plumbing, and fitted equipment.
- Young forms and shoulder carry: all six species have independent Stage I hatchling and Stage II fledgling geometry rather than scaled mature bodies. Stage I is explicitly shoulder compatible, and both young stages preserve recognizable elemental features from their mature species.
- Animation: the non-accumulating pose system now covers breathing, idle accents, sleep, walking, flight power and recovery strokes, multi-phase melee/ranged/breath attacks, head and neck follow-through, jaw, legs, tail, crests, equipment, and separate hatchling/fledgling articulation.
- Wealth and equipment: Dragon Gold Piles and Gold Blocks use authored atlas cells plus coin, ingot, gem, and sealed-hoard models. Dragonflight saddles, reins, panniers, cargo bags, all six barding families, and the wearable scale sets have fitted species/slot silhouettes and real-size inventory, held, and dropped presentations.
- Lairs: terrestrial stage-five lairs now span roughly 65 by 57 blocks across four connected chambers, Sea Dragon nests use 34-40-block abyssal radii, and generation remains deterministic, cross-chunk safe, cached, and bounded below 42,000 placements. Independent review found one buried-hoard edge case; the final design authors a supported treasury platform, two blocks of clearance, adjacent walking space, and unique deterministic hoard cells for both stage four and five.
- Eggs: every defeated Stage III-or-older, breed-capable dragon guarantees at least one exact-lineage egg in a bounded clutch. Portable egg metadata preserves type, sex, genetics, parent, lair, and creation tick; eggs are fire/lava immune, float in lava, and bypass distance, age, and drop-cap cleanup for at least one complete configured 24,000-tick world day.
- Bestiary: progressive Dragonwake field notes now unlock from first sight through mature defeat, egg recovery, incubation/hatching, bonding, Stage I shoulder carry, feeding/growth, Stage III riding, equipment/cargo, scale harvesting, and breeding rather than revealing the complete lifecycle at first contact.
- Visual acceptance: manually reviewed `output/v1-4-5-dragon-rebuild/dragon-before-after.png`, the 18-specimen Stage I/Stage II/mature field-guide sheet, adult/pose/equipment sheets, the gold/tack/barding model audit, exact 28-pixel and 22-pixel inventory icon captures, all six deployed portraits, and the official v1.4.5 title client. The rebuilt families read distinctly, young forms are clean and cute, equipment is attached, icons remain legible, and the Ice adult stays visually recognizable.
- Final verification on the corrected tree passes the bounded production build and Sites artifact, 617/617 gameplay/content tests, 8/8 rendered-metadata/audio tests, 7/7 release pretests, 44/44 focused dragon/lair/asset tests, native TypeScript, whole-repository ESLint, and `git diff --check`, with no failures, skips, or todos. GitHub and Sites publication are the remaining operational release steps after prompt cleanup.

## Dragon flight and combat follow-up - 2026-07-13

Current request: Tuck both front and rear dragon legs backward so they trail naturally in flight; improve dragon combat AI so dragons do not simply hover directly above a target; take time on the behavior, commit the finished work, and show visual progress.

- Baseline diagnosis: Stage II through V inspection portraits deliberately use the `fly` pose. That pose rotates the front hips about 0.72 radians forward and rear hips only -0.42 radians, creating the stiff forward-reaching silhouette visible in the release sheet. Runtime combat also steers directly to the target's x/z point and a fixed target-plus-2.2-block altitude, which makes an airborne dragon converge above the player and hover there.
- Planned correction: author a swept-back flight silhouette for both young and mature rigs, then replace direct target convergence with deterministic attack runs, lateral orbits, altitude bands, standoff/reposition phases, species-aware attack preferences, and a bounded retreat/re-entry cadence. Keep combat host authoritative and expose enough state for deterministic tests and `render_game_to_text` inspection.

### Dragon combat AI completion

- Replaced exact target-X/Z pursuit and fixed target-plus-2.2 altitude hovering with the pure deterministic `planDragonCombatManeuver` state machine. Host-simulated dragons now use protected lateral entry lanes, offset attack runs, 0.55-second follow-through, breakaways, bounded re-entry orbits, altitude variation, and explicit sightline-reposition phases; target loss retains only nine seconds of awareness after a real initial sightline, so dragons do not aggro players they never detected.
- Added lineage tactics without changing the existing authoritative damage/effect/cooldown pipeline: Fire uses low cinder-dives and closes for breath (with occasional claw passes), Ice alternates controlling frost passes, Steel establishes long spear strafes, Sea skims or swims low arcs, and Gold/Silver use broad solar/lunar projectile orbits. Signature Fire/Sea melee runs now use a reachable but still protected close lane, a longer Stage III-safe commit window, and a temporary terrain-following dive clearance; the engine hard-constrains every discrete combat step outside the advertised horizontal miss radius. Stage I remains ground-close and melee-only; Stage III+ flight, Sea swimming, owner follow/stay, lair return/egg defense, retreat, multiplayer interpolation, and rider controls remain intact.
- The combat maneuver state is deliberately ephemeral and host-only, so save and multiplayer snapshot schemas stay compatible. `render_game_to_text` now reports each nearby dragon's live phase and pass index. A 100,000-plan micro-check completed in 25.48 ms on this machine, keeping the planner comfortably bounded relative to render work.
- Added bounded body-and-neck attack tracking so a dragon on a strafe visually aims at the actual target instead of the far lane endpoint. The sign-sensitive local `-Z` model convention lives in a pure helper, its world-space model test proves the articulated head reduces the residual target-facing error, and a late smooth recovery reaches exact neutral before the animation clears so the body and neck do not snap after a strike.
- Added eight deterministic regression groups covering every Fire/Ice/Steel/Sea/Gold/Silver phase cycle, target switching, non-overhead horizontal separation across 48 seeded traces, sightline recovery, species geometry/attack priorities, Stage I limits, Stage III-V Fire/Sea melee reach under engine-realistic speed and terrain-clearance rules, model-space attack facing, and engine integration. Combined combat/lifecycle/engine/model coverage passes 37/37; the new planner suite passes 8/8, native TypeScript and scoped ESLint are clean.
- Regenerated and manually reviewed production-planner evidence at `output/dragon-combat-ai/dragon-combat-trajectories.png`, `.svg`, and `.json`. All six traces stay outside their dashed protected miss lanes while visibly cycling through approach, attack-run, breakaway, orbit, and reposition colors; the closest Fire and Sea traces hold at 3.67 blocks against 3.66-block protected radii. Browser smoke output at `output/dragon-combat-ai/browser-smoke/shot-0.png` is visually clean, `render_game_to_text` returned valid v1.4.5 title state, and no console-error artifact was produced.

### Dragon flight-pose completion

- Replaced the shared forward-reaching flight articulation with non-accumulating, species-aware trailing profiles for every Stage II and mature dragon. Both forelegs and hindlegs now sweep tailward, retain compact knee and claw flex, carry subtle left/right wake asymmetry, and splay just enough to remain readable without becoming stiff parallel rods. Steel stays slightly weightier; Sea and Silver use the longest streamline. Stage I shoulder/flight posture and every grounded gait remain unchanged.
- Stage II now has real knee and claw pivots rather than one straight leg object. Geometric endpoint assertions prove every Stage II paw ends 0.69-0.88 blocks behind its hip and every adult paw ends 1.17-1.77 blocks behind its hip across Fire, Ice, Steel, Sea, Gold, and Silver.
- Deterministic before/after ISO, side, three-quarter, and true-side sheets are under `output/dragon-flight-pose-progress/`; the clearest close audits are `stage-2-side-portraits/blockwild-creatures.png` and `adult-side-portraits/blockwild-creatures.png`. Both were manually reviewed at original resolution, head-right/tail-left, and show the former forward reach removed. The stale combined close-side experiment was deleted rather than left as a broken artifact.
- Flight/model verification passes 18/18 across the dragon and renderer suites; native TypeScript, scoped ESLint, and patch integrity pass. The official web-game client produced valid v1.4.5 title state in `output/dragon-flight-pose-progress/browser-smoke/state-0.json`, the screenshot was manually reviewed, and no console-error artifact was created.

### Dragon follow-up final acceptance

- Independent review found and resolved three animation integration edges: aerial melee/hurt overlays now retain the streamed flight rig; local `-Z` neck yaw now bends toward the world-space target; and attack-facing body/neck tracking smoothly returns to exact neutral before its animation object clears. The corrected tree received a final independent clear with no remaining actionable findings.
- The bounded production build and Sites artifact validation pass. The complete gate passes 628/628 gameplay/content tests, 8/8 rendered-metadata/audio tests, and 7/7 release pretests; focused post-review coverage passes 45/45. Native TypeScript, scoped ESLint, and `git diff --check` are clean.
- The official post-review web-game client returned valid v1.4.5 title state with no console/page error artifact, and `output/dragon-followup-browser-postreview/shot-0.png` was manually reviewed. Live combat staging remains represented by deterministic engine-realistic simulations and production model/trajectory renders rather than the title-only browser smoke.

## v1.5 The World Below integration - 2026-07-13

- Integrated the latest pushed `design-1` tip (`25583f9`) while leaving that working branch alive. The integration advances untouched worlds to the migration-safe `world-below-v15` generator and preserves older saves on the established legacy profile.
- Added a deterministic three-depth cave graph with connected mouths, loops, rooms, great caverns, aquifers, underground landmarks, traversal infrastructure, Dwarven civic links, and depth-aware map discovery.
- Added 41 underground ecology, construction, traversal, and material blocks; nine habitat-specific cave creatures; ordinary Iron naming with compatibility aliases; a complete Copper chain; and the Living Vein resource ecology.
- Added executable world-overhaul audits and regression gates covering biome distribution, cave reachability, flooding, settlements, materials, mapping, save migration, multiplayer IDs, and generation budgets.

## Deepgear companion audio follow-up - 2026-07-13

- Preserved the four supplied mechanical WAV masters byte-for-byte under semantic `public/sfx` names. All are 48 kHz, stereo, 16-bit PCM: Metal Breath is 2.4 seconds at -21.33 dBFS RMS; Metallic Bark is 2.0 seconds at -23.73 dBFS RMS; Steam Release A/B are 2.0-second one-shot containers at -28.49/-27.85 dBFS RMS with intentionally quiet trailing tails.
- Added stable sample keys for metal breath, metallic bark, and both steam releases. Creature cues now give the Clockwork Hound a restrained bark/metal-breath identity, the Webspinner quiet ambient steam and a stronger committed-attack release, and existing Deepgear automatons appropriate metal breathing, steam strain, and attack vents.
- Extended the creature event contract with `attack`. Gameplay should call `playCreatureEvent(mob, "attack")` only when an attack actually commits; ambient remains throttled by the existing per-creature voice timer and hurt remains routed by the existing damage hooks. The longer supplied sounds are deliberately not used as locomotion loops.
- Asset fidelity/level validation passes 8/8, runtime manifest/spatial audio validation passes 9/9, and the complete fauna/cue suite passes 42/42 after the concurrently authored production models landed. Native TypeScript and scoped audio/cue ESLint are clean.

## Deepgear companion model follow-up - 2026-07-13

- Added two distinct production Three.js rigs in the established dwarven automaton language. The 96-mesh Clockwork Hound is a low pursuit engine with a tapered boiler, open-framed aether core, visible shoulder drives, piston legs, planted paws, an articulated bite, swept tuning-fork ears, exhausts, and a segmented signal tail. The 100-mesh Webspinner has a broad pressure-loom silhouette, six lamp eyes, paired articulated fangs, eight complete hip/knee/foot chains, tension cables, a rotating aether drive ring, and three spinnerets.
- The existing runtime animation path now gives both constructs non-accumulating idle motion, species-specific planted locomotion, readable alert/attack poses, and the normal forged-shell hurt pulse. The model pose pass deliberately overrides the generic biped leg arc so the hound and spider keep their feet close to grade: both idle poses are exact; audited motion penetration is bounded to 0.0123 block for the hound and 0.0074 block for the spider.
- Regenerated the deployed Bestiary portraits at `public/creatures/clockwork-hound-golem.svg` and `public/creatures/webspinner-golem.svg`, plus the complete creature portrait sheet. Both deployed SVGs and the deterministic idle/walk/attack audit were manually reviewed. The comparison artifact is `output/mechanical-golem-model-progress/dwarven-companion-golems-pose-audit.png`; its source views include a clean front-three-quarter sheet, a true-side sheet, and a machine-readable ground-contact manifest.
- Focused integrated model/content/renderer/wildlife verification passes 23/23, including exact rig naming, open core visibility, all twelve leg roots and distal joints, alert head motion, bite/fang motion, drive motion, runtime foot transforms, complete production catalog capture, portrait export, bonding/capture persistence, settlement assignment, blueprint gating, and the Webspinner projectile. Native TypeScript, scoped ESLint, and patch integrity pass. The official web-game client returned a valid v1.4.5 title snapshot at 60 FPS with no console-error artifact; its screenshot was manually reviewed.

## Deepgear companion golems - 2026-07-13

- Added buyable Clockwork Hound and Webspinner blueprints to Dwarven golemsmith stock, permanent blueprint/orb item IDs, forge recipes, commerce values, Deepgear settlement placements, and exact save normalization without changing the existing Golem Forge schema.
- Forge-built or neutral specimens can bond with the player, accept follower commands, preserve their full record through Capture Orbs and attunement, and return when recalled. Settlement specimens remain aligned to the Dwarves and defend their hold rather than becoming freely tameable.
- The Clockwork Hound uses fast interception, bite, and armor-aware body-check behavior. The Webspinner maintains a standoff band, disengages when crowded, and launches a visible pressure-filament projectile that briefly impedes its target.
- Supplied metal-breath, metallic-bark, and two steam-release recordings are routed through the spatial creature-audio system at committed attacks and restrained ambient/hurt intervals; no long locomotion loop was introduced.
- Final review made both plans reliable Golemsmith stock while leaving neutral prebuilt orbs rare, retained authored attack poses through their short recovery frames, and moved the broad Webspinner into a precise furniture-clear forge service bay. A 200-layout regression proves the marker remains inside the forge while clearing its table, cradle, conduit, door, and elevated lantern.
- The exact finished tree passes the verified production/Sites build, 630/630 broad gameplay/content tests, 9/9 rendered-metadata/audio tests, and 19/19 release pretests: 658 checks with no failures, skips, or todos. Native TypeScript, whole-repository and focused ESLint, and patch integrity are clean. The official current-source client returned valid v1.4.5 title state with no console/page error artifact; `output/mechanical-golem-model-progress/final-browser-smoke/shot-0.png` was manually reviewed.

## v1.5 player feedback and rain mix - 2026-07-13

- Preserved the supplied two-second 48 kHz stereo PCM player-damage master as `public/sfx/player-direct-damage.wav`. Immediate hostile, projectile, PvP, fumarole, and lightning hits use it at a restrained 0.64 base gain with a 0.78 playback multiplier; hunger, drowning, falling, lava, dragonfire, and venom ticks retain the quieter synthetic feedback instead of retriggering the full hit cue.
- Reduced the authored rain-bed gain from 0.42 to 0.357 and the supporting filtered-noise layer from 0.026 to 0.0221: exactly 15% on both paths. Roof/open-sky exposure, lazy loading, and environment crossfades are unchanged.
- Added runtime-manifest and PCM-container regressions for the new cue plus an exact rain-mix assertion. The final release gate and publication record will be appended after the combined v1.5 tree is validated.

## v1.5 final integration acceptance - 2026-07-13

- Re-fetched `github/design-1` immediately before release; its latest pushed tip remains `25583f93ca9e743cd3d8ab26aa71480ec3daa626` (`Build The World Below`). The branch remains alive and unchanged, while its complete generator, underground ecology, world audits, and migration work are squashed into this single v1.5 release alongside the newer dragon and Deepgear companion work.
- Regenerated all 178 deployed Bestiary portraits from the merged production rigs. The combined isometric inspection sheet and live v1.5 creation screen were manually reviewed; the latter reports Generator 15, 24 surface biomes, six cave ecologies, 178 creatures, and the unchanged 192-block vertical range.
- Final verification passes 29 release pretests, 10 rendered/audio checks, and all 631 gameplay/content tests: 670 checks with no failures, skips, or todos. Native TypeScript, repository-wide ESLint, the bounded production/Sites build, artifact validation, and patch integrity are clean.
- The official current-source web-game client entered a newly generated Sunstep Savanna world, returned valid v1.5 player/world/mob state, and produced no console or page-error artifact. Both its creation and live gameplay screenshots were inspected at original resolution. GitHub and Sites publication are the remaining operational steps.

## v1.5.1 design synchronization - 2026-07-13

Current request: Refresh the pushed `design-1` branch, publish an incremental v1.5.1 only if it contains changes beyond v1.5, and otherwise leave the release untouched.

- The second refresh found three newly pushed commits after the v1.5 integration point: `99554aa` (`Polish World Below creatures`), `d1f425e` (`Fix flora seams and pacing`), and `dc39f32` (`Polish menus and trading`). All three are integrated in their original order while the `design-1` branch remains alive.
- Resolved the only semantic overlaps by combining the new Veinling heart animation with the existing Clockwork Hound and Webspinner animation branches, retaining Sea Dragon nest bounds while adding atomic tall-grass replacement, preserving ambient-only hunger feedback while adopting the shared regeneration-food cost, and regenerating the complete 178-creature portrait set from the merged production rigs.
- Advanced the human-facing release identity to v1.5.1 without changing generator version 15 or the existing save compatibility boundary. README and changelog notes cover the creature art pass, flora/water seams and pacing, centered title submenus, race-specific faces, and reviewed multi-stack merchant orders.
- Final verification passes 29 release pretests, 10 rendered/audio checks, and all 641 gameplay/content tests: 680 checks with no failures, skips, or todos. Native TypeScript, focused and repository-wide ESLint, the bounded production/Sites build, artifact validation, and patch integrity are clean.
- Regenerated all 178 deployed creature portraits from the merged rigs. The nine-creature isometric sheet and corrected three-column front sheet were manually reviewed; anatomy remains readable and grounded. The official current-source browser client showed the clean centered v1.5.1 title menu and Character Studio submenu, returned valid title state, and produced no console or page-error artifact.

## v1.5.2 inventory interaction pass - 2026-07-14

- Added compact target-health formatting capped at two useful decimal places, a metadata-exact recoverable trash slot that persists through saves and multiplayer player snapshots, and Minecraft-style left/right stack painting across pack and crafting slots.
- Left-drag placement uses Minecraft's floor share per valid visited slot, leaving ordinary remainders and any capacity-blocked quota carried; right drag places one per valid slot. Invalid/full stacks remain untouched, and the existing click, double-click, shift-transfer, and shared-container paths remain separate.
- Reduced the Bone Shard icon inside real inventory/crafting sockets. The official inventory audit view was manually reviewed at 1280x720; the trash affordance, complete paper-doll footer, crafting grid, and pack all fit cleanly. One later headless WebGL capture showed background context tearing, but the DOM inventory surface remained intact and the earlier settled frame was clean.
- Focused inventory and crafting coverage passes 27/27; the dedicated new suite passes 5/5. Native TypeScript, scoped ESLint, and patch-integrity checks are clean.

## v1.5.2 multiplayer authority and visiting-player ecology - 2026-07-14

- Reliable guest block edits now carry selected-hotbar intent while the host resolves the actual tool from its authoritative pack; successful hand/instant breaks no longer emit the wrong-tool warning merely because the host owns the loot.
- Guest lead attachment is one host-owned creature-plus-pack transaction, with stale generic uploads held until the committed player image returns. Ground animals on leads recover against keeper/fence terrain even after an elevated state. Shift crafting exhausts the full legal ingredient batch and immediately syncs one complete pack image.
- Guest item throws are host-spawned from the authoritative selected stack, retain durability/metadata, and broadcast the resulting drop and pack images instead of disappearing on the next snapshot.
- Natural spawning remains on one global passive/hostile clock, round-robins up to four player interest points, and expands its global cap only by the square root of player count. Host-side chunk/POI activation and nearest-player simulation/culling now include visiting players; per-peer mob/drop snapshots remain radius- and count-bounded.
- Final multiplayer/ecology coverage passes 72/72 across transport, authority, reconnect, crafting, drops, leads, visiting-player spawning, and world-generation interactions. Native TypeScript, scoped ESLint, and patch-integrity checks are clean.

## v1.5.2 structures, light and Hearthkin provisions - 2026-07-14

- Closed the Forest Temple with a stone-and-timber perimeter, leaflight windows, and one intentional doorway for the existing working door. POI clearance now suppresses an entire deterministic generated-tree plan whenever any of its blocks intersects the reserved site, instead of moving a padded rectangle that can shear a neighboring crown.
- Leaf canopies attenuate skylight gradually and retain a daylight floor rather than crossing the underground threshold after a few cutout layers. Opaque roofs and caves still block the sky. The nearest-first dynamic light pool doubled to 64 desktop/32 touch lights, the baked source limit increased to 1,024, every directional torch keeps its light index, placed torches are brighter and reach farther, and lava now produces warm bounded baked and dynamic light.
- Repainted Wild Rune Stone as cool weathered fieldstone with sparse shiny green mineral inclusions. The Lantern Piehouse keeper uses an exact behind-counter spawn and a valid brewer profession, guaranteeing honey, mead and the new craftable eight-food Hearthberry Apple Pie; the pie has commerce mapping plus dedicated real-size icon and held geometry.
- Focused integrated world/content/lighting coverage passes 128/128. Native TypeScript and scoped ESLint pass. The actual-size pie icon, Rune Stone atlas crop, official icon-audit screen and v1.5.2 creature field-guide regeneration were manually reviewed under ignored `output/` artifacts.

## v1.5.2 final prompt audit and acceptance - 2026-07-14

- Inventory and combat: all dynamic health labels use the same two-decimal formatter; the recoverable trash slot retains exact metadata through saves and multiplayer snapshots; whole-stack, half-stack, single placement, equal-share left drag with cursor remainder, and one-per-slot right drag are covered across pack and crafting slots; the Bone Shard was manually reviewed at its real 28px and 22px sizes.
- Multiplayer authority: guest tool intent no longer produces false grass/torch warnings, lead attachment consumes exactly once, led ground animals recover to keeper/fence terrain, Shift-crafting exhausts the legal ingredient batch, thrown items become host-owned metadata-exact drops, and one bounded round-robin ecology clock now spawns, activates POIs, simulates, and culls around the host plus visiting players.
- World and content: Forest Temple perimeters are complete; POI clearings suppress whole intersecting tree plans; leaf skylight diffuses without cave-darkening ordinary canopies; every directional torch remains indexed while the nearest-first animated pool is doubled and placed torch reach is brighter; Wild Rune Stone is natural stone with only a subtle green mineral glow; fresh and legacy Lantern Piehouses anchor Merry indoors and provide real brewer stock plus Hearthberry Apple Pie; lava emits warm baked/dynamic light with one indexed representative per bounded 4x3x4 cell.
- Independent post-fix review found no remaining actionable issues. The exact release tree passes the bounded production/Sites build, 35/35 release pretests, 10/10 rendered/audio checks, and 654/654 gameplay/content tests: 699 checks with no failures, skips, or todos. Native TypeScript, repository-wide ESLint, and patch integrity are clean.
- The official game browser client reported v1.5.2 title state with no console/page-error artifact. The normal title screen and real inventory audit were manually reviewed at 1280x720, and the Bone Shard was separately inspected at its exact production slot sizes.

### Independent world/lighting acceptance follow-up

- Existing activated Lantern Piehouses now migrate only when the saved spawn marker, resident ID, settlement ID, persistent-resident flag, and Hearthkin mob identity all agree. Old Merry records re-anchor behind the counter, switch from the invalid `hobbit-merchant` profession to brewer, and retain merchant gold/history/custom stock while gaining deterministic brewer provisions including Hearthberry Apple Pie; unrelated merchants and lookalike residents remain untouched.
- Lava lighting is now spatially coalesced to one representative per world-aligned 4x3x4 cell during generation and placement, with bounded cell reindexing after edits so a removed representative promotes another pool voxel. A 3,072-voxel regression produces at most 64 lava sources while preserving every independent torch entry.
- Wild Rune Stone's retained accent light is a restrained mineral green at 0.48 intensity and eight-block reach rather than the generic orange fallback. Focused adventure/world/lighting checks pass 85/85; native TypeScript, scoped ESLint, and patch integrity are clean.

## v1.5.3 player-local ecology redesign - 2026-07-14

- Synced `design-1` to the completed `main` v1.5.2 tree before implementation. Natural spawning now uses six independent, weighted local pools for surface animals, ambient life, large aquatic life, small aquatic life, underground ecology, and monsters. Each simulation interest gets a 64-block target area while one sublinear global ceiling bounds host work across separated multiplayer players.
- Natural groups now use bounded placement retries in a 24-56 block ring, avoid visible line-of-sight pop-in, select the most locally deficient compatible pool, preserve biome/activity/microhabitat rules, and treat authored residents, owned/enclosed creatures, rare creatures, and POI populations outside the natural budget.
- Removed the absolute five-minute wildlife purge. Unprotected off-range wildlife gets a 45-second grace window; named, tamed, enclosed, authored, or rare creatures outside the wider wake ring become lightweight sleeping save records and restore in bounded batches when any host simulation interest returns.
- Added a sparse 64-block ecology ledger. Hunting temporarily reduces only the defeated species' local spawn chance, decays over in-game days, and leaves other compatible species free to recover the area's biodiversity target. Text diagnostics expose local pool counts/costs, targets/ceilings, global safety cost, protected/rare/sleeping totals, spawn attempts, rejection causes, and the last successful group.
- Final acceptance passes the verified production/Sites build, 35/35 release pretests, all 654 gameplay/content tests, repository-wide ESLint, native TypeScript, and patch integrity. The official current-source browser client entered a fresh Sunstep Savanna world and grew local ecology from 4.5 weighted cost / five animals to 5.5 / seven across both surface and ambient pools, while false protected wildlife remained zero and no console/page error artifact was produced. The title, world setup, and final gameplay captures were manually reviewed. The temporary verbatim implementation plan matched its original SHA-256 (`3202E0888B48617D7038791FB356F12CDC355A6F4D59734DA45D1DC4959CC8A9`) and was deleted only after every clause passed.

## v1.5.3 main synchronization acceptance - 2026-07-14

- Refreshed and fast-forwarded `main` to the latest pushed `design-1` tip, `428cfcbc85092e042120fd4d7cabbed071527d59` (`Rebuild local wildlife ecology`), preserving the `design-1` branch unchanged for continued design work.
- Advanced the public release identity to v1.5.3 and regenerated the aggregate creature field guide without changing generator version 15 or the existing save-compatibility boundary.
- The exact synchronized tree passes 41/41 release pretests, 10/10 rendered/audio checks, and 654/654 gameplay/content tests: 705 checks with no failures, skips, or todos. Native TypeScript, repository-wide ESLint, the bounded production/Sites build, artifact validation, and patch integrity are clean.
- The official browser-game client returned a clean v1.5.3 title state. A second fresh-world pass reached live play in Birchlight Grove with five ordinary creatures correctly distributed across the new ambient and surface-animal pools, valid ecology diagnostics, and no console or page errors. Both captures were manually reviewed at 1280x720.

## v1.5.4 ecology and underground polish - 2026-07-14

- Preserved the current request verbatim with SHA-256 `7082C243BE513022D5AB900502A9943ED8E7AC289D25B59E8062CF76D874086D` until final clause acceptance. A bounded crafted-fence flood fill now recognizes only Wildwood fences and closed gates, ignores ordinary terrain hollows, caches every reached pen cell for four seconds, and invalidates on block edits. The first successful lead attachment also sets an `everLed` marker that survives active/sleeping saves, Capture Orbs, creature transformations, lead removal, and legacy active-lead restoration.
- Raised only natural overworld surface-animal and ambient targets/ceilings from 10/14 and 8/12 to 12/17 and 10/14. Water, cave, and monster budgets remain unchanged. All rabbits now render at 0.78 adult scale and 0.38 baby scale, while fox tails and other heavy terrestrial tails use a slower, weightier cadence.
- Cave-mouth realization is exactly 25% of deterministic candidate cells instead of the accidental 72%. Dry graph tunnels seal neighboring legacy noise-aquifer water/lava behind a one-block rock shell while authored Glasswater rooms, streams, waterfalls, and large flooded caverns remain connected. Regional height shaping now follows the owning core and fades completely through transition belts, eliminating height-formula switches at biome edges; sampled boundary steps remain at or below six blocks.
- Expanded sensible overworld yields without making every creature a resource source: Cloverbacks and Sunbloom Longhorns received higher hide caps/chances and meat yields; Ridgebacks, Sunstep Grazers, three deer breeds, Brambleboars, Mistmanes, Road Wargs, and Dewback Tapirs received targeted hide or generic-meat improvements.
- Added `npm run audit:mobs`, which writes ignored Markdown/JSON reports for all 178 creatures with authored sound-event counts, resolved custom-asset counts, drop-entry/yield counts, and natural surface/underground biome counts. The first complete run reports 114 naturally assigned creatures, 63 with resolved custom sound, and 86 with drops.
- Final acceptance passes 35/35 release pretests and all 661 gameplay/content tests, plus native TypeScript, repository-wide ESLint, the production build, packaged Worker/hosting-manifest import, and patch-integrity checks. The official current-source browser client reported the raised 12/17 surface-animal and 10/14 ambient budgets with no console/page-error artifact; the title and world-creation screens were manually reviewed at 1280x720. The preserved request still matched its original SHA-256 immediately before deletion, after every clause was checked against the implementation.

## v1.5.4 main synchronization acceptance - 2026-07-14

- Refreshed `github/design-1` and merged its latest pushed tip, `20b5f4af4c9568cce52b958dcf38acb07b238734` (`Polish ecology and caves`), into `main` while preserving the design branch and retaining the complete v1.5.3 release history.
- Advanced the public identity to v1.5.4, updated the repository-facing release notes, and regenerated the complete aggregate field-guide header without changing generator version 15 or the existing save-compatibility boundary.
- The exact combined tree passes 41/41 release pretests, 10/10 rendered/audio checks, and 661/661 gameplay/content tests: 712 checks with no failures, skips, or todos. Native TypeScript, repository-wide ESLint, the verified production/Sites build, hosting artifact validation, and patch integrity are clean. The repeatable mob audit reports 178 catalog entries, 114 natural assignments, 63 natural creatures with resolved custom sound, and 86 natural creatures with drops.
- The official browser-game client returned a clean v1.5.4 title state with the new 12/17 surface-animal and 10/14 ambient budgets. A second fresh-world pass reached live play in Flower Meadow, populated both pools with Cottontails and Petalfoxes, kept authored POI residents outside the natural budget, and produced no console or page errors. Both 1280x720 captures were manually reviewed.

## Large-scale optimization baseline - 2026-07-16

- Started a measured engine-wide optimization pass from the clean published v1.5.4 commit `aa90aa9d15c925fda95f2569c4d95e93f7eaa61c`. The release remains generator-v15/save-compatible; optimization work must retain gameplay, rendering, multiplayer authority, and authored content behavior.
- Five same-machine CPU benchmark runs establish the pre-change averages: water settle 9.469 ms, 1,000 structure plans 173.699 ms, weather/cloud plans 365.255 ms, radius-16 chunk ordering 0.751 ms, 64 apiary cycles 77.607 ms, and herd/shoal/tree planning 128.350 ms. Min/max ranges are retained in the task transcript for noise-aware comparison.
- Parallel audits are covering chunk streaming/meshing/rendering, simulation/pathing/ecology/multiplayer, and React/WebGL-context/audio/UI work. Changes will be selected by expected frame-time or allocation gain, bounded risk, and executable regression coverage rather than by code churn.

## v1.6.0 Wildframe optimization acceptance - 2026-07-16

- Packed chunk normals, colors, and UVs while retaining full-precision positions. Vertex attributes use 22 instead of 44 bytes per vertex; the audited 123-mesh/220,324-vertex scene falls from 10,355,228 to 5,508,100 bytes including unchanged indices, a 46.8% total reduction. A section-local shade cache removes repeated skylight/light evaluation during the same mesh rebuild.
- Distances 0-12 retain the exact established square stream. Higher settings use chunk-AABB radial windows with a complete seam halo: at radius 16, visible/generated/retained counts fall from 1,089/1,225/1,369 to 877/981/1,093 while preserving all cardinal reach and neighbor remeshing.
- Added one deterministic frame-local X/Z index for creature collision and local targeting. Three repeatable runs at 100/200/300 creatures retain exact results while cutting candidate visits by 93.8%/96.8%/97.9%; median measured speedups are 1.56x/3.70x/6.55x on this host.
- Shared ordinary particle and leaf GPU resources, removed per-frame cloud-plan and settlement-search allocations, stabilized unchanged Bestiary snapshots, split gameplay/menu HUD cadence, moved held-stack cursor motion outside React, deduplicated multiplayer poll state, and capped visible avatar previews behind one shared 22 FPS WebGL scheduler. WebAudio now skips unchanged ambience/depth automation and already-silent music scenes.
- Autosaves reuse validated metadata/options shells instead of parsing the prior full save each time. Same-realm revisions plus browser storage-event invalidation preserve cross-runtime renames, options, and newly created worlds; listener and preview renderer teardown are explicit and idempotent.
- Runtime performance reports now include simulation and chunk work, draw calls, triangles, geometries, textures, visible chunks, and simulated entities. The production artifact validates, native TypeScript and repository-wide ESLint pass, and all 745 test checks pass with no failures, skips, or todos.
- The official browser-game client reported v1.6.0 title and fresh Wildwood Forest gameplay state with valid streaming/ecology data and no console or page errors. Both 1280x720 captures were manually inspected; packed biome lighting, foliage, HUD, held art, and title presentation remain coherent. Headless SwiftShader FPS is intentionally excluded from hardware-performance claims.
## v1.6.1 Shared Footing - 2026-07-18

- Preserved the request verbatim under ignored `work/` and confirmed the file remains outside Git.
- Audited host/guest world snapshots, drop collection, shared container revisions, facility ownership, creature route probing, avatar held-item sockets, bestiary progress, and baked skylight.
- Confirmed root causes before editing: host snapshots omitted survival/builder mode; world drops were culled relative only to the host; pickup requests had no bounded pose compensation or logical retry; furnace clock changes churned inventory revisions; and the paper-doll preview never received the offhand slot.
- Researched authoritative multiplayer patterns in official Epic, Valve, Unity, and Godot networking documentation. The durable implementation proposal remains at ignored `work/multiplayer-authority-proposal.md`.
- Host world snapshots now carry game mode; survival guests cannot retain a stale builder catalog. All Blocks has a live name/id search, count, empty state, and a canonical Torch entry.
- World-drop retention and replication are actor-centered for every connected player. Guest pickup intents carry a bounded claim point, retry idempotently while visible, compensate narrowly for pose latency, and receive immediate authoritative inventory/drop replies. Drops remain valid when a guest is far from the host.
- Shared furnace/container content revisions now advance only when slots change, while progress clocks still replicate through a separate peer-delivery signature. Item moves no longer lose a revision race against an 80 ms furnace tick.
- Non-construct ground creatures can route through and swim at water surfaces; persistent route blockage samples bounded back-out angles around trunks and banks without adding constant pathfinding work.
- One-cell cave mouths now receive bounded lateral skylight while sealed/deeper caves retain darkness. Torches and ordinary tools use the authored ninety-degree ready angle; shields strap to a forearm socket; the pack preview renders its offhand item; and non-sentient Bestiary entries record whether and how often they have been caught.
- Visual QA passed for the pack/offhand reference, filtered All Blocks catalog, and v1.6.1 field-guide header. The browser console remained at zero errors and warnings.
- Final gates: six release pretest suites pass; native TypeScript and repository-wide ESLint pass; Vinext production build and Sites Worker artifact validation pass; all 688 gameplay/render/audio tests pass; simulation and spatial benchmarks pass with 93.8-97.9% candidate reduction across 100-300 indexed entities.

## Multiplayer authority hardening - 2026-07-18

- Began the complete follow-through on `work/multiplayer-authority-proposal.md` from the clean v1.6.1 baseline. Protocol v2 replaces guest-authored shared-container images with ordered semantic clicks, shift moves, collection, sort, stack, transfer-all, armor, offhand, and trash intents; full images are recovery/replication only.
- Added a 20-second, 256-command-per-peer final-response cache, stable request retries across transport reconnection, host-confirmed optimistic baselines, rollback, and replay of later non-conflicting inventory intents. Furnace clocks remain outside content revisions and output slots remain withdrawal-only.
- Mob/drop images now declare recipient, radius, epoch, and ordered tick. Omission deletes only inside its declared scope. Short-lived reliable block, mob, and drop tombstones provide immediate destruction presentation and prevent stale-image resurrection.
- Added a bounded privacy-preserving multiplayer diagnostic ring and menu download. The focused authority suite currently covers semantic conservation, full-pack pickup rejection, two-viewer furnace convergence, rollback/replay, scope epoch ordering, tombstone reordering, diagnostic redaction, and a 100-250 ms jittered disconnect/reconnect retry; the combined multiplayer gate is clean before the remaining release/browser audits.
- Completed the proposal clause audit. Actor-centered immediate/periodic/recovery snapshots, nearest-active-player drop retention, bounded pickup pose compensation, stable reconnect retries, response-cache bounds, strict request validation, close-after-pending behavior, generic facility recovery, and host survival-mode enforcement all have executable coverage.
- Final acceptance passes all 752 TypeScript gameplay/content tests, 10 rendered/audio checks, and 54 release pretests. Native TypeScript, repository-wide ESLint, Vinext production build, packaged Sites Worker/manifest validation, and patch integrity are clean.
- The spatial benchmark preserves exact results while cutting candidate visits 93.8-97.9% at 100-300 entities and measured 1.84x/3.83x/7.98x speedups on this run. The production browser loaded under the explicit 100-250 ms latency range, exported redacted diagnostics, entered a fresh survival world with valid ecology/runtime state, and produced zero console errors or warnings; title, multiplayer, and gameplay captures were manually reviewed.

## Living Bestiary + Guilds of Hearthroads implementation - 2026-07-18

- Goal prompt: Fully implement the ignored `output/plans/LIVING_BESTIARY_COMBAT_GUILDS_MASTER_PLAN.md`, use it as a repeatedly checked contract, craft every new mob masterfully, keep the implementation clean and optimized, sync from main first, and finish with reviewed update artifacts.
- `design-1`, `main`, `github/main`, and `github/design-1` all resolve to `b49b2cb860321b2baac9f1a78bdf72ab280438a8` (`v1.6.1`). The separate main worktree contains uncommitted multiplayer/inventory work and was deliberately not copied or modified; resync/reconciliation remains a final integration gate.
- Phase 0 baseline is clean. Six pretest suites pass 43/43. The verified Vinext/Sites build and artifact validation pass, followed by all 688 gameplay/render/audio tests. PowerShell must invoke npm with Git Bash explicitly (`npm.cmd --script-shell="C:\Program Files\Git\bin\bash.exe" test`) because Windows resolves bare `bash` to an unconfigured WSL executable.
- Baseline spatial candidate reduction remains 93.8%/96.8%/97.9% at 100/200/300 creatures, with measured indexed speedups 1.65x/3.82x/6.41x on this run. The machine-specific simulation benchmark and complete ecology/mob audits were captured before implementation.
- Phase 0 audit finding: `audit:ecology` reports 87 actually natural species while `audit:mobs` reports 114 because the latter still treats fallback surface tables as explicit biome assignments. Fixing this discrepancy is the first implementation task.
- Working checklist and evidence ledger: ignored `output/plans/LIVING_BESTIARY_IMPLEMENTATION_LEDGER.md`. The master proposal remains the design authority and must be reread at every phase boundary.
- Fixed the ecology audit defect without changing runtime spawning. `explicitPassiveMobSpawnTableForBiome` now separates deliberately authored biome tables from the legacy upland resilience fallback. The mob audit reports surface, aquatic, underground, ambient, and hostile source counts independently; Wild Horses and other land fauna are no longer falsely assigned to the three ocean biomes. Native TypeScript and 37 focused fauna/audit checks pass.
- Implemented the 21-type append-only registry, complete validated attacker chart, bounded unlimited multi-type resolution, source explanations, and visible 10% affinity.
- Added six deterministic species stats, bounded growth profiles, v2 specimen/progression migration, levels, separate bond tiers, stable phenotype/aptitudes/shiny identity, and capture history without IV-style hidden stat rolls.
- Added 84 real-time move definitions, level unlocks, four-slot AI loadouts, the compact 12-status/8-reaction vocabulary, telegraphs, timings, targeting, field utility, and complete profiles for all 178 baseline catalog entries.
- Added the pure host-authoritative `CombatActor` resolver, relationship/friendly-fire legality, typed mitigation, reactions, bounded threat and contribution mutations, then routed player, creature, sentient, golem, dragon, projectile, status, and environment damage through it.
- Creature progression, effective type revisions, key statuses, and move phase now save and replicate through bounded multiplayer snapshots; protocol-v1 peers remain append-compatible.
- Foundation gate: native TypeScript is clean; 7/7 new foundation tests plus focused multiplayer, dragon, golem, and world integration suites pass while preserving the existing exact armor contract.
- Shared combat follow-through adds deterministic tactic scoring, bounded threat selection, windup/active/recovery phases, cooldown and status expiry, impact-frame range/line-of-sight validation, and engine integration for hostile and creature-v-creature retaliation. Pure timing tests prevent damage during windup.
- Creature Camp follow-through adds four-slot learned move editing, a field utility command, reversible saddle/lamp/charm equipment, bounded calm-observation research, and specimen comparison without hidden genetics.
- Mount safety follow-through validates the entire swept player volume when dismounting; blocked or unsafe midair exits keep the rider mounted with clear feedback.
- Direct Vinext production compilation passes. The Sites environment wrapper currently stops before compilation because its sandbox bootstrap cannot create `C:/Users/NoahH`; this remains an environment-wrapper issue and is not counted as the final verified-wrapper gate.

### Geometry-faithful Living Bestiary showcase

- Added a deterministic software projection renderer that walks the real posed Three.js `BufferGeometry` hierarchy, preserves curved primitives, transparency, luminous materials, and hidden-part visibility, and emits labeled dark-field SVG/PNG contact sheets for the 27 field creatures, 6 legendary creatures, 4 summons, and the combined roster.
- Captured the honest `7d39fe3` pre-art baseline under ignored `output/living-bestiary-showcase/geometry-before/`. Manually reviewed both roster sheets and moved geometry statistics off the name line to prevent long legendary names from colliding with metadata.
- Focused renderer coverage passes 2/2, native TypeScript is clean, and targeted ESLint is clean. The renderer also accepts `--model-module` so a committed baseline can be captured while a separate artist edits the working-tree rigs.
- Completed the production-art pass across all 37 expansion creatures. Organic anatomy now uses low-poly ellipsoids, capsules, cones, rings, and layered masses instead of cuboid-only blockouts; crystals, membranes, metal, water, and emissive features use distinct materials.
- Corrected species-critical silhouettes: the Jerboa has two spring hind legs and tiny forepaws, the Basilisk has six legs, the Cuttle has a mantle and fin skirt rather than a fish tail, the Eel has a continuous segmented body, and the Porpoise has a melon, rostrum, and blowhole. Orichalc has true negative space, Choir-of-One reads as a hollow bell-cloak, and all ten mythic/summoned forms received authored supernatural structures.
- Added deterministic cached secondary animation for concept-appropriate floaters, orbiters, translucent membranes, shimmer, suspended pages, fins, tails, and rings. Ordinary grounded wildlife remains restrained; effects are selective rather than universal. Nonuniform rest scale is preserved exactly and no animation path accumulates transform drift.
- The geometry-faithful after render contains 1,298 visible meshes and 58,988 visible triangles, including 8,674 transparent and 16,919 luminous triangles. Focused art, renderer, ground-contact, animation, tack, sound, TypeScript, and current-portrait checks pass 14/14.
- Regenerated the complete 215-specimen public field-guide sheet and added canonical portraits for every expansion creature. Side-by-side comparison sheets covering all 27 field species and all 10 legendary/summoned species are preserved under ignored `output/living-bestiary-showcase/comparison/`.
- Manually reviewed the field and mythic comparison sheets at readable resolution. Fixed penetrated ground contact on Orichalc and Vellum Warden, corrected the comparison title entity, and re-rendered the final evidence after those revisions.

## v1.7.1 Living Bestiary articulated anatomy pass - 2026-07-18

- Preserved the complete v1.7.0 production-art sheets under ignored `output/living-bestiary-anatomy-pass/before/` as the honest baseline for this pass.
- Established the tracked “faceted storybook anatomy” standard in `docs/CREATURE_MODEL_STYLE.md`: readable anatomical masses, overlapping tapered limb chains, explicit joints, planted species-specific feet, attached distal details, four-plane faces, deliberate magical exceptions, and rest-transform animation.
- Replaced the shared single-oval quadruped, bird, and arthropod limbs with connected hierarchical rigs. Quadrupeds now use hip, upper leg, knee, lower leg, ankle, foot, and attached toes/hooves/webbing/claws; birds use thigh, hock, shank, foot, and talons; arthropods use coxa, femur, knee, tibia, foot, and hinged multi-prong claws.
- Added cached counter-motion for knees, hocks, ankles, feet, arthropod joints, and claw wrists without adding per-frame hierarchy traversal or transform drift.
- Completed first targeted refinements: Hearthback Badger digging claws are embedded in reinforced front paws; Glassstep Jerboa soles and forepaws are articulated; Cindercoil toe fans and Basilisk middle legs are attached; Varkesh talons are foot-mounted; and Wreckwhistle Porpoise now has a facial group with melon, cheeks, two eyes, rostrum, lower jaw, mouth, and blowhole.
- Refined Ilyr with leg-borne falling springs and hoof pools; Kharza with a structural banner brace, war brow, jaw, and fangs; Sugarwake with icing, wafer scales, gumdrop knees, iced hooves, berry details, and a fondant face; Asterjaw with a connected translucent constellation envelope, scapula, pelvis, anchor stars, tendons, jaw, and fangs; and Glasswake Stag with transparent articulated legs, internal tides, wake rings, and a readable face.
- Reparented authored head details to the moving head rig so antlers, horns, tusks, masks, whiskers, incisors, ear tufts, scars, and crowns no longer hover behind an animated face. Vellum Warden's bespoke arms now carry shoulder, elbow, forearm, page-hand, and finger chains rather than disconnected capsules.
- Added deterministic per-species ground corrections from final authored bounds. Every grounded expansion creature lands exactly on the ground plane while aquatic and flying silhouettes retain their intended vertical presentation.
- Regenerated the 37 canonical public expansion portraits and aggregate field-guide sheet. The final geometry-faithful render contains 2,232 meshes and 85,351 visible triangles, including 13,736 transparent and 23,230 luminous triangles.
- Final verification is clean: native TypeScript, targeted ESLint, 82/82 Living Bestiary checks, 15/15 portrait/renderer checks, and direct Vinext production compilation. The repository's Bash verification wrapper still hits its known protected-home bootstrap restriction in this sandbox; the underlying production compiler completed all five phases.
- Manually reviewed the focused seven-creature anatomy sheet, complete field roster, mythic/summon roster, canonical portrait sheet, and a real-browser public-asset smoke sheet. The five tested canonical SVGs loaded at portrait scale without browser errors. Full Cloudflare dev-server startup remained blocked by the local worker runner's internal sandbox error, so browser evidence is scoped to emitted assets while the exact runtime Three.js models are covered by the geometry-faithful renderer and model tests.
- The optional Kimi design provider produced no usable draft: its health round-trip omitted the expected tool call, and the external fallback was stopped by privacy review before Blockwild design material was transmitted. All final design and implementation work was completed locally.

## High-detail cubic seven-creature preview - 2026-07-18

- The user selected the blockified Field Guide portraits as the canonical runtime direction for exactly Hearthback Badger, Wreckwhistle Porpoise, Ilyr Virebloom, Kharza, Sugarwake Sovereign, Asterjaw, and Glasswake Stag. This preview remains intentionally uncommitted pending visual approval.
- Their actual production meshes now resolve every authored primitive to `BoxGeometry`; this is not a portrait-only effect. The complete connected limb/face hierarchy, authored semantic shape, materials, transparency, emission, head parenting, tack, and cached rest-transform animation remain intact. The other thirty expansion creatures retain their existing faceted-storybook geometry.
- Recalibrated the six grounded creatures' data-driven contact corrections against their new exact cuboid bounds. All grounded targets meet the terrain plane exactly; the aquatic Porpoise retains its authored water presentation.
- Added a reusable exact-geometry review renderer with front three-quarter, true-front, and true-side cameras. Baseline and cubic results remain ignored under `output/living-bestiary-cubic-seven/`; all three cubic sheets and the regenerated seven-creature Field Guide sheet were manually reviewed at original resolution.
- Verification is clean: 83/83 Living Bestiary checks, native TypeScript, targeted ESLint, and all five direct Vinext production-build phases. The compiled local Vinext server again stalled before binding a port in both foreground and hidden-process attempts, so browser-game verification remains blocked by that runner issue; the deterministic renderer walks the exact production `BufferGeometry` used in-world.
- Resolved: the user approved this exact cubic direction and requested it for the remainder of the expansion roster, with four named exceptions.

## Unified Living Bestiary cubic roster and visual standard - 2026-07-18

- Extended the approved high-detail cubic runtime treatment to 33 of the 37 Living Bestiary expansion creatures. Thalassene/the Reef That Swims, Orichalc/the Oath Under Stone, Vellum Warden, and Choir-of-One remain deliberately faceted because their continuous growth, negative space, paper strata, or suspended sound-body is concept-critical.
- The conversion changes production geometry rather than only portraits: every visible primitive in the 33 selected rigs is now a true `BoxGeometry`, while the complete authored hierarchy, semantic shape metadata, materials, transparency, emission, tack, and cached animation remain intact.
- Recalibrated every grounded converted species against its exact cuboid bounds. Focused tests verify complete roster coverage, the exact exception list, attached anatomy, contact-plane accuracy, drift-free animation, material effects, tack, and sound palettes.
- Added `docs/BLOCKWILD_VISUAL_THEME_PROPOSAL.md`, a 524-line art-direction proposal defining handcrafted voxel naturalism, high-detail cubic storybook anatomy, grounded storybook materialism for blocks and structures, approved reference models, anatomy/face/animation/material rules, budgets, anti-patterns, workflows, review gates, and an adoption plan.
- Captured the honest seven-cubic baseline and unified-cubic result under ignored `output/living-bestiary-unified-cubic/`. The roster remains at 2,232 authored meshes while visible triangle count falls from 68,599 to 20,050; transparency and emission remain selectively present.
- Manually reviewed the field roster, legendary/summon roster, both before/after comparisons, and all 33 cubic creatures from front three-quarter, true-front, and true-side views. Bodies remain volumetric, faces survive head-on, appendages connect, and the four deliberate exceptions remain visually distinct.
- Verification is clean: 83/83 Living Bestiary checks, 15/15 current portrait/renderer checks, native TypeScript, targeted ESLint, whitespace validation, and all five Vinext production-build phases. The production server returned HTTP 200; Chrome rendered and exercised the main menu and Characters submenu without application errors. The only denied requests were the remote production favicon in the network-restricted test environment.
- This pass remains uncommitted for user review; no push was requested.

## Unified visual-theme implementation - 2026-07-18

- Adopted `docs/BLOCKWILD_VISUAL_THEME_PROPOSAL.md` as Blockwild's binding art-direction contract: handcrafted voxel naturalism, high-detail cubic storybook creature anatomy, and grounded storybook materialism for the world.
- Added executable visual registries for tier budgets, seven canonical creature references, the four approved faceted silhouette exceptions, and 17 material families covering all 286 registered blocks.
- Added fillable creature and block/material-family briefs so silhouette, anatomy, animation, ecology, face direction, construction, acquisition, and runtime review are designed before production work begins.
- Added an exact-runtime audit across all 215 creatures and all 286 blocks. It measures geometry, face/joint/distal/animation structure, emission and transparency, contact, cubic-contract compliance, material family, atlas cells, layer, shape, hardness, tool, drops, acquisition, recipes, and natural/structure placement evidence. Strict mode currently reports zero creature violations and zero block violations; 27 nonblocking legacy creature polish observations remain visible rather than being hidden.
- Corrected Glowmoth's flying classification; strengthened the Copper Scout, Stone Bulwark, and Aetherforged Sentinel with connected lower limbs, ankle cuffs, forearms, hand clamps, and constructed facial/service planes; and preserved exact terrain contact.
- Gave Deepgear Brick, Riveted Brass, Deepgear Lantern, and Rootweave Soil dedicated authored production-atlas cells; corrected Sugar Soil's directional faces; and restored the Deepgear Stool's inventory item, acquisition alias, and crafting recipe.
- Added a deterministic pixel-canvas implementation and exact atlas review renderer. The reviewed output covers all 17 material families with top/side/bottom samples and 3 x 3 repetition checks generated from the real `createBlockAtlas()` painter, not proxy art.
- Added `test:visual-theme`, `audit:visual-theme`, and `showcase:visual-theme` commands and placed the strict visual contract in the standard release pretest.
- Final verification: strict audit 215 creatures / 286 blocks / 17 families / zero violations; 83/83 Living Bestiary, 12/12 dwarf-golem, 7/7 visual-theme, 78/78 focused model/fauna/crafting, 10/10 rendered/audio, and 703/703 main gameplay tests pass. Native TypeScript, repository-wide ESLint, whitespace validation, all five direct Vinext production phases, and a manual ESM Worker/hosting-manifest validation pass.
- The Bash Sites wrapper still fails before compilation at its protected-home bootstrap (`mkdir /c/Users/NoahH`), so the compiler and artifact checks were run directly. The exact production server returned HTTP 200; the required web-game browser client generated a new world, reached `state: playing`, observed live Petalfox and Canopy Lark ecology, and reported no browser or page errors. Menu, world setup, gameplay, creature comparisons, production atlas, and family review sheets were inspected manually.

## v1.7.0 main integration acceptance - 2026-07-18

- Merged the latest pushed `github/design-1` commit (`e7a21db`) into `main` while preserving the independent local and remote `design-1` branch. The release combines Wild Bonds & Hearthroads with the protocol-v2 multiplayer-authority hardening already completed on main.
- Reconciled the merged test scripts and progress ledger, updated the creature-rarity multiplayer fixture for scoped protocol-v2 mob snapshots, and regenerated canonical creature portraits from the final combined runtime rigs.
- Final verification passes 151/151 standard release pretests, all 843 TypeScript gameplay/content tests, all 10 rendered/audio checks, native TypeScript, repository-wide ESLint, the five-phase Vinext production build, Sites manifest/ESM Worker validation, and patch-integrity checks.
- The exact production server returned HTTP 200. The required web-game browser client loaded v1.7.0 with the expected title/menu and valid `render_game_to_text` state, emitted no console/page error artifact, and produced a manually reviewed 1280 x 720 capture. Fresh-world runtime behavior is additionally covered by the clean merged engine, ecology, multiplayer, content, and persistence suites.

## Lighting Redux - 2026-07-19

- Implemented the lighting proposal as a derived chunk-owned voxel field: one packed `Uint16` per cell stores independent four-bit skylight and RGB block-light channels. Data-driven block definitions now own emission strength, hue, material dampening, and separate visual self-emission.
- Replaced height-column shading and radius-baked source scans with deterministic increase/decrease propagation through actual voxel topology. Opaque walls stop light; air, water, foliage, and transparent materials attenuate according to their definitions; edits remove dependent light without ghosts; missing chunks are hard boundaries; seams and negative coordinates are load-order deterministic.
- Replaced terrain `MeshLambertMaterial` correctness with a shared voxel-light shader. Smooth per-corner samples feed normalized `voxelLight` and `voxelEmission` attributes; light edits refresh those buffers without rebuilding positions, UVs, normals, or indices. Static correctness no longer depends on Three.js point lights; the accent pool was reduced from 64/32 to 16/8 and its query radius from 46 to 30 blocks.
- Added `voxelOcclusion` as a separate bounded shader attribute. A section-local occluder cache preserves subtle contact/corner depth without baking ambient occlusion into albedo or adding allocations to the corner-light hot path.
- Removed the binary cave-light threshold from presentation. Sky exposure and actual depth produce a smoothed subterranean blend used independently by fog, sky color, sun/moon/stars, ambient audio, and cave scoring; cave-state switching has hysteresis. The same authoritative voxel query now governs hostile spawn darkness and crop light.
- Added the F3 lighting probe showing sky/RGB levels, cave blend, queued light-buffer sections, and derived memory. At 512 loaded chunks the field reports 48.0 MB (96 KiB per chunk), remains save/network-derived, and has no migration payload.
- Optimized large edits with one bounded chunk-halo relight. A 256-block roof test fell from roughly 3.2 seconds of repeated edit propagation to about 0.3 seconds while preserving exact darkness and light-buffer updates.
- Added `docs/LIGHTING_SYSTEM.md` as the maintained architecture, performance contract, test matrix, and extension checklist. The final proposal audit covers packed sky/RGB fields, material contracts, increase/decrease propagation, hard unloaded boundaries, seamless negative coordinates, light-only mesh updates, smooth corners, separate ambient occlusion, continuous cave presentation, shared gameplay authority, diagnostics, derived persistence, and bounded accent lights with no outstanding proposal item.
- Verification: the standard release pretest and all 706 core gameplay tests pass; native TypeScript, targeted ESLint, and patch-integrity checks pass; direct Vinext production compilation and manual ESM Worker/manifest validation pass. The official web-game Playwright client and a deeper persistent Playwright session both reached the current build; a newly generated world compiled the final WebGL shader, drained its light-work queue, exposed the F3 sky/RGB/cave/memory probe, and reported zero console/page errors. Daylight, debug, ambient-occlusion, and placed-torch captures were manually reviewed under ignored `work/lighting-redux/`.
- TODO: none for this proposal. Future additions only need to populate the four lighting fields on new luminous or filtering block definitions.
## v1.8.2 Hearthcraft machine and display pass - 2026-07-19

- Active goal: replace the legacy Queen Cell shortcut with a reusable, cancellable Capture Orb morphing machine; preserve exact queen orbs inside crafted apiaries; make queen removal suspend rather than erase a colony; add an opt-in above-hive queen display; compact the apiary panel for 1080p; render only real spell tomes with school-aware colors; add active furnace light; and rebuild fireplace flame presentation around a larger animated torch-style fire.
- Visual direction follows `docs/BLOCKWILD_VISUAL_THEME_PROPOSAL.md`: grounded storybook materials, ordinary load-bearing structure, legible mechanism, and a restrained magical accent. The new Waykeeper Chrysalis Loom uses timber/Deepgear framing, a visible orb cradle, star-crystal conduit, and honey-gold transformation light rather than a generic glowing cube.
- Release gate: focused pure-state and engine integration tests, full native TypeScript suite, production build, 1080p browser UI and in-world visual review, verbatim prompt audit/cleanup, then exact-commit GitHub and Sites source sync plus live deployment verification.
- Implemented the stateful Tome Display as an empty carved lectern until a real spell tome is installed. Its open book now carries school-colored covers, spine, luminous rotated rune, page script, corner clasps, and focus stone; unknown or later-added spell schools resolve through an explicit neutral fallback palette.
- Reworked crafted apiaries around exact Capture Orb custody. Installing a neutral or bonded Hive Queen stores her actual orb, removing it returns the same identity and leaves workers/products dormant, breaking a crafted apiary drops that orb, and the above-hive queen presentation is a per-apiary opt-in that defaults off. Wild hives keep loose visible queens which must be captured before installation. Queens grow one worker per bounded five-minute cycle up to eight, including queen-only bootstrap colonies.
- Added the Waykeeper Chrysalis Loom as a new craftable, saved, shared workstation. The first pattern turns a worker Honeybee in a Capture Orb into a Hive Queen over 42 seconds using one Royal Jelly and one Star Crystal; cancellation preserves every input, completion preserves the orb/creature name/bond/owner, and recipe complexity plus batch helpers scale later morph costs and duration. The in-world cradle animates its orb, rotating ring, and star motes while active.
- Active furnaces now contribute a restrained warm candidate to the nearest-first entity light pool and one bounded voxel-shader machine light. Hearth Fireplaces use a deeper dark firebox, grate/log bed, and three animated flame tongues driven from the established torch flicker system at a larger hearth scale.
- Acceptance audit: the apiary and Loom were manually reviewed at 1920x1080; both fit without scrolling. The compact apiary exposes its exact queen orb, five-of-eight worker occupancy, worker-growth track, stores, production, and the disabled queen-flight toggle. At 600x400 the apiary window reports a 376px viewport over 864px content with `overflow-y: auto`, confirming the small-monitor scroll fallback. Browser console review reports zero errors and zero warnings.
- Final verification: 163 release pretests, 10 rendered/audio checks, and all 718 gameplay/content tests pass with no failures, skips, or todos. Native TypeScript, whole-repository ESLint, targeted post-review lint, patch integrity, the Vinext production build, and the simulation benchmark all pass. The 64-apiary benchmark reaches the expected 512-worker, 320-honey, 64-jelly bounded result.

## v1.8.3 Bottles & Bundles - 2026-07-19

- Active request: return released ordinary Capture Orbs to the canonical stackable empty item; return bottles from consumed potions; fill bottles directly and through nearby Alchemy Stand water; repair bottle/stand inventory art; and give four produce-crate families a ten-item-equivalent sale value.
- Root causes: released empty orbs retained identity-only metadata that made each inventory slot unique; potion use destroyed its selected unit without returning its container; Alchemy Stand batch validation saw only the six adjacent cells and its React resource ledger never received the world-water catalyst; the bottle icon shared a small generic silhouette while the stand lacked authored 28px art.
- Implementation checkpoint: plain empty orbs now serialize without metadata while fitted lenses remain exact singleton upgrades; container replacement returns bottles safely for both singleton and stacked potions; source-water filling never edits the world cell; Alchemy Stand water queries use one bounded five-block sphere shared by backend and HUD; and crate values derive from the same ordinary player-sale formula as their contents, multiplied by ten.
- Visual acceptance: the dedicated icon audit rendered Empty Glass Bottle, Water Bottle, and Alchemy Stand side by side at their real 28px inventory/hotbar size and 22px recipe size. All three occupy the socket clearly, the empty/filled bottle states remain distinct, and the stand's twin bulbs, brass frame, feet, and crystal focus survive the smaller presentation. The browser exposed v1.8.3 through `render_game_to_text` with no console/page-error artifact.
- Verification: all standard release pretests pass; native TypeScript and repository-wide ESLint pass; the official five-phase Vinext build and Sites artifact validation pass; rendered/audio checks pass 10/10; and the complete gameplay/content suite passes 721/721 with no failures, skips, or todos. The generated 215-creature Field Guide was refreshed to v1.8.3 after the release identity changed.

## v1.8.4 Moonbrawn Motherlode - 2026-07-19

- Frostpear leaf follow-up: rebuilt the dedicated tile with irregular alpha gaps, five-tone canopy grain, paired pixel leaflets, and pale frost tips. The exact nearest-filtered production atlas was manually reviewed at native tile scale; the canopy now reads as layered leaves instead of a flat mossy sheet. TypeScript, targeted ESLint, 77 focused visual/world tests, the verified five-stage production build, Sites artifact validation, and the official browser smoke client all pass without a page or console error.
- Glimmerwood/desert polish follow-up: reduced desert cactus rolls to 15% of their prior density; authored separate ribbed cactus sides and a spine-ringed top; replaced Moonbough Leaves' borrowed flower cell with dense moonlit foliage; and gave Starfern and Dreamcap detailed dedicated atlas silhouettes used by their world, held, and dropped presentations. Palimpsest Vault's descending spiral now clears a third transition cell above every tread so the player can walk down without striking the ceiling.
- Glimmerwood/desert verification: manually reviewed the exact nearest-filtered production atlas, including the cactus side/crown and the four new bottom-row material cells. Native TypeScript, targeted ESLint, the 64-test focused gate, every standard pretest, the verified five-stage build and artifact validator, rendered/audio checks, and all 728 gameplay/content tests pass. The official production browser client exposed a healthy v1.8.4 title state and emitted no page or console errors.
- Wayfarer free-look follow-up: pilots and passengers now keep an independent mouse-look yaw while the hull remains controlled only by the helm's WASD input. The mounted HUD calls out mouse look, and a direct engine regression test protects the camera from being snapped back to boat heading on later simulation frames.
- Star Crystal Ore visual follow-up: replaced its generic twenty-pixel ore scatter with a connected, tile-aware crystalline seam inside dark host rock. Cyan facets and sparse pale/violet cores keep the active accent below one quarter of the surface, while data-driven level-nine cyan emission gives the ore a real cave glow that remains weaker than a refined Star Crystal Block.
- Star Crystal verification: manually reviewed the exact nearest-filtered 16 x 16 tile and its placement in the complete production atlas; native TypeScript, targeted ESLint, 69/69 focused world-engine tests, every release pretest, the five-stage Vinext build and artifact validator, rendered/audio coverage, and all 724 gameplay/content tests pass. The official browser client loaded the rebuilt v1.8.4 artifact, exposed a healthy `render_game_to_text` state, and reported no page or console errors.
- Raised Iron and Copper Ore yields to one-to-four raw ore, applied a single explicit 1.25 generation multiplier to every conventional ore roll, and expanded ordinary vein cells from 2 x 2 x 2 to porous 3 x 2 x 3 seams. Living Veins retain their bespoke rarity and cell scale so their luminous ecology remains concentrated instead of washing out ordinary tunnels.
- Restored the original two-slot Worker Bee plus Royal Jelly Queen Cell recipe. Queen Cells still seed crafted apiaries and now also release a persistent neutral Hive Queen into an open targeted cell, preserving stored bee identity and genetics when present.
- Replaced the Chrysalis Loom's bee-crowning pattern with a 48-second Mossling-to-Moonbrawn pattern using four Moonberries and one Star Crystal. Schema-v1 Loom saves retain both exact orbs and Star Crystals, cancel the retired active job without consumption, and expose all stored Royal Jelly through a recovery-only slot.
- Added the Moonbrawn Mossling as a morph-only Bestiary form with fixed Verdant/Stone stats and moves, explicit ecology, Moonberry taming, Capture Orb bond persistence, same-form breeding, inherited offspring bonds, and staged research notes.
- Built and manually reviewed its high-detail cubic storybook model in production isometric, front, side, and portrait renders. The first render exposed a 0.037-block resting-knuckle penetration; the corrected rig reports exact ground contact and retains articulated legs, forearms, shoulders, crown, face, and restrained crystal/moonberry heart animation.
- Verification: native TypeScript and targeted ESLint pass; all release pretests pass; the five-phase Vinext production build and Sites artifact validation pass; rendered/audio checks pass 10/10; and the complete gameplay/content suite passes 724/724 with no failures, skips, or todos. The official browser client rendered the Chrysalis Loom audit at 1280 x 720, exposed v1.8.4 through `render_game_to_text`, and reported no page or console errors. Production isometric, front, side, and portrait renders were reviewed manually after correcting the first rig's 0.037-block knuckle penetration; the final Moonbrawn reports exact ground contact.

## Adult dragon body-plan review set - 2026-07-19

- Built four actual high-detail cubic adult alternatives for every canonical dragon type: Fire, Ice, Steel, Sea, Gold, and Silver. The 24 review rigs span quadruped, wyvern, avian, serpentine, ray-like, mothlike, six-legged, and wingless siege silhouettes instead of recoloring one shared plan.
- Generated individual portraits, two-by-two decision sheets, current-production control sheets, and exact iso/front/side inspection renders under ignored `output/dragon-adult-alternatives/`.
- Manually reviewed every new decision sheet and the front/side inspection sheets. The 16 newly added Ice/Steel/Gold/Silver choices contain 87-136 visible parts; grounded options have exact ground contact and suspended options declare flight/swim reference poses.
- Superseded by the Mythic Frontiers implementation below: all 24 reviewed forms are now production variants rather than a single-choice replacement set.

## Mythic Frontiers and dragon variants - 2026-07-19

- Promoted every reviewed adult alternative into production: Fire, Ice, Steel, Sea, Gold, and Silver now each expose four stable named forms. Variant identity persists through saves, eggs, hatching, breeding, and multiplayer validation; young anatomy remains shared while adult rigs apply one authored silhouette transformation.
- Added the complete 15-site Mythic Frontiers catalogue: ten landmark POIs, five multi-stage dungeons, six craftable material families, four independent loot pools, fifteen one-time signature rewards, deterministic pity, approach silhouettes, return routes, map markers, and one persistent large resident per lair.
- Implemented sealed underwater pressure routes, explicit flooded rooms, dry-underground water rejection, surface-to-depth stairs, the Gorgon and Hollow loops, Namarra air gardens, the Ashen chimney, bounded local placement validation, road and settlement exclusion, and expanded Dwarven clearance at Titan's Kettle.
- Added fifteen detailed high-cubic legendary rigs with authored stats, universal types, level and bond moves, action tells, capture/covenant rules, sparse custom sound reuse, field utility, mount profiles where appropriate, rarity/bestiary stages, restrained lethal drops, and better renewable peaceful sheds. An explicit myth-source and adaptation ledger preserves each source relationship and flags sensitive working material for specialist review.
- Persistent encounter state now distinguishes six recoverable regional species, four sanctuary custodians, and five unique dungeon apexes. Recovery advances lazily on site load or revisit, captures never duplicate, site history survives regional return, signatures cannot be farmed endlessly, and nearby parties wake at most two large brains.
- Release evidence under ignored `output/mythic-frontiers-release/` contains iso, front, and side runtime sheets for all fifteen creatures and all twenty-four dragon forms, plus overhead, approach, entrance, and core atlases for all fifteen sites. Manual review corrected loose dragon framing, atlas bleed, and broad base-block emission before release.
- Final gates pass: 163/163 standard release pretests, the complete post-build gameplay/content matrix plus 10 rendered/audio checks, repository-wide ESLint with zero warnings, native five-phase Vinext compilation, ESM Worker/hosting-manifest validation, 3,000 deterministic structure plans, 5,000 proxy/revisit transitions, and strict visual audit across 230 creatures and 300 blocks with zero violations.
- Final ecology and release audits cover 57/57 proposed surface-biome assignments, all 15 mythic habitat records, 21 total legendary encounters, 10,000 diversified-loot simulations, 50/50 verified Dwarven settlement seeds, and all 24 surface plus seven underground biome layers. Spatial indexing reduces local candidates by 93.8-97.9% and reaches 6.93x over the naive 300-entity query.
- Production browser QA returned HTTP 200, rendered the menu and new-world flow, generated a fresh Sunstep Savanna world with 230-creature catalog metadata, accepted movement input, and exposed valid live ecology through `render_game_to_text`. The only denied request was the canonical production favicon under the isolated local-network policy; there were no application or page errors.
- Re-read the authoritative proposal after verification. Every design-contract, reference-policy, distribution, placement, encounter, loot, site, model, material-family, audio, persistence, performance, and acceptance-gate requirement is represented in runtime content, tested policy, or final release artifact. TODO: none.
## Workstation and Bestiary QoL - 2026-07-19

- Expanded the Capture Orb Rack from four to eight persistent, migratable, interactive slots. The production block, held model, item icon, two-shelf world mesh, runtime orb display, overlay, grotto marker, and occupancy tests now agree on the new capacity.
- Rebuilt the Creature Healing Station as a low concave four-orb basin. Its world display now renders only stored orbs with the same shell, crossed bands, cap, and rune model used by the rack; a state-driven front reservoir shows stored Cave Gel.
- Made Cave Gel understandable and reversible: the healer has a dedicated input/reserve control with left-, right-, and shift-click withdrawal, inventory shift-deposit remains available, tooltips identify it as optional healing fuel and an alchemy ingredient, and the panel explains the exact free and accelerated pulse cadence.
- Added compact caught/uncaught badges to every capturable Bestiary list card while leaving sentient entries free of misleading capture state.
- Manually reviewed before/after isometric and orthographic workstation renders plus production browser captures for the eight-card rack and Healing Station. Focused behavior/UI/model tests, TypeScript, changed-file ESLint, diff checks, all configured pretests, the complete post-build test matrix, Vinext's five-phase production build, packaged Worker validation, and packaged browser QA pass without console or page errors.

## Directional workstations, connected racks, and active-time Cave Gel - 2026-07-19

- Added one sparse cardinal-facing map for asymmetric placed blocks. Placement faces chests, furnaces, Capture Orb Racks, Healing Stations, apiaries, fireplaces, chairs, tables, shelves, archive furniture, and other authored workstations toward the builder; the metadata persists in saves, travels in bounded multiplayer block edits and snapshots, and costs no entry for the legacy north-facing default.
- Rotated the actual chunk geometry, runtime chest lid/lock model, stateful orb displays, and chair sitting anchor. Double chests now pair only along their shared local width with matching facing; older saved double-chest keys retain their former visual layout. Furnaces use a shallow authored front plate so their facing remains obvious while their other masonry faces stay neutral.
- Capture Orb Racks now join only to same-facing neighbors. Lateral neighbors share rails and suppress internal posts; vertical neighbors suppress the internal base/crown and carry continuous outer posts. The resulting 2 x 2 production gallery reads as one clean rack wall while preserving eight independent slots per block.
- Wildwood Tables, Wildwood Shelves, every Archive Shelf fill state, and Hearth Fireplaces are physical. Collision follows each authored shallow/tabletop footprint and rotates with the furniture rather than treating decorative empty space as a full cube. Chairs remain sittable and rotate their seat pose with the placed backrest.
- Replaced per-hit Cave Gel consumption with a buffered active chamber. One reserve unit auto-loads only when at least one stored creature is wounded, lasts exactly 600 active-healing seconds, pauses both its fuel clock and the station pulse clock while idle, and makes each ordinary 20-second healing hit restore 10 health to every wounded orb. Fuel use is station-wide and independent of whether one or four creatures are healing; reserve and partial active charge both persist.
- The Healing Station panel and world reservoir now distinguish buffered Gel from the current active charge, show an active m:ss timer and proportional meter, and state the exact +1 free versus +10 fueled cadence. The deterministic audit fixture displays a 6:12 active charge for ongoing browser review.
- Added `test:block-facing` to the standard pretest gate. Focused placement, persistence, furniture, seating, multiplayer-compatibility, healer duration/pause/buffering, and legacy integration checks pass. Final acceptance passes 167 release-pretest checks, all 726 post-build TypeScript gameplay/content tests, 10 rendered/audio checks, native TypeScript, changed-file ESLint, whitespace checks, the five-phase Vinext production build, and packaged Worker/manifest validation.
- Production browser QA used the required web-game client against the final build. `output/workstation-orientation-fuel/production-placement/shot-0.png` covers the clean 2 x 2 rack wall, paired and rotated chests, front- and side-facing furnaces, the four-orb healer, tables, shelves, fireplace, and chair; `output/workstation-orientation-fuel/production-healer/shot-0.png` covers the active charge UI. Both captures and their text states were manually reviewed with no browser/page error artifact.

## Star Crystal and Shellfruit husbandry - 2026-07-19

- Added lossless nine-to-one Star Crystal compaction in both directions. The crystal item now has a faceted luminous cluster icon, and the block owns dedicated top, side, and bottom atlas art with a fused starburst crystal pattern rather than borrowing a generic tile.
- Changed the Deepgear Lantern recipe to produce three lanterns per craft without altering its ingredients or placement behavior.
- Turned Shellfruit into a complete underwater crop. A whole fruit can be planted into sand, gravel, clay, mud, or stone beneath source water; its waterlogged sprout, young colony, and ripe pearl-bed stages grow through the ordinary five-times-slower farming clock without being mistaken for vertically stacking kelp.
- Mature Shellfruit harvest yields two to four fruit, gains one with a scythe, and leaves the young root colony established. Breaking a stage restores its water cell. Nine fruit compact reversibly into a dedicated Shellfruit Crate with authored lid, side, inventory, and world textures.
- Added Shellfruit Bed to the Plant Compendium with ocean, deep-ocean, and Lumen Trench ecology, cultivation instructions, harvest behavior, food use, and crate utility. Regenerated its individual production portrait and the complete 48-entry plant contact sheet.
- Release evidence under ignored `output/star-shellfruit-release/` contains the exact production atlas crop, a high-cubic Shellfruit bed review render, full plant sheet, and a browser-rendered inventory audit for both Star Crystal forms, Shellfruit, its crate, and the Deepgear Lantern. All were manually reviewed; the browser emitted no page or console error artifact.
- Final acceptance passes 167/167 standard pretests, all 728 TypeScript gameplay/content tests, 10/10 rendered/audio checks, native TypeScript, changed-file ESLint, whitespace validation, the five-phase Vinext production build, strict visual audit across 230 creatures and 304 blocks with zero violations, and packaged Worker/hosting-manifest validation.
- This pass remains uncommitted for review; no commit or push was requested.

## Known Roads navigation and chest parity - 2026-07-19

- Constrained map view state against its authored explored bounds. Whole-map view cannot drift into empty parchment, while zoomed views pan only until a real outer edge reaches the canvas; button, wheel, drag, controlled, and local view paths share the same constraint.
- Tracked destinations no longer expire by range or disappear behind the player. Out-of-view targets clamp to a bright compass edge with a directional chevron, name, and distance; an 8,000-block browser fixture verifies the HUD remains useful with the minimap disabled.
- Added a persisted, north-up 11 x 11-chunk HUD minimap toggle directly to Known Roads and Settings. It defaults off, uses the existing square map projection and water-first terrain palette, paints only bounded explored chunks, follows the player without per-frame terrain work, and pins distant tracked targets to its edge.
- Custom personal markers are now valid fast-travel destinations for exactly two banked charges. Both channel start and commit independently revalidate the destination and charge cost, with no spend before the five-second still/damage-free channel completes.
- Unified closed chunk chests and animated runtime chests behind one geometry contract. Body, lid, depth, hinge height, latch size and position, chest atlas material, facing, and single/double latch layout now match; the animated lid still opens upward around its rear hinge.
- Added deterministic map/navigation and chest visual audit routes for release QA. Final browser evidence is under ignored `output/map-navigation-chest-release/`: terrain coverage remains 76.42% initially and 75.15% after repeated zoom/pan to an edge, custom travel arrives at the exact marker and reduces four charges to two, minimap preference persists, and the console/page error ledger is empty.
- Manually reviewed default and panned maps, opt-in minimap, 8,000-block HUD direction, completed custom journey, static chest, and animated open chest captures. Final acceptance passes 167/167 standard pretests, all 732 TypeScript gameplay/content tests, 10/10 rendered/audio checks, native TypeScript, repository-wide ESLint with zero warnings, whitespace validation, all five Vinext build phases, packaged ESM Worker/manifest validation, the official game browser client, and the deeper production browser audit.

## Post-hitch camera stability - 2026-07-19

- Active request: diagnose and stop occasional screen skips after a lag spike.
- Root cause found: `design-1` does not contain the pointer-lock reacquisition quarantine from the later `d80a2cc` hotfix line, and its live mouse handler applies every unbounded `movementX`/`movementY` event immediately. Browser events queued during a main-thread hitch can therefore collapse into one presented frame. Physics catch-up is already capped to four fixed steps and third-person position damping receives a capped delta, leaving look input as the unbounded visual path.
- Implemented strict pointer-lock/menu guards, the two-event reacquisition quarantine, rejection of pointer events older than a 150 ms presented-frame gap, and a shared mouse/touch look budget of 12 degrees per rendered frame. Overflow is discarded rather than buffered, so a hitch cannot turn into a delayed camera glide; ordinary motion and the next fresh frame remain responsive.
- Verification: native TypeScript and targeted ESLint pass; `world-engine.test.ts` passes 69/69; performance and multiplayer-stability suites pass 58/58; all five Vinext production-build phases pass. The official game client produced a clean state snapshot with 60 FPS and no browser errors. A pointer-locked Chromium audit deliberately blocked the main thread for 230 ms at 2.3 average FPS: the stale burst rotated the camera by exactly 0 radians, an eight-event same-frame burst stayed at 0.210 radians (12 degrees), and fresh input resumed on the next frame. Final runtime screenshot and JSON are under ignored `output/post-hitch-camera/` and were manually reviewed.

## Mirrored wing synchrony - 2026-07-19

- Fixed Ashnose Bat's mismatched flight stroke. Its two wing pivots did not identify their mirrored side or shared stroke phase, so the final bird animator treated both as right wings.
- Audited the other birdlike and flying rigs and repaired the same metadata or phase error in Runeowl, Lanternray, Prismtail Swift, Sailfin Skimmer, Chimewing, Cinder Kite, Vaultwing, Mossback Kite, and Voidmantle Ray. Reedstrider and Lightning Bug also now use one shared physical stroke mirrored across the body.
- Reworked the underground flyer pose and Living Bestiary animator so corresponding left/right wings always share one phase while distinct fore/aft wing pairs can retain separate phases. This prevents future authored node order from making paired wings drift apart.
- Verification: focused fauna, world-overhaul, and Living Bestiary suites pass 55/55; portrait, renderer, adventure-content, and visual-theme suites pass 43/43; native TypeScript, scoped ESLint, whitespace checks, and all five Vinext production-build phases pass. The official web-game client loaded the final production build without a browser/page error artifact. The exact production upstroke/downstroke sheet under ignored `output/wing-synchrony/` was manually reviewed; Ashnose Bat and every audited counterpart mirror correctly.

## Natural fish and cave-water ecology - 2026-07-19

- Replaced the shared dry-land spawn search with locomotion-aware placement. Aquatic fauna now resolve an actual contiguous liquid column, cave fliers resolve dry cave air, and cave walkers resolve a supported cave floor; none of these paths fall back to an unrelated surface height.
- Added a dedicated `cave-water` population pool with a desktop target of four and ceiling of six. Glasswater fish no longer compete with every mole, bat, construct, and hostile cave resident for the old eight-cost underground target, and older natural creature records reclassify safely when restored.
- Surface aquatic activation now follows nearby verified habitat instead of the player's exact biome label. A player standing on a shore, riverbank, Glimmerwood pond edge, or loaded Sugarplum syrup pond can seed the corresponding water population, while isolated one-cell water and decorative trickles fail the five-of-nine connected-volume check.
- Small fish and cave shoals probe a nearer 12-36 block band and use an 18-block anti-pop-in sightline; larger aquatic animals retain the 24-56 block band and ordinary 48-block visibility protection. Placement remains bounded to 36 probes and 12 candidates, and land-hostile plus zero-density worlds skip aquatic scanning entirely.
- Added a renewable-resource reserve within the ordinary local budget. Surface and cave water-ambient populations preferentially refill Raw Fish-bearing species when useful shoals are scarce; Glasswater subsequently refills Glow Scale-bearing fish without creating a separate unbounded spawn source.
- Added runtime ecology diagnostics for valid aquatic candidates and explicit rejection causes. Save migration, local/global weighted ceilings, hunting pressure, domestic protection, habitat activity, and existing group behavior remain authoritative.
- Regressions cover real and isolated water volumes, dry cave floor/air resolution, pool-specific weighted selection, Raw Fish prioritization, shoreline activation from a non-water biome, the generated `WILDERNESS` Glasswater cathedral, a complete natural `trySpawnMob` cave-water success, save pool classification, and the zero-density fast path.
- Final verification passes native TypeScript, changed-file ESLint, whitespace validation, the five-phase Vinext production build, 890/890 TypeScript gameplay/content tests, and 10/10 rendered/audio checks. The official web-game client exercised movement and time advancement against the final production build; the manually reviewed 1280 x 720 frame under ignored `work/fish-spawn-browser-qa-final/` is visually clean, `render_game_to_text` exposes all seven ecology pools, and there is no browser/page error artifact. TODO: none.

## Grounded underground rivers and basins - 2026-07-19

- Root cause: horizontal graph streams and ecological pools were rasterized against their source tunnel or ellipsoid height before overlapping cavern volumes were unioned. When an upper stream or Glasswater/Emberdeep pool crossed a taller chamber, its original liquid plane remained suspended over the newly open space.
- Horizontal streams now author a bounded stream mask and settle as shallow channels onto the final local floor. Ecological water and lava pools retain their designed volume but pack upward from supported ground after graph rooms and legacy noise caves are combined. Explicit vertical waterfall edges remain the only intentional unsupported liquid.
- Regional noise-aquifer wetness is now stable for an entire x/z column below its water table, preventing alternating air/liquid voxels from making broken vertical ribbons.
- The deterministic 112 x 112 underground audit improved from 4,543 unsupported water cells (3.011%) and 294 unsupported lava cells to 125 unsupported water cells (0.083%, all in authored waterfall corridors) and zero unsupported lava cells. The former floating-lake fixture now contains 3,890 water cells with zero air-supported cells.
- Added regressions for the overlapping Glasswater/cathedral fixture and an Emberdeep lava basin while preserving substantial aquatic habitat volume.
- Final verification passes native TypeScript, changed-file ESLint, whitespace validation, 891/891 TypeScript gameplay/content tests, 10/10 rendered/audio checks, and all five Vinext production-build phases. The official game browser client loaded the deterministic cave overlook with no browser/page error artifact; `work/underground-liquid-qa/browser/shot-0.png` was manually reviewed and shows the broad lake seated across the cavern floor with only the authored distant falls elevated. TODO: none.

## Collision-safe creature impacts - 2026-07-19

- Root cause: local melee and dragon status attacks translated mob scene groups directly after damage, bypassing ground resolution and voxel collision. Repeated hits could therefore place a creature inside a wall or below the valid foot plane; ordinary AI then had no reliable way to escape.
- Added one terrain-aware movement/recoil path for lead tension, player melee, remote-authoritative melee/ranged hits, creature moves, golem and Peelop attacks, arrows, and dragon attacks. Impulses advance in bounded substeps, stop at solid terrain, damp independently of AI movement, and never displace mounted or shoulder-carried creatures.
- Added physical body contact for ground mobs and player-to-mob pushing. Gameplay mass derives from authored size, radius, and height; inverse-mass separation makes smaller creatures yield farther while large creatures remain movable but weighty. Pair work reuses the mob spatial index and is capped at 256 overlaps per frame.
- Added a staggered safety probe that detects ground creatures already intersecting terrain and relocates them to the nearest supported clear position within 2.5 blocks. This repairs old saves and exceptional external displacement without a continuous broad search.
- Centralized direct player-hit audio on the existing `playerDirectDamage` sample and added bounded horizontal recoil plus a small upward response. Creature moves, projectiles, dragons, legacy melee, and multiplayer strikes now share the same feedback helpers.
- Added deterministic mass, wall-stop, embedded-body recovery, mob-pair separation, player recoil, and damage-audio regressions, plus `?mob-collision-audit=1` as a maintained production-browser impact lane.
- Final verification passes native TypeScript, changed-file ESLint, whitespace validation, all 895 TypeScript gameplay/content tests, 10 rendered/audio tests, and all five Vinext production-build phases. The official game browser client loaded the exact final build with no console/page errors; `work/mob-collision-qa/final-browser/shot-0.png` was manually reviewed and shows all three size classes separated, grounded, and stopped against the masonry rather than embedded in it.

## Authored Waystone map sigil - 2026-07-19

- Replaced the Wayshrine's generic chess-rook map glyph with a dedicated compact SVG: a faceted stone monolith, stepped foot, and glowing branching route rune. The same authored mark now appears on the map pin, map legend, and selected-location inspector.
- Added a selected Crossroads Waystone to the deterministic map audit through `?waystone-icon-audit=1`, plus static-render coverage that rejects the old rook and requires all three Waystone icon contexts.
- Final verification passes native TypeScript, changed-file ESLint, whitespace validation, all 896 TypeScript gameplay/content tests, 10 rendered/audio tests, and all five Vinext production-build phases. The official production browser client selected the Crossroads Waystone through the dedicated audit; its pin, legend, and inspector sigils were manually reviewed at 1280 x 720 with no console/page errors. Evidence is under `work/waystone-icon-qa/browser/`.

## Integrated design-1 release - 2026-07-19

- Merged the four latest `design-1` commits through `0d51ca9` into `main` without moving or deleting the working branch. The merge combines Mythic Frontiers, production creature variants, directional furniture/workstations, Known Roads navigation, chest parity, post-hitch camera safeguards, synchronized wing animation, aquatic ecology, grounded underground liquids, collision-safe creature impacts, and the authored Wayshrine sigil with the v1.8.4 Moonbrawn, Hearthcraft, Glimmerwood, Frostpear, bottle, and bundle work already on `main`.
- Reconciled permanent save identifiers into one non-overlapping registry, preserved all authored atlas cells, regenerated the 231-creature production portrait set, and retained both the Chrysalis Loom and the complete design-1 material/reward catalogue.
- Personal map markers remain valid charged destinations at the authored premium of two banked journeys. Natural POIs, beds, and visited settlements cost one; Wayshrine-to-Wayshrine travel remains free from a known Wayshrine.

## Remote settlement-origin handoff hotfix - 2026-07-19

- Root cause: Advanced world creation could preview a culture settlement with an expanded 30-64-region search, but `VoxelEngine.createWorld` independently resolved the origin with the old fixed 18-region default. A valid distant selection therefore disappeared during the handoff and ordinary center spawn silently won.
- World creation now receives the exact bounded search radius used by the preview. The default and maximum live in one settlement-index contract, and both preview and creation normalize against the same cap.
- Added a deterministic regression seed whose nearest eligible Wood Elf village is more than 10,000 blocks from center: it is intentionally absent at radius 18, found at radius 64, and resolves identically on the creation path.
- Final verification passes the complete `npm test` release gate, native TypeScript, scoped ESLint, whitespace validation, and a production-browser audit. The audited player spawned at `[1319, 34.49, 10079]` in Glimmerwood with `moonbough-enclave-2-j-dekkam` recorded as the starting settlement; the manually reviewed frame visibly confirms Moonbough Enclave discovery and contains no browser error artifact.

## Living-world navigation and field reference - 2026-07-19

- Rebuilt ground and aquatic locomotion around measured movement. Route probes now retain stall evidence until the body actually advances, swept motion slides deterministically around block corners, wider bodies accept partial-but-stable footing at ledges, threatened ground creatures can commit to a two-block descent, and fish validate midpoint plus endpoint water before choosing a shoreline route.
- Increased desktop aquatic population targets and global ecology headroom, expanded natural shoal placement radii, and strengthened fish separation while preserving bounded group sizes, spatial-index collision checks, independent ecology pools, hunting pressure, and the zero-density fast path.
- Inventory and crafting drag painting now previews every staged slot and the remaining cursor stack continuously before pointer release. Player fall distance is measured from real downward travel; the first four blocks are safe and damage begins only beyond them.
- Known Roads now opens to a stable 1,024-block square around the player. Its world-coordinate viewport pans independently of discovery bounds at every zoom, so old discovery shapes are terrain data rather than clipping masks; detail rendering continues to cull against the current viewport.
- Added the searchable Trailcraft Guide across inventory, crafting, Furnace, Alchemy Stand, Distillery, Sugarworks, Apiary, Chrysalis Loom, and Golem Forge views. All 522 registered items receive deterministic descriptions and origins plus unified “how to make it” and “what it makes” processes; ingredient links drill into their own entries and crafting processes can return to the existing non-autocrafting pattern board.
- Added opt-in one-Hz performance/resource telemetry to Settings with an editable 1–180 minute emergency stop. Reports include frame percentiles, render calls and memory, chunk radii, entity/resource counts, ecology rejection diagnostics, multiplayer state, optional browser heap metrics, and precise player position. Manual stop, time limit, and Save & Quit download local JSON; nothing is uploaded.
- Giant Mooncaps retain full-block collision and their existing crown, while the visible lower gill region pulls inward to a stout 0.44-block stem. The production placement audit now includes the exact authored block.
- Final validation passes 168 focused regressions, 773 complete TypeScript gameplay/content tests, 10 rendered/audio checks, all standard pretests, native TypeScript, zero-warning changed-file ESLint, whitespace validation, and every Vinext production build phase. The official game client and a deeper Chromium audit cover the Mooncap gallery, map pan/zoom, item guide, and a real three-sample telemetry download with no console/page errors. Manually reviewed evidence is under ignored `output/pathing-mooncap-audit/`.

## Handcrafted ocean flora - 2026-07-19

- Replaced the ordinary ocean's glow-heavy scatter with coherent ecological beds. Brinegrass and Sailkelp are the two matte staples; Featherwrack and Pearlfan provide restrained color and shelf accents. Exact Ocean weights are 94% staples and 1% luminous flora, while Lumen Trench remains a concentrated glowing center.
- Added complete waterlogged block/item/plant contracts, dedicated 16 x 16 atlas cells, harvest and underwater planting loops, creative access, Plant Compendium ecology/cultivation entries, and distinct generated Compendium portraits for all four species.
- Multi-block grass, kelp, and wrack now use species-specific connected geometry, same-species vertical joins, slight overlap through voxel boundaries, and top/bottom atlas edge occupancy. Ocean generation chooses one coherent patch species before local variation instead of salt-and-pepper columns.
- Added deterministic habitat-weight exports, a 193 x 193 Ocean distribution regression, vertical-column continuity tests, atlas seam checks, and `?ocean-flora-audit=1` as a maintained underwater browser gallery. The empirical audit generated 92.27% staple columns with approximately 1.47% luminous flora.
- Final verification passes native TypeScript, changed-file ESLint, strict visual-theme auditing with zero block violations, 930/930 TypeScript gameplay/content tests, 10/10 rendered/audio tests, the five-phase Vinext production build, and packaged Worker/manifest validation. The official game client loaded the exact audit seed with no browser/page error artifact; both the live underwater frame and `output/ocean-flora-redesign/ocean-flora-review.png` were manually reviewed and revised for readability. TODO: none.

## Ammonarch gait and Cave Gel hover - 2026-07-19

- Confirmed that Ammonarch's legs were inverted: the shared arthropod femur and knee rotations sent both mirrored sides toward positive Y, placing the gait above the shell. Reversed both signed rotations so hips descend outward, knees remain below hips, and feet remain below knees.
- Fixed the shared source rather than masking Ammonarch alone, correcting Prismclaw Mantis Shrimp, Reefmender Shrimp, Shellcarrier Hermit, and Fossilback Trilobite as well. Regenerated their production portraits and the complete creature contact sheet.
- Added world-space anatomy assertions for every Living Bestiary arthropod leg. Each chained knee must now sit below its hip and each foot below its knee, preventing this orientation error from returning through animation or model revisions.
- Removed Cave Gel's long Healing Station explanation from `itemHoverText`; the Healing Station panel retains the complete fuel instructions at the point of use. The production inventory now exposes exactly `Cave Gel` as the item's tooltip.
- Final verification passes native TypeScript, changed-file ESLint, 930/930 TypeScript gameplay/content tests, the five-phase Vinext production build, manually reviewed three-view Ammonarch and four-species arthropod sheets, and production-browser Bestiary/inventory audits with no page or console errors. TODO: none.

## Hydrostatic underground containment - 2026-07-19

- Reproduced the remaining failure independently of the earlier support audit. The original 48 x 48 Glasswater diagnosis contained 233 submerged water cells opening horizontally into air, 354 exposed faces, and continuous liquid columns up to 67 blocks deep even though most liquid had a non-air block beneath it. Vertical support alone was therefore the wrong invariant.
- Replaced legacy wet/dry aquifer cutoffs with a cached world-space hydrogeology pass. Every wet aquifer core now has a deterministic one-block stone envelope derived from its four cardinal neighboring columns, including across negative chunk seams, while the open top remains a usable water surface.
- Ecological Glasswater and Emberdeep pools no longer conserve an intersected ellipsoid by stacking its liquid through a lower cavern. Each node authors a 1.5-block geological annulus from the same global ellipsoid; after all cave volumes are unioned, that annulus restores only punched-out air or unrelated fluid as biome-appropriate banks and floor before the original basin volume is filled.
- Replaced roof-filled waterfall tunnels with a one-block cascade centerline. Fine sampling plus deterministic Y/X/Z Manhattan bridging keeps each fall face-connected without turning its surrounding tunnel into a four-to-five-block-wide water tube. These narrow falls are now the only permitted exposed vertical water.
- Expanded the maintained regression from support counts to hydrostatic integrity: it measures submerged open faces, rejects every multi-block water curtain, preserves more than 30,000 water cells in the fixture, checks zero open sides in the exact Glasswater and Emberdeep basins, and proves opposite chunk generation order produces byte-identical seam blocks.
- Final fixture metrics are 35,667 water cells, five intentionally unsupported cascade cells, 43 narrow waterfall faces, and zero wide submerged faces. The exact tree passes 931/931 TypeScript gameplay/content tests, 10/10 rendered/audio checks, native TypeScript, changed-file ESLint, whitespace validation, the five-phase Vinext production build, and packaged Worker/manifest validation.
- The official web-game client loaded `?cave-liquid-audit=1` from the final production build with no console/page error artifact. `work/underground-liquid-containment-qa/browser/shot-1.png` was manually reviewed after revising the audit lighting and cascade connectivity; it shows the large intact aquatic basin with one continuous narrow fall instead of a broad freestanding liquid wall. TODO: none.

## Cragglass Basilisk predator redesign - 2026-07-19

- Replaced the underground Basilisk's generic six-legged quadruped treatment with a 124-part high-detail cubic ambush predator, up from 74 visible parts. It now has a broader wedge skull, recessed luminous gaze, predatory brows, layered cheeks and snout, articulated lower jaw, rooted fangs, nostrils, shoulder and haunch bastions, staggered flank mirrors, a dorsal cragglass ridge, and a segmented breaker tail.
- Rooted the framed seven-shard gaze crown in the animated skull instead of leaving it on the visual root. Concentrated amber fracture light in the crown and forehead lens while keeping ordinary scale armor dark, preserving the underground contrast rules.
- Rebuilt the middle limb pair to the same socket, upper limb, knee, lower limb, ankle, planted foot, and embedded-claw standard as the front and rear pairs. All six legs now participate in a slower heavy crawl; alert motion opens the real jaw and tensions the crown, while the weighted tail uses a restrained cadence.
- Re-authored the exact terrain correction after the heavier foot rig changed the lower bound. The production inspector reports `GROUND Y=0.00`, `LOWEST Y=-0.000`, and exact contact in isometric, front, and side views.
- Regenerated the canonical Bestiary portrait and complete creature sheet. Ignored review artifacts under `work/basilisk-redesign/` preserve the true before portrait, final comparison, clean multi-angle view, model manifests, and official-client browser capture.
- Verification passes native TypeScript, scoped ESLint, whitespace validation, 34 focused Living Bestiary/portrait/renderer/theme tests, and all five direct Vinext production-build phases. The official web-game client opened the Basilisk Variants record from the production build; its final portrait was manually reviewed in context and produced no page or console error artifact. TODO: none.

## Exploration performance optimization - 2026-07-19

- Current request: "Go for it. Optimize based on your findings and push to design-1. Be masterful. This should be very playable"
- Evidence baseline: the supplied 482-second telemetry capture has 0.967 correlation between rolling frame time and chunk work. Chunk-busy snapshots averaged 27.6 FPS and 23.87 ms of chunk work; chunk-idle snapshots averaged 57.2 FPS despite carrying more draw calls, triangles, and creatures. The final stable scene reached 71.5 FPS after chunk work drained.
- Working hypothesis: exploration hitching is dominated by main-thread chunk generation, remeshing, lighting, upload, or scene-integration bursts. Preserve creature density and visual distance while bounding and prioritizing chunk work.
- Acceptance focus: instrument distinct chunk stages and queue pressure; enforce predictable/adaptive frame budgets; avoid stale work; preserve deterministic generation, multiplayer, saves, liquids, lighting, and ecology; validate sustained traversal in the production browser and compare telemetry before release.
- Replaced whole-chunk generation, whole-chunk light initialization, and whole-section meshing in ordinary exploration with resumable stages. Terrain advances two local X columns at a time, lighting advances in 1,024-operation batches with task-local propagation state, and mesh geometry advances one local X column at a time while the previous finished mesh remains visible.
- Added a rotating scheduler with a 6-9 ms adaptive hard budget. Generation, initial lighting, relighting, and meshing each receive fair priority across frames; stale generation and mesh tasks are canceled when the player changes streaming regions, and the hidden generation halo only remeshes its visible seam neighbor.
- Extended performance samples and downloadable/live diagnostics with scheduling, generation, lighting, meshing, current task stages, queue depth, slice progress, and the active frame budget.
- Exact-output gates now compare synchronous and resumable terrain blocks, heightmaps, biome maps, packed voxel light, indices, positions, normals, colors, light, emission, occlusion, and UV buffers. Focused TypeScript, lighting, streaming, and performance coverage passes 101/101; scoped TypeScript and ESLint are clean.
- The repeatable 720-frame Node traversal kept chunk work busy in every frame and measured 6.86 ms average / 10.32 ms p95 world-update work, versus 23.87 ms average chunk work in the supplied busy telemetry capture. A 24-second production-browser sprint covered 85.8 route blocks and 51.2 blocks of displacement while loading 60 chunks; its rolling result was 50.9 FPS and 7.64 ms average chunk work (0.92 generation, 5.62 lighting, 1.08 meshing) with no console or page errors.
- The official web-game client also completed the final production build with no error artifact. `work/exploration-performance/browser/official-client-release/shot-0.png`, `before-traversal.png`, and `after-traversal.png` were manually reviewed: the authored placement gallery remains intact during streaming, and traversal reaches the Sunwash Coast with water, seafloor, and horizon rendering continuously rather than exposing missing chunk geometry.
- Final release verification passes all standard pretest suites, 778/778 complete TypeScript gameplay/content tests, 10/10 rendered/audio checks, native TypeScript, changed-file ESLint, whitespace validation, all five Vinext production-build phases, and packaged Worker/manifest validation. TODO: none.

## Multiplayer, Hearthcraft, and field-reference release - 2026-07-21

- Current request is preserved verbatim in ignored `work/current-request-verbatim.md` until the final checklist is complete.
- Confirmed three primary authority/performance defects before editing: a generated Furnace has no host container state until the host opens it; guest drops receive only 5 Hz position snapshots and their visual removal can precede the authoritative player-state credit; tree felling performs immediate lighting/section rebuilds and can repeat no-op remesh work on the initiating guest.
- Content audit reserved append-only ids 598-602 for the Wheat Mill, Flour/Bread Crates, Flour, and the Mill inventory alias. Existing item id 156 is the only intentional compatibility alias (`CreatureCage` / `CaptureOrb`); the release will add a validator that rejects any other named item-id duplicate.
- Planned UX contract: `?` opens the hovered/focused item in the Item Wiki from every item-bearing panel, `B` opens the targeted creature or plant Field Manual record, item-guide recipe links carry an explicit recipe filter into the recipe book, and concise contextual shortcut hints remain setting-controlled.
- Completed the furnace authority repair, immediate guest pickup transactions, interpolated replicated drops, and tree-felling work slicing. Guest pickup credit now arrives before visual removal, older drop snapshots remain compatible, and felling avoids redundant lighting, mesh, and save work without shortening the animation.
- Shipped Bread, Flour, Wheat Mill, Flour Crate, and Bread Crate as the Hearthmill Handshake pantry chain. Baking consumes Flour, all shared meats use generalized names, item ids are runtime-audited, and Hearthkin farmers occupy a dedicated millhouse.
- Shipped direct Item Wiki recipe boards and filtered Recipe Book handoff, contextual `?` item and `B` creature/plant shortcuts, a default-on compact shortcut hint, the Field Manual link, accepted Guild Journal, retroactive settlement discovery, and prerequisite-hidden quest branching.
- Repaired Hearthkin interior and gate spawning, fence continuity, doorway clearance, resident held items, and sentient door/gate traversal. Added the non-closing occupant guard to gates, harvest-result glyphs, precise click-before-drag inventory behavior, semantic stool/fence/gate/mill artwork, and tenfold farther map zoom.
- Versioned the release as v1.8.6 Hearthmill Handshake and regenerated the canonical 231-creature field-guide sheet and changed Hearthkin/creature portraits from the production rigs.
- Final verification: every standard pretest gate passes; the complete TypeScript gameplay/content suite passes 793/793; native TypeScript, changed-file ESLint, and whitespace checks pass; and both final Vinext production builds complete all five phases with a valid Sites Worker/manifest artifact. The official web-game client loaded the final production world and emitted versioned state. Manual browser review at actual 28 px/22 px item sizes confirms the Capture Orb Rack balls are centered and all new pantry/furniture icons remain legible; the Wheat Mill audit fits at 1080p with a readable 63% process state and no overflow. TODO: none.

## v1.8.7 First Dawn Hotfix - 2026-07-21

- Opening survival quests now count completed days rather than the current day number; day-one false-ready saves reconcile back to active.
- Same-slot left-button release commits the held cursor stack directly, while genuine multi-slot drag painting retains its existing distribution behavior.
- Local, host-resolved, and remote tree-fell edits immediately rebuild only directly edited visible sections before the falling proxy moves. Neighbor seams and the large lighting halo remain deferred, preventing the standing-tree duplicate without restoring broad synchronous work.
- Verification passes 216 focused quest/inventory/world/tree/multiplayer/release tests plus all 197 standard pretest checks, native TypeScript, changed-file ESLint, whitespace validation, all five Vinext production phases, and Worker/manifest validation. The official client loaded v1.8.7 without a console-error artifact; its full inventory frame was manually reviewed at release size. Release-ready.

## v1.8.8 Packhand Hotfix - 2026-07-21

- Reproduced the collect-all regression at the browser-event boundary: pointer releases carry no click count, while the trailing clicks carry details one and two. The v1.8.7 direct pointer-up placement therefore emptied the cursor before the second click could collect matching stacks.
- Deferred a same-slot release until its immediately following click so detail two reaches `collectMatching` before any placement mutation. A zero-delay, target-bound fallback preserves the earlier repair when a facility overlay re-renders before dispatching its click; genuine multi-slot painting remains unchanged.
- Focused inventory, world-engine, and multiplayer coverage passes 151/151; all 197 standard pretest checks, native TypeScript, changed-file ESLint, all five Vinext production stages, and Worker/manifest validation pass. The official web-game client loaded v1.8.8 without console or page errors, emitted the correct versioned state, and its 1280x720 title frame was manually reviewed. Release-ready.

## Performance Overhaul v2 - 2026-07-21

- Completed goal: telemetry v2 and first-pass phases 1-5 from `docs/PERFORMANCE_OVERHAUL_MASTER_PLAN.md`; WebGPU/TSL, recursive autoresearch, the full route matrix, hardware-GPU acceptance, and additional greedy-mesh research remain explicitly future work.
- Telemetry v2 now separates rolling HUD samples from non-overlapping one-second export windows, reports active CPU, mob simulation, render submission, asynchronous GPU timing, native long-animation-frame events, and wildlife simulation-tier counts. Reports use schema 2 and state their aggregation contract.
- Streaming scheduler v2 now accepts an explicit adaptive wall-clock allowance, biases queued work toward movement direction, records queue age/debt, throughput/cancellation counters, ring completeness, and exact occupied-chunk readiness episodes.
- Ordinary wildlife now uses full, active, coarse, and sleep simulation tiers with deterministic fixed cadences, while nearby, hostile, hurt, targeted, mounted, following, and led creatures stay fully responsive.
- Two bounded browser terrain workers now generate deterministic chunk blocks, metadata, indices, and isolated packed lighting through transferable buffers. Resumable main-thread seam reconciliation preserves byte-exact global light output without restoring a whole-chunk stall. A second worker consolidates vertical terrain buffers by render layer before bounded Three.js installation.
- Added a 64 MiB byte-bounded memory LRU plus a versioned IndexedDB terrain/light cache. Revisited chunks rebuild GPU state from cached CPU arrays; the deterministic reversal benchmark reduced unready frames from 160 to 7 (95.6%) and average world-update time by 14.0%.
- Exact per-section meshes now consolidate into at most one visible mesh per chunk/render layer. The final production traversal held 325 section meshes behind 98 submissions, a 69.8% reduction, while preserving atlas/light/AO/transparency behavior and editable section data.
- Final 24-second Chromium/SwiftShader traversal: zero occupied-chunk outages, 9/9 immediate-ring readiness, 6.73 ms average active CPU, 5.08 ms bounded chunk work, 1.20 ms render submission, 45 peak draw calls, and no page/console errors. GPU time averaged 20.10 ms, correctly identifying the software-GPU constraint instead of attributing its 50 ms p95 frame interval to CPU simulation.
- Manually reviewed `work/performance-overhaul/browser-traversal-v5/after-traversal.png` and both final official-client placement frames at 1280x720. Streamed coast/water and authored blocks remain continuous with no new holes, seams, transparency, or lighting defects.
- Final verification passes all standard audits and 798/798 TypeScript gameplay/content tests, the verified five-phase Vinext production build and deployable Worker/manifest validation. The tracked plan records achieved gates, honest residual targets, and all future WebGPU/autoresearch work. Released on `design-1`; TODO: none.

## Layered Item Wiki Escape handling - 2026-07-21

- Added a synchronized Item Wiki visibility layer to keyboard routing. Escape now dismisses the wiki before evaluating Bestiary filters, spell wheels, inventories, facilities, pause menus, or title navigation beneath it.
- Preserved normal stacking behavior: with Inventory beneath the wiki, the first Escape closes only the wiki and the second closes Inventory through the existing container path.
- Added a deterministic Inventory-plus-Item-Wiki browser audit and regression coverage for the ordering contract. Focused UI/inventory tests pass 35/35, all 197 standard pretest checks pass, native TypeScript and changed-file ESLint pass, and the five-stage production build plus Worker/manifest validation succeed.
- Browser verification observed `wiki=0, inventory=1` after the first Escape and `wiki=0, inventory=0` after the second. The official web-game client rendered the layered Trailcraft Guide cleanly at 1280x720 with no console or page errors. TODO: none.

## Player-action performance pass - 2026-07-21

- Active request: preserve the performance recommendation verbatim, implement every proposed interaction, terrain consolidation, telemetry, render-submission, and simulation improvement on `main`, establish a tracked running comparison log, retain the tracked agentic-autoresearch report, fully verify the release, then delete the ignored proposal copy and publish GitHub plus Sites.
- The verbatim acceptance contract was preserved at ignored `work/performance-action-priority/proposal-verbatim.md` with SHA-256 `FA10D3E8F32BC0C154E9D3746F9C1303B2F88ECFAD2FCC78FE567A7E2E3035BE`, compared during implementation, and deleted after the implementation and verification checklist completed.
- Supplied schema-2 baseline: 10.80 ms weighted frame interval, 2.18 ms simulation, 2.05 ms chunk work, 4.53 ms render submission, 3.23 ms GPU, 100% immediate-ring readiness, and four occupied-chunk readiness episodes capped at 164.3 ms over 123.9 seconds.
- Confirmed production-path defect: an immediate edit rebuilds its section, but the replacement remains hidden behind the stale consolidated layer until the asynchronous merge installs. Tree felling therefore starts its proxy while the standing opaque/cutout geometry can remain submitted.
- Confirmed consolidation churn: the capture added 10,935 merge submissions, 1.11 GB of worker transfer payloads, 1,022 stale results, 12,000 created geometries, and 14,275 disposals. Queue-age maps also retain entries removed during reconciliation, inflating debt telemetry and leaking bookkeeping across traversal.
- Acceptance focus: old player-edited geometry is detached in the edit transaction; directly edited sections remain immediately visible; background seam/light work stays bounded; consolidation waits for stable chunk-layer state and coalesces revisions; interaction latency and truthful queue debt are exported; measured simulation/render work is optimized without reducing fauna or visual fidelity.
- Implemented the full player-feedback order: break/place/tree transactions detach stale combined layers before local presentation; stable-source, layer-specific consolidation coalesces revisions and rejects stale results; canceled queue timestamps no longer survive as ghost debt; static chunk and terrain transforms are frozen.
- Reduced repeated mob work by updating same-cell spatial records in place, caching scale-dependent model attachments, and rotating expensive habitat scans through a bounded 0.8 ms slice.
- Exact detached comparison against `096914c`: warm installation 0.0595 -> 0.0178 ms (-70.1%), terrain merges 962 -> 147 (-84.7%), stale merges 39 -> 2 (-94.9%), live terrain bytes -15.9%, debt 63.98 -> 13.60, and mid-ring readiness 80% -> 96%. The transient submitted-mesh increase and small readiness-delay regression are retained in the tracked ledger for a browser recheck.
- Direct action probe: 32 break/place operations plus one six-block tree removal; local presentation p95 3.10 ms, the tree proxy followed stale-geometry removal by 0.052 ms, and the run ended with zero pending interaction consolidations and zero stale merges.
- Verification: all 197 standard pretest checks, the complete 802-test TypeScript/gameplay/content suite, native TypeScript, changed-file ESLint, whitespace validation, all five Vinext production stages, and Worker/manifest validation pass. The official rendered gameplay client emitted schema-v2 `render_game_to_text` with no page/console error artifact; its 1280x720 terrain/furniture scene was manually inspected and is intact.
- Durable records now include `docs/PERFORMANCE_COMPARISON_LOG.md`, the README link, an operational-continuation section in the autoresearch case study, the expanded analyzer, and `benchmark:player-edits`.

## v1.8.9 Canopy Frame Hotfix - 2026-07-21

- Active request: preserve the latest performance proposal verbatim, complete its bounded consolidation/queue-aging work, diagnose and fix directional darkness during tree falls, run controlled verification, delete the ignored proposal only after acceptance, and publish main to GitHub plus Sites as v1.8.9.
- Saved the exact implementation contract at ignored `work/performance-1.8.9/proposal-verbatim.md` before edits.
- Root cause established: full resumable chunk relighting starts from a zeroed packed-light buffer but was marking visible sections dirty during partial breadth-first propagation. The frame scheduler could therefore upload an incomplete light field, creating a moving dark front across unedited ground. Complete relights now stay private until final mesh refresh; boundary reconciliation retains incremental publication.
- Falling foliage now uses opaque alpha-tested cutout depth like standing leaves rather than the blended transparent pass.
- Immediate edits compute their exact material neighborhood and invalidate only affected combined layers. Consolidation stability is evaluated per layer, prioritizes the player/immediate ring and high visible-source pressure, and old valid work gains bounded promotion without passing the critical ring.
- Focused lighting/world/tree/performance verification passes 126/126. Native TypeScript passes. The deterministic player-action probe ends with zero stale merges and zero pending transactions; local presentation p95 is 5.31 ms and local-to-consolidated p95 is 0.327 ms. Final browser/build/release verification remains pending.
- Controlled production-browser traversal covered 431.11 measured blocks and then held for 20 seconds with no page or console errors. The immediate ring remained 9/9 ready; during the stop combined layers increased 47 -> 75 while section/consolidation queues fell 201 -> 131 and 182 -> 159. SwiftShader frame time is recorded as non-comparable to the player's hardware.
- The deterministic tree-fall audit was manually reviewed across six frames: the ground remains evenly lit after the proxy clears, with no moving darkness in the fall direction. The v1.8.9 performance evidence and remaining hardware capture gate are recorded in `docs/PERFORMANCE_COMPARISON_LOG.md`.
- Acceptance contract `D8726C5C228239905D8AB5BB2F0FACA25D37806FBECF2D4FCF7595DACEE802BC` was compared item by item after implementation and deleted from the ignored work area only after the implementation, controlled benchmark, visual review, and release gates completed.
- Final verification passes all standard pretest audits, the verified five-stage Vinext production build and Worker/manifest packaging, rendered/audio checks, 805/805 TypeScript gameplay/content tests, native TypeScript, full-repository ESLint, and whitespace validation. The canonical 231-creature sheet was regenerated for v1.8.9 and manually reviewed. Release is ready for GitHub and Sites publication.

## v1.9.0 Seamwater & Cartography Pass - 2026-07-21

- Saved the exact active request at ignored `work/world-map-seams-flora/current-request-verbatim.md` with SHA-256 `58E6AE30F9DFD478A1323D68CEE775424E18BBC68E873A46863DEF35DFE74A7D` before implementation.
- Root causes established: the persistent terrain-cache namespace omitted the generator version, allowing old and new chunk algorithms to meet permanently; the continental waterline formula also produced abrupt one-block level changes; and a newly arrived generation-halo neighbor left ordinary-priority speculative edge faces inside consolidated meshes.
- Terrain cache keys now include generator v18, connected surface water uses one datum while beds and banks retain authored depth variation, and already-visible seams receive an urgent all-layer rebuild that retires stale consolidated geometry only when its corrected replacement is complete.
- Map landmarks now carry semantic surface, underground, underwater, or sky layers. Surface parchment intentionally includes aquatic and sky POIs while the World Below remains gated by entered depth bands; live structure discovery repairs old elevation-classified markers.
- Star Crystal now uses mirrored, two-axis tileable crystalline faces. River Ribbon has an exact periodic vertical texture join, while Reed Bloom has a new jointed reed identity, dedicated stem/crown atlas cells, and a crown emitted only at the top of a connected colony.
- Regression coverage includes semantic surface/underwater/sky/underground POI filtering, uniform river/sea water levels, late-neighbor face retirement for both water and terrain, waterlogged-flora joins, and exact two-axis texture symmetry. The complete gameplay/content run passes 809/809; a post-visual-adjustment seam/map/ocean/theme run passes 175/175.
- Native TypeScript, full-repository ESLint, whitespace validation, all five Vinext production stages, and Worker/manifest packaging pass. Exact-runtime browser audits show the repaired surface POIs plus the cross-chunk submerged scene, continuous River Ribbon, redesigned Reed Bloom, and Star Crystal swatch with no page or console errors.
- The ignored acceptance contract still matches SHA-256 `58E6AE30F9DFD478A1323D68CEE775424E18BBC68E873A46863DEF35DFE74A7D`; release publication remains the only pending gate.

## v1.9.1 Landmark Ledger Hotfix - 2026-07-21

- Diagnosed a production-only metadata loss behind missing surface POIs: terrain workers and both terrain-cache tiers returned generated voxel/light arrays but discarded `StructureMarker` side effects. The buildings remained in the world, while the map, chests, residents, and authored encounters had no semantic records to discover.
- Worker results now transfer the POI/chest/spawn marker entries owned by each generated chunk. Main-thread installation restores those entries before discovery and structure activation run.
- Memory and IndexedDB chunk records now preserve deep-cloned structure metadata. The terrain-cache namespace advances to `terrain-v4`, intentionally invalidating older voxel-only records that cannot reconstruct their missing landmarks.
- Added cache restoration coverage plus a real `?generated-poi-audit=1` browser route that relocates to a deterministic surface POI candidate without synchronously generating it, exercising the ordinary worker handoff rather than injecting a synthetic map marker.
- Verification passes native TypeScript, changed-file ESLint, whitespace validation, the 130-test chunk/map/world suite, and all five Vinext production build phases. The official browser client completed 33 worker chunks with no worker failures, loaded a real Restored Coliseum/Desert Temple site, and rendered its discovered surface POI on the map without page or console errors; the final 1280x720 map was manually reviewed.

## AI Companion Drone Platform - 2026-07-21

- Phase 0 (`dd16740`) freezes versioned agent observation, command, result, capability, chat, voice, public task/waypoint, and diagnostic contracts; adds fail-closed validators, deterministic fixtures, benchmark predicates, and the repository agent-player skill/manual.
- Phase 1 (`dae7f93`) migrates multiplayer to protocol v3 with connection-bound agent identity and capabilities, four-drone admission, host approval/pause/resume/mute/revoke/stop controls, reconnect checkpoints, bounded human/agent chat, and an isolated voice lane. Chat is deliberately inert observation data.
- Phase 2 adds a detailed animated Blockwild-style floating drone, lightweight `/agent` client profile (render 4/sim 3, pixel ratio 1, music/minimap off), typed frozen browser bridge, task-shaped host observations, world revisions, semantic-only agent replication, and explicit merged simulation regions. Focused TypeScript and 89 contract/model/multiplayer tests pass; the exact-runtime drone audit route is ready for the final browser gate.
- Phase 3 adds bounded hierarchical/local voxel navigation, frame-rate-independent steering, follow/wait/face/stop leases, door and gate traversal, stuck detection with bounded replanning, host-owned inventory inspection/move/drop, nearby container inspection and atomic transfers, and compact wiki/Bestiary/recipe lookups. Drones remain nonblocking and nontargetable; the host roster exposes pack and current-command progress. Native TypeScript and 92 focused agent/multiplayer/model tests pass.
- Phase 4 adds nondestructive mature-crop right-click harvesting, bounded area harvests, rooted-tree and explicit-resource gathering, exact tool validation, lease-protected work, atomic inventory capacity checks, two-stage building previews, exact material shortage reports, reserved-material commits, bounded incremental placement, safe cancellation/refunds, and cyan/amber drone work feedback. Native TypeScript and 106 focused agent, multiplayer, world, farming, and reservation tests pass.
- Phase 5 adds a world-saved public drone task/waypoint ledger with host inspection/editing, task-shaped observation retrieval, a secret-filtered world-and-agent runner notebook with correction/export/disable/expiry, import-safe world fingerprints, explicit local `/agent?testAdmin=1` test-world CRUD/import/export/hosting, fixture launch, bounded paused simulation, and engine-verifiable diagnostics. Remote guest world administration is deliberately impossible; notebook inspection happens through the trusted runner rather than copying private memory into multiplayer. Native TypeScript and 125 focused bridge/platform/runner/storage/UI/multiplayer tests pass.
- Phase 6 adds caption-first ElevenLabs speech from the trusted runner, a dedicated bounded RTC voice lane, out-of-order assembly, duplicate/conflict checks, per-agent quotas, exact caption correlation, host capability/mute enforcement, spatial/universal/off playback, individual listener mute and gain controls, and WebAudio pooled decoding. The key remains runner-only; generation or playback failure preserves text. Native TypeScript, changed-file ESLint, and 53 focused agent/voice/audio/multiplayer/lighting tests pass.

## Water flow, swimming, and Glow Scale consistency - 2026-07-21

- Active request: slow and taper dynamic water spread with Minecraft-informed behavior; fix held-space surface skipping; increase sprinting vertical swim speed by exactly 20%; preserve more long-jump entry momentum and depth; standardize the generic Glow Scale name everywhere; fully verify; delete the ignored verbatim request copy after comparison; and publish a new GitHub branch.
- Saved the exact request temporarily at ignored `work/water-physics-1.9.2/request-verbatim.txt` before source edits.
- Root causes: the 80 ms liquid update consumed newly enqueued cells in the same call; flow levels were simulated but not meshed; held Space alternated water thrust with air gravity after the feet sample escaped; entry retention lasted one frame; and only the inventory definition retained the species-specific `Gloomfin Scale` label.
- Implementation checkpoint: liquid processing now advances one pre-existing frontier every 0.2 seconds; runtime levels feed a closed seven-step mesh taper; sprint strokes multiply vertical input by 1.2; near-surface Space converges to a submerged tread unless a valid shore boost applies; and fall-entry sink speed persists and decays across submerged frames.
- Exact-runtime flow and swim scenes are console-clean and were manually reviewed; the flow surface visibly descends toward its edge, while the closed seven-level geometry and 600-frame held-Space equilibrium are enforced by deterministic mesh/controller regressions. The v1.9.2 field-guide header was also rasterized and manually reviewed after its release-stamp refresh.
- Final verification passes the complete standard pretest set, all five Vinext production build phases plus Worker/manifest validation, 814/814 TypeScript gameplay/content tests, native TypeScript, changed-file ESLint, and whitespace validation. The full run also exposed and repaired stale field-guide version text plus an over-dense query-only ocean-flora audit window.
- The ignored request copy matched the original prompt exactly after newline normalization (SHA-256 `E9F127E1416F0FA26751763B4D4E548740EEEB466E98B0B7976B363169554B20`) and was approved for deletion only after every requested gameplay, naming, research, and verification item was checked off.

## Water surface exit follow-up - 2026-07-21

- Active request: let an intentional upward swim stroke breach the surface enough for a small hop and reliable land exits, while keeping held Space from settling into walk-on-water equilibrium; verify and publish to GitHub and Sites `main`.
- Implementation checkpoint: a fresh Space press now owns one short surface-crossing stroke. The stroke is consumed until Space is released, while the existing bank-aware shore boost remains the stronger path onto a one-block ledge.
- Verification passes the focused swim/world suite, native TypeScript, changed-file ESLint, the complete pretest matrix, 814/814 standard gameplay/content tests, rendered HTML/audio checks, all five Vinext production stages, and Sites artifact validation. Exact-runtime scenes confirm a visible open-water breach, a W+Space shore exit onto dry terrain, and a ten-second held-Space tread with the player's feet still well below the surface; all three were console-clean and manually reviewed. The release is ready for GitHub/Sites `main`.

## v1.10.0 Fieldglass Accord release gate - 2026-07-22

- Phase 7 (`db9a773`) hardens exact agent transfers, safe approval presets, diagnostics evidence, real data-channel pressure, work cleanup, full `emote` handling, safe snapshot shaping, and the deterministic multi-agent soak. The implementation ledger is the final proposal-by-proposal acceptance record.
- Integrated the upstream v1.9.2 water/swimming release without dropping either system. A final disconnect guard also keeps prototype-only multiplayer harnesses safe, while generated portrait comparisons remain exact across Windows CRLF and Linux LF checkouts.
- The complete release gate passes 237 standard pretest checks, all five Vinext stages plus Worker/manifest validation, 10 rendered-page/audio checks, 817 gameplay/content tests, native TypeScript, whole-repository ESLint, and whitespace validation: 1,064 repository checks in total.
- The six-scenario 30-simulated-minute capacity soak completes 840/840 commands, explicitly rejects a fifth drone and stale transfer racer, conserves inventories and build reservations, and retains all admitted co-located and separated simulation interests.
- Exact-runtime 1280 x 720 human and `/agent` scenes were manually reviewed. The articulated fieldglass drone and lightweight client badge are clear and on-theme; a 390 x 844 geometry probe is overflow-free; both pages have zero console warnings or errors. Evidence lives in ignored `work/agent-platform-release/browser/`.
- Implementation release commit `c7d51c3` was pushed to GitHub `main` and the existing Sites source repository. Sites version 64 reached `succeeded`; cache-bypassed live readback shows `v1.10.0 Fieldglass Accord` at `/` and the companion badge plus authored drone scene at `/agent`, with no browser warning or error. A final evidence-only commit records this observed state before the exact branch head is republished.

## v1.10.2 Veilreach - 2026-07-22

- Contact combat now has one body-aware reach contract from acquisition through the active frame. Contact attacks own facing/movement during commitment, share host-authoritative resolution across local players, remote players, and mobs, and distinguish hit, dodge, obstruction, and invalidation without false impact audio.
- Direct creature hits use doubled horizontal recoil with raised caps, a bounded grounded hop, stronger single-play hurt audio, water/air modifiers, and existing swept collision. Ground-mob authority snaps to valid terrain immediately while a shared presentation root settles a one-block rise/drop monotonically within 0.18 seconds.
- Cave mouths resolve one deterministic, full-footprint dry site with a two-block support collar and use it in both terrain and graph carving. The relocated mouth remains flora-free; river-bank, aquifer, connectivity, negative-coordinate, load-order, and Dwarven-hold audits remain clean.
- Camera presentation now separates propagated voxel skylight from direct sky/celestial visibility. Rate-limited enclosure probes, sparse celestial rays, eased cave state, dark deep-cavern backgrounds, and roof-aware sun/moon hiding leave the authoritative voxel-light field unchanged.
- Basic Render Distance adds a visual-only worker-built ring with the invariant `simulation <= render <= basic`, 2/4/8-block surface sampling, connected cave-graph silhouettes, water-aware color, skirts, stale cancellation, transition retention, adaptive frame-pressure suspension, no raycasts or simulation, and detailed telemetry. Agent, touch, and equal-distance profiles do no proxy work.
- Release benchmarks remain inside the proposed caps: 10 -> 20 chunks is 82,360 triangles/4.94 MB/2 draws; 10 -> 32 dragon flight is 102,960 triangles/6.18 MB/2 draws; deep cavern is 84,664 triangles/5.01 MB/2 draws; disabled is zero. Generation is isolated to one worker and uploads are deferred under pressure.
- Validation passes 240 standard pretest checks, 10 rendered-page/audio checks, 822/822 gameplay/content checks, 12/12 Basic Render tests, native TypeScript, changed-file ESLint, whitespace validation, and the five-stage production build. The official client rendered the 1.10.2 title, settings, and a generated live world without console errors; its low-end SwiftShader run correctly suspended proxy work while the full chunk queue was busy.

## Capture Orb and creature bonding simplification - 2026-07-24

- Active request: implement the approved single-Capture-Orb proposal, retain visible 40%-health reduction as the predominant aggressive fallback, add two optional transparent non-damage routes, separate custody from friendship, simplify research, migrate legacy orb/lens content, preserve multiplayer host authority, validate the complete acceptance contract, and publish `main` to GitHub and Sites.
- Implementation checkpoint: the versioned relationship policy now classifies every creature into care bond, covenant, commissioning, recruitment, summon lifecycle, relocation-only, or ineligible paths. Ordinary captured creatures begin in custody, automatically stabilize at 75% health, accept one displayed preferred food, require one to three day-bounded connection sessions by temperament, and become usable only after explicit Form Bond. Existing valid tame ownership migrates forward without loss.
- The universal hostile health threshold is now the proposal's inclusive 40%, with the visible one-heart fallback retained for tiny creatures and old near-defeat states.

## Embercarapace Beetle Tripo integration - 2026-07-28

- Active request: take Noah's currently loaded Tripo beetle asset, turn it into a polished and well-animated Blockwild mob, render the result for review, and create a local commit without pushing or deploying it.
- Source checkpoint: exported the 11-part segmented GLB from Tripo Studio as `blockwild-embercarapace-beetle-segmented.glb`; SHA-256 is `23B518DE618822DD443F50DAE9149976BB45F0FA6C19C3898D67458A2EC9526F`.
- Visual inspection confirms a strong Blockwild silhouette: six legs, paired stepped antennae, separate head and shell masses, red eye/shell accents, and a warm furnace-like abdomen. The production model will preserve this identity while replacing single-piece leg motion with connected, grounded multi-segment articulation.
- Planned runtime contract: an Emberdeep underground creature with a readable alternating-tripod gait, antenna search, abdomen heat pulse, defensive threat pose, authored spawn/economy/profile data, reusable chitter audio, canonical bestiary portrait, and a retained source/provenance record.
- Production checkpoint: `app/game/tripo-creature-models.ts` reconstructs the source as 75 shared runtime cuboids with connected hip-knee-tarsus chains, paired mandibles and antennae, split wing cases, restrained thermal vents, and exact ground contact in idle, both tripod plants, and the defensive brace.
- Content checkpoint: Embercarapace Beetles now spawn in Emberdeep groups of two to four, use the universal Capture Orb and care/bond lifecycle, share the established chitter family, carry Flame/Stone/Wild types, drop sensible sulfur and Glow Dust, and expose three extensible Bestiary field notes.
- Visual checkpoint: the untouched segmented source, nine-frame Blender motion review, four-pose exact-runtime review, canonical portrait, and editable 144-frame Blender showcase were manually inspected. Temporal QC found all 144 frames, consistent dimensions, no gaps, and no clipping warnings.
- Verification checkpoint: native TypeScript passes; the focused world-overhaul, fauna, capture-care, ecology-audit, model-renderer, portrait, and visual-theme suites pass 97/97 checks. The canonical public portrait sheet now indexes 232 production creatures.
- Final gate: changed-file ESLint and the direct Windows Vinext five-stage production build pass; the official Playwright client renders the title screen without console errors. Exact-runtime review reports ground contact for all four authored poses, while Blender temporal QC reports 144/144 complete frames with zero warnings.

## blockwild.app Vercel launch - 2026-07-31

- Active request: deploy Blockwild through Vercel at `https://blockwild.app`, preserving the existing GitHub and Sites release paths, and report any permission roadblocks.
- Account checkpoint: `blockwild.app` is owned by the `RedLynx101 Pro` Vercel team with Vercel nameservers, CDN, DNS management, and renewal active. It has no connected project or certificate yet. GitHub OAuth is not connected in Vercel, so the launch will use a direct validated deployment first.
- Compatibility checkpoint: native Next 16 Turbopack stalled, while `next build --webpack` compiled the game and workers successfully before identifying one reserved-route collision: Cardforge's non-React `app/game/tcg/layout.ts`. The Vercel profile renames that helper, keeps the verified Vinext/Sites build untouched, and makes `blockwild.app` canonical.
- Build checkpoint: native `next build --webpack` now completes all compile, type-check, page-data, static-generation, optimization, and trace stages for `/` and `/agent`; the five-stage Vinext/Sites build also remains green. TypeScript, changed-file ESLint, 19/19 Cardforge checks, 3/3 Vercel contract checks, 10/10 rendered/audio checks, and direct Sites Worker/manifest validation pass.
- Runtime checkpoint: the native Next production server returned HTTP 200 and the official deterministic game client loaded a structured v1.11.0 title state with its player chunk ready. A full-resolution title capture was manually reviewed and showed the expected menu, animated world backdrop, release label, and no browser-console error artifact.

## Worldheart icon rollout - 2026-07-31

- Active request: adopt icon proposal Option B, the Worldheart Cube, as Blockwild's live game identity and publish one validated commit to GitHub, Sites, and Vercel.
- Production treatment: preserve the approved transparent source, derive purpose-built 16, 32, 64, 180, 192, and 512 px PNGs with consistent clear space, replace the generic SVG favicon, and expose the identity through browser, Apple, and installable-app metadata.
- Release contract: verify true transparency and exact dimensions, manually inspect the production artwork and live title screen, pass native TypeScript, focused tests, lint, both Next/Vercel and Vinext/Sites builds, then publish one exact SHA across all three release paths.
- Validation checkpoint: 2/2 icon/metadata regressions, native TypeScript, changed-file ESLint, whitespace validation, the full Next/Webpack production build, all five Vinext stages, and direct Sites Worker/manifest validation pass. The exact Next production runtime reached a ready v1.11.0 title state with no browser error artifact; its title scene and the integrated 512 px transparent icon were manually reviewed.

## Concise browser title - 2026-08-01

- Active request: shorten the browser-tab title to `Blockwild`, validate it locally, and commit without publishing.
- Validation checkpoint: the rendered production document title is exactly `Blockwild`; native TypeScript, changed-file ESLint, 2/2 icon/metadata checks, and the Next/Webpack production build pass. The official deterministic client reached the ready title state without an error artifact, and its screenshot was manually reviewed. Publication is intentionally deferred.
## Performance and ice/water overhaul - 2026-08-03

- Active request: implement the complete approved performance and rendering proposal, keep an exact temporary copy until acceptance is complete, then delete it, validate the game, commit `main`, and synchronize GitHub and Sites.
- Acceptance source: `work/acceptance/2026-08-03-performance-ice-proposal-verbatim.md` contains the proposal verbatim and is ignored by Git. It must be deleted only after all proposal tasks are implemented or an evidence-based tradeoff is documented and validated.
- Baseline evidence: the supplied v1.12.0 capture averaged 43.5 ms/frame with 97.8% of frames over 25 ms; the principal measured pressures are an 8.8 ms streaming budget, late-run render/draw-call growth, a disabled generation worker, streaming debt, and telemetry that ends before post-render/HUD/persistence work.
- Work plan: repair instrumentation and benchmark determinism; make streaming pressure-aware; fix the ice/fluid boundary contract; reduce render-object churn; restore a bounded generation/meshing worker path; polish simulation scheduling; validate exact acceptance gates and visually inspect frozen water plus representative gameplay before release.
- Rendering checkpoint: water is now its own submission layer and ice is a depth-writing translucent solid. A centralized interface-owner rule emits exactly one water/ice boundary face across every axis and chunk owner; waterlogged and flowing-water seam regressions remain intact. Water animation advances a shader uniform rather than redrawing and re-uploading the entire atlas every 120 ms. The complete 121-test world/liquid suite passes.
- Instrumentation checkpoint: schema 3 telemetry records non-overlapping frame histograms, real session percentile inputs, post-render/HUD time, resource mode, native/effective pixel ratio, canvas pixels, visibility/fullscreen state, explicit GPU-timer support reason, shared geometry/creature-LOD pressure, and the highest-cost Long Animation Frame script sources. The analyzer merges histogram percentiles instead of averaging per-window percentiles.
- Main-thread checkpoint: navigation HUD delivery is capped at 20 Hz, the 232-creature Bestiary fingerprint is bounded to two checks per second, and periodic save serialization/storage is dispatched through idle work with a timeout instead of running inside `requestAnimationFrame`.
- Worker checkpoint: a hardware/memory-aware 2-4 total worker graph reserves one buffer lane, gives terrain generation one to three workers, requires a versioned ready handshake, reports startup/task errors, retries boundedly, and cleanly returns jobs to the resumable fallback. Terrain merge workers use the same handshake/error contract.
- Scene checkpoint: production creature primitives are immutable and shared across repeated species instances, so removing one mob cannot dispose geometry used by another. Ordinary distant, non-special wildlife uses one instanced low-detail submission per visible species; targets, hostiles, led/mounted/tamed creatures, dragons, summons, prime/legendary encounters, and POI residents retain authored rigs. Active/coarse simulation wakeups are deterministically phase-staggered.
- Frame-safety checkpoint: CPU reserve now caps available throughput instead of imposing 7.5 ms and high-work minimums over the adaptive controller. Severe pressure can therefore retreat to the 2 ms streaming safety floor while occupied/immediate-ring work retains priority. The stable layer-consolidation pipeline continues to coalesce revisions and apply stage-aware debt pressure before allocating final geometry.
- Deterministic benchmark checkpoint: settled walking, sprinting, and dense 360-degree traversal average 6.1-6.7 ms of CPU/world work; player-edit burst p95 is 9.78 ms with an 11.95 ms maximum; frozen-boundary edit p95 is 22.25 ms; and 100 distant creatures occupy one 128-capacity draw batch at 0.067 ms average. All final scenarios return the player chunk to ready.
- Exact-runtime checkpoint: both above-water and underwater frozen-lake scenes were manually reviewed. Ice remains a pale depth-writing shelf, open water remains separately blended, and the irregular cross-chunk interface has no doubled wall, striped overlap, air seam, or flicker. The production browser started two generation workers and the terrain-buffer worker, completing 29-31 generation jobs and seven buffer jobs per scene with zero failures or restarts and no page/console error artifact.
- Proposal tradeoffs are explicit. A renderer-free generator extraction is deferred because the production worker now completes exact deterministic jobs and moving the mature generator would add save/world-determinism risk without evidence of a remaining startup fault. Background terrain retains the existing stable one-submission-per-layer consolidation rather than duplicating the renderer's mesh builder in a worker. Per-creature materials remain local where hurt, rarity, emissive, and transparency state must diverge; immutable geometry and distant instancing remove the measured object pressure without breaking those effects. Path planning and save compression remain main-authoritative/idle-scheduled because the measured 100-creature path/broadphase proxy is 0.067 ms and the supplied capture does not attribute a persistence stall; schema-3 telemetry now makes either migration evidence-gated. WebGPU remains the proposal's intentionally out-of-scope future experiment.
- Release verification: native TypeScript and repository-wide ESLint pass; the final focused world/liquid/performance/worker suite passes 135/135; the standard pretest matrix passes; the complete rendered/audio and gameplay/content suite passes 830/830; and the Next/Webpack production build compiles, type-checks, prerenders, and traces all routes. The legacy WSL Vinext wrapper alone cannot consume this checkout's Windows esbuild binary, so Sites publication uses its source-backed remote build rather than mutating shared `node_modules` across platforms.
- The strict 1080p hardware FPS, ten-minute GPU heap, and final Chrome p95 thresholds remain a post-release player-machine capture gate, not an unverified claim from SwiftShader. The implementation supplies true schema-3 session histograms, GPU-support reasons, exact worker errors, deterministic scenarios, and resource-state capture so the next hardware log can make that comparison rigorously.
- The ignored acceptance source was re-read line by line after implementation and still hashed `8311943E69727F1B84114D2E411C764C07BD027BA6B702F625D37314E2E5DD4F`. It was approved for deletion only after the implementation, explicit tradeoff ledger, benchmark, test, browser, and visual gates above completed.

## Performance release parity - 2026-08-04

- The new player capture was conclusively identified as schema 2 from the older production runtime. It retained the failed/disabled generation worker, high render-object pressure, and long nearby queue debt that commit `53c2756` already targeted.
- Live endpoint probes found two different releases: Sites ran two ready generation workers and completed 31 jobs without failure, while `blockwild.app` ran the legacy two-failure disable path. Vercel's GitHub build for `53c2756` had failed because a restored `.next/cache` entry referenced an asset absent from the new compilation.
- The Vercel build now removes only its canonicalized compiler-cache directory before Webpack. Downloaded performance logs carry commit, origin, deployment channel, and worker-protocol identity; the analyzer warns when a legacy log lacks provenance and reports workload/frame correlations.
- The focused 133-test performance, liquid, and world gate, native TypeScript, changed-file ESLint, whitespace validation, the native Next/Webpack production build, all five Vinext stages, and direct Sites Worker/manifest validation pass. The official client reached a ready frozen-water scene with two ready generation workers, 31 completed jobs, zero worker failures/restarts, no browser error artifact, and a manually reviewed clean ice/water boundary. Remaining work is synchronized GitHub/Sites/Vercel publication and live readback.

## Frame admission and streaming overhaul - 2026-08-04

- Active request: implement the approved measured optimization proposal, commit it in independently verifiable phases, synchronize GitHub and both production sites, and then propose a practical Karpathy autoresearch workflow for continued benchmark-driven optimization.
- Baseline: the supplied production capture at commit `8e9e8d8` averages 35.35 ms/frame with a 56.78 ms p95, 78.22% long-frame ratio, transient 922-draw scenes, a 4.29-second readiness p95, 141-second oldest nearby streaming debt, and 569 canceled generation jobs against 137 completions. Worker health is clean; frame/render correlation is 0.80 and frame/draw-call correlation is 0.74.
- Phase 1 complete: schema-compatible sampled sub-phase telemetry now separates creature presentation, environment presentation, and HUD work while attributing terrain-section, consolidated-terrain, full-creature, and distant-proxy draw buckets. The attribution pass runs only every twelfth frame or one in three severe frames. Terrain submission diagnostics now honor hidden parent chunks instead of counting their child meshes as submitted work. Focused performance/world checks pass 120/120, native TypeScript passes, and scoped ESLint is clean.
- Phase 2 complete: fixed 48-block presentation switching is replaced by a 5 Hz frame-admission controller with critical-creature protection, camera/frustum relevance, projected-size scoring, pressure-sensitive hero capacity, 900 ms demotion hysteresis, and bounded transition counts. Hero creatures keep exact authored rigs; middle-distance wildlife uses a single colored nine-part articulated batch updated at 20 Hz; distant visible wildlife across all species uses one colored silhouette draw at 10 Hz; off-camera noncritical visuals can be hidden without changing simulation. Hidden authored hierarchies no longer receive per-part pose mutations. Focused fauna/model/performance checks pass 76/76, native TypeScript passes, and scoped ESLint is clean.
- Phase 3 complete: the world streamer now guarantees an omnidirectional four-chunk detail core and makes only the farther detailed halo camera-directional. Velocity lookahead scales to six chunks, player/immediate-ring generation and lighting can preempt resumable background work, one worker lane remains available for correctness-critical nearby generation, and consolidation receives a bounded reserve under draw or queue pressure. Cache existence checks stop recording false misses, hidden parent chunks no longer inflate consolidation priority, and diagnostic lanes expose the protected work directly. The deterministic benchmark finishes with 26 generation jobs queued instead of the supplied capture's 268 and zero memory-cache misses instead of 11,653; 108/108 world checks, native TypeScript, and scoped ESLint pass.
- Phase 4 complete: the performance analyzer now weights sampled creature, environment, and HUD attribution by the actual sparse phase-sample count and correlates frames with authored-creature draws, articulated/silhouette populations, and terrain submission modes. Deterministic benchmark v2 adds the complete 100-creature admission and articulation path: under an intentionally pressured 32 ms/520-draw input it retains 9 authored heroes, presents 41 creatures in one articulated draw, 32 in one silhouette draw, hides 18 off-camera creatures, and averages 0.31 ms for admission plus articulated matrix updates. The focused telemetry checks, native TypeScript, and scoped ESLint pass.
- Phase 5 complete: the isolated final benchmark averages 5.88-6.51 ms across stationary, walking, sprinting, dense-turn, settlement, and cavern CPU/world scenarios; 100-creature admission plus articulation averages 0.146 ms. The Next/Webpack production build passes, the entire pretest matrix passes, and the complete rendered/audio plus gameplay/content gate passes 833/833. The source-backed Sites build remains the release path because the local WSL wrapper correctly rejects Windows-only esbuild dependencies rather than mutating shared `node_modules`.
- Visual/runtime checkpoint: the official deterministic client reached a generated Flower Meadow world after traversal with clean terrain and flora, no page/console error artifact, 118 natural creatures, one articulated creature batch, a 9/9 immediate ring, two ready generation workers, 56 completed generation jobs, and zero failures or restarts. SwiftShader FPS is excluded from hardware-performance claims.
- Autoresearch checkpoint: `docs/PERFORMANCE_AUTORESEARCH_PROTOCOL.md` translates Karpathy's fixed-evaluator experiment loop into a Blockwild-safe two-layer contract: immutable correctness/fidelity gates first, normalized score and Pareto tracking second, isolated worktrees, narrow edit allowlists, durable keep/discard/crash evidence, no automatic deployment, and a persistent Codex-goal invocation Noah can pause.

## Ten-pass performance autoresearch - 2026-08-04

- Active request: run exactly ten controlled optimization passes, commit every pass, preserve before/over-time/final visual evidence, revalidate the champion, then synchronize GitHub, Vercel, and Sites.
- Frozen contract: `docs/PERFORMANCE_AUTORESEARCH_RUN_2026_08_04.md` records the immutable evaluator, correctness and fidelity gates, keep threshold, rollback rule, and durable ledger.
- Baseline checkpoint: five complete benchmark-v2 repetitions produced a 4.6812 ms geometric mean of the ten scenario median p95 values. Every evaluator guardrail passes. The reviewed before frame is retained under `docs/artifacts/performance-autoresearch-2026-08-04/`.
- Experiment checkpoint: all ten single-hypothesis passes were measured and individually committed. The strict evaluator discarded every candidate; pass 8's 45.7% targeted articulation gain remained unpromoted because repeated unrelated tails exceeded the 1.05x scenario floor. Every rejected source mutation was reversed, leaving the gameplay source byte-identical to the starting champion.
- Evidence checkpoint: the reviewed before, midpoint, final, and metric-timeline artifacts are retained under `docs/artifacts/performance-autoresearch-2026-08-04/`. Final exact-runtime gameplay reached a complete immediate ring with two ready generation workers, zero failures, nine nearby mobs, and no browser error artifact.
- Validation checkpoint: five-run unchanged-source revalidation is 1.0041x the initial baseline with all six guardrails passing. The immutable evaluator checksums, evaluator unit test, native TypeScript, scoped ESLint, whitespace checks, native production build, 10 rendered/audio checks, and all 833 gameplay/content checks pass. The legacy WSL Sites wrapper remains unavailable from this Windows-owned checkout, so the already-established source-backed Sites build path is retained.
- Release gate: publish this exact evidence commit to GitHub, Vercel, and Sites, verify both live endpoints and provenance, then close the goal.

## Bedrock performance and Celestial Frontiers planning - 2026-08-11

- Research checkpoint: primary Microsoft/Mojang material was separated from Blockwild-specific inference. The Bedrock plan records public render/simulation/ticking-area behavior, 20 Hz tick guidance, resource/entity cost controls, RenderDragon section/page-pool evidence, actor-record persistence, profiling, and network authority without claiming undocumented engine internals.
- Performance proposal checkpoint: `docs/BEDROCK_INSPIRED_PERFORMANCE_ARCHITECTURE_PLAN.md` maps the live scheduler, workers, simulation tiers, cache, persistence, multiplayer, and Basic Render Distance implementation into a phased architecture plan. Its immediate reversible action is a production-off feature gate that makes effective Basic Render Distance equal full Render Distance, preserves the preference, creates no proxy worker/geometry, and retains a measured debug path.
- Celestial proposal checkpoint: `docs/CELESTIAL_FRONTIERS_AND_WAYWORKS_MASTER_PLAN.md` defines location-scoped universes, deterministic ephemeris/skies, low/zero gravity, planets/moons/orbits/stations/asteroids, maps, ships, submarines, back-slot life support, Wayworks power/logistics/machines, Wayanchors, drills, multiplayer, persistence, factions, biomes, creatures, rollout phases, and acceptance gates.
- Habitat checkpoint: the proposal includes deterministic cached AirZones, buildable Atmosphere and Equalization Vents, recovery pumps, sensors, emergency shutters, ordinary Pressure Doors, futuristic Horizon Doors, Hangar Gates, and a restartable host-authoritative airlock cycle for multi-room pressure management.
- Visual checkpoint: `docs/artifacts/celestial-frontiers/waystar-system-plan.svg` and its PNG render show the proposed orbital order and major systems. The 1920x1080 tracked render and the responsive in-conversation view were manually inspected; a bottom-legend overlap and narrow-layout readability were corrected before delivery.

## Hybrid Rust engine migration planning - 2026-08-11

- Active request: replace the earlier TypeScript-only performance implementation path with a comprehensive hybrid Rust/WebAssembly architecture and plan a complete authoritative-engine migration without a big-bang rewrite.
- Added `docs/HYBRID_RUST_ENGINE_MIGRATION_MASTER_PLAN.md`, grounded in the live 33,178-line `engine.ts`, 9,167-line `world.ts`, existing worker/telemetry/save/multiplayer seams, the Bedrock-inspired architecture, and the ten-pass autoresearch evidence.
- Target state: Rust owns deterministic world, simulation, gameplay, persistence, multiplayer authority, render extraction, and the primary `wgpu` renderer; TypeScript remains the React/browser/platform adapter for DOM, WebRTC, WebAudio, IndexedDB, and accessibility.
- The migration uses one dedicated Rust/Wasm engine worker first, coarse versioned typed-buffer contracts, transfer-based compatibility builds, optional cross-origin-isolated threading, native replay/tools/server builds, an explicit authority ledger, and TypeScript-versus-Rust differential replays before each cutover.
- Twelve shippable phases cover toolchain and replay, kernels, meshing/lighting, generation, world authority, physics/fluids/atmosphere, creatures/ecology, all gameplay, persistence, multiplayer/agents, complete render extraction, `wgpu` promotion, and final TypeScript authority retirement. The `wgpu` workstream now begins in R0 with browser/native smoke rendering, reaches a real dual-render terrain slice in R2, and advances beside every visible R3-R9 domain rather than waiting for R10-R11.
- Renderer decision checkpoint: `wgpu` is a required part of the main engine migration and a hard R12 completion gate. Three.js is only the temporary shipping renderer, golden visual oracle, and separately loaded compatibility bundle during a defined support window; indefinite dual-primary ownership is rejected.
- The plan explicitly prepares for location-sharded planets/orbits, gravity, atmosphere, player-built airlocks and Horizon Doors, power/logistics, anchors, ships, submarines, native servers, save repair, and future recursive performance research.
- Planning-only validation complete: current subsystem targets, source citations, Markdown structure, renderer sequencing, local links, whitespace, and repository public-readiness checks pass. No Rust toolchain packages or game behavior were changed.

## Full hybrid Rust engine migration - 2026-08-11

- Active goal: fully implement and verify `docs/HYBRID_RUST_ENGINE_MIGRATION_MASTER_PLAN.md`, including Rust/Wasm authority, the parallel `wgpu` renderer path, migration-safe persistence and multiplayer, native tools, full browser validation, before/after performance evidence, and synchronized GitHub/Sites/Vercel publication.
- Preservation checkpoint: the approved plan is being committed with the independently completed Runeowl, Lanternshell, and Reed Dragonfly model/animation rebuilds and their exact regenerated public portraits before engine implementation begins.
- Initial graphical validation: 63/63 focused fauna, animation, model-renderer, and portrait-asset checks pass; regenerated portrait parity is exact. Fresh iso/front/side model sheets and portrait PNGs were manually inspected under ignored `work/hybrid-rust-migration/initial-graphics/`.
- Process discipline: record test processes launched by this goal, stop only owned helpers, verify no owned server/browser/build process remains after each browser or benchmark phase, and never kill unrelated Codex, Comet, or user processes.

## TypeScript Edition baseline isolation - 2026-09-07

- Active bounded phase: validate and repair the original TypeScript/Three.js stack on `edition/typescript`; retain the untouched historical baseline, make only local commits, and stop before documentation/CI parity, Rust repair, provider work, publication, or deployment.
- Edition boundary: every TypeScript-owned world, settings, UI, profile, player, agent, cache, rendezvous, and protocol identifier now uses an explicit `blockwild-typescript-*` name. Normal startup does not import or remove generic pre-split data. Cross-edition multiplayer envelopes are rejected before payload inspection.
- Previous-data access: the title screen visibly explains the separated world list and offers an explicit read-only raw localStorage backup. The backup preserves exact strings and reports that authoritative Rust IndexedDB data is not collected because it lacks a versioned whole-database export contract; the Rust edition's own world export remains the retrieval path.
- Bounded baseline repairs: Generator copy follows the live Generator 18 constant; authorized local agent test stepping can advance a paused synthetic world without unpausing normal gameplay; the agent-platform script no longer names a nonexistent test; Vercel and terrain-worker test fixtures now assert the real production paths.
- Deterministic validation: TypeScript and whole-repository ESLint pass. Pretest passes 275/275. The verified five-stage Sites production build and artifact validation pass, followed by 10/10 rendered/audio and 843/843 gameplay/content checks. All nine tracked tests outside the default lifecycle pass 26/26 in a serial audit; the final focused storage/profile/agent/UI/multiplayer batch passes 76/76.
- Browser acceptance: the required game client and an isolated exact-byte harness prove title/new-world flow, Generator 18, movement, jump, camera, creative place/break, pause, save-and-quit, reload/Continue restoration, TypeScript-only writes, raw backup equality, preservation of generic localStorage plus generic-cache/Rust IndexedDB byte sentinels, mobile fit, and zero console/page errors. Six final screenshots were manually reviewed; desktop and mobile overlap regressions found by the audit were repaired.
- Multiplayer boundary: deterministic same-edition fake-channel/rendezvous tests pass and generic/Rust handshakes fail closed. A strict-local two-browser attempt, with external STUN and rendezvous disabled, created peers but did not reach both session-level `CONNECTED` states within 30 seconds, so real browser multiplayer is not claimed from that attempt.

## TypeScript Edition multiplayer acceptance follow-up - 2026-09-07

- Instrumented strict-local two-browser WebRTC showed the initial failure was Chromium mDNS host-candidate resolution: ICE gathering completed, but both peers remained `new`. Disabling only local-IP mDNS hiding in the isolated acceptance browser let both sessions and all three data channels reach connected/open without STUN or rendezvous.
- The first connected run then exposed a real validator mismatch: multiplayer permits dotted character identities such as `browser_alpha.character_beta`, while agent chat rejected the same identity. The shared agent ID grammar now accepts a literal dot, with a focused chat regression.
- Final validation passes: 32/32 focused agent-platform, multiplayer, and edition-isolation checks; TypeScript; scoped ESLint; the five-stage production build and artifact validation; and seven strict-local two-client browser gates. Both aggregate sessions and all six observed channel endpoints reached connected/open, guest-to-host chat rendered in both UIs, the guest applied the host seed, four final frames were manually reviewed, and no console/page error was captured.

## Celestial Frontiers TypeScript foundation - 2026-09-19

- Active bounded package: CF0 foundation for the full Celestial Frontiers/Wayworks campaign, revision 1. Canonical TypeScript checkout; no runtime migration before director acceptance, no Rust work or external publication.
- Source freeze: complete master plan hash-bound; source-line ledger includes all 77 validation cases and 28 final acceptance criteria, with 389 named-content/component entries and no gameplay-implementation claims. Sixteen defaults are recorded. Eight moons plus Ad Astra reconcile nine moon-scale destinations; Cinderhymn and Hollowmere remain complete CF11 content; 64 named plus six described creature concepts remain in scope.
- Architecture: exact baseline seams, catalog/generator versions, location/epoch ownership, host authority, transactional IndexedDB/rollback design, performance caps and a detailed testable CF1 proposal are retained in task-local evidence. The tracked foundation document records portable scope and safety decisions.
- Baseline checkpoint: TypeScript, ESLint and all 1,121 source tests across 132 test files pass. Six synthetic legacy-save versions, exact normalized hashes, quota rollback and three seeded terrain hashes pass; the first fixture's out-of-range test-coordinate mistake is retained as failed harness evidence, not mislabeled a production regression.
- Visual checkpoint: four original procedural concept sheets plus existing-production references were personally reviewed. Diagonal projection artifacts were corrected and the sheets re-reviewed. These are reference concepts, not finished models or implemented content.
- Final baseline: fresh Next and Sites builds plus rendered-HTML validation pass. Eleven isolated browser checks pass, including create/move/jump/pause/save/reload/Continue and desktop/compact title fit, with no captured errors and a 9/9 immediate terrain ring. SwiftShader rendering is not hardware performance evidence. Exact source/build identity, retained artifacts and limitations are recorded in the task-local CF0 handoff; CF1 remains acceptance-gated.
# CF4 development authority boundary — 2026-09-19 18:10 UTC

- `development-kernel-r2`: 63/63 focused tests pass, including short-step item
  bandwidth, signal-controlled charger and portable metadata isolation fixes.
- Typed guest and agent workshop intents now use exact machine/player revisions,
  reach and owner/public-service checks. Guest access revocation stops updates.
  Waygrid preserves its existing global item authority and stages power plus
  inventory after-images together. New authority run 61/62: one test named the
  packet `facility` instead of `facility-action`; corrected and pending rerun.
- New exact protected-custody validator and 17 authored item models integrated;
  helper tests 12/12 and 5/5 pass. Wrench resource-face glyphs and separate
  presentation-only guest/paused rendering added. Manual visuals still pending.
- No production build or browser started; source remains dirty on 89986cb.
  Frozen recovery and all prior receipts remain untouched. Full CF4 incomplete.

## CF4 full workshop - 2026-09-19 19:00 UTC

- Committed `2b5434a` (Build finite Wayworks workshop): twenty machine kinds,
  fourteen processing recipes, typed guest/agent custody, authored models/items,
  cached power topology and canonical Waygrid integration. Focused 193/193,
  final TypeScript and scoped lint passed; isolated production full-r1 passed.
- Normal browser controls verified ore processing/extraction, wrench-only edits,
  all resource selectors, copy/paste/trust/signal/rotation round-trips, 390px
  inspector and keyboard focus, exact fluid/gas transfers, physical capacity
  modules, and filled-tank break/pickup/place/cold reload (3L plus module).
- Official unchanged web-game client reached gameplay with twenty machines and
  no errors. Screenshot personally reviewed. Browser-r1's harness timeout killed
  its own browser; completed receipts retained and browser-r2 used a new explicit
  synthetic world. Its checkpoint is saved, browser closed. No real saves used.
- Found and fixing hidden inspector feedback, wrong metadata tooltips, and
  waterwheel's incorrect source-water hint. Tanks now prioritize resource stores.
  Requirement review also adds finite supplied-heat conversion and declared,
  enforced upgrade compatibility; focused regressions and rebuild pending.
- Full CF4 requirement handoff/remaining runtime visuals still open. No CF5 work.

## CF4 verified development handoff - 2026-09-19 19:41 UTC

- Runtime source `aa736068026dc2349236304408db7432ba91f5c2`: full workshop,
  service feedback/metadata, finite supplied-heat conversion, supported upgrades,
  visible Waygrid transfer costs/errors and corrected narrow panel fit.
- Exact-source focused suite200/200pass; TypeScript/scopedlint and isolated
  productionfull-r4 pass, build`15y9-l5eJimluso5KOcHi`. Existing webpack circular
  chunk warnings retained. Generated tsconfig includes restored, no cleanup.
- Normal-input environmental/crafting coverage now includes source-water
  consumption1L/1kJ, adjacent fluid transfer, zero-buffer solar/wind/waterwheel,
  finite coal/heat conversion, actual sheet-to-cylinder crafting and Waygrid
  exact50J/item. Disabled power leaves inventory/vault/energy unchanged; restoring
  it yields9200->8800->8400J for8items deposited and withdrawn.
- Final390px Waygrid bounds0,0,390,844; readable failure/success feedback.
  Authored models/helditems/icons and desktop/mobile controls personally reviewed.
  Final unchanged officialclient passedplaying21instances/20kinds with no captured
  errors. All browsers/previews/tests/builds/helpers drained, synthetic saves kept.
- Full traceability, retained failures, downstream obligations and boundedCF5
  proposal are in the task-local development handoff. CF5 remains unstarted;
  director acceptance and all deferredCFV gates are not implied. Safety review
  blocked cross-task handoff transmission; explicit user approval requested.

## CF5 habitat integration - 2026-09-20 00:55 UTC

- Noah approved continuation/transmission; director accepted CF4 and dispatched
  revision11 CF5. First foundation commit56a1298 includes finite fluid/gas/heat
  transport and chemistry, worker AirZones, authored pressure hardware, airlock
  state machine, typed save/host/guest/agent integration and inspector.
- Focused208/208, static and scopedlint passed before first isolated build;
  productionbuild-r1 passed (dfzk7GyLA18RpLwK4yb4y), existing circular chunk
  warnings retained. No publication/provider/real-save actions.
- First normal-input synthetic browser pass confirmed breathable room readings,
  explicit pump/controller links and automatic cycle entry. It found pale text
  on parchment and repeated held-crank execution during its own topology check.
  Source fixes now improve contrast, latch each continuous hold once, reject
  aliased airlock hardware before mutation and honor disabled/signal-gated power.
  Focused runtime/panel regression24/24passed. These fixes await rebuilt browser.
- Guest inspector now receives bounded validated host diagnostics; targeted20/20
  passes. Ordinary known-habitat animal/NPC exposure gains saved grace/damage;
  nonbreathing authored types are excluded. Final integrated checks pending.
- Browser-r1 fixture-shape error and browser-r2 genuine failures retained.
  Browser-r2 normal SaveQuit reached title; synthetic IndexedDB checkpoint saved,
  browser closed. Unchanged officialclient-r1 passed gameplay and its screenshot
  was personally opened. This is exploratory evidence, not full CF5 acceptance.
- Remaining: rebuilt normal production/airlock/manual/breach/helmet/health,
  desktop/mobile review, representative coldreload, full criterion-level handoff
  and CF6 proposal. CF6 is not dispatched. Frozen CF4 evidence remains untouched.

## CF5 control completion - 2026-09-20 01:27 UTC

- Corrected source3fddf36 passed focused225/225, TypeScript, scopedlint and
  isolated build-r2 (K4Ah0C7BL4uYTCwSGq-D8). Normal browser completed outbound
  and return cycles, exact164119mmol recovery, power-loss reseal, cancelled2s
  and successful8.6s manual crank, held dangerous decompression to6kPa, safe
  helmet removal and coldreload. Desktop/390px screenshots personally readable.
- Browser found a post-completion stale-revision toast; installation-bound live
  hold continuation/release is corrected in current source, not yet rebuilt.
- Masterplan completion adds finite vent mixture/capture/release/balance,
  directional equalization pressure cap, sensor thresholds/signal/shutter,
  mandatory chamber-vent binding and measured gas/pressure-operation power.
  Helper focused46/46/static/lint passed; parent integrated checks pending.
- Primary five-minute bounded topology integrity audit3/3passed. Its first test
  incorrectly expected sealed status for low-pressure staged gas; corrected to
  require unchanged status and retained the failed receipt.
- Browser-r4 saved to title117, storage118 retained, context closed. Preview-r2
  remains until next build. Normal chemistry/crafting/breach/unsafe health and
  new controls still need browser coverage; no fullCF5/CFV completion claimed.

- At01:35UTC source review found unfinished hangar frames permanently interlocked
  their controller even after repair. The actual-runtime regression failed red,
  then passed after separating frame validity from independent safety locks.
  Build-r3 was intentionally interrupted before source edits; partial output
  retained and no successful-build claim. Fresh isolated candidate follows.

- At02:10UTC normal browser-r5 on c58f5ad completed finite water electrolysis,
  separate filtered O2/H2 storage, twenty1L oxygen transfers into life support,
  controlled wall mining/repair, healthy helmet removal and finite CO2 scrubbing.
  Sensor threshold changes toggled its own and an owned receiver's signals.
- Saving during airlock recovery exposed a cold-start integration defect:
  checking topology immediately faulted an otherwise valid saved phase. The
  actual-runtime regression failed red. Closed phases now wait only when every
  linked room is known or actively checking; no opening/transfer/energy spend,
  existing phase deadlines advance, and unknown/power/binding failures still
  fault. Cold-recovery-r2 42/42 and integrated focused-r11 243/243 pass; static-r19
  and lint-r8 pass. Fresh build and browser replay of the retained active-cycle
  save remain required.

## CF5 final normal verification - 2026-09-20 03:04 UTC

- Production6e3d04f/build-r5 passed retained active-cycle cold recovery, outward
  opening and safe return. Normal r8 crafted/assembled/powered a3x4hangar gate,
  crossed it, confirmed closed collision and missing-frame denial, then repaired
  and reopened it without a persistent lock. A mined/placed Gasline retained
 4800mLhydrogen and its filter through r9 cold reload.
- Controlled helmet-off low-pressure exposure caused hypoxia/pressure injury;
  the player exited alive and resealed both test walls. No full-pressure-suit
  protection claim. An earlier optional relocation/floor-overmine/death trace is
  retained separately as a failed synthetic harness experiment, not acceptance.
- r9 captured14000mmol from the4cellchamber; directional equalization then
  raised90.531→95.000kPa exactly, lowered the separate95cellroom99.069→98.880kPa,
  and spent400J. Reverse direction blocked flow. Normal paired-door replacement
  retained12kJ, required explicit installation rebind, and restored idle-inner-safe.
- Desktop and390px screenshots personally reviewed. One hover selector lost to
  generic button specificity, hiding the close glyph against pale parchment;
  focused regression fails red, narrow selector correction awaits final rebuild.
  All functional source since6e3d04f is unchanged by this visual-only correction.
- Final exact-source checks/build/official client and evidence handoff remain;
  CF6 proposal exists but source is undispatched. Frozen CF0-CF4 untouched.

- Final8e601fa focused-r12 **244/244**,static-r20,lint-r9 and isolatedbuild-r6
  PASS; build IDgOlqK09YdAkvjYfoBkqaN. Browser-r10 coldloads the restored normal
  construction checkpoint: idle-inner-safe, originaldoor12000J, gate1520J and
  gasline4800mLH2 survive. Desktop005/mobile009 hover screenshots personally
  opened; close glyph legible and390pxdocument remains390wide. SaveQuit14,
  title15/storage16/context17closed. Unchanged official-webgame-r2 PASS,
  playing26workshopinstances,health2/breathingsafe,no captured errors; image
  personally opened. Known circular-chunk/module-type warnings retained.
- Preview4336 stopped after verification; port readback has no listener.
  All helpers/builds/tests/browser jobs drained. CF5 exact-source manifest and
  criterion-level handoff are ready for director review. This is not CFV or full
  campaign completion; CF6 remains proposal-only pending acceptance/dispatch.

## CF6 bounded Morrow ecology verification - 2026-09-20 10:07 UTC

- Director's bounded r12 ecology packet: zero helpers, no new large integration.
  Reused exact838d27b/buildYSfUwT4lfnHg_yMTDc5of; no runtime source changes.
  Historical lunar return-r1/034 had mobDensity0. Preserved failed normal-r1;
  director approved a derivative changing only authoritative manifest density0→1.
  Structural diff/hashes prove no injected creatures, resources or terrain edits.
- Normal-r2 observed runtime-spawned Rillehopper, Vacuum Lantern and Slatefin
  Burrower. Lantern screenshots131/133 personally reviewed: lit chamber and limbs
  move over real steps. Rillehopper distant model/flee behavior observed; dedicated
  low-G hop remains open. Slatefin coordinates move .7blocks beneath regolith;
  close model view stayed obscured. Owl not hunted; unsafe-room jar not attempted
  because the retained expedition has no jar ingredients. No new supplies added.
- Real defect retained: five naturally spawned Rillehoppers/Lanterns persist at
  y=-64.5, including IDs3/4/7/12/14 in saved138. No root-cause/fix claim; requires
  a bounded spawn/terrain-generation diagnosis. Earlier no-run-up jump approaches
  stalled because vacuum has no air steering; normal run-up87–92 crossed ridge.
  Screens110/112 were a failed lure attempt with Precision Gear Cluster, NOT a
  Crystal Shard; filename shorthand is not evidence of successful luring.
- focused-r33 27/27 PASS (ecology/model/engine custody), browser-morrow-ecology-r1
  custody PASS/ecology PARTIAL_WITH_DEFECT. Exact fleet/inventory/terrain/armor,
  health10; finite72713.333mLO2/111.8667sscrubber consumed, rig energy unchanged.
  SaveQuit136/title137/storage138/close139; owned preview/browser drained and
  ports4338/4339 absent. No rebuild needed; previous official-r10 remains exact.
  See CF6/MORROW-ECOLOGY-CHECKPOINT.md. Full CF6/CFV incomplete and CF7 gated.
