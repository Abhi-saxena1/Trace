"use client";

import { useState } from "react";
import { EmptyState } from "./editorial";
import Link from "next/link";
import type { Campaign, ContentItem } from "@/lib/research/types";

export function LaunchIndex({ campaigns, content }: { campaigns: Campaign[]; content: ContentItem[] }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("All sources");
  const filtered = Boolean(query.trim()) || platform !== "All sources";
  const visible = campaigns.filter(campaign => {
    const textMatches = `${campaign.company} ${campaign.product ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return textMatches && (platform === "All sources" || content.some(item => item.campaign_id === campaign.id && item.platform === platform));
  });
  return <section aria-label="Launch index">
    <div className="index-controls">
      <div className="search-field"><label htmlFor="launch-search" className="eyebrow">Search the index</label><input id="launch-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company or product…" /></div>
      <div className="filter-field"><label htmlFor="launch-platform" className="eyebrow">Source platform</label><select id="launch-platform" value={platform} onChange={e => setPlatform(e.target.value)}>{["All sources", "X", "LinkedIn"].map(value => <option key={value}>{value}</option>)}</select></div>
    </div>
    <div className="index-caption eyebrow"><span>Campaign / Portfolio month / Source coverage</span><span role="status">{visible.length} of {campaigns.length} campaigns</span></div>
    {filtered && <button className="text-link reset-button" onClick={() => { setQuery(""); setPlatform("All sources"); }}>Clear filters <span aria-hidden="true">↗</span></button>}
    {visible.length ? <ol className="campaign-index">{visible.map(campaign => <li key={campaign.id}>
      <div><Link href={`/launches/${campaign.id}`} className="campaign-title">{campaign.company} <span aria-hidden="true">↗</span></Link><p>Product: {campaign.product ?? "Not stated in source"}</p></div>
      <span className="eyebrow">{campaign.launch_date ?? "Date unknown"}</span>
      <div><p>{campaign.content_item_ids.length} source records</p><span className="eyebrow">{campaign.provenance.status === "source_verified" ? "Portfolio verified · excerpt coverage" : "Verification pending"}</span></div>
    </li>)}</ol> : <EmptyState label="No matches" title="No campaigns match these filters."><p>Try another company name or source platform.</p></EmptyState>}
  </section>;
}
