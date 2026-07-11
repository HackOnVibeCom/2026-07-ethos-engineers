import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function AppDashboardPage({ params }) {
  const { id } = await params;
  const db = supabase();

  const [{ data: app }, { data: assets }, { data: plan }, { data: entries }] =
    await Promise.all([
      db.from("apps").select("*").eq("id", id).single(),
      db.from("assets").select("*").eq("app_id", id),
      db.from("plans").select("*").eq("app_id", id).maybeSingle(),
      db
        .from("tracking_entries")
        .select("*")
        .eq("app_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!app) notFound();

  return (
    <Dashboard
      app={app}
      initialAssets={assets ?? []}
      initialPlan={plan?.days ?? null}
      initialEntries={entries ?? []}
    />
  );
}
