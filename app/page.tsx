"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CakeSlice,
  Camera,
  Check,
  ChevronDown,
  Gem,
  Heart,
  MapPin,
  Menu,
  Music2,
  Search,
  Sparkles,
  Star,
  Utensils,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const vendors = [
  {
    name: "Aurora Events NG",
    category: "Planning & décor",
    location: "Lekki, Lagos",
    rating: "4.9",
    reviews: 86,
    price: "From ₦850,000",
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
    tag: "Top rated",
    image: "https://gallery.dripplescakes.com/assets/images/traditional-marriage-cake-by-dripplescakes-2024-15-1000x1333.webp",
  },
];

const categories = [
  { name: "Venues", icon: Gem, count: "680+" },
  { name: "Photographers", icon: Camera, count: "420+" },
  { name: "Planners & décor", icon: Sparkles, count: "510+" },
  { name: "Catering", icon: Utensils, count: "360+" },
  { name: "Music & DJs", icon: Music2, count: "280+" },
  { name: "Cakes", icon: CakeSlice, count: "230+" },
];

const locations = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City", "Enugu"];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("Lagos");
  const [category, setCategory] = useState("All vendors");
  const [searchMessage, setSearchMessage] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  const visibleVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const locationMatch = location === "Nigeria" || vendor.location.toLowerCase().includes(location.toLowerCase());
      const categoryMatch = category === "All vendors" || vendor.category.toLowerCase().includes(category.toLowerCase());
      return locationMatch && categoryMatch;
    });
  }, [category, location]);

  function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchMessage(
      visibleVendors.length
        ? `Showing ${visibleVendors.length} trusted match${visibleVendors.length > 1 ? "es" : ""} in ${location}.`
        : `We’re growing in ${location}. Try “All vendors” or another city.`,
    );
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleSaved(name: string) {
    setSaved((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="VowNaija home">
          <span className="brand-mark"><Heart size={16} strokeWidth={2.4} /></span>
          <span>VowNaija</span>
        </Link>

        <nav className={menuOpen ? "nav-links is-open" : "nav-links"} aria-label="Main navigation">
          <a href="#categories">Find vendors</a>
          <a href="#how-it-works">How it works</a>
          <a href="#inspiration">Inspiration</a>
          <Link href="/vendor/aurora-events">Vendor profile</Link>
        </nav>

        <div className="header-actions">
          <Link href="/dashboard" className="text-link">Vendor sign in</Link>
          <Link href="/onboarding" className="button button-dark button-small">List your business</Link>
        </div>

        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
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
            <button className="search-button" type="submit" aria-label="Search vendors"><Search size={21} /> <span>Search</span></button>
          </form>

          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true"><span>AO</span><span>TF</span><span>NK</span><span>+2k</span></div>
            <p><strong>2,000+ couples</strong><br />planning with VowNaija</p>
            <div className="proof-rating"><Star size={15} fill="currentColor" /> 4.9</div>
          </div>
        </div>

        <div className="hero-visual">
          <img src="https://static.wixstatic.com/media/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/fdf893_120788a0b4fa499fb373d950cc86501e~mv2.jpg" alt="Nigerian couple in traditional wedding attire" />
          <div className="hero-caption"><span><MapPin size={15} /> Lagos, Nigeria</span><p>“Every detail felt like us.”</p><small>Amara & Tunde</small></div>
          <div className="hero-flower" aria-hidden="true">✦</div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Marketplace benefits">
        <p><Check size={17} /> Verified vendors</p><p><Check size={17} /> Transparent reviews</p><p><Check size={17} /> Quotes made simple</p><p><Check size={17} /> Nigerian, nationwide</p>
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading split-heading">
          <div><p className="eyebrow"><span /> Start planning</p><h2>Everything you need,<br /><em>all in one place.</em></h2></div>
          <p>From the first idea to the final dance, find experienced professionals who understand your vision—and your traditions.</p>
        </div>
        <div className="category-grid">
          {categories.map(({ name, icon: Icon, count }) => (
            <button className="category-card" key={name} onClick={() => { setCategory(name === "Planners & décor" ? "Planning & décor" : name); document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className="category-icon"><Icon size={24} /></span><span><strong>{name}</strong><small>{count} vendors</small></span><ArrowRight size={19} />
            </button>
          ))}
        </div>
      </section>

      <section className="section featured-section" id="featured">
        <div className="section-heading row-heading">
          <div><p className="eyebrow light"><span /> Curated for you</p><h2>Popular around <em>{location}</em></h2></div>
          <button className="underlined-button" onClick={() => setLocation("Nigeria")}>View all vendors <ArrowRight size={17} /></button>
        </div>
        {searchMessage && <div className="search-feedback" role="status">{searchMessage}</div>}
        <div className="vendor-grid">
          {(visibleVendors.length ? visibleVendors : vendors).map((vendor) => (
            <article className="vendor-card" key={vendor.name}>
              <div className="vendor-image">
                <img src={vendor.image} alt={`${vendor.name} wedding work`} /><span className="vendor-tag">{vendor.tag}</span>
                <button className={saved.includes(vendor.name) ? "save-button saved" : "save-button"} onClick={() => toggleSaved(vendor.name)} aria-label={`${saved.includes(vendor.name) ? "Remove" : "Save"} ${vendor.name}`}><Heart size={18} fill={saved.includes(vendor.name) ? "currentColor" : "none"} /></button>
              </div>
              <div className="vendor-info"><p className="vendor-category">{vendor.category}</p><div className="vendor-title-row"><h3>{vendor.name}</h3><BadgeCheck size={18} /></div><p className="vendor-location"><MapPin size={14} /> {vendor.location}</p><div className="vendor-meta"><span><Star size={14} fill="currentColor" /> <strong>{vendor.rating}</strong> ({vendor.reviews})</span><strong>{vendor.price}</strong></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="how-it-works">
        <div className="story-image"><img src="https://naphtalirentals.com/wp-content/uploads/2022/07/291952015_993524448004434_4768468144911484061_n.jpg" alt="Elegant Nigerian wedding reception setup" /><div className="story-sticker"><Heart fill="currentColor" size={24} /><strong>Made for<br />Naija love</strong></div></div>
        <div className="story-copy">
          <p className="eyebrow"><span /> How it works</p><h2>Less stress.<br /><em>More celebration.</em></h2>
          <div className="steps"><div><span>01</span><p><strong>Discover your favourites</strong>Search by service, city, style and budget.</p></div><div><span>02</span><p><strong>Compare with confidence</strong>See real work, packages and verified reviews.</p></div><div><span>03</span><p><strong>Request a personal quote</strong>Tell vendors what you need and manage replies in one place.</p></div></div>
          <Link href="/onboarding" className="button button-primary">Start planning <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="section location-section" id="inspiration">
        <div className="location-copy"><p className="eyebrow light"><span /> Near you</p><h2>Find wedding vendors<br /><em>across Nigeria.</em></h2><p>Local expertise matters. Browse professionals who know the venues, traditions and pace of your city.</p></div>
        <div className="location-list">
          {locations.map((city, index) => <button key={city} onClick={() => { setLocation(city); document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" }); }}><span>0{index + 1}</span><strong>{city}</strong><ArrowRight /></button>)}
        </div>
      </section>

      <section className="vendor-cta">
        <div><p className="eyebrow"><span /> For wedding professionals</p><h2>Your best work deserves<br /><em>to be discovered.</em></h2></div>
        <div><p>Build a beautiful profile, share your portfolio, respond to enquiries and send custom quotes—all from one place.</p><Link href="/onboarding" className="button button-dark">Grow your business <ArrowRight size={18} /></Link></div>
      </section>

      <footer>
        <div className="footer-top"><Link href="/" className="brand brand-light"><span className="brand-mark"><Heart size={16} /></span><span>VowNaija</span></Link><p>Celebrating love, culture and brilliant Nigerian businesses.</p><div className="socials"><a href="#">Instagram</a><a href="#">TikTok</a><a href="#">Pinterest</a></div></div>
        <div className="footer-bottom"><span>© 2026 VowNaija</span><span>Made with love in Nigeria 🇳🇬</span><span>Privacy · Terms</span></div>
      </footer>
    </main>
  );
}
