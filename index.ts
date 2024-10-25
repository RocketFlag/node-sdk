import { validateFlag } from "./validateFlag";

export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

interface UserContext {
  [key: string]: string | number | boolean;
}

const createRocketflagClient = (version = "v1", apiUrl = "https://rocketflag.web.app") => {
  const cache: { [key: string]: FlagStatus } = {};

  const getFlag = async (flagId: string, userContext: UserContext = {}): Promise<FlagStatus> => {
    if (cache[flagId]) {
      return cache[flagId];
    }

    const url = new URL(`${apiUrl}/${version}/flags/${flagId}`);
    Object.entries(userContext).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

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
  };

  return { getFlag };
};

export default createRocketflagClient;
