"use client";

import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Brand } from "../../components/Brand";

type TransitionState = "connecting" | "profile" | "workspace" | "error";

export default function AccountTransition({
  intent,
  returnTo,
}: {
  intent: "couple" | "vendor";
  returnTo?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<TransitionState>("connecting");
  const [message, setMessage] = useState("");

  const resolveWorkspace = useCallback(async () => {
    setMessage("");
    setState("connecting");

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch("/api/account/resolve-workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ intent, returnTo }),
        });

        if (response.status === 401 && attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 250 + attempt * 250));
          continue;
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "We couldn’t open your workspace.");

        setState("profile");
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        setState("workspace");

        const destination = String(result.destination || "/");
        router.prefetch(destination);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        router.replace(destination);
        router.refresh();
        return;
      } catch (error) {
        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 300 + attempt * 250));
          continue;
        }
        setState("error");
        setMessage(error instanceof Error ? error.message : "We couldn’t open your workspace.");
      }
    }
  }, [intent, returnTo, router]);

  useEffect(() => {
    void resolveWorkspace();
  }, [resolveWorkspace]);

  return (
    <main className="account-transition-page">
      <section className="account-transition-card" aria-live="polite">
        <Brand priority />
        <div className="account-transition-mark">
          {state === "error" ? <ShieldCheck /> : state === "workspace" ? <CheckCircle2 /> : <LoaderCircle className="spin" />}
        </div>

        {state === "error" ? <>
          <p className="eyebrow"><span /> Secure session</p>
          <h1>We couldn’t open your workspace.</h1>
          <p>{message}</p>
          <button type="button" onClick={() => void resolveWorkspace()}>Try again</button>
        </> : <>
          <p className="eyebrow"><span /> Signed in securely</p>
          <h1>{state === "workspace" ? "Your workspace is ready." : "Opening your workspace…"}</h1>
          <p>We’re restoring your account and taking you back to Smitten.</p>
          <div className="account-transition-steps">
            <span className="done"><CheckCircle2 /> Secure sign-in</span>
            <span className={state === "profile" || state === "workspace" ? "done" : "active"}>
              {state === "profile" || state === "workspace" ? <CheckCircle2 /> : <LoaderCircle className="spin" />} Account
            </span>
            <span className={state === "workspace" ? "done" : state === "profile" ? "active" : ""}>
              {state === "workspace" ? <CheckCircle2 /> : <span />} Workspace
            </span>
          </div>
        </>}
      </section>
    </main>
  );
}
