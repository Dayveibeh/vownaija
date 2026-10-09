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

### Customer planning and inactivity logout (Phase 5)

Customers manage wedding details, exact budgets, allocations and checklist tasks at `/couples/planning`. The workspace dashboard reads their saved allocations and tasks instead of sample figures. Planning data and favourites live in Neon under the authenticated Clerk user ID. Deployment `npm run db:setup` adds `customer_budget_items` and `customer_checklist_items` without replacing existing data. No additional Coolify resource or environment variable is needed.

The web app signs out the active Clerk session after **10 minutes without user interaction**, with a warning during the last two minutes. Clicks, typing, touch gestures, mouse movement and wheel scrolling reset the timer. Refreshing, switching tabs, notification polling and API requests do not reset it. Tabs using the same Clerk session share activity; a new sign-in starts a fresh timer. This is the application's idle policy, separate from Clerk's maximum session lifetime. The previous `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES` and warning overrides are no longer used.

Validation: `npm run test:customers` exercises customer APIs, account isolation, persistence, database failure rollback, booking/payment summary reads and the idle timer against isolated PostgreSQL fixtures. `npm run test:vendors` retains the vendor regression checks. Payment tests use recorded fixtures and never contact a payment provider or move funds.

After merging and redeploying the existing web resource from `main`, verify on staging:
1. Customer workspace → More → Wedding details. Save details and a total budget, refresh, and confirm they remain.
2. Add/edit/remove a budget allocation. Confirm the workspace summary reflects it.
3. Add a checklist task, mark it complete, and refresh. Confirm it stays complete.
4. Save a vendor, sign out and back in (or sign in on another device), and check the saved list.
5. Leave the signed-in site untouched for ten minutes. Confirm the two-minute warning and sign-out. Interact before expiry to confirm the timer resets; refreshing alone must not reset it.

Authenticated browser checks on the deployed site remain necessary after deployment.

### Booking reviews and marketplace administration (Phase 5)

Customers confirm delivery from their booking page, on or after the booking date in Nigeria (or after delivery when no date is recorded). Only the booking customer can confirm; cancelled bookings are excluded. Completion records `bookings.completed_at` without initializing payments or releasing payouts.

Completed bookings support one review each: 1–5 stars, a title and feedback. Reviews and edits await admin approval. Published feedback appears on the vendor profile with the customer's first name and a **Booking verified** label. Private booking and account IDs stay private. Vendors access feedback through **More → Reviews** (`/dashboard/reviews`). Published reviews alone determine the public rating; the old sample dashboard reviews and placeholder catalogue ratings are removed. Deployment recalculates catalogue scores from published booking reviews.

Admins use `/admin/marketplace` to approve or hide reviews and hide or restore vendors, with an audit reason for every action. An operator grants access through Clerk **private metadata**: `{"smitten":{"role":"admin"}}`. Opening the admin page syncs that trusted role to the account. User-editable unsafe metadata and database roles alone cannot authorize the new APIs. Revoking trusted metadata blocks subsequent API requests immediately. Approval checks the review revision to prevent publishing feedback edited since the admin loaded it.

Vendor hiding covers public discovery, profiles, saved lists, new enquiries and public portfolio endpoints. The separate `moderation_status` survives profile edits and deployment backfills. Existing bookings and messages remain accessible to participants. Restoration preserves onboarding requirements. Previously cached portfolio responses can remain visible for their existing five-minute cache lifetime.

Schema setup adds `booking_reviews`, `marketplace_admin_events`, `bookings.completed_at` and `marketplace_vendors.moderation_status`. Records live in the existing Neon database; code lives in GitHub. After merging, redeploy the existing **smitten-web-test** Coolify web resource. No additional resource or environment variable is required. Admin queues and vendor lists show up to 200 records; the audit feed shows 50 actions and public profiles show 100 reviews. Vendor summaries aggregate all published reviews.

`npm run test:reviews` exercises the isolated PostgreSQL enquiry → quote → booking → completion → review → approval workflow, concurrent repeat submissions, ownership, future/cancelled bookings, trusted admin authorization and revocation, stale approval, rollback, ratings and persistent visibility. Existing vendor and customer suites remain regression checks. DATE fixtures now match PostgreSQL serialization, and quote acceptance preserves Neon's calendar dates. Tests do not contact live Neon or move funds.

After deployment, verify authenticated screens at `dev.smitten.com.ng`:
1. Create a test booking with a past date, confirm delivery, submit feedback and refresh. It must remain pending and absent publicly.
2. With a trusted admin account, publish the review with a reason. Check the public profile, rating, vendor Reviews page and audit entry.
3. Edit feedback as the customer. It returns to pending and leaves the public rating until approved. Approval from an older admin screen must require a refresh.
4. Hide a vendor, check search and the direct profile, then edit the vendor profile to confirm it stays hidden. Restore it and check discovery again.
5. Check mobile inputs, navigation, inline moderation confirmation and bottom notifications. Authenticated staging browser verification remains necessary after deployment.

### Admin workspace and account safety (Phase 5)

The admin home is `/admin`, with shared navigation to Users, Transactions, Finance controls, Marketplace and Activity log. Admin access requires an active Smitten account and Clerk **private metadata** `{"smitten":{"role":"admin"}}` in the same Clerk instance as the deployment. An email address or a database role alone does not grant administrative API access. Existing financial actions and admin receipt access also check trusted metadata.

Users (`/admin/users`) supports name/email/user-ID search, role/access/risk filters, and pages of 25 accounts. Admins can suspend, restore, remove, flag or clear a suspicious flag on customer and vendor accounts. Every action requires a reason and writes an audit record atomically with the account change. Removal additionally requires typing the account email. Admin accounts are protected from these controls, and revision checks reject stale actions from another admin screen.

Suspension and removal disable **Smitten access**, including existing-session API actions; they do not delete or ban the identity in Clerk. Restricted users are redirected to `/account/restricted`, and sign-in/bootstrap cannot reset their status. Removed accounts retain bookings, payments and audit history and can be restored. Suspended/removed vendor listings are excluded from discovery, saved lists, new enquiries, public reviews and portfolio access. Previously cached portfolio responses retain their existing five-minute lifetime. Restoration preserves independent listing moderation and suspicious flags. Flags alone do not restrict access. Provider callbacks and settlement processing continue to preserve financial records.

Transactions (`/admin/transactions`) includes paid, pending, created, failed, cancelled and refunded orders, with reference/name/email/ID search, payment/funds filters and inclusive date ranges in Nigeria time. Pages contain 25 records. Detail views show safe payment events, dispute/refund cases and payout status; provider authorization payloads and bank details are not exposed. Totals represent recorded order amounts, including unpaid attempts, rather than money received. Financial operations remain in the existing Finance controls. The Activity log shows the 100 most recent account and marketplace actions; financial events appear in transaction details.

Schema setup adds `smitten_users.account_status`, `suspicious` and `admin_revision` idempotently and preserves restrictions on redeploy. Code is in GitHub; status, flags, transactions and audit records are in the existing Neon database. After merge, redeploy **smitten-web-test** in Coolify. No new resource or environment variable is required.

`npm run test:admin` exercises trusted admin authorization and revocation, cross-origin rejection, flags, stale revisions, suspension with existing sessions, bootstrap protection, typed removal, record retention, restoration, pagination, date filters, safe financial detail views and rollback when an audit write fails. It uses isolated PostgreSQL and never contacts the live database or moves funds.

After deployment:

1. Sign in to `dev.smitten.com.ng` as the trusted admin and open `/admin`. Check all six navigation destinations and the account/financial summaries.
2. Find a disposable customer/vendor account, flag it with a reason, and check the risk filter and Activity log. The flagged account should keep access.
3. Suspend that account while it has another browser session open. Its API actions should fail and workspace pages should redirect to the restricted-account page; vendor discovery should hide its listings. Restore it and check that the suspicious flag remains.
4. Remove the disposable account by typing its email and providing a reason. Its prior bookings and payments must remain visible to the admin. Restore access when finished.
5. Search Transactions by a known reference/email, try status and Nigeria-date filters, and inspect event/case/payout history. Check pagination and mobile readability. An ordinary customer/vendor and an admin with revoked trusted metadata must not be able to read admin APIs or use finance controls.

Authenticated staging browser verification remains necessary after deployment.
