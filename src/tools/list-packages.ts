/**
 * list_packages tool
 * Lists all packages in a Cognigy.AI project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Project ID to list packages for. If omitted, lists all accessible packages."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of packages to return (1-100, default 25)"),
});

export function registerListPackages(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "list_packages",
    "Lists packages in a Cognigy.AI project. Packages are portable bundles of resources (flows, intents, etc.) that can be transferred between projects or environments.",
    inputSchema.shape,
    async (args) => {
      const { projectId, limit } = inputSchema.parse(args);

      const params: Parameters<typeof client.indexPackages>[0] = {
        limit,
      };
      if (projectId) {
        params.projectId = projectId;
      }

      const result = await client.indexPackages(params);

      const packages = result.items.map((pkg) => ({
        _id: pkg._id,
        name: pkg.name,
        description: pkg.description,
        createdAt: pkg.createdAt
          ? new Date(pkg.createdAt).toISOString()
          : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                total: result.total,
                returned: packages.length,
                packages,
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
