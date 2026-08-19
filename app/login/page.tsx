import { redirect } from "next/navigation";
import { CORE_REQUIRES_AUTH } from "@/lib/core-apps/access";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

// While CORE_REQUIRES_AUTH is false there's nothing to sign in to gate
// access to, so /login just forwards into the product. The real
// magic-link flow (components/auth/MagicLinkForm.tsx) is untouched and
// starts rendering again the moment that flag flips back to true — it's
// gated, not deleted, so there's nothing to rebuild later.
export default function LoginPage() {
  if (!CORE_REQUIRES_AUTH) {
    redirect("/core");
  }
  return <MagicLinkForm />;
}
