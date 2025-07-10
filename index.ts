import { APIError, InvalidResponseError, NetworkError } from "./errors";
import { validateFlag } from "./validateFlag";

const GET_METHOD = "GET";
const DEFAULT_API_URL = "https://api.rocketflag.app";
const DEFAULT_VERSION = "v1";

export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

export interface UserContext {
  cohort?: string | number | boolean;
}

export interface RocketFlagClient {
  getFlag: (flagId: string, context?: UserContext) => Promise<FlagStatus>;
}

const createRocketflagClient = (version = DEFAULT_VERSION, apiUrl = DEFAULT_API_URL): RocketFlagClient => {
  const getFlag = async (flagId: string, userContext: UserContext = {}): Promise<FlagStatus> => {
    if (!flagId) {
      throw new Error("flagId is required");
    }
    if (typeof flagId !== "string") {
      throw new Error("flagId must be a string");
    }
    if (typeof userContext !== "object") {
      throw new Error("userContext must be an object");
    }

    const url = new URL(`${apiUrl}/${version}/flags/${flagId}`);
    Object.entries(userContext).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    let raw: Response;
    try {
      raw = await fetch(url, { method: GET_METHOD });
    } catch (error) {
      throw new NetworkError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (!raw.ok) throw new APIError(`API request failed with status ${raw.status}`, raw.status, raw.statusText);

    let response: unknown;
    try {
      response = await raw.json();
    } catch {
      throw new InvalidResponseError("Failed to parse JSON response");
    }

    if (!response || typeof response !== "object") throw new InvalidResponseError("Invalid response format: response is not an object");
    if (!validateFlag(response)) throw new InvalidResponseError("Invalid response from server");

    return response;
  };

  return { getFlag };
};

export default createRocketflagClient;
