import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { AnalyzeModulePicker } from "@/components/analyzer/AnalyzeModulePicker";
import { CreateCompanyForm } from "@/components/analyzer/CreateCompanyForm";
import { listCompaniesForUser, type CompanyRow } from "@/lib/database/repositories/companies";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";
import { getCoreApps } from "@/lib/core-apps/registry";
import { TooltipProvider } from "@/components/ui/tooltip";

async function loadCompanies(): Promise<{ companies: CompanyRow[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { companies: [], error: null };

    const companies = await listCompaniesForUser(supabase, user.id);
    return { companies, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load companies for the analyze page.", error);
    return { companies: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function loadCoreAppsSafe() {
  try {
    return getCoreApps();
  } catch (error) {
    console.error("getCoreApps() failed on /analyze", error);
    return [];
  }
}

export default async function AnalyzePage() {
  const [{ companies, error }] = await Promise.all([loadCompanies()]);
  loadCoreAppsSafe();

  if (error) {
    return (
      <TooltipProvider>
        <ConfigErrorNotice title="Kunde inte ladda dina företag" />
      </TooltipProvider>
    );
  }

  if (companies.length === 0) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <p className="text-sm text-zinc-400">Ett steg kvar innan din första analys.</p>
          <CreateCompanyForm />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <p className="text-sm text-zinc-400">Vad ska FRED analysera åt dig?</p>
        <Suspense fallback={<div className="max-w-2xl animate-pulse text-sm text-zinc-500">Laddar…</div>}>
          <AnalyzeModulePicker
            companies={companies.map((company) => ({ id: company.id, companyName: company.company_name }))}
          />
        </Suspense>
      </div>
    </TooltipProvider>
  );
}
