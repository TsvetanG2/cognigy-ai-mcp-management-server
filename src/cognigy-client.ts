/**
 * Cognigy REST API client wrapper.
 * Provides a configured instance of the official Cognigy client.
 */

import { RestAPIClient } from "@cognigy/rest-api-client";
import type { Config } from "./config.js";

export type CognigyClient = ReturnType<typeof createCognigyClient>;

export function createCognigyClient(config: Config) {
  const client = new RestAPIClient({
    baseUrl: config.cognigyBaseUrl,
  });

  client.setCredentials({
    type: "ApiKey",
    apiKey: config.cognigyApiKey,
  });

  // Workaround: The rest-api-client sends a JSON body on GET requests,
  // which causes Cognigy Trial (and possibly other environments) to
  // return 403 Forbidden. We patch the HTTP adapter to remove the body
  // from GET requests.
  patchHttpAdapterForGetRequests(client);

  return client;
}

/**
 * Patches the HTTP adapter to remove request body from GET requests.
 *
 * The official @cognigy/rest-api-client incorrectly includes the query
 * parameters as a JSON body in GET requests. While the parameters are
 * also in the URL query string, the presence of a body causes some
 * Cognigy API environments (e.g., Trial) to reject the request with
 * 403 Forbidden.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchHttpAdapterForGetRequests(client: any): void {
  const httpAdapter = client.getHttpAdapter();
  const originalConvertRequest = httpAdapter.convertRequest.bind(httpAdapter);

  httpAdapter.convertRequest = async function (
    request: Parameters<typeof originalConvertRequest>[0],
    clientArg: Parameters<typeof originalConvertRequest>[1]
  ) {
    const axiosConfig = await originalConvertRequest(request, clientArg);

    // Remove body/data from GET requests
    if (axiosConfig.method === "GET") {
      delete axiosConfig.data;
    }

    return axiosConfig;
  };
}
