import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { ConfigErrorNotice } from "@/components/dashboard/ConfigErrorNotice";
import { CreateCompanyForm } from "@/components/analyzer/CreateCompanyForm";
import { AddCompanySection } from "@/components/settings/AddCompanySection";
import { CompanyProfileForm } from "@/components/settings/CompanyProfileForm";
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
    console.error("Failed to load companies for the settings page.", error);
    return { companies: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export default async function SettingsPage() {
  const { companies, error } = await loadCompanies();

  if (error) {
    return <ConfigErrorNotice title="Kunde inte ladda dina företag" />;
  }

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-sm text-zinc-400">
        Företagsprofilen som varje analys använder för budget, moms och marginalkontroller.
      </p>

      {companies.length === 0 ? (
        <CreateCompanyForm />
      ) : (
        <>
          {companies.map((company) => (
            <CompanyProfileForm key={company.id} company={company} />
          ))}
          <AddCompanySection />
        </>
      )}

      <p>
        <Link href="/settings/billing" className="text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200">
          Fakturering och användning →
        </Link>
      </p>
    </div>
  );
}
