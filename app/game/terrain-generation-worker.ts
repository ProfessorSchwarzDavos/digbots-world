import { CHUNK_SIZE, ChunkWorld, type WorldGenerationOptions } from "./world";
import { TERRAIN_WORKER_PROTOCOL, type TerrainGenerationRequest } from "./terrain-generation-pipeline";

type Request = Readonly<{ id: number; request: TerrainGenerationRequest }>;

self.postMessage({ type: "ready", protocol: TERRAIN_WORKER_PROTOCOL });

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, request } = event.data;
  try {
    const world = new ChunkWorld();
    const savedEdits = request.edits.length
      ? { [request.key]: request.edits.map(([index, type]) => [index, type] as [number, number]) }
      : undefined;
    world.reset(request.seedText, savedEdits, request.generationOptions as Partial<WorldGenerationOptions>, undefined, request.locationScope, request.celestialGeneration);
    const chunk = world.generateChunk(request.cx, request.cz);
    const structureMarkers = [...world.structureMarkers.entries()].filter(([, marker]) => (
      Math.floor(marker.position.x / CHUNK_SIZE) === chunk.cx
      && Math.floor(marker.position.z / CHUNK_SIZE) === chunk.cz
    ));
    const result = {
    namespace: request.namespace,
    generationSource: world.snapshotGenerationProducer(),
    key: chunk.key,
    cx: chunk.cx,
    cz: chunk.cz,
    blocks: chunk.blocks,
    heightmap: chunk.heightmap,
    biomes: chunk.biomes,
    sectionBlockCounts: chunk.sectionBlockCounts,
    skyTops: chunk.skyTops,
    light: chunk.light,
    lightIndices: [...chunk.lightIndices],
    leafIndices: [...chunk.leafIndices],
    structureMarkers,
    };
    world.chunks.delete(chunk.key);
    world.group.remove(chunk.group);
    world.dispose();
    const transfer = [result.blocks.buffer, result.heightmap.buffer, result.biomes.buffer, result.sectionBlockCounts.buffer, result.skyTops.buffer, result.light.buffer];
    self.postMessage({ type: "result", id, result }, { transfer });
  } catch (error) {
    self.postMessage({ type: "task-error", id, message: error instanceof Error ? error.message : String(error) });
  }
};
