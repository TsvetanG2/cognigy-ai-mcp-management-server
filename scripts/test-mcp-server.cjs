/**
 * Test the actual MCP server tools against Trial.
 * This loads the built server code and tests it directly.
 */

const apiKey = process.argv[2] || process.env.COGNIGY_API_KEY;
if (!apiKey) {
  console.error("ERROR: API key required");
  process.exit(1);
}

// Set environment variables
process.env.COGNIGY_BASE_URL = "https://api-trial.cognigy.ai";
process.env.COGNIGY_API_KEY = apiKey;

async function main() {
  console.log("=== TESTING MCP SERVER TOOLS ===\n");

  // Import the built modules
  const { loadConfig } = await import("../dist/config.js");
  const { createCognigyClient } = await import("../dist/cognigy-client.js");

  const config = loadConfig();
  const client = createCognigyClient(config);

  console.log("Config loaded, client created with patch.");
  console.log("Base URL:", config.cognigyBaseUrl);
  console.log("");

  // Test a few tools
  const results = [];

  async function test(name, fn) {
    process.stdout.write(`Testing ${name}... `);
    try {
      const result = await fn();
      console.log("OK");
      results.push({ name, status: "PASS" });
      return result;
    } catch (e) {
      console.log("FAIL:", e.message);
      results.push({ name, status: "FAIL", error: e.message });
      return null;
    }
  }

  // Test core operations
  const projects = await test("indexProjects", () =>
    client.indexProjects({ limit: 5 })
  );

  if (projects?.items?.length > 0) {
    const projectId = projects.items[0]._id;
    console.log(`  -> Project: ${projects.items[0].name}`);

    const flows = await test("indexFlows", () =>
      client.indexFlows({ projectId, limit: 5 })
    );

    if (flows?.items?.length > 0) {
      const flowId = flows.items[0]._id;
      console.log(`  -> Flow: ${flows.items[0].name}`);

      await test("indexChartNodes", () =>
        client.indexChartNodes({ resourceId: flowId, resourceType: "flow", limit: 10 })
      );

      await test("indexIntents", () =>
        client.indexIntents({ flowId, limit: 10 })
      );
    }

    await test("indexEndpoints", () =>
      client.indexEndpoints({ projectId, limit: 5 })
    );

    await test("indexSnapshots", () =>
      client.indexSnapshots({ projectId, limit: 5 })
    );

    await test("indexLogEntries", () =>
      client.indexLogEntries({ projectId, limit: 10 })
    );
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log("\nMCP server tools are working correctly with Cognigy Trial!");
  }
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
