import createRocketflagClient from "./index";
import { FlagStatus } from "./index";

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

  describe("getFlag", () => {
    it("should fetch a flag", async () => {
      const mockFlag: FlagStatus = { name: "Test Flag", enabled: true, id: flagId };
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFlag) });

      const client = createRocketflagClient();
      const flag = await client.getFlag(flagId, userContext);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(new URL(`${apiUrl}/v1/flags/${flagId}?cohort=${userContext.cohort}`), { method: "GET" });
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
