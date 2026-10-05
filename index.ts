import { APIError, InvalidResponseError, NetworkError } from "./errors.js";
import { validateFlag } from "./validateFlag.js";

const GET_METHOD = "GET";
const DEFAULT_API_URL = "https://api.rocketflag.app";
const DEFAULT_VERSION = "v1";
const ENV_REGEX = /^[A-Za-z0-9_-]+$/;
const DEFAULT_MAX_CACHE_ENTRIES = 10_000;

export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

/** A context value. It is sent to the API in its string form. */
export type ContextValue = string | number | boolean;

/**
 * The evaluation context for a flag request. Every key is sent to the API as a
 * query parameter.
 *
 * - `cohort` is matched against the flag's cohort list.
 * - `env` selects an environment of a group flag.
 * - `targetingKey` is a stable identifier for the user (a user id, not an
 *   email where you can avoid it) that makes percentage rollouts sticky.
 * - Any other key is an audience attribute, such as `plan` or `country`.
 *
 * Values cannot be `undefined`. Leave the key out instead.
 */
export type UserContext = Record<string, ContextValue> & {
  cohort?: ContextValue;
  env?: string;
  targetingKey?: string | number;
};

export interface CacheOptions {
  ttlSeconds?: number;
  /**
   * The most responses the cache holds. When it is full the least recently
   * used entry is evicted. Defaults to 10,000.
   */
  maxEntries?: number;
}

export interface CallOptions {
  ttlSeconds?: number;
}

export interface RocketFlagClient {
  getFlag: (flagId: string, context?: UserContext, options?: CallOptions) => Promise<FlagStatus>;
}

type CacheEntry = { flag: FlagStatus; expiresAt: number };

const createRocketflagClient = (
  version = DEFAULT_VERSION,
  apiUrl = DEFAULT_API_URL,
  cacheOptions: CacheOptions = {},
): RocketFlagClient => {
  const defaultTtlMs = cacheOptions.ttlSeconds !== undefined ? cacheOptions.ttlSeconds * 1_000 : 0;
  const maxEntries = cacheOptions.maxEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error("maxEntries must be a positive integer");
  }
  // A Map iterates in insertion order, so re-inserting on every hit keeps the
  // least recently used entry first.
  const cache: Map<string, CacheEntry> = new Map();

  const getFlag = async (flagId: string, userContext: UserContext = {}, options: CallOptions = {}): Promise<FlagStatus> => {
    if (!flagId) {
      throw new Error("flagId is required");
    }
    if (typeof flagId !== "string") {
      throw new Error("flagId must be a string");
    }
    if (typeof userContext !== "object" || userContext === null) {
      throw new Error("userContext must be an object");
    }

    for (const key in userContext) {
      const value = userContext[key];
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        throw new Error(`userContext values must be of type string, number, or boolean. Invalid value for key: ${key}`);
      }
      if (key === "env" && (typeof value !== "string" || !ENV_REGEX.test(value))) {
        throw new Error(`env values may only contain letters, numbers, hyphens and underscores. Invalid value for env: ${value}`);
      }
    }

    const url = new URL(`${apiUrl}/${version}/flags/${flagId}`);
    Object.entries(userContext).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    const effectiveTtl = options.ttlSeconds !== undefined ? options.ttlSeconds * 1_000 : defaultTtlMs;
    let cacheKey = "";
    if (effectiveTtl > 0) {
      const sortedParams = new URLSearchParams(url.searchParams);
      sortedParams.sort();
      cacheKey = `${flagId}?${sortedParams.toString()}`;
      const entry = cache.get(cacheKey);
      if (entry) {
        cache.delete(cacheKey);
        if (entry.expiresAt > Date.now()) {
          cache.set(cacheKey, entry);
          return structuredClone(entry.flag);
        }
      }
    }

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

    if (effectiveTtl > 0) {
      cache.delete(cacheKey);
      if (cache.size >= maxEntries) {
        const oldest = cache.keys().next();
        if (!oldest.done) cache.delete(oldest.value);
      }
      cache.set(cacheKey, { flag: structuredClone(response), expiresAt: Date.now() + effectiveTtl });
    }

    return response;
  };

  return { getFlag };
};

export default createRocketflagClient;
