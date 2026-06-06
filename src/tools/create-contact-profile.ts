/**
 * create_contact_profile tool
 * Creates a new contact profile.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to create the profile in"),
  contactId: z
    .string()
    .describe("The unique contact identifier for this profile"),
  profile: z
    .record(z.unknown())
    .optional()
    .describe("Profile data to store (custom fields)"),
  acceptedGDPR: z
    .boolean()
    .optional()
    .describe("Whether the user has accepted GDPR consent"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without creating. Set to false to actually create."),
});

export function registerCreateContactProfile(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "create_contact_profile",
    "Creates a new Cognigy.AI contact profile. Contact profiles persist user data across sessions for personalization. MUTATING: Set dryRun=false to create.",
    inputSchema.shape,
    async (args) => {
      const { projectId, contactId, profile, acceptedGDPR, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to create the contact profile.",
                  wouldCreate: {
                    projectId,
                    contactId,
                    hasProfile: !!profile,
                    acceptedGDPR,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.createProfile({
        projectId,
        contactId,
        profile,
        acceptedGDPR,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                created: true,
                profile: {
                  _id: result._id,
                  referenceId: result.referenceId,
                  contactId: result.contactId,
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
