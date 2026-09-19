# Celestial environment foundation (CF2, local/unreleased)

The TypeScript edition now evaluates a frozen Waystar catalog, one persistent
universe clock, body-local days, analytic celestial positions and shared gravity.
Ordinary play remains on Home. Other locations are explicitly synthetic developer
fixtures: they do not yet provide destination terrain, travel progression or life
support equipment. This is not the completed Celestial Frontiers expansion.

## Runtime contracts

- `celestial-catalog.ts` validates immutable save snapshots. Environment and sky
  policy IDs resolve through the versioned implementations in
  `celestial-environment.ts`; unknown versions fail closed.
- `celestial-ephemeris.ts` computes parent-relative Kepler ellipses in AU from
  `waystar-v1:0`. Home gameplay-day seconds scale orbital periods. Space instances
  use deterministic authored circular bands, with instance-specific phase and
  inclination. There is no frame-by-frame orbital integration.
- `WorldSave.universeTimeSeconds` is universe-owned. Body-local `time` and `day`
  are derived runtime values; older saves derive their initial epoch from the
  existing Home clock. Travel does not replace the universe clock with a
  destination's older clock. Host snapshots carry the frozen catalog and coarse
  clock correction; guests never select physics from a different local save.
- `celestial-sky.ts` draws phase-lit low-poly bodies, procedural surface bands,
  rings and analytic shadows, plus policy-driven aurora. Physical angular sizes
  determine eclipse overlap; separate modest display floors keep distant bodies
  legible. Parent bodies dominate authored near-side moon views. Home retains its
  familiar solar path and only displays Morrow until later observatory progression.
- Terrain ray visibility and the existing camera-environment enclosure contract
  hide celestial objects under roofs/in caves. Vacuum has no atmospheric dome,
  clouds or air drag. Parent surface colors do not leak into orbital skies.

## Physics and environment

Surface gravity is `massEarths / radiusEarths²`. Orbit, station, asteroid and
transit locations are 0 G. Player acceleration/fall energy, projectile ballistics,
swimming buoyancy, drops, creature movement, debris, leaves, timber and boat
response use the shared gravity scale. Ground-creature cadence, stride and safe
drop bounds vary with gravity; unsupported gravity uses a bracing policy.

In zero G, the player retains velocity without propulsion. A single jump press
near a solid contact pushes off; current carried mass uses an explicitly temporary
0.25 kg per inventory unit plus an 80 kg character baseline. Zero-G velocity for
the player, drops and creatures is saved with that location. Creative flight is
still a separate, deliberate control mode, not implicit EVA propulsion.

Pressure, oxygen/composition, temperature, corrosion, radiation, liquid medium,
weather and wind are separate policies. Unprotected survival breathing consumes
the existing oxygen reserve in non-breathable environments. This is not a complete
life-support model: equipment, layered exposure protection, alarms, refill/swap,
magnetic boots, tether and powered EVA are CF3. Pressurized rooms are CF5.

## Isolated developer review

Use a fresh browser context and `/agent?testAdmin=1`. Create a tagged synthetic
world through `window.blockwildAgent.worldCreate`, pause it with `testPause(true)`,
then use `worldTransition` with a valid canonical address. These transitions use
the real atomic universe repository and location reset path.

`testEnvironment` accepts only `universeSeconds`, `platform`, `roof`, `face`
(`parent`, `sun`, `horizon`) and a bounded three-component `velocity`. It requires
a paused local tagged test world, explicit test-admin URL, and no multiplayer
session. `testAdvance(milliseconds)` deterministically advances the fixture.
`render_game_to_text()` exposes environment, clock, phase/eclipse, visible bodies
and player motion. The off-world HUD explicitly identifies unfinished synthetic
destinations. Never run fixtures against real saves.

## Evidence and remaining gates

Local campaign evidence is retained under
`work/celestial-frontiers-ts-20260918/CF2/`. Focused tests cover policy validation,
Kepler residuals, large epochs, hierarchy, local-clock round trips, eclipse disc
math, authored space instances, zero-G ballistics, buoyancy and velocity custody.
Browser review covers Home, Morrow, Orison/Aerie, roof occlusion, equal-impulse
low-G movement, sustained zero-G drift/contact push and clock/velocity reload.

Full destination-content skies (storm spirals, Ad Astra transit, lightning beneath
Orison), the system-map correspondence, observatory unlock, remote/offline
production integration and the full creature/mount/vehicle/performance matrix
remain tied to later implementation/integration gates. The focused checks do not
establish whole-expansion acceptance, mobile parity, a production build or soak.
CF1's explicitly deferred verification remains required. No deployment is implied.
