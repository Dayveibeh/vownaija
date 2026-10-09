"use client";
import { useClerk } from "@clerk/nextjs";
import { SessionAccountNav } from "../components/SessionAccountNav";
import styles from "./admin.module.css";
export function AdminAccountControls() {
  const { signOut } = useClerk();
  return <div className={styles.account}><SessionAccountNav variant="compact" /><button type="button" onClick={() => void signOut({ redirectUrl: "/" })}>Log out</button></div>;
}
