export type FlagStatus = {
  name: string;
  enabled: boolean;
  id: string;
};

export interface UserContext {
  [key: string]: string | number | boolean;
}
