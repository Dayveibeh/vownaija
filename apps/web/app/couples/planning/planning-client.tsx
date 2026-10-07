"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Save, X } from "lucide-react";
import { formatNaira, serviceOptions, styleOptions } from "@smitten/shared";
import { nigeriaStates } from "@/lib/vendor-validation";
import type { CustomerPlanning, BudgetItem, ChecklistItem } from "@/lib/customer-validation";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import styles from "./planning.module.css";

const emptyBudget = { id: "", title: "", amount: "" };
const emptyTask = { id: "", title: "", dueDate: "", completed: false };

export default function PlanningClient({ initial }: { initial: CustomerPlanning }) {
  const [details, setDetails] = useState(initial.details);
  const [budget, setBudget] = useState(initial.budget);
  const [checklist, setChecklist] = useState(initial.checklist);
  const [budgetDraft, setBudgetDraft] = useState(emptyBudget);
  const [taskDraft, setTaskDraft] = useState(emptyTask);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState("");
  const ceiling = Number(String(details.budgetCeiling || "0").replaceAll(",", "")) || 0;
  const allocated = budget.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100;
  const done = checklist.filter((item) => item.completed).length;

  async function request(path: string, method: string, body: unknown) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) {
      setFields(result.issues?.fieldErrors || {});
      throw new Error(result.message || "We couldn’t save your changes. Please try again.");
    }
    return result;
  }
  async function perform(kind: string, action: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(kind); setError(""); setFields({}); setNotice("");
    try { await action(); setNotice(message); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setBusy(""); }
  }
  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    await perform("details", async () => {
      const { profile } = await request("/api/customer/preferences", "PUT", details);
      setDetails((current) => ({ ...current, budgetCeiling: String(profile.budgetCeiling || "0") }));
    }, "Your wedding details are saved.");
  }
  async function saveBudget(event: FormEvent) {
    event.preventDefault();
    await perform("budget", async () => {
      const { item } = await request("/api/customer/budget", "POST", { ...budgetDraft, id: budgetDraft.id || undefined }) as { item: BudgetItem };
      setBudget((current) => current.some((b) => b.id === item.id) ? current.map((b) => b.id === item.id ? item : b) : [...current, item]);
      setBudgetDraft(emptyBudget);
    }, "Your budget item is saved.");
  }
  async function saveTask(event: FormEvent) {
    event.preventDefault();
    await perform("task", async () => {
      const { item } = await request("/api/customer/checklist", "POST", { ...taskDraft, id: taskDraft.id || undefined }) as { item: ChecklistItem };
      setChecklist((current) => current.some((t) => t.id === item.id) ? current.map((t) => t.id === item.id ? item : t) : [...current, item]);
      setTaskDraft(emptyTask);
    }, "Your checklist is saved.");
  }
  const disabled = Boolean(busy);
  return <main className={styles.shell}>
    <WorkspaceHeader role="couple" activeSection="planning" />
    <div className={styles.content}>
      <header className={styles.heading}><div><p className="eyebrow"><span /> Your wedding plan</p><h1>A little more together.</h1><p>Save your details, organise your budget and keep track of what’s next.</p></div><Link href="/couples/dashboard" className="button button-dark">Back to workspace <ArrowRight size={17} /></Link></header>
      <nav className={styles.nav} aria-label="Planning sections"><a href="#details">Wedding details</a><a href="#budget">Budget</a><a href="#checklist">Checklist</a></nav>
      {error && <div className={styles.error} role="alert"><p>{error}</p>{Object.entries(fields).map(([field, messages]) => <p key={field}>{messages.join(" ")}</p>)}</div>}
      <section id="details" className={styles.card}>
        <h2>Wedding details</h2><p>These details also appear when you return to your vendor matches.</p>
        <form onSubmit={saveDetails}>
          <div className={styles.fields}>
            <label>Wedding date<input type="date" value={details.weddingDate || ""} onChange={(e) => setDetails({ ...details, weddingDate: e.target.value })} /></label>
            <label>City or area<input required minLength={2} maxLength={120} value={details.weddingLocation} onChange={(e) => setDetails({ ...details, weddingLocation: e.target.value })} /></label>
            <label>State<select required value={details.weddingState || ""} onChange={(e) => setDetails({ ...details, weddingState: e.target.value })}><option value="">Choose a state</option>{nigeriaStates.map((state) => <option key={state}>{state}</option>)}</select></label>
            <label>Wedding type<select value={details.weddingType} onChange={(e) => setDetails({ ...details, weddingType: e.target.value })}>{["Traditional wedding", "White wedding", "Traditional & white wedding", "Civil ceremony", "Destination wedding"].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Guest count<input required maxLength={80} placeholder="e.g. 200 guests" value={details.guestCount} onChange={(e) => setDetails({ ...details, guestCount: e.target.value })} /></label>
            <label>Total planned budget (₦)<input required inputMode="decimal" value={details.budgetCeiling || "0"} onChange={(e) => setDetails({ ...details, budgetCeiling: e.target.value })} /></label>
            <label>Wedding style<select value={details.weddingStyle} onChange={(e) => setDetails({ ...details, weddingStyle: e.target.value })}>{styleOptions.map((style) => <option key={style}>{style}</option>)}</select></label>
          </div>
          <fieldset className={styles.services}><legend>Services you need</legend>{[...new Set([...serviceOptions, "Bead styling", ...(details.requiredServices || [])])].map((service) => <label key={service}><input type="checkbox" checked={details.requiredServices.includes(service)} onChange={(e) => setDetails({ ...details, requiredServices: e.target.checked ? [...details.requiredServices, service] : details.requiredServices.filter((s) => s !== service) })} />{service}</label>)}</fieldset>
          <button className="button button-primary" disabled={disabled}><Save size={17} />{busy === "details" ? "Saving…" : "Save wedding details"}</button>
        </form>
      </section>
      <section id="budget" className={styles.card}>
        <h2>Your budget</h2><p>Track planned allocations here. Your bookings and payments are available in their workspace tabs.</p>
        <div className={styles.summary}><div><small>Planned</small><strong>{formatNaira(ceiling)}</strong></div><div><small>Allocated</small><strong>{formatNaira(allocated)}</strong></div><div><small>{allocated > ceiling ? "Over budget" : "Remaining"}</small><strong>{formatNaira(Math.abs(ceiling - allocated))}</strong></div></div>
        {!budget.length && <p className={styles.empty}>Add your first allocation below, such as photography or venue hire.</p>}
        <ul className={styles.items}>{budget.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{formatNaira(Number(item.amount))}</span></div><div className={styles.actions}><button type="button" disabled={disabled} onClick={() => { setBudgetDraft(item); document.getElementById("budget-title")?.focus(); }}>Edit</button><button type="button" disabled={disabled} onClick={() => void perform("budget", async () => { await request("/api/customer/budget", "DELETE", { id: item.id }); setBudget((items) => items.filter((i) => i.id !== item.id)); if (budgetDraft.id === item.id) setBudgetDraft(emptyBudget); }, "Budget item removed.")}>Remove</button></div></li>)}</ul>
        <form onSubmit={saveBudget}><h3>{budgetDraft.id ? "Edit allocation" : "Add an allocation"}</h3><div className={styles.fields}><label>Item<input id="budget-title" required minLength={2} maxLength={120} value={budgetDraft.title} onChange={(e) => setBudgetDraft({ ...budgetDraft, title: e.target.value })} /></label><label>Amount (₦)<input required inputMode="decimal" value={budgetDraft.amount} onChange={(e) => setBudgetDraft({ ...budgetDraft, amount: e.target.value })} /></label></div><div className={styles.actions}><button className="button button-primary" disabled={disabled}>Save allocation</button>{budgetDraft.id && <button type="button" onClick={() => setBudgetDraft(emptyBudget)}>Cancel editing</button>}</div></form>
      </section>
      <section id="checklist" className={styles.card}>
        <h2>Your checklist</h2><p>{done} of {checklist.length} completed. Changes are saved to your account.</p>
        {!checklist.length && <p className={styles.empty}>Start with a task such as requesting photographer quotes.</p>}
        <ul className={styles.items}>{checklist.map((task) => <li key={task.id}><label className={styles.task}><input type="checkbox" checked={task.completed} disabled={disabled} onChange={(e) => void perform("task", async () => { const { item } = await request("/api/customer/checklist", "PATCH", { id: task.id, completed: e.target.checked }) as { item: ChecklistItem }; setChecklist((items) => items.map((t) => t.id === item.id ? item : t)); }, "Your checklist is saved.")} /><span><strong>{task.title}</strong><small>{task.completed ? "Completed" : task.dueDate ? `Due ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("en-GB")}` : "To do"}</small></span></label><div className={styles.actions}><button type="button" disabled={disabled} onClick={() => { setTaskDraft({ ...task, dueDate: task.dueDate || "" }); document.getElementById("task-title")?.focus(); }}>Edit</button><button type="button" disabled={disabled} onClick={() => void perform("task", async () => { await request("/api/customer/checklist", "DELETE", { id: task.id }); setChecklist((items) => items.filter((t) => t.id !== task.id)); if (taskDraft.id === task.id) setTaskDraft(emptyTask); }, "Checklist item removed.")}>Remove</button></div></li>)}</ul>
        <form onSubmit={saveTask}><h3>{taskDraft.id ? "Edit task" : "Add a task"}</h3><div className={styles.fields}><label>Task<input id="task-title" required minLength={2} maxLength={160} value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} /></label><label>Due date (optional)<input type="date" value={taskDraft.dueDate} onChange={(e) => setTaskDraft({ ...taskDraft, dueDate: e.target.value })} /></label></div><div className={styles.actions}><button className="button button-primary" disabled={disabled}>Save task</button>{taskDraft.id && <button type="button" onClick={() => setTaskDraft(emptyTask)}>Cancel editing</button>}</div></form>
      </section>
    </div>
    {notice && <div className={styles.notice}><p role="status" aria-atomic="true">{notice}</p><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={18} /></button></div>}
  </main>;
}
