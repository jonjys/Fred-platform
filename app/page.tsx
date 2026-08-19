import { redirect } from "next/navigation";

// /core no longer requires a session (see lib/core-apps/access.ts), so the
// separate public-landing-page -> /login -> /core funnel is redundant —
// there's nothing left for a splash page to gate. Straight to the product.
export default function Home() {
  redirect("/core");
}
