/** Use only the signup response; never look up users or expose an email directory. */
export function isExistingSignup(result: {
  error: { code?: string; message?: string } | null;
  data: { user: { identities?: unknown[] } | null };
}): boolean {
  if (result.error) {
    return result.error.code === "user_already_exists" ||
      result.error.code === "email_exists" ||
      /already registered|already been registered|already exists/i.test(result.error.message ?? "");
  }
  return result.data.user?.identities?.length === 0;
}