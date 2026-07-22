/**
 * get_node_descriptors tool
 * Gets available node types/blueprints for a flow.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  flowId: z
    .string()
    .describe("The flow ID to get available node types for"),
});

export function registerGetNodeDescriptors(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_node_descriptors",
    "Gets all available node types (blueprints) that can be created in a Cognigy.AI flow. Returns node type definitions including their fields, appearance, and constraints. Use this to understand what nodes can be added to a flow.",
    inputSchema.shape,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { flowId } = inputSchema.parse(args);

      const result = await client.indexNodeDescriptors({
        resourceId: flowId,
        resourceType: "flow",
      });

      const descriptors = result.items.map((desc) => ({
        type: desc.type,
        defaultLabel: desc.defaultLabel,
        summary: desc.summary,
        extension: desc.extension,
        parentType: desc.parentType,
        tags: desc.tags,
        appearance: desc.appearance
          ? {
              color: desc.appearance.color,
              textColor: desc.appearance.textColor,
              showIcon: desc.appearance.showIcon,
              variant: desc.appearance.variant,
            }
          : undefined,
        behavior: desc.behavior,
        constraints: desc.constraints,
        fieldCount: desc.fields?.length ?? 0,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                flowId,
                total: result.total,
                returned: descriptors.length,
                nextCursor: result.nextCursor,
                descriptors,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
