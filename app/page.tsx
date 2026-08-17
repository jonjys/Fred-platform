import { redirect } from "next/navigation";

// /core is an experimental 4-file shell (hardcoded "Inloggad som owner",
// no link to History/Billing) — not ready for production traffic. The
// real app lives at /dashboard; its own layout already redirects to
// /login when unauthenticated, so this can unconditionally point there.
export default function Home() {
  redirect("/dashboard");
}
