"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, ImagePlus, Save } from "lucide-react";
import { formatNaira } from "@smitten/shared";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { saveVendorProfile } from "../../onboarding/actions";
import { nigeriaStates, vendorServices, type VendorProfileForm } from "@/lib/vendor-validation";
import styles from "./vendor-studio.module.css";

type Package = { id: string; title: string; description: string; price: number; featured: boolean; displayOrder: number };
const emptyPackage = { id: "", title: "", description: "", price: "", featured: false, displayOrder: 0 };

export default function VendorStudio({ initialProfile, vendorId, imageUrl, gallery, packages }: {
  initialProfile: VendorProfileForm; vendorId: string; imageUrl: string; gallery: string[]; packages: Package[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(emptyPackage);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  function update<K extends keyof VendorProfileForm>(key: K, value: VendorProfileForm[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setFields((current) => ({ ...current, [key]: "" }));
  }
  async function request(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "We couldn’t save your changes. Please try again.");
    return result;
  }
  async function perform(kind: string, action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(kind); setError(""); setNotice("");
    try { await action(); setNotice(success); router.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Something went wrong. Please try again."); }
    finally { setBusy(""); }
  }
  async function saveBusiness(event: FormEvent) {
    event.preventDefault();
    await perform("profile", async () => {
      const result = await saveVendorProfile(profile);
      if (!result.ok) { setFields(result.fields || {}); throw new Error(result.message); }
    }, "Your business profile is saved and your public listing is updated.");
  }
  async function savePackage(event: FormEvent) {
    event.preventDefault();
    await perform("package", async () => {
      await request("/api/vendor-workspace/packages", "POST", { ...draft, id: draft.id || undefined });
      setDraft(emptyPackage);
    }, "Your package is saved and visible on your public profile.");
  }
  async function upload(file?: File) {
    if (!file) return;
    await perform("media", async () => {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/vendor-workspace/media", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Your upload failed. Please try again.");
    }, "Your media is uploaded and saved to your portfolio.");
  }
  function field(key: Exclude<keyof VendorProfileForm, "travelDistance">, label: string, type = "text") {
    return <label>{label}<input type={type} value={profile[key]} required={key !== "instagram"}
      aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `error-${key}` : undefined}
      inputMode={key === "startingPrice" ? "decimal" : undefined}
      onChange={(event) => update(key, event.target.value)} />
      {fields[key] && <small id={`error-${key}`} className={styles.fieldError}>{fields[key]}</small>}</label>;
  }

  return <main className={styles.shell}>
    <WorkspaceHeader role="vendor" activeSection="profile" />
    <div className={styles.content}>
      <header className={styles.heading}><div><p className="eyebrow"><span /> Your storefront</p><h1>Make it yours.</h1><p>Your business, packages and portfolio, all in one place.</p></div>
        <Link className="button button-primary" href={`/vendor/${vendorId}`}>View public profile <ArrowRight size={17} /></Link></header>
      <nav className={styles.sectionNav} aria-label="Profile sections"><a href="#business">Business details</a><a href="#packages">Packages</a><a href="#portfolio">Portfolio</a></nav>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <section id="business" className={styles.card}>
        <h2>Business details</h2><p>Changes appear on your public profile when you save. Contact details stay in your workspace.</p>
        <form onSubmit={saveBusiness}>
          <div className={styles.fields}>
            {field("businessName", "Business name")}{field("contactName", "Contact name")}
            {field("businessEmail", "Business email", "email")}{field("phone", "Phone number", "tel")}
            <label>Primary service<select value={profile.primaryService} onChange={(event) => update("primaryService", event.target.value)}>
              {!vendorServices.includes(profile.primaryService) && <option>{profile.primaryService}</option>}{vendorServices.map((service) => <option key={service}>{service}</option>)}</select></label>
            {field("yearsInBusiness", "Years in business")}{field("location", "City or area")}
            <label>State<select required value={profile.state} aria-invalid={Boolean(fields.state)} onChange={(event) => update("state", event.target.value)}><option value="">Choose your state</option>{nigeriaStates.map((state) => <option key={state}>{state}</option>)}</select>{fields.state && <small className={styles.fieldError}>{fields.state}</small>}</label>
            <label>Travel distance<select value={profile.travelDistance} onChange={(event) => update("travelDistance", event.target.value as VendorProfileForm["travelDistance"])}>{["My city only", "My state", "Neighbouring states", "Nationwide"].map((distance) => <option key={distance}>{distance}</option>)}</select></label>
            {field("startingPrice", "Starting price (₦)")}{field("instagram", "Instagram URL or @username")}
          </div>
          <label className={styles.about}>About your business<textarea required minLength={20} maxLength={1200} rows={5} value={profile.about} aria-invalid={Boolean(fields.about)} onChange={(event) => update("about", event.target.value)} />{fields.about && <small className={styles.fieldError}>{fields.about}</small>}</label>
          <button className="button button-primary" disabled={Boolean(busy)}><Save size={17} />{busy === "profile" ? "Saving…" : "Save business details"}</button>
        </form>
      </section>
      <section id="packages" className={styles.card}>
        <h2>Service packages</h2><p>Help couples compare what you offer. Archived packages stay linked to existing enquiries.</p>
        {packages.length === 0 && <p className={styles.empty}>No packages yet. Add your first service below.</p>}
        <div className={styles.packageList}>{packages.map((item) => <article key={item.id}>
          <div>{item.featured && <small>Featured package</small>}<h3>{item.title}</h3><p>{item.description}</p><strong>{formatNaira(item.price)}</strong></div>
          <div className={styles.actions}><button type="button" disabled={Boolean(busy)} onClick={() => { setDraft({ ...item, price: String(item.price) }); document.getElementById("package-title")?.focus(); }}>Edit</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void perform("package", async () => { await request("/api/vendor-workspace/packages", "DELETE", { id: item.id }); if (draft.id === item.id) setDraft(emptyPackage); }, "Package archived.")}>Archive</button></div>
        </article>)}</div>
        <form onSubmit={savePackage} className={styles.packageForm}>
          <h3>{draft.id ? "Edit package" : "Add a package"}</h3>
          <div className={styles.fields}><label>Package title<input id="package-title" required minLength={2} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>Price (₦)<input required inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label>
            <label>Display order<input type="number" min={0} max={100} required value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} /></label></div>
          <label className={styles.about}>What’s included?<textarea rows={3} required minLength={10} maxLength={1600} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className={styles.check}><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /> Feature this package</label>
          <div className={styles.actions}><button className="button button-primary" disabled={Boolean(busy)}>{busy === "package" ? "Saving…" : "Save package"}</button>{draft.id && <button type="button" disabled={Boolean(busy)} onClick={() => setDraft(emptyPackage)}>Cancel editing</button>}</div>
        </form>
      </section>
      <section id="portfolio" className={styles.card}>
        <div className={styles.portfolioHeading}><div><h2>Your portfolio</h2><p>{gallery.length} of 24 files · JPG, PNG, WebP up to 8 MB · MP4 up to 25 MB</p></div>
          <label className={`button button-primary ${styles.upload}`} aria-disabled={Boolean(busy) || gallery.length >= 24}><ImagePlus size={17} />{busy === "media" ? "Uploading…" : "Add media"}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={Boolean(busy) || gallery.length >= 24} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
        {gallery.length === 0 && <p className={styles.empty}>Show couples your work. Upload your first photo or video.</p>}
        <div className={styles.gallery}>{gallery.map((url, index) => <article key={url}>
          {url.endsWith(".mp4") ? <video controls preload="metadata" src={url} /> : <Image src={url} width={480} height={330} unoptimized={!url.startsWith("/api/vendor-media/")} alt={`${profile.businessName} portfolio ${index + 1}`} />}
          <div className={styles.actions}>{imageUrl === url ? <strong>Cover image</strong> : !url.endsWith(".mp4") && <button disabled={Boolean(busy)} onClick={() => void perform("media", async () => { await request("/api/vendor-workspace/media", "PATCH", { url, action: "cover" }); }, "Your cover image is updated.")}>Use as cover</button>}
            <button disabled={Boolean(busy)} onClick={() => void perform("media", async () => { await request("/api/vendor-workspace/media", "PATCH", { url, action: "remove" }); }, "Media removed from your public portfolio.")}>Remove</button></div>
        </article>)}</div>
      </section>
    </div>
  </main>;
}
