/**
 * /api/analyze has `maxDuration = 60` — when Claude (or the pipeline as a
 * whole) takes longer than that, Vercel hard-kills the function mid-request.
 * The route's own catch block (which would set status: "failed") never runs
 * in that case, so the decision row is left at status: "processing"
 * permanently. This is a real, confirmed failure mode (seen in production
 * runtime logs), not a hypothetical.
 *
 * Rather than changing /api/analyze's pipeline logic, every place that
 * displays a decision's status treats "processing" for longer than this
 * threshold as stalled — a read-only, display-layer inference. The
 * threshold is comfortably past the 60s function ceiling to avoid flagging
 * a request that's merely still running normally.
 */
const STALLED_THRESHOLD_MS = 90_000;

export function isStalledProcessing(decision: { status: string; created_at: string }, now: Date = new Date()): boolean {
  if (decision.status !== "processing" && decision.status !== "draft") return false;
  return now.getTime() - new Date(decision.created_at).getTime() > STALLED_THRESHOLD_MS;
}
