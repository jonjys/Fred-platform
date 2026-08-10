import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground">
        Placeholder — the AI Wallet (company profile) editor for the <code>companies</code> table. UI is a later
        milestone.
      </p>
      <p>
        <Link href="/settings/billing" className="text-sm underline underline-offset-4">
          Billing &amp; usage →
        </Link>
      </p>
    </div>
  );
}
