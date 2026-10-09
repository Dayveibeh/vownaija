import Link from "next/link";
import { restrictedMessage } from "@/lib/account-access";
import { Brand } from "../../components/Brand";
import styles from "../../admin/admin.module.css";
export default function RestrictedAccountPage() {
  return <main className={styles.content}><Brand /><section className={styles.panel}><h1>Account access restricted</h1><p>{restrictedMessage}</p><p>If you believe this is a mistake, include your account email when contacting support.</p><div className={styles.actions}><a className={styles.button} href="mailto:support@smitten.com.ng">Contact support</a><Link className={styles.button} href="/">Back to Smitten</Link></div></section></main>;
}
