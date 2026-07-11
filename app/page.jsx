import Link from "next/link";
import IntakeForm from "@/components/IntakeForm";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getRecentApps() {
  try {
    const { data } = await supabase()
      .from("apps")
      .select("id, name, category, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return { apps: data ?? [], error: null };
  } catch (e) {
    return { apps: [], error: e.message };
  }
}

export default async function HomePage() {
  const { apps, error } = await getRecentApps();

  return (
    <div>
      <h1>You shipped the app. Now ship the launch.</h1>
      <p className="lede">
        Tell LaunchCopilot about your newly launched mobile app and get a full
        promotion kit: App Store ASO copy, launch posts for X and LinkedIn, a
        Product Hunt pitch, a Reddit post that won&apos;t get you banned — and
        a 7-day promotion plan. Every asset written for that platform&apos;s
        real conventions, not one generic blurb.
      </p>

      {error && (
        <div className="error-box">
          Setup needed: {error} — see README.md for the 5-minute setup.
        </div>
      )}

      <div className="steps">
        <div className="step">
          <span className="step-num">1</span>
          <strong>Describe your app</strong>
          <span className="hint">20 seconds of info you already know.</span>
        </div>
        <div className="step">
          <span className="step-num">2</span>
          <strong>Get 5 platform-native assets</strong>
          <span className="hint">ASO, X, LinkedIn, Product Hunt, Reddit — plus a 7-day plan.</span>
        </div>
        <div className="step">
          <span className="step-num">3</span>
          <strong>Track & let AI iterate</strong>
          <span className="hint">Log results; the weakest copy gets rewritten from your data.</span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create your launch kit</h2>
        <IntakeForm />
      </div>

      {apps.length > 0 && (
        <div className="card subtle">
          <h2 style={{ marginTop: 0 }}>Recent apps</h2>
          {apps.map((a) => (
            <div className="app-list-item" key={a.id}>
              <Link href={`/app/${a.id}`}>{a.name}</Link>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="hint">
                  {a.created_at ? String(a.created_at).slice(0, 10) : ""}
                </span>
                <span className="badge">{a.category}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
