"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Share2,
  Star,
  X,
} from "lucide-react";
import { formatNaira, type MarketplaceVendorDetailRecord } from "@smitten/shared";
import { Brand } from "../../components/Brand";
import { SessionAccountNav } from "../../components/SessionAccountNav";

export default function VendorProfileClient({ vendor }: { vendor: MarketplaceVendorDetailRecord }) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void fetch("/api/favourites", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!Array.isArray(result?.favourites)) return;
        setSaved(result.favourites.some((item: { vendorId: string }) => item.vendorId === vendor.id));
      })
      .catch(() => undefined);
  }, [vendor.id]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function toggleSaved() {
    const next = !saved;
    setSaved(next);
    try {
      const response = await fetch("/api/favourites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      if (response.status === 401) {
        setSaved(false);
        window.location.href = "/couples/sign-up?mode=signin";
        return;
      }
      if (!response.ok) throw new Error("Favourite update failed");
    } catch {
      setSaved(!next);
      setNotice("We couldn’t update your saved vendors. Please try again.");
    }
  }

  function openEnquiry(packageId: string | null = null) {
    if (!vendor.acceptingEnquiries) {
      setNotice("This showcase profile hasn’t connected its Smitten inbox yet. Try a vendor marked as accepting enquiries.");
      return;
    }
    setSelectedPackageId(packageId);
    setEnquiryError("");
    setSubmitted(false);
    setQuoteOpen(true);
  }

  async function sendQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnquiryError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          packageId: selectedPackageId,
          requestedService: selectedPackageId
            ? vendor.packages.find((item) => item.id === selectedPackageId)?.title ?? vendor.category
            : vendor.category,
          weddingDate: String(form.get("weddingDate") ?? "") || null,
          weddingLocation: String(form.get("weddingLocation") ?? ""),
          guestCount: String(form.get("guestCount") ?? "") || null,
          budgetBand: String(form.get("budgetBand") ?? "") || null,
          message: String(form.get("message") ?? ""),
        }),
      });

      if (response.status === 401) {
        window.location.href = `/couples/sign-up?mode=signin&returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "We couldn’t send your enquiry.");

      setConversationId(String(result.conversationId));
      setSubmitted(true);
    } catch (error) {
      setEnquiryError(error instanceof Error ? error.message : "We couldn’t send your enquiry just now.");
    } finally {
      setSubmitting(false);
    }
  }

  const gallery = vendor.gallery.length ? vendor.gallery : [vendor.imageUrl];
  const galleryMain = gallery[0] ?? vendor.imageUrl;
  const secondary = gallery.slice(1, 3);
  const location = vendor.state && vendor.state !== vendor.location
    ? vendor.location + ", " + vendor.state
    : vendor.location;

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Brand />
        <nav>
          <Link href="/"><ArrowLeft size={16} /> Back to search</Link>
          <a href="#about">About</a>
          <a href="#packages">Packages</a>
          <a href="#reviews">Reviews</a>
        </nav>
        <div className="profile-header-actions">
          <SessionAccountNav variant="compact" />
          <button className="button button-primary button-small" onClick={() => openEnquiry()}>Request a quote</button>
        </div>
      </header>

      <section className="profile-gallery">
        <div className="gallery-main"><img src={galleryMain} alt={vendor.businessName + " wedding portfolio"} /></div>
        <div>{secondary.map((image, index) => <img key={image + index} src={image} alt={vendor.businessName + " portfolio " + (index + 2)} />)}</div>
        <span className="gallery-count">{gallery.length} portfolio photos</span>
      </section>

      <section className="profile-body">
        <article className="profile-content">
          <div className="profile-title-block">
            <p className="vendor-category">{vendor.category}</p>
            <h1>{vendor.businessName} <BadgeCheck size={25} /></h1>
            <div className="profile-subline">
              <span><MapPin size={15} /> {location} · {vendor.travelDistance}</span>
              <span><Star size={15} fill="currentColor" /> <strong>{Number(vendor.rating).toFixed(1)}</strong> · {vendor.reviewCount} reviews</span>
            </div>
            <div className="profile-actions">
              <button className={saved ? "saved" : ""} onClick={() => void toggleSaved()}><Heart size={17} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}</button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => setNotice("Profile link copied")).catch(() => setNotice("Share this page from your browser menu")); }}><Share2 size={17} /> Share</button>
              {vendor.instagram ? <a href={vendor.instagram} target="_blank" rel="noreferrer"><Instagram size={17} /> Instagram</a> : null}
            </div>
          </div>

          <div className="profile-divider" />

          <section id="about" className="profile-section">
            <p className="eyebrow"><span /> About</p>
            <h2>Meet <em>{vendor.businessName}.</em></h2>
            <p>{vendor.about}</p>
            <div className="profile-highlights">{vendor.highlights.map((item) => <span key={item}><Check size={16} /> {item}</span>)}</div>
          </section>

          <section id="packages" className="profile-section">
            <div className="profile-section-heading"><div><p className="eyebrow"><span /> Services</p><h2>Packages</h2></div><small>Prices shown in NGN · Custom quotes available</small></div>
            <div className="package-list">
              {vendor.packages.map((item) => <article key={item.id}>
                <div>{item.featured ? <span>Most popular</span> : null}<h3>{item.title}</h3><p>{item.description}</p></div>
                <div><strong>From {formatNaira(item.price)}</strong><button onClick={() => openEnquiry(item.id)}>Get this quote <ChevronRight size={16} /></button></div>
              </article>)}
            </div>
          </section>

          <section id="reviews" className="profile-section reviews-section">
            <div className="profile-section-heading"><div><p className="eyebrow"><span /> Reputation</p><h2>Couple reviews</h2></div></div>
            <div className="rating-overview">
              <div><strong>{Number(vendor.rating).toFixed(1)}</strong><span><span>★★★★★</span>{vendor.reviewCount} marketplace reviews</span></div>
              <p>{vendor.matchReason}</p>
            </div>
          </section>
        </article>

        <aside className="profile-enquiry-card">
          <div className="availability"><span /><strong>{vendor.acceptingEnquiries ? vendor.availability : "Showcase profile · Inbox not connected yet"}</strong></div>
          <h3>Interested in {vendor.businessName}?</h3>
          <p>Share your wedding details and request a personalised quote.</p>
          <div className="vendor-profile-price"><small>Packages from</small><strong>{formatNaira(Number(vendor.startingPrice))}</strong></div>
          <button className="button button-primary" onClick={() => openEnquiry()}>Request a free quote</button>
          <div className="response-time"><MessageCircle size={17} /><span><strong>{vendor.acceptingEnquiries ? vendor.responseTime : "Browse their work for inspiration"}</strong>{vendor.acceptingEnquiries ? "No booking fee to enquire" : "Live enquiries are available on connected vendor profiles"}</span></div>
        </aside>
      </section>

      {quoteOpen && <div className="modal-backdrop" onMouseDown={() => setQuoteOpen(false)}>
        <section className="quote-modal" role="dialog" aria-modal="true" aria-label={"Request a quote from " + vendor.businessName} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setQuoteOpen(false)} aria-label="Close"><X /></button>
          {!submitted ? <>
            <p className="eyebrow"><span /> Personal quote</p>
            <h2>Tell {vendor.businessName} about your day</h2>
            <p>The more detail you share, the more accurate your quote can be.</p>
            {selectedPackageId && <div className="selected-package-note"><Check size={15} /><span>Enquiring about <strong>{vendor.packages.find((item) => item.id === selectedPackageId)?.title}</strong></span></div>}
            <form onSubmit={sendQuote} className="quote-request-form">
              <div><label>Your name<input name="displayName" placeholder="Your account name will be shared" disabled /></label><label>Email<input name="displayEmail" placeholder="Your account email will be shared" disabled /></label></div>
              <div><label>Wedding date<input name="weddingDate" required type="date" /></label><label>Location<input name="weddingLocation" required placeholder="City or venue" /></label></div>
              <div><label>Guest count<input name="guestCount" type="number" placeholder="e.g. 250" /></label><label>Budget range<select name="budgetBand" defaultValue=""><option value="" disabled>Choose a range</option><option>Under ₦1m</option><option>₦1m – ₦3m</option><option>₦3m – ₦7m</option><option>₦7m+</option></select></label></div>
              <label>What do you need help with?<textarea name="message" required minLength={10} rows={4} placeholder="Tell the vendor about the style, traditions and services you have in mind…" /></label>
              {enquiryError && <p className="form-error" role="alert">{enquiryError}</p>}
              <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Sending enquiry…" : "Send enquiry"} {!submitting && <ChevronRight size={17} />}</button>
            </form>
          </> : <div className="quote-success"><div><Check size={30} /></div><h2>Enquiry sent</h2><p>{vendor.businessName} now has your wedding details. Continue in your Smitten conversation to keep everything together.</p>{conversationId && <Link className="button button-primary" href={`/messages/${conversationId}`}>Open conversation <MessageCircle size={17} /></Link>}<button className="button button-dark" onClick={() => { setQuoteOpen(false); setSubmitted(false); setConversationId(""); setSelectedPackageId(null); }}>Keep browsing</button></div>}
        </section>
      </div>}

      {notice && <div className="dashboard-toast">{notice}</div>}
    </main>
  );
}
