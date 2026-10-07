"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BookingReviewState } from "@/lib/reviews";
import styles from "../../components/reviews.module.css";

export default function BookingReviewPanel({ bookingId, initialState }: { bookingId: string; initialState: BookingReviewState }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [delivered, setDelivered] = useState(false);
  const [rating, setRating] = useState(initialState.review?.rating ?? 5);
  const [title, setTitle] = useState(initialState.review?.title ?? "");
  const [body, setBody] = useState(initialState.review?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent, action: "complete" | "review") {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/${action}`, { method: action === "complete" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "complete" ? { serviceDelivered: delivered } : { rating, title, body }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "We couldn’t save this change.");
      setState(action === "complete" ? result.state : { ...state, review: result.review });
      setNotice(action === "complete" ? "Service marked completed. You can now leave a review." : "Your review is saved and awaiting admin approval.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "We couldn’t save this change."); }
    finally { setBusy(false); }
  }
  return <section className={styles.section}>
    <h2>{state.status === "completed" ? "Your booking review" : "Service completion"}</h2>
    {state.status === "confirmed" && <><p>Once the booked service has been delivered, confirm completion to share your experience.</p>{state.canComplete ? <form className={styles.form} onSubmit={(event) => void submit(event, "complete")}>
      <label className={styles.check}><input type="checkbox" checked={delivered} onChange={(event) => setDelivered(event.target.checked)} required />I confirm that the booked service has been delivered.</label>
      <button disabled={busy || !delivered}>{busy ? "Saving…" : "Confirm service completed"}</button>
    </form> : <p>Completion becomes available on your booking date.</p>}</>}
    {state.status === "cancelled" && <p>This booking was cancelled and cannot be reviewed.</p>}
    {state.status === "completed" && <><p>{state.review ? `Review status: ${state.review.status === "pending" ? "awaiting approval" : state.review.status}. Any edits require approval again.` : "Share honest feedback about this completed booking. Your first name appears publicly after approval."}</p>
      <form className={styles.form} onSubmit={(event) => void submit(event, "review")}>
        <label>Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>)}</select></label>
        <label>Review title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required /></label>
        <label>Your experience<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={2000} required /><span>20–2,000 characters</span></label>
        <button disabled={busy}>{busy ? "Saving…" : state.review ? "Save review changes" : "Submit review"}</button>
      </form></>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <div role="status" className={styles.notice}>{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
  </section>;
}
