// End-to-end test script for Agent Council
const BASE = "http://localhost:3001";

async function run() {
  // 1. Fetch personalities
  const presets = await fetch(`${BASE}/api/personalities`).then(r => r.json());
  const skeptic = presets.find(p => p.name === "Skeptic").personality;
  const optimist = presets.find(p => p.name === "Optimist").personality;
  console.log("✓ Fetched personalities");

  // 2. Create debate
  const debateRes = await fetch(`${BASE}/api/debates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Should we use AI to replace teachers?",
      goal: "Should artificial intelligence replace human teachers in schools? Consider educational outcomes, social development, accessibility, and cost.",
      agents: [
        { name: "Skeptic", modelKey: "gemini:gemini-2.0-flash", personalityJson: JSON.stringify(skeptic) },
        { name: "Optimist", modelKey: "gemini:gemini-2.0-flash", personalityJson: JSON.stringify(optimist) },
      ],
    }),
  }).then(r => r.json());

  console.log("✓ Created debate:", debateRes.debateId);
  const debateId = debateRes.debateId;

  // 3. Start the debate
  const startRes = await fetch(`${BASE}/api/debates/${debateId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).then(r => r.json());
  console.log("✓ Started debate, run:", startRes.runId);

  // 4. Wait for completion (poll every 5s, max 5 minutes)
  let lastPhase = "";
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const debate = await fetch(`${BASE}/api/debates/${debateId}`).then(r => r.json());
    const currentRun = debate.runs?.[0];
    if (currentRun && currentRun.phase !== lastPhase) {
      console.log(`  ► Phase: ${currentRun.phase} (${currentRun.status})`);
      lastPhase = currentRun.phase;
    }
    if (debate.status === "completed") {
      console.log("\n✓ DEBATE COMPLETED!");
      
      // 5. Fetch final graph
      const graph = await fetch(`${BASE}/api/debates/${debateId}/graph`).then(r => r.json());
      console.log(`  Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);
      
      const finalNode = graph.nodes.find(n => n.nodeType === "final");
      if (finalNode) {
        console.log("\n═══ FINAL ANSWER ═══");
        console.log(finalNode.content);
        console.log("═══════════════════\n");
      }

      process.exit(0);
    } else if (debate.status === "errored") {
      console.log("\n✗ DEBATE ERRORED");
      console.log("  Run:", JSON.stringify(currentRun));
      process.exit(1);
    }
    process.stdout.write(".");
  }

  console.log("\n✗ Timed out waiting for debate");
  process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
