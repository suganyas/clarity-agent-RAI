import { describe, expect, it } from "vitest";
import { createRedactedDiagnostic } from "../../src/adapters/security/diagnostics.js";
import { redactValue } from "../../src/adapters/security/redaction.js";

describe("redaction", () => {
  it("redacts authorization, cookie, token, and secret-like values", () => {
    const value = {
      authorization: "Bearer abc.def.ghi",
      cookie: "sessionid=secret",
      url: "https://teams.example/path?token=abc&safe=ok",
      nested: { accessToken: "abc123", message: "hello" },
    };

    expect(redactValue(value)).toEqual({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      url: "https://teams.example/path?token=%5BREDACTED%5D&safe=ok",
      nested: { accessToken: "[REDACTED]", message: "hello" },
    });
  });

  it("redacts long raw payload snippets", () => {
    expect(redactValue("this looks like a very long transcript payload that should not be emitted")).toBe(
      "[REDACTED_TEXT]",
    );
  });

  it("creates adapter diagnostics with redacted details only", () => {
    expect(
      createRedactedDiagnostic("cdp-connect", {
        endpoint: "http://127.0.0.1:9222",
        authorization: "Bearer secret",
      }),
    ).toEqual({
      source: "cdp-connect",
      details: {
        endpoint: "http://127.0.0.1:9222",
        authorization: "[REDACTED]",
      },
    });
  });
});
