/**
 * get_package tool
 * Gets details of a specific package.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  packageId: z
    .string()
    .describe("The package ID to get details for"),
});

export function registerGetPackage(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "get_package",
    "Gets detailed information about a Cognigy.AI package including its name, description, and contained resources.",
    inputSchema.shape,
    async (args) => {
      const { packageId } = inputSchema.parse(args);

      const pkg = await client.readPackage({ packageId });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                _id: pkg._id,
                name: pkg.name,
                description: pkg.description,
                createdAt: pkg.createdAt
                  ? new Date(pkg.createdAt).toISOString()
                  : undefined,
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
