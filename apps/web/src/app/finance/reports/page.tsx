import { redirect } from "next/navigation";

export default function FinanceReportsPage() {
  redirect("/reports?tab=profit-loss");
}
