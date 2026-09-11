import { describe, expect, it } from "vitest";
import { runStatus } from "../../src/app/commands/status.js";
import type { TeamsSessionPort } from "../../src/ports/teams-session.js";

describe("runStatus", () => {
  it("returns JSON success for active meeting", async () => {
    const session = fakeSession({
      cdpReachable: true,
      teamsTabFound: true,
      meetingActive: true,
      cdpEndpoint: "http://127.0.0.1:9222",
      tabTitle: "Meeting | Microsoft Teams",
    });

    const result = await runStatus(session, { output: "json", command: "status" });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      ok: true,
      command: "status",
      data: { meetingActive: true, teamsTabFound: true },
    });
    expect(result.stderr).toBeUndefined();
  });

  it("returns human success for inactive meeting", async () => {
    const result = await runStatus(
      fakeSession({ cdpReachable: true, teamsTabFound: true, meetingActive: false }),
      { output: "human", command: "status" },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Teams tab found: yes");
    expect(result.stdout).toContain("Meeting active: no");
  });

  it("maps CDP unavailable to structured JSON error", async () => {
    const result = await runStatus(
      fakeSession({ cdpReachable: false, teamsTabFound: false, meetingActive: false }),
      { output: "json", command: "status" },
    );

    expect(result.exitCode).toBe(10);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      ok: false,
      error: { code: "CDP_UNREACHABLE" },
    });
  });

  it("maps missing Teams tab to human error", async () => {
    const result = await runStatus(
      fakeSession({ cdpReachable: true, teamsTabFound: false, meetingActive: false }),
      { output: "human", command: "status" },
    );

    expect(result.exitCode).toBe(11);
    expect(result.stderr).toBe("No Teams tab found\n");
    expect(result.stdout).toBeUndefined();
  });
});

function fakeSession(status: Awaited<ReturnType<TeamsSessionPort["getStatus"]>>): TeamsSessionPort {
  return {
    async getStatus() {
      return status;
    },
  };
}
