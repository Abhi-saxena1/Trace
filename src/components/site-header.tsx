"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [["Research", "/"], ["Launches", "/launches"], ["Patterns", "/patterns"], ["Network", "/network"], ["Signal", "/signal"]];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-top">
        <Link href="/" className="wordmark" aria-label="TRACE home">TRACE<span className="brand-dot">.</span></Link>
        <span className="header-descriptor eyebrow">Public launch intelligence</span>
        <Link href="/ask" className="ask-link" aria-current={pathname === "/ask" ? "page" : undefined}>Ask the Dataset <span aria-hidden="true">↗</span></Link>
      </div>
      <nav aria-label="Main navigation" className="navigation">
        {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
        <span className="nav-note eyebrow">An ongoing investigation</span>
      </nav>
    </header>
  );
}
