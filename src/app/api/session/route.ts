import { getUser } from "@/lib/auth";

/**
 * Whether the caller holds a session. Used by the "check your inbox" screen to
 * notice when sign-in completed in another tab.
 *
 * Deliberately returns nothing but a boolean — no id, no email. A polling
 * endpoint should not become a way to read the user record.
 */
export async function GET() {
  const user = await getUser();
  return Response.json({ signedIn: user !== null });
}
