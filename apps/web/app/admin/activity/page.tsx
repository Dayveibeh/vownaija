import { requireUserRole } from "@/lib/accounts";
import { listAdminActivity } from "@/lib/admin-workspace";
import styles from "../admin.module.css";
export const dynamic = "force-dynamic";
export default async function AdminActivityPage() {
  await requireUserRole("admin"); const events = await listAdminActivity();
  return <main className={styles.content}><p className="eyebrow">Admin audit trail</p><h1>Account and moderation activity</h1><p className={styles.intro}>The latest 100 user, review and vendor moderation changes, with the responsible admin and recorded reason. Payment event history is available in each transaction.</p><section className={styles.panel}>{!events.length && <p>No actions recorded yet.</p>}<ul className={styles.activity}>{events.map(event=><li key={event.id}><strong>{event.action.replace(/[._]/g," ")}</strong> · {event.actor}<p>{event.reason}</p><small>Target: {event.targetId}</small><p><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})}</time></p></li>)}</ul></section></main>;
}
