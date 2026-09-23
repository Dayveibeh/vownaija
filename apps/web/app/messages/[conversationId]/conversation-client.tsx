"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Send, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ConversationDetail } from "@/lib/messaging";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function dateLabel(value: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T12:00:00"));
}

export default function ConversationClient({
  initialConversation,
  role,
}: {
  initialConversation: ConversationDetail;
  role: "couple" | "vendor" | "admin";
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const otherName = role === "couple" ? conversation.vendorName : conversation.customerName;
  const backHref = role === "couple" ? "/couples/messages" : "/dashboard/messages";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/conversations/${conversation.id}/messages`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((result) => {
          if (result?.conversation) setConversation(result.conversation);
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [conversation.id]);

  const meta = useMemo(() => [
    conversation.weddingDate ? { icon: CalendarDays, text: dateLabel(conversation.weddingDate) } : null,
    { icon: MapPin, text: conversation.weddingLocation },
  ].filter(Boolean) as Array<{ icon: typeof CalendarDays; text: string }>, [conversation.weddingDate, conversation.weddingLocation]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = body.trim();
    if (!message || sending) return;
    setError("");
    setSending(true);

    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Message failed");
      setBody("");
      const refreshed = await fetch(`/api/conversations/${conversation.id}/messages`, { cache: "no-store" });
      if (refreshed.ok) {
        const next = await refreshed.json();
        if (next?.conversation) setConversation(next.conversation);
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "We couldn’t send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="conversation-page">
      <header className="conversation-topbar">
        <Brand />
        <Link href={backHref} className="conversation-back"><ArrowLeft size={16} /> Inbox</Link>
        <SessionAccountNav variant="compact" />
      </header>

      <section className="conversation-shell">
        <aside className="conversation-summary">
          <p className="eyebrow"><span /> Wedding enquiry</p>
          <h1>{otherName}</h1>
          <div className="conversation-meta">
            {meta.map(({ icon: Icon, text }) => <span key={text}><Icon size={16} /> {text}</span>)}
          </div>
          <div className="conversation-detail-card">
            <small>Service</small>
            <strong>{conversation.packageTitle || conversation.requestedService || "Custom wedding enquiry"}</strong>
            {conversation.guestCount && <p>{conversation.guestCount} guests</p>}
            {conversation.budgetBand && <p>{conversation.budgetBand} budget</p>}
          </div>
          <div className="conversation-status"><i /><span><strong>{conversation.status === "new" ? "New enquiry" : "Conversation active"}</strong><small>Keep all decisions here so nothing gets lost.</small></span></div>
        </aside>

        <section className="conversation-thread">
          <header>
            <div>
              <span className="conversation-person-avatar">{otherName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
              <div><strong>{otherName}</strong><small>{role === "couple" ? "Wedding vendor" : conversation.customerEmail}</small></div>
            </div>
            <span className="conversation-live"><i /> Smitten conversation</span>
          </header>

          <div className="conversation-messages">
            <div className="conversation-origin"><Sparkles size={15} /><span>Enquiry created · {dateLabel(conversation.weddingDate)}</span></div>
            {conversation.messages.map((message) => (
              <article key={message.id} className={message.mine ? "message-bubble mine" : "message-bubble"}>
                {!message.mine && <strong>{message.senderName}</strong>}
                <p>{message.body}</p>
                <time>{timeLabel(message.createdAt)}</time>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className="conversation-composer" onSubmit={sendMessage}>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Message ${otherName}…`} rows={3} maxLength={3000} />
            <div>
              <span>{error || "Messages stay with this enquiry and sync across your Smitten account."}</span>
              <button type="submit" disabled={sending || !body.trim()}>{sending ? "Sending…" : "Send"} <Send size={16} /></button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
