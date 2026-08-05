/**
 * Prompt composition helpers shared across every Decision Module.
 *
 * Module-specific prompt *content* (what to explain, which JSON shape to
 * return) lives inside each module — e.g.
 * lib/decision-engine/modules/purchase-analysis/prompt.ts. What lives here
 * is only the platform-wide framing that every module's prompt should carry,
 * so it's defined once instead of copy-pasted into every module.
 */

export const PLATFORM_DISCLAIMER =
  "This analysis is generated to support — not replace — human decision-making. " +
  "Flag when a contractual, legal, or tax question is beyond what can be assessed from the provided " +
  "materials, and recommend the user verify with qualified counsel before finalizing high-stakes agreements.";

/** Wraps a module's system prompt with platform-wide guardrails. Every
 * module's `buildPrompt` should have its system string passed through this
 * before being sent to Claude. */
export function withPlatformGuardrails(systemPrompt: string): string {
  return `${systemPrompt}\n\n${PLATFORM_DISCLAIMER}`;
}
