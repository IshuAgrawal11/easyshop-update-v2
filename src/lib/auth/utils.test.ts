import { describe, expect, it } from "vitest";
import { generateToken, verifyToken } from "./utils";

describe("JWT sign/verify round-trip", () => {
  it("produces a token that verifies back to the same payload", async () => {
    const token = await generateToken({ userId: "abc123", role: "user" });
    const payload = await verifyToken(token);
    expect(payload).toEqual({ userId: "abc123", role: "user" });
  });

  it("rejects a tampered token", async () => {
    const token = await generateToken({ userId: "abc123", role: "user" });
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifyToken(tampered)).toBeNull();
  });

  it("rejects garbage input without throwing", async () => {
    expect(await verifyToken("not-a-jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
  });
});
