import { describe, expect, it } from "vitest";
import { isExistingSignup } from "./auth-result";

describe("Existing-account signup detection", () => {
  it("rejects an obfuscated existing account with no identities", () => {
    expect(isExistingSignup({ error: null, data: { user: { identities: [] } } })).toBe(true);
  });
  it("rejects the explicit existing-user response", () => {
    expect(isExistingSignup({ error: { code: "user_already_exists" }, data: { user: null } })).toBe(true);
  });
  it("accepts a new email identity awaiting confirmation", () => {
    expect(isExistingSignup({ error: null, data: { user: { identities: [{ provider: "email" }] } } })).toBe(false);
  });
  it("does not mistake a rate limit or missing user for an existing account", () => {
    expect(isExistingSignup({ error: { code: "over_email_send_rate_limit" }, data: { user: null } })).toBe(false);
    expect(isExistingSignup({ error: null, data: { user: null } })).toBe(false);
  });
});