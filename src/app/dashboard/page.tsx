import { redirect } from "next/navigation";

// Documents moved to their own page. Keep old links working.
export default function DashboardIndex() {
  redirect("/documents");
}
