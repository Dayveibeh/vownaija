import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { Brand } from "@/app/components/Brand";
import { SessionAccountNav } from "@/app/components/SessionAccountNav";
import { getShortlist } from "@/lib/ai/store";
import "./shortlist.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your SmittenAI shortlist | Smitten", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ShortlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shortlist = await getShortlist(id);
  if (!shortlist) notFound();
  return <div className="ai-shortlist">
    <header className="ai-shortlist-nav"><Brand /><nav aria-label="Main navigation">
      <Link href="/#featured">Find vendors</Link><Link href="/couples/dashboard">Your workspace</Link>
      <SessionAccountNav />
    </nav></header>
    <main>
      <div className="ai-shortlist-intro">
        <span className="ai-shortlist-eyebrow"><Sparkles size={17} aria-hidden="true" /> From your WhatsApp conversation</span>
        <h1>{shortlist.title}</h1>
        <p>A little closer to finding your people. View a Smitten profile or explore the original web source.</p>
        <span className="ai-shortlist-date">Sourced {new Date(shortlist.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} · Saved for 30 days</span>
      </div>
      <div className="ai-shortlist-grid">
        {shortlist.recommendations.map(item => <article className="ai-shortlist-card" key={item.url}>
          <span className={`ai-shortlist-badge ${item.kind === "web" ? "ai-shortlist-web" : ""}`}>
            {item.kind === "smitten" ? "Listed on Smitten" : "Found on the web"}
          </span>
          <h2>{item.name}</h2><p className="ai-shortlist-service">{item.service}</p>
          <p className="ai-shortlist-location"><MapPin size={16} aria-hidden="true" />{item.location}</p>
          <p className="ai-shortlist-reason">{item.reason}</p>
          <p className="ai-shortlist-price">{item.startingPrice === null ? "Ask the vendor for current pricing" : `Listed from ₦${item.startingPrice.toLocaleString("en-NG")}`}</p>
          {item.kind === "smitten" ? <Link className="ai-shortlist-button" href={item.url}>View vendor profile <ArrowUpRight size={18} aria-hidden="true" /></Link>
            : <><a className="ai-shortlist-button" href={item.url} target="_blank" rel="noopener noreferrer">View original source <ExternalLink size={16} aria-hidden="true" /></a>
              <span className="ai-shortlist-source">Source: {item.sourceTitle}</span></>}
        </article>)}
      </div>
      <aside className="ai-shortlist-note"><strong>Made with SmittenAI</strong>
        <p>Recommendations are based on the sources found for your request. Confirm the service, price and availability with the vendor. Web results are external businesses and are not verified Smitten listings.</p>
        <p>Want a different area, style or budget? Reply to SmittenAI on WhatsApp to refine your search.</p>
      </aside>
      <Link className="ai-shortlist-more" href="/#featured">Discover more vendors on Smitten <ArrowUpRight size={18} aria-hidden="true" /></Link>
    </main>
  </div>;
}
