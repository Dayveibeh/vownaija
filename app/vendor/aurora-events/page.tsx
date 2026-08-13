"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, ChevronRight, Heart, Instagram, MapPin, MessageCircle, Play, Share2, Star, X } from "lucide-react";
import { FormEvent, useState } from "react";

const gallery = [
  "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
  "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
  "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
];

export default function VendorProfilePage() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  function sendQuote(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <Link href="/" className="brand"><span className="brand-mark"><Heart size={16} /></span><span>VowNaija</span></Link>
        <nav><Link href="/"><ArrowLeft size={16} /> Back to search</Link><a href="#about">About</a><a href="#packages">Packages</a><a href="#reviews">Reviews</a></nav>
        <button className="button button-primary button-small" onClick={() => setQuoteOpen(true)}>Request a quote</button>
      </header>

      <section className="profile-gallery">
        <div className="gallery-main"><img src={gallery[0]} alt="Aurora Events luxury wedding decoration" /><button><Play size={18} fill="currentColor" /> Watch showreel</button></div>
        <div><img src={gallery[1]} alt="Elegant reception tablescape" /><img src={gallery[2]} alt="Luxury wedding details" /></div>
        <span className="gallery-count">12 photos · 3 videos</span>
      </section>

      <section className="profile-body">
        <article className="profile-content">
          <div className="profile-title-block">
            <p className="vendor-category">Wedding planning & décor</p>
            <h1>Aurora Events NG <BadgeCheck size={25} /></h1>
            <div className="profile-subline"><span><MapPin size={15} /> Lekki, Lagos · Travels nationwide</span><span><Star size={15} fill="currentColor" /> <strong>4.9</strong> · 86 reviews</span></div>
            <div className="profile-actions"><button className={saved ? "saved" : ""} onClick={() => setSaved((value) => !value)}><Heart size={17} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}</button><button><Share2 size={17} /> Share</button><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={17} /> Instagram</a></div>
          </div>

          <div className="profile-divider" />
          <section id="about" className="profile-section">
            <p className="eyebrow"><span /> Our story</p><h2>Beautifully considered.<br /><em>Joyfully Nigerian.</em></h2>
            <p>We plan and style weddings that feel unmistakably personal. From intimate civil ceremonies to three-day traditional celebrations, our Lagos-based team brings calm coordination, thoughtful design and trusted vendor relationships to every event.</p>
            <div className="profile-highlights"><span><Check size={16} /> 8 years’ experience</span><span><Check size={16} /> 160+ weddings delivered</span><span><Check size={16} /> Nationwide travel</span><span><Check size={16} /> Insured business</span></div>
          </section>

          <section id="packages" className="profile-section">
            <div className="profile-section-heading"><div><p className="eyebrow"><span /> Services</p><h2>Packages</h2></div><small>Custom quotes available</small></div>
            <div className="package-list">
              <article><div><span>Most popular</span><h3>The Full Celebration</h3><p>End-to-end planning, vendor coordination, décor concept, guest management and on-the-day production.</p></div><div><strong>From ₦2,800,000</strong><button onClick={() => setQuoteOpen(true)}>Get this quote <ChevronRight size={16} /></button></div></article>
              <article><div><h3>Signature Styling</h3><p>Creative direction, venue styling, floral design, tablescape and installation for your ceremony and reception.</p></div><div><strong>From ₦850,000</strong><button onClick={() => setQuoteOpen(true)}>Get this quote <ChevronRight size={16} /></button></div></article>
              <article><div><h3>Wedding Day Coordination</h3><p>Timeline review, vendor liaison, ceremony management and calm coordination from setup to send-off.</p></div><div><strong>From ₦650,000</strong><button onClick={() => setQuoteOpen(true)}>Get this quote <ChevronRight size={16} /></button></div></article>
            </div>
          </section>

          <section id="reviews" className="profile-section reviews-section">
            <div className="profile-section-heading"><div><p className="eyebrow"><span /> Kind words</p><h2>Couple reviews</h2></div><button className="write-review" onClick={() => setReviewOpen(true)}>Write a review</button></div>
            <div className="rating-overview"><div><strong>4.9</strong><span><span>★★★★★</span>86 verified reviews</span></div><p>Couples praise Aurora most for <strong>communication, creativity and attention to detail.</strong></p></div>
            <div className="review-grid">
              <article><div className="review-stars">★★★★★</div><h3>“They understood the assignment.”</h3><p>Adaeze and her team brought our modern Yoruba wedding to life. Every detail was thoughtful and the day ran beautifully.</p><div><span>AO</span><p><strong>Amara O.</strong><small>Married in Lagos · May 2026</small></p></div></article>
              <article><div className="review-stars">★★★★★</div><h3>“Calm, creative and so organised.”</h3><p>From the first call we felt looked after. Our families could actually enjoy the day because Aurora handled everything.</p><div><span>NC</span><p><strong>Nneka C.</strong><small>Married in Abuja · February 2026</small></p></div></article>
            </div>
          </section>
        </article>

        <aside className="profile-enquiry-card">
          <div className="availability"><span /><strong>Available for selected 2026 dates</strong></div>
          <h3>Love what you see?</h3><p>Tell Aurora about your celebration and receive a personal quote.</p>
          <button className="button button-primary" onClick={() => setQuoteOpen(true)}>Request a free quote</button>
          <div className="response-time"><MessageCircle size={17} /><span><strong>Usually replies within 2 hours</strong>No booking fee to enquire</span></div>
        </aside>
      </section>

      {quoteOpen && <div className="modal-backdrop" onMouseDown={() => setQuoteOpen(false)}>
        <section className="quote-modal" role="dialog" aria-modal="true" aria-label="Request a quote" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setQuoteOpen(false)} aria-label="Close"><X /></button>
          {!submitted ? <>
            <p className="eyebrow"><span /> Personal quote</p><h2>Tell Aurora about your day</h2><p>The more detail you share, the more accurate your quote will be.</p>
            <form onSubmit={sendQuote} className="quote-request-form">
              <div><label>Your name<input required placeholder="Your full name" /></label><label>Email<input required type="email" placeholder="you@email.com" /></label></div>
              <div><label>Wedding date<input required type="date" /></label><label>Location<input required placeholder="City or venue" /></label></div>
              <div><label>Guest count<input type="number" placeholder="e.g. 250" /></label><label>Budget range<select><option>Choose a range</option><option>₦500k – ₦1m</option><option>₦1m – ₦3m</option><option>₦3m – ₦5m</option><option>₦5m+</option></select></label></div>
              <label>What do you need help with?<textarea required rows={4} placeholder="Tell us about the style, traditions and services you have in mind…" /></label>
              <button className="button button-primary" type="submit">Send quote request <ChevronRight size={17} /></button>
            </form>
          </> : <div className="quote-success"><div><Check size={30} /></div><h2>Your request is on its way!</h2><p>Aurora Events usually responds within two hours. We’ll let you know as soon as they reply.</p><button className="button button-dark" onClick={() => setQuoteOpen(false)}>Done</button></div>}
        </section>
      </div>}

      {reviewOpen && <div className="modal-backdrop" onMouseDown={() => setReviewOpen(false)}>
        <section className="quote-modal review-modal" role="dialog" aria-modal="true" aria-label="Write a review" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setReviewOpen(false)} aria-label="Close"><X /></button>
          {!reviewSent ? <form onSubmit={(event) => { event.preventDefault(); setReviewSent(true); }}><p className="eyebrow"><span /> Your experience</p><h2>Review Aurora Events</h2><label className="star-picker">Your rating<span>★★★★★</span></label><label>Review title<input required placeholder="Sum up your experience" /></label><label>Your review<textarea required rows={5} placeholder="What did you love? What should other couples know?" /></label><button className="button button-primary" type="submit">Submit review</button></form> : <div className="quote-success"><div><Check size={30} /></div><h2>Thank you!</h2><p>Your review has been submitted for verification.</p><button className="button button-dark" onClick={() => setReviewOpen(false)}>Done</button></div>}
        </section>
      </div>}
    </main>
  );
}
