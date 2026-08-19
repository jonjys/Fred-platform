import { redirect } from "next/navigation";

// Radar 06 is the main FRED OS chat surface. /core stays Architecture (01).
export default function Home() {
  redirect("/core/radar");
}
