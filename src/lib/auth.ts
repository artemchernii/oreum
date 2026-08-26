import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The data access layer. Every protected read goes through this rather than
 * trusting the Proxy redirect.
 *
 * The Proxy check is optimistic — it reads a cookie and runs before render, so
 * it is the wrong place to authorise anything. `getUser()` here revalidates
 * against the auth server, which is what makes the answer trustworthy.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/** For places that render differently when signed out rather than redirecting. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
