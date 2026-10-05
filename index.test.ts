import { APIError, InvalidResponseError, NetworkError } from "./errors";
import createRocketflagClient from "./index";
import { FlagStatus, UserContext } from "./index";

// Mock the global fetch function
global.fetch = jest.fn() as jest.Mock<Promise<Response>>;

describe("createRocketflagClient", () => {
  const apiUrl = "https://api.rocketflag.app";
  const flagId = "test-flag";
  const userContext = { cohort: "user123" };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(jest.fn());
  });

  describe("custom client options", () => {
    it("can create a client with a custom version", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient("v2");
      await client.getFlag(flagId);

      const expectedUrl = `${apiUrl}/v2/flags/${flagId}`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
    });

    it("can create a client with a custom url", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient("v2", "https://example.com");
      await client.getFlag(flagId);

      const expectedUrl = `https://example.com/v2/flags/${flagId}`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
    });
  });

  describe("getFlag", () => {
    it("should fetch a flag", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, userContext);

      expect(fetch).toHaveBeenCalledTimes(1);

      const expectedUrl = `${apiUrl}/v1/flags/${flagId}?cohort=user123`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
      expect(flag).toEqual(mockFlag);
    });

    it("should fetch a flag with special characters in the query", async () => {
      userContext.cohort = "user+testing_rocketflag@example.com";
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, userContext);

      expect(fetch).toHaveBeenCalledTimes(1);

      const expectedUrl = `${apiUrl}/v1/flags/${flagId}?cohort=${"user%2Btesting_rocketflag%40example.com"}`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
      expect(flag).toEqual(mockFlag);
    });

    it("should fetch a flag with env in the user context", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, { env: "staging" });

      expect(fetch).toHaveBeenCalledTimes(1);

      const expectedUrl = `${apiUrl}/v1/flags/${flagId}?env=staging`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
      expect(flag).toEqual(mockFlag);
    });

    it("should fetch a flag with cohort and env in the user context", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, { cohort: "user123", env: "staging" });

      expect(fetch).toHaveBeenCalledTimes(1);

      const expectedUrl = `${apiUrl}/v1/flags/${flagId}?cohort=user123&env=staging`;
      const expectedURLObject = new URL(expectedUrl);

      expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expectedURLObject.href }), { method: "GET" });
      expect(flag).toEqual(mockFlag);
    });

    describe("userContext validation", () => {
      it.each([
        { value: "staging", shouldThrow: false },
        { value: "123", shouldThrow: false },
        { value: "production1", shouldThrow: false },
        { value: "test2", shouldThrow: false },
        { value: "prod-portals", shouldThrow: false },
        { value: "staging_v2", shouldThrow: false },
        { value: "staging test", shouldThrow: true },
        { value: "staging!", shouldThrow: true },
        { value: "staging.test", shouldThrow: true },
        { value: "staging@test", shouldThrow: true },
        { value: "staging+test@rocketflag.com", shouldThrow: true },
      ])("should handle env value: $value", async ({ value, shouldThrow }) => {
        const client = createRocketflagClient();

        if (shouldThrow) {
          await expect(client.getFlag(flagId, { env: value })).rejects.toThrow(
            `env values may only contain letters, numbers, hyphens and underscores. Invalid value for env: ${value}`,
          );
        } else {
          const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
          (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
          await expect(client.getFlag(flagId, { env: value })).resolves.toEqual(mockFlag);
        }
      });
    });

    describe("targeting key and audience attributes", () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };

      it("sends the targeting key and every attribute as query parameters", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient();
        await client.getFlag(flagId, { targetingKey: "user-42", plan: "pro", country: "AU", seats: 5, beta: true });

        const url = (fetch as jest.Mock).mock.calls[0][0] as URL;
        expect(Object.fromEntries(url.searchParams)).toEqual({
          targetingKey: "user-42",
          plan: "pro",
          country: "AU",
          seats: "5",
          beta: "true",
        });
      });

      it("accepts a context built as a variable", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient();
        const context = { plan: "pro", country: "AU" };
        await expect(client.getFlag(flagId, context)).resolves.toEqual(mockFlag);
      });

      it("rejects values the API cannot take at compile time", () => {
        const user: { id: string; plan?: string } = { id: "user-42" };
        const contexts: UserContext[] = [
          // @ts-expect-error an attribute that may be undefined must be left out instead
          { plan: user.plan },
          // @ts-expect-error env is a string
          { env: 5 },
          // @ts-expect-error targetingKey is a string or number
          { targetingKey: true },
          // @ts-expect-error context values are flat
          { plan: { tier: "pro" } },
        ];
        expect(contexts).toHaveLength(4);
      });

      it("accepts contexts declared with a type alias, and interfaces once spread", () => {
        type AliasContext = { cohort: string; plan: string };
        interface InterfaceContext {
          cohort: string;
          plan: string;
        }
        const alias: AliasContext = { cohort: "beta", plan: "pro" };
        const iface: InterfaceContext = { cohort: "beta", plan: "pro" };
        const fromAlias: UserContext = alias;
        const fromSpread: UserContext = { ...iface };
        // @ts-expect-error interfaces have no implicit index signature
        const fromInterface: UserContext = iface;
        expect([fromAlias, fromSpread, fromInterface]).toHaveLength(3);
      });

      it("throws for an undefined value passed from JavaScript", async () => {
        const client = createRocketflagClient();
        await expect(client.getFlag(flagId, { plan: undefined } as unknown as UserContext)).rejects.toThrow(
          "userContext values must be of type string, number, or boolean. Invalid value for key: plan",
        );
        expect(fetch).not.toHaveBeenCalled();
      });
    });

    it("should throw an error if env in userContext contains invalid values", async () => {
      const client = createRocketflagClient();
      const invalidUserContext = { env: { a: 1 } };
      await expect(client.getFlag(flagId, invalidUserContext as unknown as UserContext)).rejects.toThrow(
        "userContext values must be of type string, number, or boolean. Invalid value for key: env",
      );
    });

    it("should throw an APIError on non-ok response with correct status and statusText", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Flag Not Found",
      });
      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow(APIError);
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("API request failed with status 404");

      try {
        await client.getFlag(flagId, userContext);
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        if (error instanceof APIError) {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe("Flag Not Found");
        }
      }
    });

    it("should handle invalid responses from the server", async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ invalid: "response" }) });

      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Invalid response from server");
    });

    it("should handle errors during the fetch request", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Network error");
    });

    it("should throw an error if flagId is empty", async () => {
      const client = createRocketflagClient();
      await expect(client.getFlag("", userContext)).rejects.toThrow("flagId is required");
    });

    it("should throw an error if flagId is not a string", async () => {
      const client = createRocketflagClient();
      await expect(client.getFlag(123 as unknown as string, userContext)).rejects.toThrow("flagId must be a string");
    });

    it("should throw an error if userContext contains invalid values", async () => {
      const client = createRocketflagClient();
      const invalidUserContext = { cohort: { a: 1 } };
      await expect(client.getFlag(flagId, invalidUserContext as unknown as UserContext)).rejects.toThrow(
        "userContext values must be of type string, number, or boolean. Invalid value for key: cohort",
      );
    });

    it("should throw a NetworkError on network error", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Some network error"));
      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow(NetworkError);
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Some network error");
    });

    it("should throw an InvalidResponseError on invalid JSON response", async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.reject(new Error("Syntax error")) });
      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow(InvalidResponseError);
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Failed to parse JSON response");
    });

    it("should throw an InvalidResponseError if response is not an object", async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve("not an object") });
      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow(InvalidResponseError);
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Invalid response format: response is not an object");
    });

    describe("caching", () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };

      it("does not cache when no TTL is configured", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient();
        await client.getFlag(flagId);
        await client.getFlag(flagId);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("returns a cached value within the default TTL", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60 });
        const first = await client.getFlag(flagId, { cohort: "beta" });
        const second = await client.getFlag(flagId, { cohort: "beta" });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
      });

      it("refetches after the TTL elapses", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        jest.useFakeTimers();
        try {
          const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 1 });
          await client.getFlag(flagId);
          jest.setSystemTime(Date.now() + 1_500);
          (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
          await client.getFlag(flagId);
          expect(fetch).toHaveBeenCalledTimes(2);
        } finally {
          jest.useRealTimers();
        }
      });

      it("keys cache entries by user context", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60 });
        await client.getFlag(flagId, { cohort: "alpha" });
        await client.getFlag(flagId, { cohort: "beta" });
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("allows per-call TTL override to disable caching", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60 });
        await client.getFlag(flagId, {}, { ttlSeconds: 0 });
        await client.getFlag(flagId, {}, { ttlSeconds: 0 });
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("allows per-call TTL to enable caching without a client default", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient();
        await client.getFlag(flagId, {}, { ttlSeconds: 60 });
        await client.getFlag(flagId, {}, { ttlSeconds: 60 });
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("evicts the least recently used entry when the cache is full", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60, maxEntries: 2 });
        await client.getFlag(flagId, { targetingKey: "a" });
        await client.getFlag(flagId, { targetingKey: "b" });
        await client.getFlag(flagId, { targetingKey: "a" }); // hit, so "b" is now least recently used
        expect(fetch).toHaveBeenCalledTimes(2);

        await client.getFlag(flagId, { targetingKey: "c" }); // evicts "b"
        await client.getFlag(flagId, { targetingKey: "a" });
        expect(fetch).toHaveBeenCalledTimes(3);

        await client.getFlag(flagId, { targetingKey: "b" });
        expect(fetch).toHaveBeenCalledTimes(4);
      });

      it("caps the cache at 10,000 entries by default", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60 });
        for (let i = 0; i <= 10_000; i++) {
          await client.getFlag(flagId, { targetingKey: `user-${i}` });
        }
        expect(fetch).toHaveBeenCalledTimes(10_001);

        await client.getFlag(flagId, { targetingKey: "user-10000" });
        expect(fetch).toHaveBeenCalledTimes(10_001);
        await client.getFlag(flagId, { targetingKey: "user-0" });
        expect(fetch).toHaveBeenCalledTimes(10_002);
      });

      it.each([0, -1, 1.5, Number.NaN])("rejects maxEntries of %p", (maxEntries) => {
        expect(() => createRocketflagClient(undefined, undefined, { ttlSeconds: 60, maxEntries })).toThrow(
          "maxEntries must be a positive integer",
        );
      });

      it("isolates cached values from caller mutation", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...mockFlag }) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 60 });
        const first = await client.getFlag(flagId);
        first.name = "mutated";
        const second = await client.getFlag(flagId);
        expect(second.name).toBe(mockFlag.name);
        expect(fetch).toHaveBeenCalledTimes(1);
      });
    });

    it("should throw an InvalidResponseError if validateFlag fails", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "Test Flag",
            enabled: true,
            // id: flagId, // Missing ID to make it fail validation
          }),
      });
      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow(InvalidResponseError);
    });
  });
});
