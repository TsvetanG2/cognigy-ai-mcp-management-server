/**
 * get_node tool
 * Gets detailed information about a specific node in a flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID containing the node"),
  nodeId: z
    .string()
    .describe("The node ID to retrieve"),
  localeId: z
    .string()
    .optional()
    .describe("Optional locale ID for localized content"),
});

export function registerGetNode(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_node",
    "Gets detailed configuration of a specific node in a Cognigy.AI flow. Returns the node's type, label, config fields, and settings. Use this to inspect node behavior before modifying it.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId, nodeId, localeId } = inputSchema.parse(args);

      const node = await client.readChartNode({
        resourceId: flowId,
        resourceType: "flow",
        nodeId,
        preferredLocaleId: localeId,
      });

      const result = {
        id: node._id,
        referenceId: node.referenceId,
        type: node.type,
        label: node.label,
        analyticsLabel: node.analyticsLabel,
        isEntryPoint: node.isEntryPoint,
        isDisabled: node.isDisabled,
        extension: node.extension,
        localeReference: node.localeReference,
        comment: node.comment || undefined,
        config: node.config,
        preview: node.preview,
        mock: node.mock,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
