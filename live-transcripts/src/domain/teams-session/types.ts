export interface TeamsSessionStatus {
  cdpReachable: boolean;
  teamsTabFound: boolean;
  meetingActive: boolean;
  cdpEndpoint?: string;
  cdpEndpointSource?: "default" | "env" | "flag";
  tabTitle?: string;
  tabUrl?: string;
  diagnostics?: Record<string, unknown>;
}
