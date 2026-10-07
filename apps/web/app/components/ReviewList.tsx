import type { ReviewView } from "@/lib/reviews";
import styles from "./reviews.module.css";
export function ReviewList({ reviews, showStatus = false }: { reviews: ReviewView[]; showStatus?: boolean }) {
  return reviews.length ? <div>{reviews.map((review) => <article className={styles.card} key={review.id}>
    <div className={styles.meta}><span className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span><strong>{review.reviewer}</strong><span>Booking verified</span>{showStatus && <span className={styles.badge}>{review.status === "pending" ? "Awaiting approval" : review.status}</span>}</div>
    <h3>{review.title}</h3><p className={styles.body}>{review.body}</p><time dateTime={review.updatedAt}>{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(review.updatedAt))}</time>
  </article>)}</div> : <p>No published booking reviews yet.</p>;
}
