import type { FlagStatus } from "./index.js";

export const validateFlag = (flag: object): flag is FlagStatus => {
  return (
    "name" in flag &&
    "enabled" in flag &&
    "id" in flag &&
    typeof flag.name === "string" &&
    typeof flag.enabled === "boolean" &&
    typeof flag.id === "string"
  );
};
