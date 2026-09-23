import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Mail, MapPin, MessageSquare } from "lucide-react";
import type { ConversationSummary } from "@/lib/messaging";
import { Brand } from "./Brand";
import { SessionAccountNav } from "./SessionAccountNav";

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  const days = Math.floor(hours / 24);
  return days + "d";
}

export function ConversationList({
  conversations,
  role,
  mode = "messages",
}: {
  conversations: ConversationSummary[];
  role: "couple" | "vendor" | "admin";
  mode?: "messages" | "enquiries";
}) {
  const isVendor = role !== "couple";
  const backHref = isVendor ? "/dashboard" : "/couples/dashboard";
  const title = mode === "enquiries" ? "Enquiries" : "Messages";
  const intro = mode === "enquiries"
    ? "Real couples who have asked about your services. Open an enquiry to reply and keep the conversation moving."
    : "Every vendor conversation in one place, synced to your Smitten account.";

  return (
    <main className="phase2-list-page">
      <header className="phase2-list-topbar"><Brand /><Link href={backHref}><ArrowLeft size={16} /> Dashboard</Link><SessionAccountNav variant="compact" /></header>
      <section className="phase2-list-wrap">
        <div className="phase2-list-heading"><div><p className="eyebrow"><span /> {isVendor ? "Vendor workspace" : "My wedding"}</p><h1>{title}</h1><p>{intro}</p></div><div className="phase2-list-count"><MessageSquare /><strong>{conversations.length}</strong><span>{conversations.length === 1 ? "conversation" : "conversations"}</span></div></div>

        {conversations.length === 0 ? <section className="phase2-empty"><span><Mail /></span><h2>{mode === "enquiries" ? "No enquiries yet" : "Your inbox is ready"}</h2><p>{isVendor ? "When a couple sends an enquiry from your Smitten profile, it will appear here." : "Start with a vendor profile and send an enquiry. Replies will appear here."}</p><Link href={isVendor ? "/" : "/"} className="button button-primary">{isVendor ? "View marketplace" : "Find vendors"} <ArrowRight size={16} /></Link></section>
          : <div className={mode === "enquiries" ? "phase2-enquiry-grid" : "phase2-conversation-list"}>
            {conversations.map((item) => {
              const person = isVendor ? item.customerName : item.vendorName;
              const initials = person.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
              return <Link href={`/messages/${item.id}`} className="phase2-conversation-card" key={item.id}>
                <div className="phase2-person"><span>{initials}</span><div><strong>{person}</strong><small>{item.requestedService || "Wedding enquiry"}</small></div>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</div>
                {mode === "enquiries" && <div className="phase2-enquiry-meta"><span><CalendarDays size={14} /> {item.weddingDate || "Date flexible"}</span><span><MapPin size={14} /> {item.weddingLocation}</span>{item.budgetBand && <span>{item.budgetBand}</span>}</div>}
                <p>{item.lastMessage || "Open the conversation"}</p>
                <footer><span className={item.status === "new" ? "new" : ""}>{item.status === "new" ? "New enquiry" : "Active"}</span><time>{relativeTime(item.lastMessageAt)}</time><ArrowRight size={16} /></footer>
              </Link>;
            })}
          </div>}
      </section>
    </main>
  );
}
