import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TRACE — Public launch intelligence", template: "%s — TRACE" },
  description: "A source-led research tool for examining how public product launches are executed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><div className="site-shell"><SiteHeader /><main id="main">{children}</main><footer className="site-footer"><Link href="/" className="footer-brand">TRACE<span className="brand-dot">.</span></Link><p>Follow the evidence.</p><span className="eyebrow">Launch mechanics / Methodology 03</span></footer></div></body></html>;
}
