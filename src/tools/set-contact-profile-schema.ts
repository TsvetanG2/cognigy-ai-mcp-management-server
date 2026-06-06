/**
 * set_contact_profile_schema tool
 * Sets the contact profile schema for a project.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CognigyClient } from "../cognigy-client.js";
import type { Config } from "../config.js";

const inputSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to set the profile schema for"),
  schema: z
    .array(z.object({
      name: z.string().describe("Field name"),
      type: z.enum(["string", "number", "boolean", "array", "object"]).describe("Field type"),
      description: z.string().optional().describe("Field description"),
    }))
    .describe("Array of schema field definitions"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true (default), validates without updating. Set to false to actually update."),
});

export function registerSetContactProfileSchema(
  server: McpServer,
  client: CognigyClient,
  _config: Config
): void {
  server.tool(
    "set_contact_profile_schema",
    "Sets the contact profile schema for a Cognigy.AI project. Defines what custom fields can be stored in contact profiles. MUTATING: Set dryRun=false to update.",
    inputSchema.shape,
    async (args) => {
      const { projectId, schema, dryRun } = inputSchema.parse(args);

      if (dryRun) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dryRun: true,
                  message: "Validation passed. Set dryRun=false to update the profile schema.",
                  wouldSet: {
                    projectId,
                    fieldCount: schema.length,
                    fields: schema.map((f) => f.name),
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await client.setProfileSchema({
        projectId,
        schema,
      } as any) as unknown as Record<string, unknown>;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                updated: true,
                projectId,
                schema: result.schema || schema,
                note: "Profile schema has been updated.",
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
