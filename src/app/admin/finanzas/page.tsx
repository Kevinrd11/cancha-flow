import { redirect } from "next/navigation";
import { FinanceDashboard } from "@/components/admin/finance/finance-dashboard";
import { requireFinance } from "@/lib/admin-auth";
import { getBusinessLocale } from "@/lib/business-data";
import { getFinanceOverview, getFinanceTransactions } from "@/lib/finance-data";
import { parseFinanceFilters } from "@/lib/finance/validation";

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // El proxy ya bloquea la ruta para el personal operativo; esto es la segunda
  // barrera, por si alguien llega a la página sin pasar por él.
  const auth = await requireFinance();
  if (!auth) redirect("/admin?error=insufficient_role");

  const filters = parseFinanceFilters(await searchParams);
  const { currency, timezone } = await getBusinessLocale();
  const [overview, page] = await Promise.all([
    getFinanceOverview(filters, timezone),
    getFinanceTransactions(filters, filters.page, timezone),
  ]);

  return <FinanceDashboard overview={overview} page={page} filters={filters} currency={currency} />;
}
