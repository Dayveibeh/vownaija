import { requireUserRole } from "@/lib/accounts";
import { getVendorReviewSummary, listVendorReviews } from "@/lib/reviews";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { ReviewList } from "../../components/ReviewList";
import styles from "../../components/reviews.module.css";
export const dynamic = "force-dynamic";
export default async function VendorReviewsPage() {
  const profile = await requireUserRole("vendor");
  const [reviews, summary] = await Promise.all([listVendorReviews(profile.clerkUserId), getVendorReviewSummary(profile.clerkUserId)]);
  return <main className={styles.workspace}><WorkspaceHeader role="vendor" activeSection="reviews" /><div className={styles.content}>
    <p className="eyebrow">Reputation</p><h1>Booking reviews</h1><p>Feedback from customers who confirmed delivery of your booked services.</p>
    <section className={styles.section}><h2>{summary.average ? `${summary.average} out of 5` : "Your reviews start here"}</h2><p>{summary.count} published {summary.count === 1 ? "review" : "reviews"}. Pending and hidden reviews do not contribute to your public rating.</p>
    {reviews.length ? <ReviewList reviews={reviews} showStatus /> : <p>No reviews received yet. Customers can leave feedback from their completed booking.</p>}<p>Showing the 200 most recent reviews.</p></section>
  </div></main>;
}
