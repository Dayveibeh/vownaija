import type { ReactNode } from "react";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { AdminAccountControls } from "./admin-account-controls";
import styles from "./admin.module.css";
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.workspace}><WorkspaceHeader role="admin" accountControls={<AdminAccountControls />} />{children}</div>;
}
