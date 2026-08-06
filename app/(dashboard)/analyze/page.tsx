import { CreateCompanyForm } from "@/components/analyzer/CreateCompanyForm";
import { PurchaseAnalyzerForm } from "@/components/analyzer/PurchaseAnalyzerForm";
import { listCompaniesForUser } from "@/lib/database/repositories/companies";
import { createSupabaseServerClient } from "@/lib/database/supabase/server";

export default async function AnalyzePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The (dashboard) layout already redirects to /login when unauthenticated.
  const companies = user ? await listCompaniesForUser(supabase, user.id) : [];

  if (companies.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Analyze</h1>
          <p className="text-muted-foreground">One more step before your first analysis.</p>
        </div>
        <CreateCompanyForm />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Analyze</h1>
        <p className="text-muted-foreground">Should you BUY, NEGOTIATE, or REJECT?</p>
      </div>
      <PurchaseAnalyzerForm
        companies={companies.map((company) => ({ id: company.id, companyName: company.company_name }))}
      />
    </div>
  );
}
