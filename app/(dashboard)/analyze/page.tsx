import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { AnalyzeModulePicker } from "@/components/analyzer/AnalyzeModulePicker";
import { CreateCompanyForm } from "@/components/analyzer/CreateCompanyForm";
import { listCompaniesForUser, type CompanyRow } from "@/lib/database/repositories/companies";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

async function loadCompanies(): Promise<{ companies: CompanyRow[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // The (dashboard) layout already redirects to /login when unauthenticated.
    if (!user) return { companies: [], error: null };

    const companies = await listCompaniesForUser(supabase, user.id);
    return { companies, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load companies for the analyze page.", error);
    return { companies: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function AnalyzePage() {
  const { companies, error } = await loadCompanies();

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Analyze</h1>
        <ConfigErrorNotice title="Couldn't load your companies" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analyze</h1>
          <p className="text-muted-foreground">One more step before your first analysis.</p>
        </div>
        <CreateCompanyForm />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze</h1>
        <p className="text-muted-foreground">Should you BUY, NEGOTIATE, or REJECT?</p>
      </div>
      <Suspense fallback={<div className="max-w-2xl animate-pulse text-sm text-muted-foreground">Loading…</div>}>
        <AnalyzeModulePicker
          companies={companies.map((company) => ({ id: company.id, companyName: company.company_name }))}
        />
      </Suspense>
    </div>
  );
}
