'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download, AlertTriangle, CheckCircle2, Zap, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type BillingData = {
  isActive: boolean;
  used: number;
  limit: number;
  daysLeft: number | null;
  stripeCustomerId: string | null;
  paymentMethod: any;
  invoices: any[];
  trialCredits: number;
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetch('/api/billing')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="min-h-screen bg-[#0a0a0b] text-white p-6">Laddar...</div>;

  const usagePercent = Math.min(100, Math.round((data.used / data.limit) * 100));

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Prenumeration</h1>
          <p className="text-gray-400">Hantera din prenumeration, betalningsmetod och fakturor.</p>
        </div>

        {success === '1' && (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400 mb-6">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Prenumerationen är aktiverad — tack!
          </div>
        )}
        {canceled === '1' && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-[#141416] p-4 text-sm text-gray-400 mb-6">
            <XCircle className="h-5 w-5 shrink-0" />
            Kassan avbröts — inga ändringar gjordes.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-[#141416] border border-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-3">Nuvarande plan</div>
              
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold">{data.isActive ? 'Pro' : 'Trial'}</h2>
                {data.isActive && (
                  <div className="bg-[#7c3aed] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Pro
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold mb-1">{data.used}/{data.limit} analyser</div>
                <div className="text-sm text-gray-400">{data.daysLeft ? `${data.daysLeft} dagar kvar` : `${data.trialCredits} gratisanalyser kvar`}</div>
              </div>

              {data.isActive && (
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2">Användning denna månad</div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                    <div className="bg-[#7c3aed] h-2 rounded-full" style={{ width: `${usagePercent}%` }}></div>
                  </div>
                  <div className="text-xs text-gray-500">{data.used} använda av {data.limit} analyser</div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="text-sm font-semibold mb-3">Ingår i Pro</div>
                {[
                  'Realtidsanalys',
                  'Obegränsade integrationer', 
                  'Prioriterad support',
                  'Avancerade rapporter'
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {!data.isActive && (
                <button 
                  onClick={() => window.location.href = '/api/stripe/checkout'}
                  className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-3 rounded-lg transition-colors mb-2"
                >
                  Uppgradera plan
                </button>
              )}
              {data.stripeCustomerId && (
                <button 
                  onClick={() => window.location.href = '/api/stripe/portal'}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors text-sm"
                >
                  Hantera prenumeration
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {data.paymentMethod && (
              <div className="bg-[#141416] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Betalningsmetod</h3>
                  <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-400">Standard</span>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white px-3 py-2 rounded">
                    <CreditCard className="w-6 h-6 text-[#141416]" />
                  </div>
                  <div>
                    <div className="font-medium">{data.paymentMethod.brand} •••• {data.paymentMethod.last4}</div>
                    <div className="text-sm text-gray-400">Förfaller {data.paymentMethod.exp_month}/{data.paymentMethod.exp_year}</div>
                  </div>
                </div>
              </div>
            )}

            {data.daysLeft !== null && data.daysLeft < 7 && (
              <div className="bg-[#2a1a00] border border-[#7c2d12] rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#f59e0b] mb-1">
                      Prenumerationen upphör snart
                    </div>
                    <div className="text-sm text-[#fbbf24]">
                      För att undvika avbrott i tjänsten, förnya din prenumeration.
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/api/stripe/portal'}
                  className="bg-transparent border border-[#7c2d12] hover:bg-[#7c2d12]/20 text-[#f59e0b] px-6 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Förnya nu
                </button>
              </div>
            )}

            {data.invoices.length > 0 && (
              <div className="bg-[#141416] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Fakturor</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                        <th className="pb-3 font-medium">Faktura</th>
                        <th className="pb-3 font-medium">Datum</th>
                        <th className="pb-3 font-medium">Belopp</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-b border-gray-800/50">
                          <td className="py-4 text-sm">{inv.number}</td>
                          <td className="py-4 text-sm text-gray-400">{new Date(inv.created * 1000).toLocaleDateString('sv-SE')}</td>
                          <td className="py-4 text-sm">{inv.amount_paid / 100} kr</td>
                          <td className="py-4">
                            <span className="bg-[#065f46] text-[#6ee7b7] px-3 py-1 rounded-full text-xs font-medium">
                              Betald
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <a href={inv.invoice_pdf} target="_blank" className="text-[#7c3aed] hover:text-[#6d28d9] text-sm font-medium flex items-center gap-1 ml-auto">
                              Ladda ner <Download className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-4">Visar {data.invoices.length} fakturor</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}