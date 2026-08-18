import { redirect } from "next/navigation";

// /core is a separate experimental hub (its own grid of app tiles) — not
// wired up as production traffic yet. The real app lives at /dashboard;
// its own layout already redirects to /login when unauthenticated, so
// this can unconditionally point there.
export default function Home() {
  redirect("/dashboard");
}
