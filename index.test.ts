import createRocketflagClient from "./index";
import { FlagStatus } from "./index";

// Mock the global fetch function
global.fetch = jest.fn() as jest.Mock<Promise<Response>>;

describe("createRocketflagClient", () => {
  const apiUrl = "https://api.rocketflag.app";
  const flagId = "test-flag";
  const userContext = { userId: "user123" };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(jest.fn());
  });

  it("should create a client with default options", () => {
    const client = createRocketflagClient();
    expect(client).toBeDefined();
    expect(client.getFlag).toBeDefined();
    expect(client.getFlag).toBeInstanceOf(Function);
  });

  it("should create a client with custom options", () => {
    const client = createRocketflagClient("v2", "https://example.com/api");
    expect(client).toBeDefined();
    expect(client.getFlag).toBeDefined();
    expect(client.getFlag).toBeInstanceOf(Function);
  });

  describe("getFlag", () => {
    it("should fetch and cache a flag", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, userContext);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(new URL(`${apiUrl}/v1/flags/${flagId}?userId=${userContext.userId}`), { method: "GET" });
      expect(flag).toEqual(mockFlag);

      // Fetch again to test caching
      const cachedFlag = await client.getFlag(flagId, userContext);
      expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(cachedFlag).toEqual(mockFlag);
    });

    it("should handle non-ok responses from the server", async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: false, statusText: "Not Found" });

      const client = createRocketflagClient();
      await expect(client.getFlag(flagId, userContext)).rejects.toThrow("Not Found");
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
  });
});
