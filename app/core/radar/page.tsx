import { RadarChat } from "@/components/core/RadarChat";

export const dynamic = "force-dynamic";

/** Slot 06 — main FRED OS chat. Static route beats /core/[appName]. Public. */
export default function RadarPage() {
  return <RadarChat />;
}
