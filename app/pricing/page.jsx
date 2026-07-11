import { supabase } from "@/lib/supabase";
import { getAccount, getAppCount, PRO_PRICE_INR } from "@/lib/account";
import UpgradeButton from "@/components/UpgradeButton";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  let plan = "free";
  let appCount = 0;
  try {
    const db = supabase();
    const account = await getAccount(db);
    plan = account.plan;
    appCount = await getAppCount(db);
  } catch {
    // unconfigured env — render the page anyway
  }

  return (
    <div>
      <h1>Pricing</h1>
      <p className="lede">
        Your first launch is on us. Pay when LaunchCopilot becomes part of how
        you ship.
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>Free</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "4px 0" }}>₹0</p>
          <p className="hint">The launch moment, covered.</p>
          <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
            <li>1 complete launch kit (1 app)</li>
            <li>All 5 channels + conventions shown</li>
            <li>7-day promotion plan</li>
            <li>Channel tracking + 1 AI optimization</li>
            <li>Public share page</li>
          </ul>
          {plan === "free" && (
            <p className="hint">
              Current plan — {appCount === 0 ? "your free kit is unused" : "your free kit is used"}.
            </p>
          )}
        </div>

        <div className="card pro-card">
          <span className="pro-flag">Recommended</span>
          <h3>Pro</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "4px 0" }}>
            ₹{PRO_PRICE_INR}
            <span style={{ fontSize: 14, color: "var(--muted)" }}>/month</span>
          </p>
          <p className="hint">For devs who keep shipping.</p>
          <ul style={{ paddingLeft: 18, lineHeight: 2 }}>
            <li>Unlimited apps and launch kits</li>
            <li>Regenerate copy as your app evolves</li>
            <li>Unlimited data-driven optimizations</li>
            <li>Multi-app tracking dashboard</li>
            <li>Coming: HN + Shorts scripts, press kit</li>
          </ul>
          <UpgradeButton plan={plan} />
        </div>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        Less than one hour of a freelance copywriter, every month, for every
        channel of every launch. Cancel anytime.
      </p>
    </div>
  );
}
