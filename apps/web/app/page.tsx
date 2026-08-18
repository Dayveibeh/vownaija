"use client";

import Link from "next/link";
import { Brand } from "./components/Brand";
import {
  ArrowRight,
  BadgeCheck,
  CakeSlice,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Gem,
  Heart,
  MapPin,
  Menu,
  Music2,
  Search,
  Sparkles,
  Star,
  UserRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

const vendors = [
  {
    name: "Aurora Events NG",
    category: "Planning & décor",
    location: "Lekki, Lagos",
    rating: "4.9",
    reviews: 86,
    price: "From ₦850,000",
    priceMin: 850000,
    tier: "Mid-range",
    tag: "Most booked",
    image: "https://ikejabird.com/wp-content/uploads/2025/10/2022-02-01-1.jpg",
  },
  {
    name: "The Bridal Chair",
    category: "Bridal beauty",
    location: "Abuja, FCT",
    rating: "4.8",
    reviews: 54,
    price: "From ₦180,000",
    priceMin: 180000,
    tier: "Budget-friendly",
    tag: "Responds fast",
    image: "https://i.pinimg.com/originals/33/9b/0f/339b0f6a388202ad731f89715e91e442.jpg",
  },
  {
    name: "Dripples Cakes",
    category: "Cakes & desserts",
    location: "Ikeja, Lagos",
    rating: "4.9",
    reviews: 112,
    price: "From ₦250,000",
    priceMin: 250000,
    tier: "Budget-friendly",
    tag: "Top rated",
    image: "https://gallery.dripplescakes.com/assets/images/traditional-marriage-cake-by-dripplescakes-2024-15-1000x1333.webp",
  },
  {
    name: "Lagos Lens Co.",
    category: "Photography",
    location: "Victoria Island, Lagos",
    rating: "4.8",
    reviews: 73,
    price: "From ₦450,000",
    priceMin: 450000,
    tier: "Mid-range",
    tag: "Great value",
    image: "https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg",
  },
  {
    name: "Grand Marquee Lagos",
    category: "Venues",
    location: "Ikeja, Lagos",
    rating: "4.9",
    reviews: 128,
    price: "From ₦3,500,000",
    priceMin: 3500000,
    tier: "Luxury",
    tag: "Premium pick",
    image: "https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg",
  },
  {
    name: "Buka & Bubbles",
    category: "Catering",
    location: "Lekki, Lagos",
    rating: "4.7",
    reviews: 61,
    price: "From ₦6,500 per guest",
    priceMin: 6500,
    tier: "Budget-friendly",
    tag: "Couples’ choice",
    image: "https://www.eventdesignbybe.com/wp-content/uploads/2024/08/Modern-Nigerian-Wedding-Cake-Designs.jpg",
  },
];

const categories = [
  { name: "Venues", icon: Gem, count: "680+" },
  { name: "Photographers", icon: Camera, count: "420+" },
  { name: "Planners & décor", icon: ClipboardCheck, count: "510+" },
  { name: "Catering", icon: Utensils, count: "360+" },
  { name: "Music & DJs", icon: Music2, count: "280+" },
  { name: "Cakes", icon: CakeSlice, count: "230+" },
];

const locations = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City", "Enugu"];

const categoryAliases: Record<string, string> = {
  Photographers: "Photography",
  "Planners & décor": "Planning & décor",
  Cakes: "Cakes & desserts",
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("Lagos");
  const [category, setCategory] = useState("All vendors");
  const [budget, setBudget] = useState("Any budget");
  const [saved, setSaved] = useState<string[]>([]);
  const [activeVendor, setActiveVendor] = useState<(typeof vendors)[number] | null>(null);
  const categoryTrackRef = useRef<HTMLDivElement>(null);

  const visibleVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const locationMatch = location === "Nigeria" || vendor.location.toLowerCase().includes(location.toLowerCase());
      const normalizedCategory = categoryAliases[category] ?? category;
      const categoryMatch = category === "All vendors" || vendor.category === normalizedCategory;
      const budgetMatch = budget === "Any budget"
        || (budget === "Under ₦250k" && vendor.priceMin < 250000)
        || (budget === "₦250k – ₦1m" && vendor.priceMin >= 250000 && vendor.priceMin <= 1000000)
        || (budget === "₦1m – ₦3m" && vendor.priceMin > 1000000 && vendor.priceMin <= 3000000)
        || (budget === "₦3m+" && vendor.priceMin > 3000000);
      return locationMatch && categoryMatch && budgetMatch;
    });
  }, [budget, category, location]);

  function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function scrollCategories(direction: "previous" | "next") {
    const track = categoryTrackRef.current;
    if (!track) return;

    track.scrollBy({
      left: (direction === "next" ? 1 : -1) * Math.min(track.clientWidth * 0.82, 760),
      behavior: "smooth",
    });
  }

  return (
    <main>
      <header className="site-header">
        <Brand priority />

        <nav id="primary-navigation" className={menuOpen ? "nav-links is-open" : "nav-links"} aria-label="Main navigation">
          <a href="#categories" onClick={() => setMenuOpen(false)}>Find vendors</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <Link href="/couples/match" onClick={() => setMenuOpen(false)}>AI recommendations</Link>
          <a href="#inspiration" onClick={() => setMenuOpen(false)}>Inspiration</a>
          <Link href="/couples/sign-up" className="mobile-auth-link" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link href="/vendor/sign-up" className="mobile-vendor-join" onClick={() => setMenuOpen(false)}>Join as vendor <ArrowRight size={16} /></Link>
        </nav>

        <div className="header-actions">
          <Link href="/couples/sign-up" className="couple-sign-in"><UserRound size={15} /> Sign in</Link>
          <Link href="/vendor/sign-up" className="button button-dark button-small">Join as vendor</Link>
        </div>

        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="primary-navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Your wedding, your way</p>
          <h1>Find the people who’ll make it <em>unforgettable.</em></h1>
          <p className="hero-intro">Discover trusted wedding vendors across Nigeria, compare real reviews, and get quotes that fit your celebration.</p>

          <form className="search-panel" onSubmit={runSearch}>
            <label>
              <span>What do you need?</span>
              <div className="select-wrap">
                <Search size={19} />
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option>All vendors</option>
                  <option>Planning & décor</option>
                  <option>Bridal beauty</option>
                  <option>Cakes & desserts</option>
                  <option>Photography</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <label>
              <span>Where?</span>
              <div className="select-wrap">
                <MapPin size={19} />
                <select value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option>Nigeria</option>
                  {locations.map((item) => <option key={item}>{item}</option>)}
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <label>
              <span>Your budget</span>
              <div className="select-wrap">
                <WalletCards size={19} />
                <select value={budget} onChange={(event) => setBudget(event.target.value)}>
                  <option>Any budget</option>
                  <option>Under ₦250k</option>
                  <option>₦250k – ₦1m</option>
                  <option>₦1m – ₦3m</option>
                  <option>₦3m+</option>
                </select>
                <ChevronDown size={16} />
              </div>
            </label>
            <button className="search-button" type="submit" aria-label="Search vendors"><Search size={21} /> <span>Search</span></button>
          </form>

          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true"><span>AO</span><span>TF</span><span>NK</span><span>+2k</span></div>
            <p><strong>2,000+ couples</strong><br />planning with Smitten</p>
            <div className="proof-rating"><Star size={15} fill="currentColor" /> 4.9</div>
          </div>
        </div>

        <div className="hero-visual">
          <img src="https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg" alt="Nigerian couple in traditional wedding attire" />
          <div className="hero-caption"><span><MapPin size={15} /> Lagos, Nigeria</span><p>“Every detail felt like us.”</p><small>Amara & Tunde</small></div>
        </div>
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading split-heading">
          <div><p className="eyebrow"><span /> Start planning</p><h2>Everything you need,<br /><em>all in one place.</em></h2></div>
          <p>From the first idea to the final dance, find experienced professionals who understand your vision—and your traditions.</p>
        </div>
        <div className="category-slider-heading">
          <p>Explore by service</p>
          <div className="category-slider-controls" aria-label="Category carousel controls">
            <button type="button" onClick={() => scrollCategories("previous")} aria-label="Show previous categories"><ChevronLeft /></button>
            <button type="button" onClick={() => scrollCategories("next")} aria-label="Show next categories"><ChevronRight /></button>
          </div>
        </div>
        <div className="category-carousel" ref={categoryTrackRef} role="region" aria-label="Wedding vendor categories" tabIndex={0}>
          {categories.map(({ name, icon: Icon, count }, index) => (
            <button type="button" className="category-card" key={name} aria-label={`Browse ${name}`} onClick={() => { setCategory(categoryAliases[name] ?? name); document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className="category-card-top"><small>Explore 0{index + 1}</small><span className="category-icon"><Icon /></span></span>
              <span className="category-card-copy"><strong>{name}</strong><small>{count} trusted vendors</small></span>
              <span className="category-card-link">Browse vendors <ArrowRight /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="section featured-section" id="featured">
        <div className="section-heading row-heading">
          <div><p className="eyebrow light"><span /> Curated for you</p><h2>Popular around <em>{location}</em></h2></div>
          <button className="underlined-button" onClick={() => { setLocation("Nigeria"); setCategory("All vendors"); setBudget("Any budget"); }}>View all vendors <ArrowRight size={17} /></button>
        </div>
        {visibleVendors.length > 0 ? <div className="vendor-grid">
          {visibleVendors.map((vendor) => (
            <article className="vendor-card" key={vendor.name}>
              <div className="vendor-image">
                <img src={vendor.image} alt={`${vendor.name} wedding work`} /><span className="vendor-tag">{vendor.tag}</span>
                <button className={saved.includes(vendor.name) ? "save-button saved" : "save-button"} onClick={() => toggleSaved(vendor.name)} aria-label={`${saved.includes(vendor.name) ? "Remove" : "Save"} ${vendor.name}`}><Heart size={18} fill={saved.includes(vendor.name) ? "currentColor" : "none"} /></button>
              </div>
              <div className="vendor-info"><div className="vendor-category-line"><p className="vendor-category">{vendor.category}</p><span>{vendor.tier}</span></div><div className="vendor-title-row"><h3>{vendor.name}</h3><BadgeCheck size={18} /></div><p className="vendor-location"><MapPin size={14} /> {vendor.location}</p><div className="vendor-meta"><span><Star size={14} fill="currentColor" /> <strong>{vendor.rating}</strong> ({vendor.reviews})</span><strong>{vendor.price}</strong></div><button className="vendor-profile-button" onClick={() => setActiveVendor(vendor)}>View profile <ArrowRight size={15} /></button></div>
            </article>
          ))}
        </div> : <div className="vendor-empty" role="status"><Sparkles /><h3>We’re still growing in {location}.</h3><p>No exact match for {category.toLowerCase()} at {budget.toLowerCase()} yet. Try all vendors across Nigeria.</p><button className="button button-primary" onClick={() => { setLocation("Nigeria"); setCategory("All vendors"); setBudget("Any budget"); }}>Show all vendors</button></div>}
      </section>

      <section className="story-section" id="how-it-works">
        <div className="story-image"><img src="https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg" alt="Elegant Nigerian wedding reception setup" /><div className="story-sticker"><Heart fill="currentColor" size={24} /><strong>Made for<br />Naija love</strong></div></div>
        <div className="story-copy">
          <p className="eyebrow"><span /> How it works</p><h2>Less stress.<br /><em>More celebration.</em></h2>
          <ul className="steps"><li><span className="step-bullet" aria-hidden="true" /><p><strong>Discover your favourites</strong>Search by service, city, style and budget.</p></li><li><span className="step-bullet" aria-hidden="true" /><p><strong>Compare with confidence</strong>See real work, packages and verified reviews.</p></li><li><span className="step-bullet" aria-hidden="true" /><p><strong>Request a personal quote</strong>Tell vendors what you need and manage replies in one place.</p></li></ul>
          <Link href="/couples/sign-up" className="button button-primary">Start planning <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="ai-match-cta">
        <div className="ai-match-orbit" aria-hidden="true"><span><Sparkles /></span><i /><i /><i /></div>
        <div>
          <p className="eyebrow light"><span /> Smitten AI matchmaker</p>
          <h2>Not sure where to start?<br /><em>Let us build your shortlist.</em></h2>
          <p>Answer a few quick questions about your location, budget and wedding style. Smitten AI will recommend vendors that fit—whether you’re keeping costs lean or planning something luxurious.</p>
          <div className="ai-match-actions"><Link href="/couples/match" className="button button-primary">Find my matches <Sparkles size={17} /></Link><span>Takes about 2 minutes · You can skip this step</span></div>
        </div>
        <div className="match-preview-stack">
          <article><span>94% match</span><strong>Planning & décor</strong><p>Aurora Events NG</p><small>Fits your Lagos location and mid-range budget</small></article>
          <article><span>91% match</span><strong>Photography</strong><p>Lagos Lens Co.</p><small>Strong value and documentary style</small></article>
          <article><span>88% match</span><strong>Bridal beauty</strong><p>The Bridal Chair</p><small>Budget-friendly and highly rated</small></article>
        </div>
      </section>

      <section className="section location-section" id="inspiration">
        <div className="location-copy"><p className="eyebrow light"><span /> Near you</p><h2>Find wedding vendors<br /><em>across Nigeria.</em></h2><p>Local expertise matters. Browse professionals who know the venues, traditions and pace of your city.</p></div>
        <div className="location-list">
          {locations.map((city, index) => <button key={city} onClick={() => { setLocation(city); setCategory("All vendors"); setBudget("Any budget"); document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" }); }}><span>0{index + 1}</span><strong>{city}</strong><ArrowRight /></button>)}
        </div>
      </section>

      <section className="vendor-cta">
        <div><p className="eyebrow"><span /> For wedding professionals</p><h2>Your best work deserves<br /><em>to be discovered.</em></h2></div>
        <div><p>Build a beautiful profile, share your portfolio, respond to enquiries and send custom quotes—all from one place.</p><Link href="/vendor/sign-up" className="button button-dark">Grow your business <ArrowRight size={18} /></Link></div>
      </section>

      <footer>
        <div className="footer-top"><Brand light /><p>Celebrating love, culture and brilliant Nigerian businesses.</p><div className="socials"><a href="https://instagram.com/Smitten_NG" target="_blank" rel="noreferrer">Instagram: Smitten_NG</a><a href="https://x.com/Smitten_NG" target="_blank" rel="noreferrer">X: Smitten_NG</a></div></div>
        <div className="footer-bottom"><span>© 2026 Smitten</span><span>Privacy · Terms</span></div>
      </footer>

      {activeVendor && <div className="vendor-modal-backdrop" onMouseDown={() => setActiveVendor(null)}>
        <section className="vendor-preview-modal" role="dialog" aria-modal="true" aria-label={`${activeVendor.name} profile`} onMouseDown={(event) => event.stopPropagation()}>
          <button className="vendor-modal-close" onClick={() => setActiveVendor(null)} aria-label="Close vendor profile"><X /></button>
          <img src={activeVendor.image} alt={`${activeVendor.name} wedding portfolio`} />
          <div><p className="vendor-category">{activeVendor.category}</p><h2>{activeVendor.name}</h2><p className="vendor-location"><MapPin size={14} /> {activeVendor.location}</p><p>Verified on Smitten with {activeVendor.reviews} couple reviews and packages starting at {activeVendor.price.replace("From ", "")}.</p><div className="vendor-modal-actions">{activeVendor.name === "Aurora Events NG" ? <Link className="button button-dark" href="/vendor/aurora-events">Open full profile</Link> : <button className="button button-dark" onClick={() => setActiveVendor(null)}>Keep browsing</button>}<Link className="button button-primary" href="/couples/sign-up">Request a quote</Link></div></div>
        </section>
      </div>}
    </main>
  );
}
