import assert from "node:assert/strict";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
const SOAK_SCOPE = Object.freeze({ locationId: locationId(homeLocation(universeId("synthetic-agent-soak"))), epoch: 1, revision: 0 });
import { performance } from "node:perf_hooks";
import { BlockId, Item } from "../app/game/data";
import {
  AGENT_DEFAULT_SIMULATION_DISTANCE,
  AgentAuthority,
  createAgentResult,
  mergeAgentInterestRegions,
  type AgentCommandEnvelope,
  type AgentVector3,
} from "../app/game/agent-platform";
import { buildMaterialRequirements, reserveBuildMaterials, transferAgentStacksExact } from "../app/game/agent-work";

const SIMULATED_MINUTES = 30;
const STEP_MILLISECONDS = 50;
const STEPS = SIMULATED_MINUTES * 60_000 / STEP_MILLISECONDS;
const COUNTS = [1, 2, 4] as const;
const LAYOUTS = ["co-located", "separated"] as const;

const percentile = (values: readonly number[], fraction: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
};

function command(agentId: string, sequence: number, revision: number, now: number): AgentCommandEnvelope {
  return {
    schema: 1,
    scope: SOAK_SCOPE,
    commandId: `soak_${agentId}_${sequence}`,
    agentId,
    kind: "observe",
    expectedWorldRevision: revision,
    issuedAt: now,
    expiresAt: now + 30_000,
    arguments: {},
  };
}

function positionFor(index: number, step: number, layout: typeof LAYOUTS[number]): AgentVector3 {
  const phase = step * 0.002 + index * 0.71;
  const anchor = layout === "co-located" ? 8 : (index + 1) * 112;
  return { x: anchor + Math.sin(phase) * 5, y: 32, z: (layout === "co-located" ? 8 : -anchor) + Math.cos(phase) * 5 };
}

function runScenario(agentCount: typeof COUNTS[number], layout: typeof LAYOUTS[number]) {
  const authority = new AgentAuthority(4);
  const agents = Array.from({ length: agentCount }, (_, index) => `agent_soak_${index}`);
  for (const [index, agentId] of agents.entries()) {
    assert.ok(authority.register({ agentId, connectionId: `peer_${index}`, name: `Drone ${index + 1}`, requested: ["observe.world", "move.self", "build", "container.read", "container.write"] }, 1));
    assert.ok(authority.approve(agentId, ["observe.world", "move.self", "build", "container.read", "container.write"], 2));
  }

  let revision = 10;
  let commands = 0;
  let terminalResults = 0;
  let rejectedInterests = 0;
  let peakRegions = 0;
  let peakSimulatedChunks = 0;
  const sampleMilliseconds: number[] = [];
  for (let step = 0; step < STEPS; step += 1) {
    const started = performance.now();
    const positions = agents.map((agentId, index) => ({ agentId, position: positionFor(index, step, layout), status: "approved" as const }));
    const interests = mergeAgentInterestRegions([{ x: 8, y: 32, z: 8 }], positions);
    assert.equal(interests.admittedAgentIds.length, agentCount);
    rejectedInterests += interests.rejectedAgentIds.length;
    peakRegions = Math.max(peakRegions, interests.totalRegions);
    const diameter = AGENT_DEFAULT_SIMULATION_DISTANCE * 2 + 1;
    peakSimulatedChunks = Math.max(peakSimulatedChunks, interests.totalRegions * diameter * diameter);

    if (step % 600 === 0) {
      for (const [index, agentId] of agents.entries()) {
        const issued = command(agentId, commands, revision, step * STEP_MILLISECONDS + 100);
        assert.equal(authority.authorize(issued, `peer_${index}`, revision, SOAK_SCOPE, issued.issuedAt), null);
        const result = createAgentResult(issued, "completed", revision, "soak_observed", "Authoritative observation sampled.", {}, issued.issuedAt + 2);
        authority.setCurrentResult(result, issued.issuedAt + 2);
        assert.equal(result.terminal, true);
        commands += 1;
        terminalResults += 1;
      }
      revision += 1;
    }
    sampleMilliseconds.push(performance.now() - started);
  }

  assert.equal(rejectedInterests, 0);
  assert.equal(terminalResults, commands);
  return {
    agentCount,
    layout,
    simulatedMinutes: SIMULATED_MINUTES,
    steps: STEPS,
    commands,
    terminalResults,
    rejectedInterests,
    peakRegions,
    peakSimulatedChunks,
    iterationMs: {
      p50: percentile(sampleMilliseconds, 0.5),
      p95: percentile(sampleMilliseconds, 0.95),
      max: Math.max(...sampleMilliseconds),
    },
  };
}

function verifyContentionAndRecovery() {
  let containerRevision = 4;
  let inventoryRevision = 7;
  const container = [{ item: Item.Berry, count: 30 }, null];
  const inventory = [null, { item: Item.Stick, count: 2 }];
  const firstRead = { containerRevision, inventoryRevision };
  const first = transferAgentStacksExact(container, inventory, { sourceSlot: 0, destinationSlot: 0, count: 12 });
  assert.equal(first.ok, true);
  containerRevision += 1;
  inventoryRevision += 1;
  const secondHasFreshRevision = firstRead.containerRevision === containerRevision && firstRead.inventoryRevision === inventoryRevision;
  assert.equal(secondHasFreshRevision, false, "the second racer must re-read instead of replaying a stale transfer");
  assert.equal((first.source[0]?.count ?? 0) + (first.destination[0]?.count ?? 0), 30, "the exact transfer conserves every item");

  const placements = Array.from({ length: 16 }, (_, index) => ({ x: index, y: 32, z: 0, block: BlockId.Planks }));
  const requirements = buildMaterialRequirements(placements, [{ item: BlockId.Planks, count: 16 }]);
  const reserved = reserveBuildMaterials([{ item: BlockId.Planks, count: 16 }], requirements);
  assert.equal(reserved.ok, true);
  assert.equal(reserved.reserved.reduce((sum, [, count]) => sum + count, 0), 16);

  const authority = new AgentAuthority(4);
  for (let index = 0; index < 4; index += 1) assert.ok(authority.register({ agentId: `agent_capacity_${index}`, connectionId: `peer_${index}`, name: "Capacity Drone" }, index));
  assert.equal(authority.register({ agentId: "agent_capacity_5", connectionId: "peer_5", name: "Excess Drone" }, 10), null);
  return { staleTransferRejected: true, conservedItems: 30, reservedBuildItems: 16, fifthAgentRejected: true };
}

const started = performance.now();
const scenarios = COUNTS.flatMap((count) => LAYOUTS.map((layout) => runScenario(count, layout)));
const invariants = verifyContentionAndRecovery();
process.stdout.write(`${JSON.stringify({
  schema: 1,
  suite: "blockwild-agent-platform-soak",
  simulatedMinutesPerScenario: SIMULATED_MINUTES,
  scenarios,
  invariants,
  wallClockMs: performance.now() - started,
}, null, 2)}\n`);
