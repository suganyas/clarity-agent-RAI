import type { TeamsSessionStatus } from "../domain/teams-session/types.js";

export interface TeamsSessionPort {
  getStatus(): Promise<TeamsSessionStatus>;
}
