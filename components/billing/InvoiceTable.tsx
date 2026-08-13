import type { InvoiceSummary } from "@/lib/billing/stripeDetails";
import { cn, formatCurrency } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  paid: "Betald",
  open: "Öppen",
  void: "Makulerad",
  uncollectible: "Ej indrivningsbar",
  draft: "Utkast",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}

/** Last 12 invoices as a row list, each linking out to Stripe's hosted
 * invoice page (the actual PDF/receipt lives there — we only mirror the
 * summary, never store or regenerate invoice documents ourselves). */
export function InvoiceTable({ invoices }: { invoices: InvoiceSummary[] }) {
  if (invoices.length === 0) {
    return <p className="text-sm text-zinc-500">Inga fakturor ännu.</p>;
  }

  return (
    <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
      {invoices.map((invoice) => {
        const statusLabel = invoice.status ? (STATUS_LABEL[invoice.status] ?? invoice.status) : "—";

        return (
          <a
            key={invoice.id}
            href={invoice.hostedInvoiceUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors",
              invoice.hostedInvoiceUrl ? "hover:bg-zinc-800/60" : "pointer-events-none",
            )}
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-zinc-50">{invoice.number ?? invoice.id}</p>
              <p className="text-xs text-zinc-500">{formatDate(invoice.created)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-zinc-300">
                {formatCurrency(invoice.amountPaid / 100, invoice.currency.toUpperCase())}
              </span>
              <span className="text-xs text-zinc-500">{statusLabel}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
