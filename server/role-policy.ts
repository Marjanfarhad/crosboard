/** Role assignment for identity sync. Never accept a caller-supplied role. */
export function roleForIdentitySync(openId: string, ownerOpenId: string | undefined): "admin" | "user" {
  return ownerOpenId && openId === ownerOpenId ? "admin" : "user";
}
