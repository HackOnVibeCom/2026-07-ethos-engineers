import "./globals.css";
import Link from "next/link";

const title = "LaunchCopilot — promotion kit for your new app";
const description =
  "Turn basic info about your newly launched mobile app into channel-aware ASO copy, social posts, a Product Hunt pitch, a Reddit post, and a 7-day promotion plan.";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title,
  description,
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚀</text></svg>",
  },
  openGraph: {
    title,
    description,
    siteName: "LaunchCopilot",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            🚀 LaunchCopilot
          </Link>
          <span className="tagline-sm">ship the app, we ship the launch</span>
          <Link href="/pricing" className="tagline-sm" style={{ marginLeft: "auto", color: "var(--accent)", textDecoration: "none" }}>
            Pricing
          </Link>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          LaunchCopilot · Your first launch kit is free · Pro ₹499/mo for
          unlimited apps, regeneration & tracking
        </footer>
      </body>
    </html>
  );
}
