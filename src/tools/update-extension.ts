/**
 * update_extension tool
 * Updates extension settings (e.g., trusted code flag).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  extensionId: z
    .string()
    .describe("The extension ID to update"),
  trustedCode: z
    .boolean()
    .optional()
    .describe("Enable trusted code execution (allows full Node.js API access)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerUpdateExtension(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "update_extension",
    "Updates Cognigy.AI Extension settings like trusted code flag. Use this to enable/disable full Node.js API access. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { extensionId, trustedCode, dryRun } = inputSchema.parse(args);

      // Verify the extension exists
      const existing = await client.readExtension({ extensionId }) as unknown as Record<string, unknown>;

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the extension.",
                  existingExtension: {
                    _id: existing._id,
                    name: existing.name,
                    trustedCode: existing.trustedCode,
                  },
                  wouldUpdate: {
                    trustedCode: trustedCode !== undefined ? trustedCode : "(unchanged)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.updateExtension({
        extensionId,
        trustedCode: trustedCode ?? false,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                extension: {
                  _id: result._id,
                  name: result.name,
                  trustedCode: result.trustedCode,
                },
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
