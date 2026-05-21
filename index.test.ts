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
        { value: "staging test", shouldThrow: true },
        { value: "staging-test", shouldThrow: true },
        { value: "staging!", shouldThrow: true },
        { value: "staging@test", shouldThrow: true },
        { value: "staging+test@rocketflag.com", shouldThrow: true },
      ])("should handle env value: $value", async ({ value, shouldThrow }) => {
        const client = createRocketflagClient();

        if (shouldThrow) {
          await expect(client.getFlag(flagId, { env: value })).rejects.toThrow(
            "env values must be alphanumeric. Invalid value for env: env",
          );
        } else {
          const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
          (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
          await expect(client.getFlag(flagId, { env: value })).resolves.toEqual(mockFlag);
        }
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

      it("returns a cached value within the default TTL (ttlMinutes)", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlMinutes: 1 });
        const first = await client.getFlag(flagId, { cohort: "beta" });
        const second = await client.getFlag(flagId, { cohort: "beta" });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
      });

      it("returns a cached value within the default TTL (ttlSeconds)", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlSeconds: 30 });
        await client.getFlag(flagId);
        await client.getFlag(flagId);
        expect(fetch).toHaveBeenCalledTimes(1);
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
        const client = createRocketflagClient(undefined, undefined, { ttlMinutes: 1 });
        await client.getFlag(flagId, { cohort: "alpha" });
        await client.getFlag(flagId, { cohort: "beta" });
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("allows per-call TTL override to disable caching", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient(undefined, undefined, { ttlMinutes: 1 });
        await client.getFlag(flagId, {}, { ttlSeconds: 0 });
        await client.getFlag(flagId, {}, { ttlSeconds: 0 });
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("allows per-call TTL to enable caching without a client default", async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });
        const client = createRocketflagClient();
        await client.getFlag(flagId, {}, { ttlMinutes: 1 });
        await client.getFlag(flagId, {}, { ttlMinutes: 1 });
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("throws if both ttlSeconds and ttlMinutes are set on client", () => {
        expect(() =>
          createRocketflagClient(undefined, undefined, { ttlSeconds: 30, ttlMinutes: 1 }),
        ).toThrow("client cache options cannot specify both ttlSeconds and ttlMinutes");
      });

      it("throws if both ttlSeconds and ttlMinutes are set per call", async () => {
        const client = createRocketflagClient();
        await expect(client.getFlag(flagId, {}, { ttlSeconds: 30, ttlMinutes: 1 })).rejects.toThrow(
          "call cache options cannot specify both ttlSeconds and ttlMinutes",
        );
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
