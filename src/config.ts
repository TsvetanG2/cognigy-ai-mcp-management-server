/**
 * Configuration module for the Cognigy MCP server.
 * Reads environment variables and provides typed config.
 */

export interface Config {
  cognigyBaseUrl: string;
  cognigyApiKey: string;
  defaultProjectId?: string;
  /** False when credentials are missing — the server still starts so tools/list works. */
  isConfigured: boolean;
}

export function loadConfig(): Config {
  const baseUrl = process.env.COGNIGY_BASE_URL;
  const apiKey = process.env.COGNIGY_API_KEY;

  return {
    cognigyBaseUrl: baseUrl ?? "",
    cognigyApiKey: apiKey ?? "",
    defaultProjectId: process.env.COGNIGY_DEFAULT_PROJECT_ID,
    isConfigured: Boolean(baseUrl && apiKey),
  };
}
