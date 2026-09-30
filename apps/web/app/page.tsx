"use client";

import Link from "next/link";
import Image from "next/image";
import "./editorial-home.css";
import { Brand } from "./components/Brand";
import { SessionAccountNav } from "./components/SessionAccountNav";
import {
  BadgeCheck,
  CakeSlice,
  Camera,
  ChevronDown,
  ClipboardCheck,
  Gem,
  Heart,
  MapPin,
  Menu,
  Music2,
  Search,
  Sparkles,
  Star,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  coupleVendorFromMarketplaceRecord,
  type CoupleVendor,
  type MarketplaceVendorListResponse,
} from "@smitten/shared";

const categories = [
  { name: "Venues", icon: Gem, note: "A setting to fall in love with" },
  {
    name: "Photographers",
    icon: Camera,
    note: "Every moment, beautifully kept",
  },
  {
    name: "Planners & décor",
    icon: ClipboardCheck,
    note: "Your vision, brought to life",
  },
  {
    name: "Catering",
    icon: Utensils,
    note: "Something for everyone to savour",
  },
  {
    name: "Music & DJs",
    icon: Music2,
    note: "From the first dance to the last",
  },
  { name: "Cakes", icon: CakeSlice, note: "A sweet centrepiece for your day" },
];

const coupleImage = "/editorial-couple.jpg";
const receptionImage = "/editorial-reception.jpg";

const locations = [
  "Lagos",
  "Abuja",
  "Port Harcourt",
  "Ibadan",
  "Benin City",
  "Enugu",
];

const categoryAliases: Record<string, string> = {
  Photographers: "Photography",
  "Planners & décor": "Planning & décor",
  Cakes: "Cakes & desserts",
};

function displayLocation(vendor: CoupleVendor) {
  return vendor.state && vendor.state !== vendor.location
    ? `${vendor.location}, ${vendor.state}`
    : vendor.location;
}

function budgetParams(budget: string) {
  if (budget === "Under ₦250k") return { maxPrice: 249999 };
  if (budget === "₦250k – ₦1m") return { minPrice: 250000, maxPrice: 1000000 };
  if (budget === "₦1m – ₦3m") return { minPrice: 1000000, maxPrice: 3000000 };
  if (budget === "₦3m+") return { minPrice: 3000000 };
  return {} as { minPrice?: number; maxPrice?: number };
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("Lagos");
  const [category, setCategory] = useState("All vendors");
  const [budget, setBudget] = useState("Any budget");
  const [vendorQuery, setVendorQuery] = useState("");
  const [vendors, setVendors] = useState<CoupleVendor[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [marketplaceError, setMarketplaceError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const queryFromUrl =
      new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (queryFromUrl) {
      setVendorQuery(queryFromUrl);
      setLocation("Nigeria");
      setCategory("All vendors");
      setBudget("Any budget");
      window.requestAnimationFrame(() =>
        document
          .getElementById("featured")
          ?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    const normalizedCategory = categoryAliases[category] ?? category;
    if (location !== "Nigeria") params.set("location", location);
    if (category !== "All vendors") params.set("category", normalizedCategory);
    const range = budgetParams(budget);
    if (typeof range.minPrice === "number")
      params.set("minPrice", String(range.minPrice));
    if (typeof range.maxPrice === "number")
      params.set("maxPrice", String(range.maxPrice));
    if (vendorQuery) params.set("q", vendorQuery);

    setLoadingVendors(true);
    setMarketplaceError("");
    void fetch(`/api/vendors${params.size ? `?${params.toString()}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Marketplace request failed");
        return response.json() as Promise<MarketplaceVendorListResponse>;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setVendors(result.vendors.map(coupleVendorFromMarketplaceRecord));
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        )
          return;
        setMarketplaceError(
          "We couldn’t load the marketplace just now. Please try again.",
        );
        setVendors([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingVendors(false);
      });

    return () => controller.abort();
  }, [budget, category, location, reloadKey, vendorQuery]);

  useEffect(() => {
    void fetch("/api/favourites", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (Array.isArray(result?.favourites)) {
          setSaved(
            result.favourites.map(
              (item: { vendorId: string }) => item.vendorId,
            ),
          );
        }
      })
      .catch(() => {
        // Public browsing should still work if the visitor is signed out.
      });
  }, []);

  function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVendorQuery("");
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  }

  async function toggleSaved(vendorId: string) {
    const wasSaved = saved.includes(vendorId);
    setSaved((current) =>
      wasSaved
        ? current.filter((item) => item !== vendorId)
        : [...current, vendorId],
    );

    try {
      const response = await fetch("/api/favourites", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (response.status === 401) {
        setSaved((current) =>
          wasSaved
            ? [...current, vendorId]
            : current.filter((item) => item !== vendorId),
        );
        window.location.href = "/couples/sign-up?mode=signin";
        return;
      }
      if (!response.ok) throw new Error("Favourite update failed");
    } catch {
      setSaved((current) =>
        wasSaved
          ? [...new Set([...current, vendorId])]
          : current.filter((item) => item !== vendorId),
      );
    }
  }

  return (
    <main className="smitten-editorial">
      <header className="ed-header">
        <Brand priority />
        <nav
          id="primary-navigation"
          className={menuOpen ? "ed-nav is-open" : "ed-nav"}
          aria-label="Main navigation"
        >
          <a href="#categories" onClick={() => setMenuOpen(false)}>
            Discover
          </a>
          <a href="#experience" onClick={() => setMenuOpen(false)}>
            The experience
          </a>
          <Link href="/couples/match" onClick={() => setMenuOpen(false)}>
            Find my matches
          </Link>
          <div className="ed-mobile-account">
            <SessionAccountNav
              variant="mobile"
              withVendorJoin
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </nav>
        <div className="ed-account">
          <SessionAccountNav withVendorJoin />
        </div>
        <button
          className="ed-menu"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section className="ed-hero">
        <div className="ed-hero-copy">
          <p className="ed-label">FOR THE LOVE. FOR THE CULTURE. FOR YOU.</p>
          <h1>
            A day like
            <br />
            no other.
            <br />
            <em>A little more you.</em>
          </h1>
          <p className="ed-intro">
            Find your people. Bring your vision to life. Discover wedding
            vendors across Nigeria, for every kind of celebration and every kind
            of budget.
          </p>
          <div className="ed-actions">
            <a href="#categories" className="ed-button">
              Discover your vendors
            </a>
            <Link href="/couples/match" className="ed-text-link">
              <Sparkles size={17} /> Find my matches
            </Link>
          </div>
          <div className="ed-hero-note">
            <span>MADE FOR NIGERIAN LOVE STORIES</span>
            <p>From your first idea to your final dance.</p>
          </div>
        </div>
        <div className="ed-hero-art">
          <div className="ed-photo-main">
            <Image
              src={coupleImage}
              alt="Nigerian couple celebrating in traditional wedding attire"
              fill
              priority
              sizes="(max-width: 760px) 85vw, 46vw"
              unoptimized
            />
          </div>
          <span className="ed-art-caption">
            A CELEBRATION THAT FEELS LIKE YOU · SMITTEN
          </span>
        </div>
      </section>

      <section className="ed-search-band" aria-label="Find wedding vendors">
        <div className="ed-search-heading">
          <span className="ed-label">LET’S START WITH YOUR VISION</span>
          <h2>Who’s on your wishlist?</h2>
        </div>
        <form className="ed-search" onSubmit={runSearch}>
          <label>
            <span>THE PEOPLE</span>
            <div>
              <Search size={18} />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Vendor service"
              >
                <option>All vendors</option>
                {categories.map(({ name }) => (
                  <option key={name} value={categoryAliases[name] ?? name}>
                    {name}
                  </option>
                ))}
                <option>Bridal beauty</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <label>
            <span>THE PLACE</span>
            <div>
              <MapPin size={18} />
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                aria-label="Wedding location"
              >
                <option>Nigeria</option>
                {locations.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <label>
            <span>VENDOR BUDGET</span>
            <div>
              <WalletCards size={18} />
              <select
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                aria-label="Vendor budget"
              >
                <option>Any budget</option>
                <option>Under ₦250k</option>
                <option>₦250k – ₦1m</option>
                <option>₦1m – ₦3m</option>
                <option>₦3m+</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
          <button className="ed-button" type="submit">
            <Search size={18} /> Find vendors
          </button>
        </form>
      </section>

      <section className="ed-section ed-discovery" id="categories">
        <div className="ed-section-head">
          <div>
            <p className="ed-label ed-section-label">
              THE PEOPLE WHO MAKE THE DAY
            </p>
            <h2>
              Big dreams.
              <br />
              <em>Brilliant people.</em>
            </h2>
          </div>
          <p>
            The setting, the music, the moments you’ll keep forever. Find the
            right people to make them yours.
          </p>
        </div>
        <div className="ed-categories">
          {categories.map(({ name, icon: Icon, note }) => (
            <button
              key={name}
              aria-label={`Browse ${name}`}
              aria-pressed={category === (categoryAliases[name] ?? name)}
              onClick={() => {
                setCategory(categoryAliases[name] ?? name);
                document
                  .getElementById("featured")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="ed-category-icon" aria-hidden="true">
                <Icon size={25} strokeWidth={1.4} />
              </span>
              <span className="ed-category-copy">
                <strong>{name}</strong>
                <small>{note}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="ed-section ed-marketplace"
        id="featured"
        aria-busy={loadingVendors}
      >
        <div className="ed-section-head">
          <div>
            <p className="ed-label">YOUR NEXT GREAT FIND</p>
            <h2>
              {vendorQuery ? (
                <>
                  Results for <em>“{vendorQuery}”</em>
                </>
              ) : (
                <>
                  A little closer to
                  <br />
                  <em>your dream day.</em>
                </>
              )}
            </h2>
            <p className="ed-results-context">
              {location} · {category} · {budget}
            </p>
          </div>
          <button
            className="ed-text-link"
            onClick={() => {
              setVendorQuery("");
              setLocation("Nigeria");
              setCategory("All vendors");
              setBudget("Any budget");
              window.history.replaceState(null, "", "/#featured");
            }}
          >
            Browse all vendors
          </button>
        </div>
        {loadingVendors && vendors.length === 0 ? (
          <div className="ed-empty" role="status">
            <Sparkles size={24} />
            <h3>Finding your people…</h3>
            <p>Loading wedding vendors from the Smitten marketplace.</p>
          </div>
        ) : marketplaceError ? (
          <div className="ed-empty" role="alert">
            <h3>A little pause in the planning.</h3>
            <p>{marketplaceError}</p>
            <button
              className="ed-button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : vendors.length > 0 ? (
          <div className="ed-vendors">
            {vendors.map((vendor) => (
              <article className="ed-vendor" key={vendor.id}>
                <div className="ed-vendor-image">
                  <Link
                    href={`/vendor/${vendor.id}`}
                    aria-label={`View ${vendor.name}`}
                  >
                    <Image
                      src={vendor.image}
                      alt={`${vendor.name} wedding portfolio`}
                      fill
                      sizes="(max-width: 600px) 90vw, (max-width: 1000px) 44vw, 29vw"
                      unoptimized
                    />
                  </Link>
                  <span className="ed-vendor-tag">{vendor.tier}</span>
                  <button
                    className={
                      saved.includes(vendor.id) ? "ed-save saved" : "ed-save"
                    }
                    onClick={() => void toggleSaved(vendor.id)}
                    aria-label={`${saved.includes(vendor.id) ? "Remove" : "Save"} ${vendor.name}`}
                    aria-pressed={saved.includes(vendor.id)}
                  >
                    <Heart
                      size={19}
                      fill={saved.includes(vendor.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="ed-vendor-info">
                  <span className="ed-label">{vendor.category}</span>
                  <h3>
                    <Link href={`/vendor/${vendor.id}`}>{vendor.name}</Link>
                  </h3>
                  <p>
                    <MapPin size={14} /> {displayLocation(vendor)}
                  </p>
                  <div className="ed-vendor-meta">
                    <strong>{vendor.price}</strong>
                    {vendor.reviews > 0 ? (
                      <span>
                        <Star size={14} fill="currentColor" /> {vendor.rating}{" "}
                        <small>({vendor.reviews})</small>
                      </span>
                    ) : (
                      <span>New on Smitten</span>
                    )}
                  </div>
                  <Link
                    className="ed-vendor-link"
                    href={`/vendor/${vendor.id}`}
                  >
                    Explore this vendor
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ed-empty" role="status">
            <h3>
              {vendorQuery
                ? `No vendor matched “${vendorQuery}”.`
                : "Your perfect match might be a little further afield."}
            </h3>
            <p>
              Try another service, a different budget, or browse vendors across
              Nigeria.
            </p>
            <button
              className="ed-button"
              onClick={() => {
                setVendorQuery("");
                setLocation("Nigeria");
                setCategory("All vendors");
                setBudget("Any budget");
              }}
            >
              Show all vendors
            </button>
          </div>
        )}
      </section>

      <section className="ed-experience" id="experience">
        <div className="ed-experience-copy">
          <p className="ed-label ed-section-label">THE SMITTEN EXPERIENCE</p>
          <h2>
            One place,
            <br />
            from “yes”
            <br />
            <em>to “I do.”</em>
          </h2>
          <p>
            Your ideas, your favourite vendors and your next steps. Bring the
            moving parts together, so you can be present for the moments that
            matter.
          </p>
          <Link href="/couples/sign-up" className="ed-button">
            Make it your wedding
          </Link>
          <div className="ed-feature-index">
            <span>DISCOVER</span>
            <span>SHORTLIST</span>
            <span>PLAN</span>
          </div>
        </div>
        <div
          className="ed-app-scene"
          aria-label="Illustrative Smitten wedding plan"
        >
          <div className="ed-floating ed-budget-card">
            <span className="ed-label">YOUR BUDGET, IN BALANCE</span>
            <strong>₦12,000,000</strong>
            <div className="ed-progress">
              <span />
            </div>
            <p>
              ₦8.4m allocated <span>₦3.6m to go</span>
            </p>
          </div>
          <div className="ed-phone">
            <div className="ed-phone-top">
              <span>9:41</span>
              <i />
              <span>100%</span>
            </div>
            <div className="ed-phone-screen">
              <span className="ed-phone-brand">
                smitten<span>♡</span>
              </span>
              <p className="ed-label">YOUR WEDDING, YOUR WAY</p>
              <h3>
                Hello, love.
                <br />
                <em>Let’s make it happen.</em>
              </h3>
              <div className="ed-phone-photo">
                <Image
                  src={receptionImage}
                  fill
                  sizes="260px"
                  unoptimized
                  alt="Reception inspiration in an example wedding plan"
                />
                <span>
                  Your Lagos celebration
                  <br />
                  <strong>350 guests · Your kind of magic</strong>
                </span>
              </div>
              <div className="ed-phone-plan">
                <span>Your day, coming together</span>
                <strong>3 things to celebrate</strong>
                <p>
                  <BadgeCheck size={16} /> Venue shortlisted <small>Done</small>
                </p>
                <p>
                  <Camera size={16} /> Find your photographer{" "}
                  <small>Next</small>
                </p>
                <p>
                  <Utensils size={16} /> Explore your menu <small>To do</small>
                </p>
              </div>
              <div className="ed-phone-nav">
                <span>
                  <Heart size={17} /> Your day
                </span>
                <span>
                  <Search size={17} /> Discover
                </span>
                <span>
                  <Sparkles size={17} /> Matches
                </span>
              </div>
            </div>
          </div>
          <div className="ed-floating ed-shortlist-card">
            <span className="ed-label">
              <Heart size={15} /> YOUR SHORTLIST
            </span>
            <strong>
              A few favourites.
              <br />
              One beautiful day.
            </strong>
            <div>
              <span>Venue</span>
              <span>Photography</span>
              <span>Décor</span>
            </div>
          </div>
          <div className="ed-floating ed-match-card">
            <span>
              <Sparkles size={19} />
            </span>
            <div>
              <strong>A little help finding “the one”.</strong>
              <p>
                Vendors matched to your style,
                <br />
                location and budget.
              </p>
            </div>
          </div>
          <p className="ed-demo-caption">
            ILLUSTRATIVE PLAN · YOUR WEDDING WILL BE UNIQUELY YOURS
          </p>
        </div>
      </section>

      <section className="ed-love-note" id="how-it-works">
        <div>
          <p className="ed-label">LESS ADMIN. MORE ANTICIPATION.</p>
          <h2>
            A hundred conversations.
            <br />
            <em>One place to bring them together.</em>
          </h2>
        </div>
        <div className="ed-planning-steps">
          {[
            {
              title: "Find your kind of people",
              icon: Search,
              text: "Browse by service, city and budget. Save the vendors you love.",
            },
            {
              title: "Make a little room for magic",
              icon: Sparkles,
              text: "Tell our matchmaker what matters to you and discover your shortlist.",
            },
            {
              title: "Bring your day together",
              icon: Heart,
              text: "Request quotes, compare the details and manage your vendor conversations.",
            },
          ].map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <span className="ed-step-marker" aria-hidden="true">
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ed-dark-story">
        <div className="ed-dark-image">
          <Image
            src={receptionImage}
            alt="An elegant reception with flowers, candlelight and carefully styled tables"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
            unoptimized
          />
        </div>
        <div className="ed-dark-copy">
          <p className="ed-label ed-section-label">
            A LITTLE GUIDANCE. A LOT OF YOU.
          </p>
          <h2>
            Your style.
            <br />
            Your budget.
            <br />
            <em>Your kind of magic.</em>
          </h2>
          <p>
            A big Lagos celebration or something intimate in Abuja. Traditional,
            modern, or a little of both. Tell us what you’re dreaming of, and
            let Smitten help you find your people.
          </p>
          <Link href="/couples/match" className="ed-button ed-button-light">
            <Sparkles size={18} /> Find my matches
          </Link>
          <small>A few quick questions. Always optional.</small>
        </div>
      </section>

      <section className="ed-section ed-cities" id="inspiration">
        <p className="ed-label">LOVE IS LOCAL</p>
        <div className="ed-section-head">
          <h2>
            Where’s your
            <br />
            <em>love story happening?</em>
          </h2>
          <p>
            Find professionals who know your city, your traditions and the
            details that make the difference.
          </p>
        </div>
        <div>
          {locations.map((city) => (
            <button
              key={city}
              aria-label={`Browse wedding vendors in ${city}`}
              aria-pressed={location === city}
              onClick={() => {
                setLocation(city);
                setCategory("All vendors");
                setBudget("Any budget");
                document
                  .getElementById("featured")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MapPin size={20} strokeWidth={1.4} aria-hidden="true" />
              {city}
            </button>
          ))}
        </div>
      </section>
      <section className="ed-final">
        <p className="ed-label">HERE’S TO YOUR NEXT CHAPTER.</p>
        <h2>
          Let’s make it
          <br />
          <em>unforgettable.</em>
        </h2>
        <Link href="/couples/sign-up" className="ed-button">
          Start your story
        </Link>
        <p>
          Wedding professional?{" "}
          <Link href="/vendor/sign-up">Find your people on Smitten.</Link>
        </p>
      </section>
      <footer className="ed-footer">
        <div>
          <Brand light />
          <p>For the love. For the culture. For you.</p>
        </div>
        <div>
          <a
            href="https://instagram.com/Smitten_NG"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
          <a href="https://x.com/Smitten_NG" target="_blank" rel="noreferrer">
            X
          </a>
          <span>© 2026 Smitten · Made for Nigeria</span>
        </div>
      </footer>
    </main>
  );
}
