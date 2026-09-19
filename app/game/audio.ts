import { BLOCKS, BlockId } from "./data";

export type AudioSettings = { volume: number; muted: boolean; musicVolume?: number };
export type SoundKind = "step" | "mine" | "break" | "place" | "pickup" | "jump" | "fall" | "land" | "hurt" | "ui" | "attack" | "mob" | "craft" | "furnace" | "splash" | "eat" | "life-support";
export type MusicScene =
  | "day"
  | "hoppin"
  | "night"
  | "sea"
  | "deepSea"
  | "skyboss"
  | "combatA"
  | "combatB"
  | "wildwoodA"
  | "wildwoodB"
  | "fernlight"
  | "meadowglass"
  | "emberdeepA"
  | "emberdeepB"
  | "hobbitSettlement"
  | "goblinSettlement"
  | "atlantianSettlement"
  | "woodElfSettlement"
  | "dwarfSettlement";
export type SampleKind =
  | "swordSwing"
  | "zombieMoan1"
  | "zombieMoan2"
  | "chestOpen"
  | "chestClose"
  | "ridgebackWarmHuff"
  | "shadecrawlerStoneChitter"
  | "horseWhinnyA"
  | "horseWhinnyB"
  | "deepgearCourserWhinny"
  | "emberjaySquawk"
  | "birdChirp"
  | "canopyLarkCall"
  | "tidewingGullCallA"
  | "tidewingGullCallB"
  | "catCallA"
  | "catCallB"
  | "houndCallA"
  | "houndCallB"
  | "crabChitter"
  | "lightRain"
  | "nightCrickets"
  | "wind"
  | "snowStep"
  | "dirtStep"
  | "grassStep"
  | "blockHit"
  | "winterWind"
  | "caveAmbience"
  | "waterSplash"
  | "swimming"
  | "dragonAttackA"
  | "dragonAttackB"
  | "dragonWingFlap"
  | "magicAttack"
  | "achievement"
  | "uiTap"
  | "oceanAmbience"
  | "scaryGrumble"
  | "humanoidSigh"
  | "puddlehopperCroak"
  | "copperMoleSniff"
  | "reedstriderCall"
  | "dragonAmbientGrowl"
  | "wargDeepGrowl"
  | "rabbitSqueak"
  | "littleAnimalSqueak"
  | "leviathanGrowlUnderwaterA"
  | "leviathanGrowlUnderwaterB"
  | "owlCallA"
  | "owlCallB"
  | "dwarvenAutomatonMetalBreath"
  | "clockworkHoundMetallicBark"
  | "dwarvenAutomatonSteamReleaseA"
  | "dwarvenAutomatonSteamReleaseB"
  | "playerDirectDamage";
export type AudioPosition = Readonly<{ x: number; y: number; z: number }> | readonly [number, number, number];
export type SamplePlaybackOptions = {
  gain?: number;
  playbackRate?: number;
  detune?: number;
  when?: number;
  position?: AudioPosition;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
};
export type DragonSoundType = "fire" | "ice" | "steel" | "sea" | "gold" | "silver";
export type DragonSoundEvent = "ambient" | "roar" | "hurt" | "death" | "wing" | "melee" | "breath" | "projectile" | "egg-crack";
export type SpellSoundSchool = "destruction" | "restoration" | "alteration" | "conjuration" | "utility";
export type EnvironmentLoop = "rain" | "crickets" | "wind" | "winterWind" | "cave" | "ocean" | "swimming";
export type EnvironmentAudioState = Readonly<{
  rain: number;
  skyExposure: number;
  night: number;
  wind: number;
  winter: number;
  cave: number;
  ocean: number;
  swimming: number;
}>;

export const MAX_ACTIVE_SAMPLE_VOICES = 32;
export const MAX_POOLED_SPATIAL_VOICES = 16;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function positionTuple(position: AudioPosition): readonly [number, number, number] {
  return "x" in position
    ? [Number(position.x) || 0, Number(position.y) || 0, Number(position.z) || 0]
    : [Number(position[0]) || 0, Number(position[1]) || 0, Number(position[2]) || 0];
}

/** Mirrors WebAudio's inverse-distance model for deterministic culling/tests. */
export function spatialAttenuation(distance: number, refDistance = 2, maxDistance = 48, rolloffFactor = 1.15) {
  const reference = Math.max(0.01, refDistance);
  const maximum = Math.max(reference, maxDistance);
  const clampedDistance = Math.min(maximum, Math.max(reference, Number.isFinite(distance) ? distance : maximum));
  return clamp01(reference / (reference + Math.max(0, rolloffFactor) * (clampedDistance - reference)));
}

export function environmentLoopMix(state: EnvironmentAudioState): Record<EnvironmentLoop, number> {
  const rain = clamp01(state.rain);
  const outdoors = clamp01(state.skyExposure);
  const night = clamp01(state.night);
  const wind = clamp01(state.wind);
  const winter = clamp01(state.winter);
  const cave = clamp01(state.cave);
  const ocean = clamp01(state.ocean);
  const swimming = clamp01(state.swimming);
  const shelteredSurface = outdoors * (1 - cave) * (1 - ocean * 0.45);
  return {
    rain: rain * outdoors,
    crickets: night * shelteredSurface * (1 - rain * 0.82) * (1 - winter * 0.7),
    wind: wind * shelteredSurface * (1 - winter),
    winterWind: wind * winter * shelteredSurface,
    cave: cave * (1 - ocean * 0.72),
    ocean: ocean * (1 - cave * 0.55),
    swimming,
  };
}

export function environmentCrossfadeTimeConstant(current: number, target: number) {
  return target > current ? 0.6 : 1.35;
}

export const AUDIO_TARGET_EPSILON = 0.001;

export function audioTargetChanged(previous: number, next: number, epsilon = AUDIO_TARGET_EPSILON) {
  return !Number.isFinite(previous) || Math.abs(next - previous) >= Math.max(0, epsilon);
}

export type ActiveVoiceScore = Readonly<{ distance: number; startedAt: number; spatial: boolean }>;

/** Prefer retiring an inaudible/far spatial voice before a recent local UI cue. */
export function spatialVoiceEvictionIndex(voices: readonly ActiveVoiceScore[]) {
  if (!voices.length) return -1;
  let selected = 0;
  let selectedScore = -Infinity;
  for (let index = 0; index < voices.length; index += 1) {
    const voice = voices[index];
    const score = (voice.spatial ? 10_000 + Math.max(0, voice.distance) * 100 : 0) - voice.startedAt * 0.001;
    if (score > selectedScore) {
      selected = index;
      selectedScore = score;
    }
  }
  return selected;
}

const MUSIC_TRACKS: Record<MusicScene, string | readonly string[]> = {
  day: "/music/blockwild-theme.mp3",
  hoppin: "/music/blockwild-hoppin.mp3",
  night: "/music/blockwild-night.mp3",
  sea: [
    "/music/blockwild-sea.mp3",
    "/music/blockwild-tidelight-shelf-a.mp3",
    "/music/blockwild-tidelight-shelf-b.mp3",
  ],
  deepSea: [
    "/music/blockwild-lantern-sea-a.mp3",
    "/music/blockwild-lantern-sea-b.mp3",
  ],
  skyboss: "/music/blockwild-skyboss.mp3",
  combatA: "/music/blockwild-ironbloom-skirmish-a.mp3",
  combatB: "/music/blockwild-ironbloom-skirmish-b.mp3",
  wildwoodA: "/music/blockwild-wildwood-dawn-a.mp3",
  wildwoodB: "/music/blockwild-wildwood-dawn-b.mp3",
  fernlight: "/music/blockwild-fernlight-ramble.mp3",
  meadowglass: "/music/blockwild-meadowglass-morning.mp3",
  emberdeepA: "/music/blockwild-emberdeep-a.mp3",
  emberdeepB: "/music/blockwild-emberdeep-b.mp3",
  hobbitSettlement: [
    "/music/blockwild-hearthroad-home-a.mp3",
    "/music/blockwild-hearthroad-home-b.mp3",
  ],
  goblinSettlement: [
    "/music/blockwild-brassroot-market-a.mp3",
    "/music/blockwild-brassroot-market-b.mp3",
  ],
  atlantianSettlement: [
    "/music/blockwild-lantern-sea-a.mp3",
    "/music/blockwild-lantern-sea-b.mp3",
  ],
  woodElfSettlement: "/music/13_blockwild_moonbough_lanterns.mp3",
  dwarfSettlement: "/music/14_blockwild_deepgear_hearth.mp3",
};

export const SAMPLE_ASSETS: Record<SampleKind, { source: string; gain: number }> = {
  swordSwing: { source: "/sfx/sword-swing-1.wav", gain: 0.72 },
  zombieMoan1: { source: "/sfx/zombie-moan-1.wav", gain: 0.5 },
  zombieMoan2: { source: "/sfx/zombie-moan-2.wav", gain: 0.28 },
  chestOpen: { source: "/sfx/chest-open.wav", gain: 0.72 },
  chestClose: { source: "/sfx/chest-close.wav", gain: 0.58 },
  ridgebackWarmHuff: { source: "/sfx/ridgeback-warm-huff.mp3", gain: 0.62 },
  shadecrawlerStoneChitter: { source: "/sfx/shadecrawler-stone-chitter.mp3", gain: 0.52 },
  horseWhinnyA: { source: "/sfx/horse-whinny-a.wav", gain: 0.74 },
  horseWhinnyB: { source: "/sfx/horse-whinny-b.wav", gain: 0.78 },
  deepgearCourserWhinny: { source: "/sfx/deepgear-courser-whinny.wav", gain: 0.72 },
  emberjaySquawk: { source: "/sfx/emberjay-squawk.wav", gain: 0.76 },
  birdChirp: { source: "/sfx/bird-chirp.wav", gain: 0.7 },
  canopyLarkCall: { source: "/sfx/canopy-lark-call.wav", gain: 0.72 },
  tidewingGullCallA: { source: "/sfx/tidewing-gull-call-a.wav", gain: 0.68 },
  tidewingGullCallB: { source: "/sfx/tidewing-gull-call-b.wav", gain: 0.72 },
  catCallA: { source: "/sfx/cat-call-a.wav", gain: 0.72 },
  catCallB: { source: "/sfx/cat-call-b.wav", gain: 0.75 },
  houndCallA: { source: "/sfx/hound-call-a.wav", gain: 0.7 },
  houndCallB: { source: "/sfx/hound-call-b.wav", gain: 0.73 },
  crabChitter: { source: "/sfx/crab-chitter.wav", gain: 0.68 },
  lightRain: { source: "/sfx/ambient-light-rain.wav", gain: 0.357 },
  nightCrickets: { source: "/sfx/ambient-night-crickets.wav", gain: 0.12 },
  wind: { source: "/sfx/ambient-wind.wav", gain: 0.17 },
  snowStep: { source: "/sfx/step-snow.wav", gain: 0.56 },
  dirtStep: { source: "/sfx/step-dirt.wav", gain: 0.5 },
  grassStep: { source: "/sfx/step-grass-soft.wav", gain: 0.36 },
  blockHit: { source: "/sfx/block-hit-default.wav", gain: 0.48 },
  winterWind: { source: "/sfx/ambient-winter-wind.wav", gain: 0.24 },
  caveAmbience: { source: "/sfx/ambient-cave.wav", gain: 0.2 },
  waterSplash: { source: "/sfx/water-splash.wav", gain: 0.7 },
  swimming: { source: "/sfx/water-swimming.wav", gain: 0.24 },
  dragonAttackA: { source: "/sfx/dragon-attack-a.wav", gain: 0.7 },
  dragonAttackB: { source: "/sfx/dragon-attack-b.wav", gain: 0.7 },
  dragonWingFlap: { source: "/sfx/dragon-wing-flap.wav", gain: 0.66 },
  magicAttack: { source: "/sfx/magic-attack.wav", gain: 0.66 },
  achievement: { source: "/sfx/achievement-unlocked.wav", gain: 0.7 },
  uiTap: { source: "/sfx/ui-tap.wav", gain: 0.36 },
  oceanAmbience: { source: "/sfx/ambient-ocean-soft.wav", gain: 0.2 },
  scaryGrumble: { source: "/sfx/creature-scary-grumble.wav", gain: 0.64 },
  humanoidSigh: { source: "/sfx/humanoid-sigh.wav", gain: 0.46 },
  puddlehopperCroak: { source: "/sfx/puddlehopper-croak.wav", gain: 0.7 },
  copperMoleSniff: { source: "/sfx/copper-mole-sniff.wav", gain: 0.58 },
  reedstriderCall: { source: "/sfx/reedstrider-call.wav", gain: 0.7 },
  dragonAmbientGrowl: { source: "/sfx/dragon-ambient-deep-growl.wav", gain: 0.52 },
  wargDeepGrowl: { source: "/sfx/warg-deep-growl.wav", gain: 0.62 },
  rabbitSqueak: { source: "/sfx/rabbit-squeak.wav", gain: 0.58 },
  littleAnimalSqueak: { source: "/sfx/little-animal-squeak.wav", gain: 0.54 },
  leviathanGrowlUnderwaterA: { source: "/sfx/leviathan-growl-underwater-a.wav", gain: 0.56 },
  leviathanGrowlUnderwaterB: { source: "/sfx/leviathan-growl-underwater-b.wav", gain: 0.62 },
  owlCallA: { source: "/sfx/owl-call-a.wav", gain: 0.56 },
  owlCallB: { source: "/sfx/owl-call-b.wav", gain: 0.62 },
  dwarvenAutomatonMetalBreath: { source: "/sfx/dwarven-automaton-metal-breath.wav", gain: 0.5 },
  clockworkHoundMetallicBark: { source: "/sfx/clockwork-hound-metallic-bark.wav", gain: 0.56 },
  dwarvenAutomatonSteamReleaseA: { source: "/sfx/dwarven-automaton-steam-release-a.wav", gain: 0.62 },
  dwarvenAutomatonSteamReleaseB: { source: "/sfx/dwarven-automaton-steam-release-b.wav", gain: 0.64 },
  playerDirectDamage: { source: "/sfx/player-direct-damage.wav", gain: 0.64 },
};
const SAMPLES = SAMPLE_ASSETS;

export const ENVIRONMENT_LOOP_SAMPLES: Record<EnvironmentLoop, SampleKind> = {
  rain: "lightRain",
  crickets: "nightCrickets",
  wind: "wind",
  winterWind: "winterWind",
  cave: "caveAmbience",
  ocean: "oceanAmbience",
  swimming: "swimming",
};
const MUSIC_FALLBACKS: Partial<Record<MusicScene, string>> = {
  combatA: "/music/blockwild-skyboss.mp3",
  combatB: "/music/blockwild-skyboss.mp3",
};

export function effectiveMusicVolume(settings: AudioSettings) {
  const music = Number.isFinite(settings.musicVolume) ? Math.max(0, Math.min(1, settings.musicVolume!)) : 0.72;
  return settings.muted ? 0 : Math.min(0.46, Math.max(0, Math.min(1, settings.volume)) * music * 0.61);
}

type SpatialVoiceNodes = { gain: GainNode; panner: PannerNode };
type ActiveSampleVoice = {
  gain: GainNode;
  panner: PannerNode | null;
  startedAt: number;
  distance: number;
  pooledSpatial: SpatialVoiceNodes | null;
};

export class SynthAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  ambienceGain: GainNode | null = null;
  ambience: AudioBufferSourceNode | null = null;
  rainGain: GainNode | null = null;
  rainAmbience: AudioBufferSourceNode | null = null;
  noise: AudioBuffer | null = null;
  settings: AudioSettings;
  music = new Map<MusicScene, HTMLAudioElement>();
  musicScene: MusicScene = "day";
  musicStarted = false;
  musicPlayPending = new Set<MusicScene>();
  musicRetryAfter = new Map<MusicScene, number>();
  musicSuspended = false;
  samples = new Map<SampleKind, AudioBuffer>();
  sampleLoads = new Map<SampleKind, Promise<AudioBuffer | null>>();
  activeSamples = new Map<AudioBufferSourceNode, ActiveSampleVoice>();
  spatialVoicePool: SpatialVoiceNodes[] = [];
  environmentSources = new Map<EnvironmentLoop, AudioBufferSourceNode>();
  environmentGains = new Map<EnvironmentLoop, GainNode>();
  environmentLoopLoads = new Set<EnvironmentLoop>();
  environmentTargets: Record<EnvironmentLoop, number> = {
    rain: 0,
    crickets: 0,
    wind: 0,
    winterWind: 0,
    cave: 0,
    ocean: 0,
    swimming: 0,
  };
  environmentAppliedTargets: Record<EnvironmentLoop, number> = {
    rain: 0,
    crickets: 0,
    wind: 0,
    winterWind: 0,
    cave: 0,
    ocean: 0,
    swimming: 0,
  };
  depthAmbienceTarget = Number.NaN;
  depthRainTarget = Number.NaN;
  listenerPosition: readonly [number, number, number] = [0, 0, 0];
  listenerForward: readonly [number, number, number] = [0, 0, -1];
  listenerLastWriteAt = -Infinity;
  sampleAbort: AbortController | null = null;
  disposed = false;

  constructor(settings: AudioSettings) {
    this.settings = settings;
  }

  async unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 8;
        this.master.connect(compressor).connect(this.context.destination);
        this.noise = this.createNoiseBuffer(1.5);
        this.startAmbience();
        this.prepareMusic();
        this.preloadSamples();
        this.applyVolume();
      }
      if (this.context.state !== "running") await this.context.resume();
      await this.startMusic();
    } catch {
      // Audio is optional in restrictive embedded browsers.
    }
  }

  createNoiseBuffer(seconds: number) {
    if (!this.context) return null;
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.76 + white * 0.24;
      data[index] = previous;
    }
    return buffer;
  }

  startAmbience() {
    if (!this.context || !this.master || !this.noise || this.ambience) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noise;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 360;
    gain.gain.value = 0.018;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambience = source;
    this.ambienceGain = gain;

    const rainSource = this.context.createBufferSource();
    const rainFilter = this.context.createBiquadFilter();
    const rainGain = this.context.createGain();
    rainSource.buffer = this.noise;
    rainSource.loop = true;
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 2_850;
    rainFilter.Q.value = 0.42;
    rainGain.gain.value = 0;
    rainSource.connect(rainFilter).connect(rainGain).connect(this.master);
    rainSource.start();
    this.rainAmbience = rainSource;
    this.rainGain = rainGain;
  }

  applyVolume() {
    if (!this.master || !this.context) return;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.volume, this.context.currentTime, 0.02);
    this.mixMusic(true);
  }

  setSettings(settings: AudioSettings) {
    this.settings = settings;
    this.applyVolume();
  }

  setDepth(depth: number, rainLevel: boolean | number) {
    if (!this.ambienceGain || !this.context) return;
    const rain = typeof rainLevel === "number" ? Math.max(0, Math.min(1, rainLevel)) : rainLevel ? 1 : 0;
    const target = depth < 0 ? 0.012 : 0.018;
    if (audioTargetChanged(this.depthAmbienceTarget, target)) {
      this.depthAmbienceTarget = target;
      this.ambienceGain.gain.setTargetAtTime(target, this.context.currentTime, 0.4);
    }
    // The supplied lossless rain bed carries the weather; this filtered-noise
    // layer only fills the first moment while that buffer decodes.
    const rainTarget = rain * 0.0221;
    if (this.rainGain && audioTargetChanged(this.depthRainTarget, rainTarget)) {
      this.depthRainTarget = rainTarget;
      this.rainGain.gain.setTargetAtTime(rainTarget, this.context.currentTime, rain > 0 ? 0.3 : 1.25);
    }
  }

  setListenerPose(position: AudioPosition, forward: AudioPosition, up: AudioPosition = [0, 1, 0]) {
    const nextPosition = positionTuple(position);
    const rawForward = positionTuple(forward);
    const rawUp = positionTuple(up);
    const forwardLength = Math.hypot(...rawForward) || 1;
    const upLength = Math.hypot(...rawUp) || 1;
    const nextForward = [rawForward[0] / forwardLength, rawForward[1] / forwardLength, rawForward[2] / forwardLength] as const;
    const previousPosition = this.listenerPosition;
    const previousForward = this.listenerForward;
    this.listenerPosition = nextPosition;
    this.listenerForward = nextForward;
    const context = this.context;
    if (!context || context.state === "closed") return;
    const moved = Math.hypot(
      nextPosition[0] - previousPosition[0],
      nextPosition[1] - previousPosition[1],
      nextPosition[2] - previousPosition[2],
    );
    const turnDelta = Math.abs(nextForward[0] - previousForward[0])
      + Math.abs(nextForward[1] - previousForward[1])
      + Math.abs(nextForward[2] - previousForward[2]);
    if (context.currentTime - this.listenerLastWriteAt < 1 / 30 && moved < 0.03 && turnDelta < 0.01) return;
    this.listenerLastWriteAt = context.currentTime;
    const listener = context.listener;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(nextPosition[0], context.currentTime);
      listener.positionY.setValueAtTime(nextPosition[1], context.currentTime);
      listener.positionZ.setValueAtTime(nextPosition[2], context.currentTime);
      listener.forwardX.setValueAtTime(nextForward[0], context.currentTime);
      listener.forwardY.setValueAtTime(nextForward[1], context.currentTime);
      listener.forwardZ.setValueAtTime(nextForward[2], context.currentTime);
      listener.upX.setValueAtTime(rawUp[0] / upLength, context.currentTime);
      listener.upY.setValueAtTime(rawUp[1] / upLength, context.currentTime);
      listener.upZ.setValueAtTime(rawUp[2] / upLength, context.currentTime);
    } else {
      listener.setPosition(nextPosition[0], nextPosition[1], nextPosition[2]);
      listener.setOrientation(
        nextForward[0], nextForward[1], nextForward[2],
        rawUp[0] / upLength, rawUp[1] / upLength, rawUp[2] / upLength,
      );
    }
  }

  setEnvironment(state: EnvironmentAudioState) {
    const context = this.context;
    this.environmentTargets = environmentLoopMix(state);
    if (!context || context.state === "closed" || this.disposed) return;
    for (const loop of Object.keys(ENVIRONMENT_LOOP_SAMPLES) as EnvironmentLoop[]) {
      const target = this.environmentTargets[loop];
      if (target > 0.002 && !this.environmentSources.has(loop)) void this.ensureEnvironmentLoop(loop);
      const gain = this.environmentGains.get(loop);
      if (!gain) continue;
      if (!audioTargetChanged(this.environmentAppliedTargets[loop], target)) continue;
      const absoluteTarget = target * SAMPLES[ENVIRONMENT_LOOP_SAMPLES[loop]].gain;
      gain.gain.setTargetAtTime(
        absoluteTarget,
        context.currentTime,
        environmentCrossfadeTimeConstant(gain.gain.value, absoluteTarget),
      );
      this.environmentAppliedTargets[loop] = target;
    }
  }

  private async ensureEnvironmentLoop(loop: EnvironmentLoop) {
    if (this.environmentSources.has(loop) || this.environmentLoopLoads.has(loop) || this.disposed) return;
    this.environmentLoopLoads.add(loop);
    const sample = ENVIRONMENT_LOOP_SAMPLES[loop];
    try {
      const buffer = await this.loadSample(sample);
      const context = this.context;
      const master = this.master;
      if (!buffer || !context || !master || context.state === "closed" || this.disposed || this.environmentSources.has(loop)) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(master);
      source.start();
      this.environmentSources.set(loop, source);
      this.environmentGains.set(loop, gain);
      const target = this.environmentTargets[loop] * SAMPLES[sample].gain;
      gain.gain.setTargetAtTime(target, context.currentTime, environmentCrossfadeTimeConstant(0, target));
      this.environmentAppliedTargets[loop] = this.environmentTargets[loop];
    } finally {
      this.environmentLoopLoads.delete(loop);
    }
  }

  prepareMusic() {
    if (typeof Audio === "undefined" || this.music.size) return;
    for (const [scene, source] of Object.entries(MUSIC_TRACKS) as Array<[MusicScene, string | readonly string[]]>) {
      const playlist = typeof source === "string" ? [source] : [...source];
      const element = new Audio(playlist[0]);
      const fallback = MUSIC_FALLBACKS[scene];
      if (fallback) element.addEventListener("error", () => {
        if (element.dataset.fallbackActive === "1") return;
        element.dataset.fallbackActive = "1";
        element.src = fallback;
        element.loop = true;
        element.load();
        if (scene === this.musicScene && !this.musicSuspended) window.setTimeout(() => {
          this.musicStarted = true;
          void this.playMusicScene(scene);
        }, 0);
      });
      element.dataset.playlistIndex = "0";
      element.loop = playlist.length === 1;
      if (playlist.length > 1) element.addEventListener("ended", () => {
        const current = Number.parseInt(element.dataset.playlistIndex ?? "0", 10);
        const next = (Number.isFinite(current) ? current + 1 : 1) % playlist.length;
        element.dataset.playlistIndex = String(next);
        element.src = playlist[next];
        element.load();
        if (scene === this.musicScene && this.musicStarted && !this.musicSuspended) {
          void this.playMusicScene(scene);
        }
      });
      element.preload = scene === this.musicScene ? "auto" : "metadata";
      element.volume = 0;
      element.setAttribute("playsinline", "true");
      const scheduleRetry = () => {
        if (scene !== this.musicScene || this.musicSuspended || !this.musicStarted) return;
        this.musicRetryAfter.set(scene, Date.now() + 1_500);
      };
      element.addEventListener("stalled", scheduleRetry);
      element.addEventListener("waiting", scheduleRetry);
      this.music.set(scene, element);
    }
  }

  async startMusic() {
    if (!this.music.size || this.musicSuspended) return;
    this.musicStarted = true;
    await this.playMusicScene(this.musicScene);
    this.mixMusic(true);
  }

  async playMusicScene(scene: MusicScene) {
    if (!this.musicStarted || this.musicSuspended || this.musicPlayPending.has(scene)) return;
    const element = this.music.get(scene);
    if (!element || !element.paused) return;
    this.musicPlayPending.add(scene);
    try {
      await element.play();
      this.musicRetryAfter.delete(scene);
    } catch {
      // A transient network stall must not permanently silence the soundtrack.
      // Autoplay failures are naturally retried after the next user unlock.
      this.musicRetryAfter.set(scene, Date.now() + 3_000);
    }
    finally { this.musicPlayPending.delete(scene); }
  }

  setMusicScene(scene: MusicScene, dt = 1 / 60) {
    const changed = scene !== this.musicScene;
    this.musicScene = scene;
    if (changed) void this.playMusicScene(scene);
    this.mixMusic(false, dt);
  }

  mixMusic(immediate: boolean, dt = 1 / 60) {
    const base = effectiveMusicVolume(this.settings);
    const blend = immediate ? 1 : 1 - Math.exp(-Math.max(0, dt) * 1.55);
    const now = Date.now();
    for (const [scene, element] of this.music.entries()) {
      const active = scene === this.musicScene;
      if (!active && element.paused && element.volume === 0) continue;
      const target = active ? base : 0;
      const retryReady = now >= (this.musicRetryAfter.get(scene) ?? 0);
      if (target > 0 && this.musicStarted && element.paused && retryReady) void this.playMusicScene(scene);
      if (element.volume !== target) {
        const next = element.volume + (target - element.volume) * blend;
        element.volume = Math.abs(target - next) < 0.001 ? target : next;
      }
      if (target === 0 && element.volume === 0) {
        if (!element.paused) element.pause();
      }
    }
  }

  suspendMusic() {
    this.musicSuspended = true;
    for (const element of this.music.values()) element.pause();
  }

  resumeMusic() {
    this.musicSuspended = false;
    this.musicStarted = false;
    void this.startMusic();
  }

  preloadSamples() {
    const streamingLoops = new Set<SampleKind>(Object.values(ENVIRONMENT_LOOP_SAMPLES));
    for (const kind of Object.keys(SAMPLES) as SampleKind[]) {
      if (!streamingLoops.has(kind)) void this.loadSample(kind);
    }
  }

  loadSample(kind: SampleKind): Promise<AudioBuffer | null> {
    const cached = this.samples.get(kind);
    if (cached) return Promise.resolve(cached);
    const pending = this.sampleLoads.get(kind);
    if (pending) return pending;
    const context = this.context;
    if (!context || context.state === "closed" || this.disposed) return Promise.resolve(null);
    this.sampleAbort ??= new AbortController();
    const signal = this.sampleAbort.signal;
    const load = (async () => {
      try {
        const response = await fetch(SAMPLES[kind].source, { signal });
        if (!response.ok) return null;
        const encoded = await response.arrayBuffer();
        if (this.disposed || signal.aborted || this.context !== context) return null;
        const decoded = await context.decodeAudioData(encoded);
        if (this.disposed || signal.aborted || this.context !== context || context.state === "closed") return null;
        this.samples.set(kind, decoded);
        return decoded;
      } catch {
        return null;
      }
    })();
    this.sampleLoads.set(kind, load);
    void load.finally(() => {
      if (this.sampleLoads.get(kind) === load) this.sampleLoads.delete(kind);
    });
    return load;
  }

  playSample(kind: SampleKind, options: SamplePlaybackOptions = {}) {
    if (this.settings.muted || this.disposed) return;
    const snapshot: SamplePlaybackOptions = options.position
      ? { ...options, position: positionTuple(options.position) }
      : { ...options };
    const buffer = this.samples.get(kind);
    if (buffer) {
      this.startSample(kind, buffer, snapshot);
      return;
    }
    void this.loadSample(kind).then((loaded) => {
      if (loaded && !this.disposed) this.startSample(kind, loaded, snapshot);
    });
  }

  /** Decode and play bounded runner speech through the same pooled voice path as game SFX. */
  async playEncodedAudio(encoded: ArrayBuffer, options: SamplePlaybackOptions = {}) {
    const context = this.context;
    if (!context || context.state === "closed" || this.settings.muted || this.disposed || !encoded.byteLength) return false;
    try {
      const buffer = await context.decodeAudioData(encoded.slice(0));
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 32 || this.disposed) return false;
      this.startDecodedBuffer(buffer, 0.82, options);
      return true;
    } catch {
      return false;
    }
  }

  private acquireSpatialVoice() {
    const context = this.context;
    if (!context) return null;
    return this.spatialVoicePool.pop() ?? { gain: context.createGain(), panner: context.createPanner() };
  }

  private releaseSampleVoice(source: AudioBufferSourceNode, voice: ActiveSampleVoice) {
    this.activeSamples.delete(source);
    try { source.disconnect(); } catch { /* It may already be disconnected. */ }
    try { voice.gain.disconnect(); } catch { /* It may already be disconnected. */ }
    if (voice.panner) {
      try { voice.panner.disconnect(); } catch { /* It may already be disconnected. */ }
    }
    if (voice.pooledSpatial && this.spatialVoicePool.length < MAX_POOLED_SPATIAL_VOICES && !this.disposed) {
      this.spatialVoicePool.push(voice.pooledSpatial);
    }
  }

  private stopSampleVoice(source: AudioBufferSourceNode, voice: ActiveSampleVoice) {
    source.onended = null;
    try { source.stop(); } catch { /* A one-shot may already have ended. */ }
    this.releaseSampleVoice(source, voice);
  }

  startSample(kind: SampleKind, buffer: AudioBuffer, options: SamplePlaybackOptions) {
    this.startDecodedBuffer(buffer, SAMPLES[kind].gain, options);
  }

  private startDecodedBuffer(buffer: AudioBuffer, baseGain: number, options: SamplePlaybackOptions) {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state === "closed" || this.settings.muted || this.disposed) return;
    const spatialPosition = options.position ? positionTuple(options.position) : null;
    const maxDistance = Math.max(options.refDistance ?? 2, options.maxDistance ?? 48);
    const distance = spatialPosition
      ? Math.hypot(
        spatialPosition[0] - this.listenerPosition[0],
        spatialPosition[1] - this.listenerPosition[1],
        spatialPosition[2] - this.listenerPosition[2],
      )
      : 0;
    if (spatialPosition && distance > maxDistance) return;
    if (this.activeSamples.size >= MAX_ACTIVE_SAMPLE_VOICES) {
      const entries = [...this.activeSamples.entries()];
      const index = spatialVoiceEvictionIndex(entries.map(([, voice]) => ({
        distance: voice.distance,
        startedAt: voice.startedAt,
        spatial: Boolean(voice.panner),
      })));
      const eviction = entries[index];
      if (eviction) this.stopSampleVoice(eviction[0], eviction[1]);
    }
    const source = context.createBufferSource();
    const spatialVoice = spatialPosition ? this.acquireSpatialVoice() : null;
    const gain = spatialVoice?.gain ?? context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.25, Math.min(4, options.playbackRate ?? 1));
    source.detune.value = Math.max(-2400, Math.min(2400, options.detune ?? 0));
    gain.gain.value = Math.max(0, baseGain) * Math.max(0, Math.min(2, options.gain ?? 1));
    if (spatialVoice && spatialPosition) {
      const panner = spatialVoice.panner;
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = Math.max(0.1, options.refDistance ?? 2);
      panner.maxDistance = maxDistance;
      panner.rolloffFactor = Math.max(0, Math.min(4, options.rolloffFactor ?? 1.15));
      panner.coneInnerAngle = 360;
      panner.coneOuterAngle = 360;
      if (panner.positionX) {
        panner.positionX.setValueAtTime(spatialPosition[0], context.currentTime);
        panner.positionY.setValueAtTime(spatialPosition[1], context.currentTime);
        panner.positionZ.setValueAtTime(spatialPosition[2], context.currentTime);
      } else panner.setPosition(spatialPosition[0], spatialPosition[1], spatialPosition[2]);
      source.connect(gain).connect(panner).connect(master);
    } else source.connect(gain).connect(master);
    const voice: ActiveSampleVoice = {
      gain,
      panner: spatialVoice?.panner ?? null,
      startedAt: context.currentTime,
      distance,
      pooledSpatial: spatialVoice,
    };
    source.onended = () => {
      source.onended = null;
      this.releaseSampleVoice(source, voice);
    };
    this.activeSamples.set(source, voice);
    source.start(context.currentTime + Math.max(0, options.when ?? 0));
  }

  noiseBurst(duration: number, frequency: number, gainValue: number, highpass = false, when = 0) {
    if (!this.context || !this.master || !this.noise || this.settings.muted) return;
    const now = this.context.currentTime + when;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noise;
    source.playbackRate.value = 0.88 + Math.random() * 0.24;
    filter.type = highpass ? "highpass" : "bandpass";
    filter.frequency.value = frequency * (0.9 + Math.random() * 0.2);
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random() * 0.4, duration);
    source.stop(now + duration + 0.02);
  }

  tone(frequency: number, duration: number, gainValue: number, type: OscillatorType = "triangle", when = 0, endFrequency?: number) {
    if (!this.context || !this.master || this.settings.muted) return;
    const now = this.context.currentTime + when;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  play(kind: SoundKind, material: BlockId = BlockId.Grass) {
    const definition = BLOCKS[material];
    const stoneLike = definition?.preferredTool === "pickaxe";
    const woodLike = definition?.preferredTool === "axe";
    const sandLike = material === BlockId.Sand || material === BlockId.RedSand || material === BlockId.SunbakedClay;
    const grassLike = [BlockId.Grass, BlockId.MeadowGrass, BlockId.SavannaGrass, BlockId.SwampGrass, BlockId.JungleGrass,
      BlockId.SakuraGrass, BlockId.SugarplumGrass, BlockId.GlimmerGrass, BlockId.CloudreedGrass].includes(material);
    const softLike = material === BlockId.Grass || material === BlockId.Dirt || material === BlockId.MeadowGrass
      || material === BlockId.TallGrass || material === BlockId.DoubleTallGrassLower || material === BlockId.DoubleTallGrassUpper || definition?.shape === "cross";
    const base = stoneLike ? 1240 : woodLike ? 680 : 400;
    if (kind === "step") {
      if (material === BlockId.Snow || material === BlockId.SnowyGrass) {
        this.playSample("snowStep", { gain: 0.78, playbackRate: 0.96 + Math.random() * 0.08 });
      } else if (grassLike) {
        this.playSample("grassStep", { gain: 0.55, playbackRate: 0.96 + Math.random() * 0.08 });
      } else if (material === BlockId.Dirt) {
        this.playSample("dirtStep", { gain: 0.72, playbackRate: 0.95 + Math.random() * 0.1 });
      } else if (sandLike) {
        this.noiseBurst(0.082, 520, 0.046);
        this.noiseBurst(0.045, 880, 0.022, true, 0.025);
      } else if (softLike) {
        this.noiseBurst(0.072, 300, 0.052);
        this.tone(72 + Math.random() * 12, 0.045, 0.012, "sine");
      } else if (woodLike) {
        this.noiseBurst(0.047, 720, 0.048, true);
        this.tone(118, 0.055, 0.022, "triangle", 0, 84);
      } else {
        // Crisp stone/ore steps and a neutral fallback share one compact path.
        this.noiseBurst(stoneLike ? 0.038 : 0.064, base * 0.64, 0.055, stoneLike);
      }
    }
    else if (kind === "mine") {
      this.playSample("blockHit", { gain: stoneLike ? 0.44 : woodLike ? 0.62 : 0.52, playbackRate: stoneLike ? 1.15 : woodLike ? 0.96 : 1.04 });
      this.noiseBurst(0.075, base, 0.085, stoneLike);
      this.tone(stoneLike ? 105 : 82, 0.045, 0.025, "sine");
    } else if (kind === "break") {
      this.playSample("blockHit", { gain: 0.66, playbackRate: stoneLike ? 1.08 : woodLike ? 0.92 : 1 });
      for (let index = 0; index < 4; index += 1) this.noiseBurst(0.07, base * (0.8 + index * 0.12), 0.1, stoneLike, index * 0.026);
      this.tone(95, 0.11, 0.045, "sine", 0, 55);
    } else if (kind === "place") {
      this.noiseBurst(0.085, 560, 0.105);
      this.tone(122, 0.1, 0.09, "sine", 0, 68);
    } else if (kind === "pickup") {
      this.tone(660, 0.055, 0.045, "triangle");
      this.tone(990, 0.07, 0.04, "triangle", 0.052);
    } else if (kind === "jump") this.noiseBurst(0.075, 280, 0.045);
    else if (kind === "fall") {
      // A brief airy rush communicates that a fall has become dangerous
      // without looping a sample or masking nearby creature sounds.
      this.noiseBurst(0.42, 1040, 0.05, true);
      this.tone(210, 0.38, 0.018, "sine", 0, 92);
    }
    else if (kind === "land") {
      this.noiseBurst(0.11, 210, 0.09);
      this.tone(74, 0.08, 0.03, "sine");
    } else if (kind === "life-support") {
      // Helmet-local dual chirp, independent of world distance or left/right view.
      this.tone(880, .12, .07, "sine"); this.tone(660, .16, .07, "sine", .2);
    } else if (kind === "hurt") this.tone(150, 0.18, 0.09, "sawtooth", 0, 72);
    else if (kind === "ui") this.playSample("uiTap", { gain: 0.68, playbackRate: 0.98 + Math.random() * 0.04 });
    else if (kind === "attack") {
      this.noiseBurst(0.11, 920, 0.08, true);
      this.tone(180, 0.09, 0.035, "sawtooth", 0, 95);
    } else if (kind === "mob") {
      this.tone(180 + Math.random() * 80, 0.18, 0.04, "square", 0, 120);
    } else if (kind === "craft") {
      this.tone(520, 0.06, 0.04, "triangle");
      this.tone(780, 0.09, 0.045, "triangle", 0.055);
    } else if (kind === "furnace") {
      this.noiseBurst(0.12, 380, 0.04);
      this.tone(110, 0.08, 0.025, "sine", 0, 74);
    } else if (kind === "splash") this.playSample("waterSplash", { gain: 0.84, playbackRate: 0.95 + Math.random() * 0.08 });
    else if (kind === "eat") {
      for (let index = 0; index < 3; index += 1) this.noiseBurst(0.05, 520 + index * 100, 0.05, false, index * 0.055);
    }
  }

  /**
   * Authored attack/wing transients sit over lightweight elemental layers so
   * every age tier pitch-shifts naturally without a separate sample bank for
   * every dragon species and stage.
   */
  playDragon(type: DragonSoundType, event: DragonSoundEvent, stage = 1, position?: AudioPosition) {
    if (!this.context || !this.master || this.settings.muted) return;
    const age = Math.max(1, Math.min(5, Math.round(stage)));
    if (event === "ambient") {
      this.playSample("dragonAmbientGrowl", { gain: 0.34 + age * 0.055, playbackRate: 1.08 - age * 0.045 });
      return;
    }
    const depth = 1 - (age - 1) * 0.095;
    const base = (type === "fire" ? 92 : type === "ice" ? 128 : type === "sea" ? 104 : type === "gold" ? 116 : type === "silver" ? 136 : 108) * depth;
    const weight = 0.58 + age * 0.105;
    const texture = type === "fire" ? 420 : type === "ice" ? 1380 : type === "sea" ? 690 : type === "gold" ? 1540 : type === "silver" ? 1840 : 860;
    const spatial = position ? { position, refDistance: 3 + age * 0.45, maxDistance: 76 + age * 8, rolloffFactor: 0.92 } : {};

    if (event === "wing") {
      this.playSample("dragonWingFlap", { ...spatial, gain: 0.46 + age * 0.07, playbackRate: 1.08 - age * 0.055 });
      this.noiseBurst(0.18 + age * 0.025, 210 + age * 24, 0.025 * weight);
      this.tone(base * 0.72, 0.12, 0.012 * weight, "sine", 0, base * 0.48);
      return;
    }
    if (event === "melee") {
      this.playSample("dragonAttackB", { ...spatial, gain: 0.6 + age * 0.065, playbackRate: 1.06 - age * 0.045 });
      this.noiseBurst(0.14, 760, 0.075 * weight, true);
      this.tone(base * 1.55, 0.13, 0.047 * weight, "sawtooth", 0, base * 0.72);
      return;
    }
    if (event === "breath") {
      this.playSample("dragonAttackA", { ...spatial, gain: 0.54 + age * 0.07, playbackRate: 1.08 - age * 0.048 });
      this.noiseBurst(0.62 + age * 0.07, texture, 0.075 * weight, type !== "fire");
      if (type === "sea") this.noiseBurst(0.44 + age * 0.04, 1180, 0.042 * weight, true, 0.02);
      this.noiseBurst(0.48, type === "steel" ? 2300 : texture * 0.55, 0.038 * weight, true, 0.035);
      this.tone(base * (type === "ice" ? 2.4 : 0.88), 0.58, 0.031 * weight, type === "ice" ? "triangle" : "sawtooth", 0, base * 0.46);
      if (type === "gold") this.tone(base * 3.25, 0.72, 0.027 * weight, "sine", 0.025, base * 1.62);
      if (type === "silver") this.tone(base * 4.1, 0.8, 0.025 * weight, "triangle", 0.02, base * 2.05);
      return;
    }
    if (event === "projectile") {
      this.playSample(type === "steel" ? "dragonAttackB" : "dragonAttackA", { ...spatial, gain: 0.55 + age * 0.065, playbackRate: 1.1 - age * 0.05 });
      if (type === "steel") {
        this.tone(1180, 0.085, 0.065 * weight, "square", 0, 420);
        this.tone(176, 0.22, 0.045 * weight, "triangle", 0.025, 92);
      } else if (type === "gold" || type === "silver") {
        const bright = type === "gold" ? 1568 : 1864;
        this.tone(bright, 0.3, 0.052 * weight, "sine", 0, bright * 0.5);
        this.tone(bright * 1.5, 0.18, 0.028 * weight, "triangle", 0.035, bright * 0.75);
        this.noiseBurst(0.18, texture * 1.4, 0.028 * weight, true);
      } else {
        this.noiseBurst(0.24, texture * 1.25, 0.062 * weight, true);
        this.tone(base * 2.2, 0.21, 0.04 * weight, "sawtooth", 0, base * 0.8);
      }
      return;
    }
    if (event === "egg-crack") {
      for (let index = 0; index < 3; index += 1) {
        this.noiseBurst(0.055, 960 + index * 370, 0.043, true, index * 0.085);
        if (type === "steel") this.tone(1320 - index * 220, 0.07, 0.024, "triangle", index * 0.085);
        if (type === "gold" || type === "silver") this.tone((type === "gold" ? 1760 : 2093) - index * 180, 0.12, 0.022, "sine", index * 0.085);
      }
      return;
    }

    const duration = event === "death" ? 1.48 : event === "roar" ? 1.05 : 0.32;
    const gain = (event === "death" || event === "roar" ? 0.078 : event === "hurt" ? 0.052 : 0.036) * weight;
    this.noiseBurst(duration * 0.88, texture * (event === "hurt" ? 1.25 : 0.64), gain * 0.72, type === "ice");
    this.tone(
      base * (event === "hurt" ? 1.42 : 1),
      duration,
      gain,
      type === "ice" ? "triangle" : type === "steel" ? "square" : "sawtooth",
      0,
      base * (event === "death" ? 0.27 : event === "roar" ? 0.48 : 0.72),
    );
    if (type === "fire") this.noiseBurst(duration * 0.48, 2600, gain * 0.31, true, duration * 0.18);
    if (type === "ice") this.tone(base * 3.01, duration * 0.44, gain * 0.28, "sine", 0.035, base * 1.65);
    if (type === "steel") this.tone(base * 4.3, 0.11, gain * 0.56, "triangle", 0.015, base * 1.8);
    if (type === "gold") this.tone(base * 4.5, duration * 0.54, gain * 0.42, "sine", 0.025, base * 2.25);
    if (type === "silver") this.tone(base * 5.05, duration * 0.62, gain * 0.36, "triangle", 0.035, base * 2.5);
  }

  /** Compact, layered casting signatures shared by learned spells in a school. */
  playSpell(school: SpellSoundSchool, position?: AudioPosition) {
    if (!this.context || !this.master || this.settings.muted) return;
    this.playSample("magicAttack", {
      gain: school === "destruction" ? 0.78 : 0.58,
      playbackRate: school === "restoration" ? 1.08 : school === "conjuration" ? 0.92 : 1,
      ...(position ? { position, refDistance: 2.2, maxDistance: 58, rolloffFactor: 1.05 } : {}),
    });
    if (school === "destruction") {
      this.noiseBurst(0.31, 1_420, 0.055, true);
      this.tone(138, 0.28, 0.052, "sawtooth", 0, 76);
    } else if (school === "restoration") {
      this.tone(392, 0.3, 0.035, "sine", 0, 587);
      this.tone(659, 0.2, 0.024, "triangle", 0.08, 784);
    } else if (school === "alteration") {
      this.noiseBurst(0.18, 2_800, 0.025, true);
      this.tone(244, 0.24, 0.041, "triangle", 0, 976);
    } else if (school === "conjuration") {
      this.tone(104, 0.32, 0.046, "square", 0, 208);
      this.tone(1_180, 0.09, 0.032, "triangle", 0.19, 470);
    } else {
      this.tone(174, 0.38, 0.03, "sine", 0, 348);
      this.tone(523, 0.26, 0.022, "triangle", 0.06, 392);
    }
  }

  playAchievement() {
    this.playSample("achievement", { gain: 0.82 });
  }

  /** Procedural storm strike with a close crack and a longer, lower roll. */
  playThunder(distance = 0) {
    if (!this.context || !this.master || this.settings.muted) return;
    const delay = Math.max(0, Math.min(2.4, distance / 170));
    const weight = Math.max(0.28, 1 - distance / 260);
    this.noiseBurst(0.16, 2_150, 0.16 * weight, true, delay);
    this.noiseBurst(1.35, 92, 0.115 * weight, false, delay + 0.07);
    this.tone(58, 1.12, 0.055 * weight, "sawtooth", delay + 0.08, 31);
    this.noiseBurst(0.82, 150, 0.054 * weight, false, delay + 0.65);
  }

  dispose() {
    this.disposed = true;
    this.sampleAbort?.abort();
    try {
      this.ambience?.stop();
      this.rainAmbience?.stop();
      for (const [source, voice] of this.activeSamples) this.stopSampleVoice(source, voice);
      this.activeSamples.clear();
      for (const source of this.environmentSources.values()) {
        try { source.stop(); } catch { /* The loop may already have ended. */ }
        try { source.disconnect(); } catch { /* Already disconnected. */ }
      }
      for (const gain of this.environmentGains.values()) {
        try { gain.disconnect(); } catch { /* Already disconnected. */ }
      }
      this.environmentSources.clear();
      this.environmentGains.clear();
      this.environmentLoopLoads.clear();
      for (const voice of this.spatialVoicePool) {
        try { voice.gain.disconnect(); } catch { /* Already disconnected. */ }
        try { voice.panner.disconnect(); } catch { /* Already disconnected. */ }
      }
      this.spatialVoicePool.length = 0;
      this.samples.clear();
      this.sampleLoads.clear();
      for (const element of this.music.values()) {
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
      this.music.clear();
      this.musicPlayPending.clear();
      this.musicRetryAfter.clear();
      void this.context?.close();
    } catch {
      // Already closed.
    }
  }
}
