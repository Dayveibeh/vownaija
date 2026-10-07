# Smitten

A Nigerian wedding-vendor marketplace for discovering trusted vendors by service, location and budget. The web and native applications live in separate project folders, with only matching data and types shared between them.

## Codebase

- `apps/web/` — Next.js web marketplace, customer account, Smitten AI matching and vendor portal
- `apps/mobile/` — Expo/React Native app for iPhone, including notifications and account settings
- `packages/shared/` — vendor data, types and matching logic shared by web and iOS

## Included experiences

- Location and category-based vendor discovery
- Vendor onboarding and profile creation
- Public portfolios, packages and social links
- Custom quote creation, editing and tracking
- Enquiry and client email management
- Portfolio image and video uploads
- AI-assisted business support
- Customer reviews and vendor responses
- Responsive desktop and mobile layouts
- Native iOS Home, Discover, Saved, Planning and Profile tabs
- Shared Smitten recommendations across the web and iOS experiences

## Current status

Smitten is in staging at [dev.smitten.com.ng](https://dev.smitten.com.ng), hosted on the user’s VPS through Coolify. Phase 3 is accepted; the Phase 4 WhatsApp assistant remains on hold. Phase 5 covers marketplace readiness and a small pilot launch.

Clerk authentication and Neon persistence are connected. The marketplace includes sample showcase vendors alongside owner-managed listings. Reviews, insights and AI business tools still include demonstration UI and are outside the vendor readiness work described below.

## Development

Requires Node.js 22.13 or newer.

Install the web workspace and start Next.js:

```bash
npm install
npm run web
```

Create a production build with:

```bash
npm run build:web
```

The repository-level `npm run dev` and `npm run build` commands remain available for the Sites preview and deployment workflow.

## Database setup and deployment

Provide `DATABASE_URL` (or `POSTGRES_URL`) for the intended Neon database before running
`npm run db:setup`. The command batches schema changes, inserts missing sample vendors
and packages, and publishes existing vendor profiles. Re-running it preserves existing
sample edits, vendor URLs, favourites and packages. Database setup no longer runs inside
page or API requests.

Vercel's `npm run build:vercel` command runs setup before building. The database variable
must therefore be available at build time. In Coolify, keep the repository root as the
base directory, use `npm run build:vercel` to build and `npm run web:start` to start;
the start command also runs setup before accepting traffic. Do not use a bare `next start`
command unless `npm run db:setup` has been configured as a separate deployment step.
For Sites deployments, run the setup command explicitly before starting the app.

Vendor profile saves publish the listing atomically. Public catalogue reads run a single
SELECT and expose handler duration in the `Server-Timing` response header. No catalogue
cache is added, so saved profile changes appear immediately.

Run `npm run test:vendors` for isolated PostgreSQL integration tests and
`npm run typecheck:vendors` for the vendor API and setup scripts. Run
`npm run benchmark:vendors` with a database URL to measure three read-only API handler
requests; this excludes frontend and browser-to-server network time. Tests use PGlite
and never access your Neon data.

## Native app

Start the iOS app on macOS with Xcode Simulator:

```bash
cd apps/mobile
npm ci
npx expo start --ios
```

Alternatively, install the mobile dependencies once, start Expo, and scan the QR code with an iPhone running Expo Go:

```bash
cd apps/mobile
npm ci
npx expo start --clear
```

From the repository root, validate the native project with `npm run typecheck:mobile` and `npm --prefix apps/mobile run export:ios`.

## Phase 5: vendor readiness

Vendors can manage their own business details, service packages and portfolio at
`/dashboard/profile` (also available from the workspace’s More menu). Legacy portfolio
links redirect there. Onboarding and workspace previews use the signed-in owner’s
listing ID, preserving the URL through business renames. Service categories match
marketplace discovery filters, and a state can be saved separately from a city/area.
New listings use a neutral cover until an owner uploads one.

Packages can be created, edited and archived. Archival hides a package from new
customer enquiries without deleting its existing enquiry references or quote history.
Uploaded media is validated, stored as uniquely named files and linked to the owner’s
Neon listing. Gallery changes and cover selection persist across refreshes; videos
support byte-range playback. Each portfolio supports 24 files; images (JPG, PNG, WebP)
are limited to 8 MB and MP4 videos to 25 MB. Onboarding covers are optional images.

### Coolify portfolio storage (web resource only)

Before deploying this branch:

1. Open the web application’s **Configuration → Persistent Storage**.
2. Add a **Volume Mount** named `vendor-media`. Leave Source Path empty and set
   **Destination Path** to `/app/storage/vendor-media`.
3. Add the runtime environment variable
   `SMITTEN_MEDIA_DIR=/app/storage/vendor-media` to the web resource.
4. Redeploy the web resource using the existing build/start commands above.
5. Upload a portfolio image, refresh the workspace and check the public profile.
   Redeploy once more and confirm that the image still loads.

The container user must be able to write to the mounted directory. Include this volume
in VPS backups: Neon stores metadata and links, not the file contents. Do not share the
volume across unrelated environments. Removed gallery files are retained on disk for
recovery; they are no longer served by the public media route after removal. A separate
retention policy will be needed before larger-scale use.

Local development defaults to the ignored `.data/vendor-media` directory under the web
workspace. Production refuses uploads without an explicitly configured storage path.
Vercel builds support the profile/package code, but filesystem portfolio uploads are
disabled there because deployment filesystems do not provide this persistent VPS
volume. Shared media across VPS and Vercel would require a later object-storage adapter.

`npm run test:vendors` verifies isolated PostgreSQL persistence, package ownership and
archival, media round trips, range responses, file validation and catalogue query counts.
It never modifies the live Neon database. Authenticated staging UI checks additionally
require a vendor account and the mounted Coolify volume.
