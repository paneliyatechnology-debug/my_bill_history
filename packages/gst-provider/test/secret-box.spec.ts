import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadCredentialKeyRing, openSecret, redactSecrets, sealSecret } from "../src";

const key = randomBytes(32).toString("base64");
const nextKey = randomBytes(32).toString("base64");

describe("provider secret box", () => {
  it("seals and opens a sandbox secret and keeps production apart", () => {
    const ring = loadCredentialKeyRing({
      GST_CREDENTIALS_ENCRYPTION_KEY: key,
      GST_CREDENTIALS_KEY_ID: "v1",
    });
    const sealed = sealSecret("sandbox-password", ring.current!, "SANDBOX");
    expect(sealed).not.toContain("sandbox-password");
    expect(openSecret(sealed, ring, "SANDBOX")).toBe("sandbox-password");
    expect(() => openSecret(sealed, ring, "PRODUCTION")).toThrow(/cannot be opened/);
  });

  it("fails when the key is missing or invalid and rotates with the previous key", () => {
    expect(loadCredentialKeyRing({}).error).toMatch(/not configured/);
    expect(loadCredentialKeyRing({ GST_CREDENTIALS_ENCRYPTION_KEY: "YQ==" }).error).toMatch(/32 bytes/);
    const oldRing = loadCredentialKeyRing({
      GST_CREDENTIALS_ENCRYPTION_KEY: key,
      GST_CREDENTIALS_KEY_ID: "v1",
    });
    const sealed = sealSecret("rotated-secret", oldRing.current!, "SANDBOX");
    const rotated = loadCredentialKeyRing({
      GST_CREDENTIALS_ENCRYPTION_KEY: nextKey,
      GST_CREDENTIALS_KEY_ID: "v2",
      GST_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS: key,
      GST_CREDENTIALS_KEY_ID_PREVIOUS: "v1",
    });
    expect(openSecret(sealed, rotated, "SANDBOX")).toBe("rotated-secret");
    const wrong = loadCredentialKeyRing({
      GST_CREDENTIALS_ENCRYPTION_KEY: nextKey,
      GST_CREDENTIALS_KEY_ID: "v1",
    });
    expect(() => openSecret(sealed, wrong, "SANDBOX")).toThrow(/authentication/);
  });

  it("redacts secrets from text", () => {
    expect(redactSecrets("password=sandbox-password", ["sandbox-password"])).toBe("password=[REDACTED]");
  });
});
