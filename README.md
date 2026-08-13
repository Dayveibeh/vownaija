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

This repository contains the interactive MVP. The live demo is available at [vownaija.vercel.app](https://vownaija.vercel.app).

The current workflows use representative data. Production deployment will require external authentication, persistent database and object storage, transactional email, and a live AI service.

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
