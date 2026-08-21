import { redirect } from "next/navigation";

// Radar 06 is the main FRED OS chat surface. Architecture (01) stays at /core.
export default function Home() {
  redirect("/core/radar");
}
