import Link from "next/link";
import type { ReactNode } from "react";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

export function PageIntro({ number, label, title, description }: { number: string; label: string; title: string; description: string }) {
  return <section className="page-intro"><p className="eyebrow accent">{number} / {label}</p><h1>{title}</h1><p className="intro-description">{description}</p></section>;
}

export function EmptyState({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">[ — ]</span><p className="eyebrow accent">{label}</p><h2>{title}</h2><div className="empty-description">{children}</div></div>;
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-link">{children}<Arrow /></Link>;
}
