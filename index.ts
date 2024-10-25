import { FlagStatus, UserContext } from "./flags";
import { validateFlag } from "./validateFlag";

const createRocketflagClient = (version = "v1", apiUrl = "https://rocketflag.web.app") => {
  const cache: { [key: string]: FlagStatus } = {};

  const getFlag = async (flagId: string, userContext: UserContext = {}): Promise<FlagStatus | Error> => {
    if (cache[flagId]) {
      return cache[flagId];
    }

    const url = new URL(`${apiUrl}/${version}/flags/${flagId}`);
    Object.entries(userContext).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    try {
      const raw = await fetch(url, {
        method: "GET",
      });

      if (!raw.ok) throw new Error(raw.statusText);

      const response: unknown = await raw.json();

      if (!response) throw new Error("Invalid response from server");
      if (typeof response !== "object") throw new Error("Invalid response from server");
      if (!validateFlag(response)) throw new Error("Invalid response from server");

      cache[flagId] = response;
      return response;
    } catch (error) {
      console.error("Error fetching flag:", error);
      return error as Error;
    }
  };

  return { getFlag };
};

export default createRocketflagClient;
