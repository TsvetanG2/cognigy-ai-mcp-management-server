/**
 * Tool registration module.
 * Registers all available MCP tools with the server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";
import { registerListProjects } from "./list-projects.js";
import { registerListFlows } from "./list-flows.js";
import { registerGetFlow } from "./get-flow.js";
import { registerGetFlowSettings } from "./get-flow-settings.js";
import { registerGetLatestLogEntries } from "./get-latest-log-entries.js";
import { registerGetNodes } from "./get-nodes.js";
import { registerGetNode } from "./get-node.js";
import { registerSearchNodes } from "./search-nodes.js";
import { registerGetNodeDescriptors } from "./get-node-descriptors.js";
import { registerListIntents } from "./list-intents.js";
import { registerGetIntent } from "./get-intent.js";
import { registerListEndpoints } from "./list-endpoints.js";
import { registerGetEndpoint } from "./get-endpoint.js";
import { registerInjectContext } from "./inject-context.js";
import { registerResetContext } from "./reset-context.js";
import { registerGetConversations } from "./get-conversations.js";
import { registerGetConversation } from "./get-conversation.js";
import { registerGetTranscript } from "./get-transcript.js";
import { registerListSnapshots } from "./list-snapshots.js";
import { registerGetSnapshot } from "./get-snapshot.js";
import { registerGetSnapshotResources } from "./get-snapshot-resources.js";
import { registerListTasks } from "./list-tasks.js";
import { registerGetTask } from "./get-task.js";

export function registerTools(
  server: McpServer,
  client: CognigyClient,
  config: Config
): void {
  // Phase 0: Core reads
  registerListProjects(server, client, config);
  registerListFlows(server, client, config);
  registerGetFlow(server, client, config);
  registerGetFlowSettings(server, client, config);
  registerGetLatestLogEntries(server, client, config);

  // Phase 1: Nodes (read/search)
  registerGetNodes(server, client, config);
  registerGetNode(server, client, config);
  registerSearchNodes(server, client, config);
  registerGetNodeDescriptors(server, client, config);

  // Phase 1: Intents (read)
  registerListIntents(server, client, config);
  registerGetIntent(server, client, config);

  // Phase 1: Endpoints (read)
  registerListEndpoints(server, client, config);
  registerGetEndpoint(server, client, config);

  // Phase 1: Sessions (inject/reset context)
  registerInjectContext(server, client, config);
  registerResetContext(server, client, config);

  // Phase 1: Conversations/Transcripts
  registerGetConversations(server, client, config);
  registerGetConversation(server, client, config);
  registerGetTranscript(server, client, config);

  // Phase 1: Snapshots (read)
  registerListSnapshots(server, client, config);
  registerGetSnapshot(server, client, config);
  registerGetSnapshotResources(server, client, config);

  // Phase 1: Tasks
  registerListTasks(server, client, config);
  registerGetTask(server, client, config);
}
