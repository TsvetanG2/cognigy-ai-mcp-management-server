/**
 * export_contact_profile tool
 * Exports all data for a contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  profileId: z
    .string()
    .describe("The contact profile ID to export"),
});

export function registerExportContactProfile(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "export_contact_profile",
    "Exports all data for a Cognigy.AI contact profile. Use this for GDPR data access requests. Returns all stored profile data in a portable format.",
    inputSchema.shape,
    async (args) => {
      const { profileId } = inputSchema.parse(args);

      const result = await client.exportProfileData({
        profileId,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                exported: true,
                profileId,
                data: result,
                note: "Full profile data export for GDPR compliance.",
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
