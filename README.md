# Smitten

A Nigerian wedding-vendor marketplace for discovering trusted vendors by service, location and budget. The repository contains the web marketplace and the native iOS app in one workspace.

## Codebase

- `app/` — Next.js web marketplace, customer account, Smitten AI matching and vendor portal
- `apps/mobile/` — Expo/React Native app for iPhone
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

```bash
npm run install:ci
npm run dev
```

Create a production build with:

```bash
npm run build
```

Start the iOS app on macOS with Xcode Simulator:

```bash
npm run mobile:install
npm run mobile:ios
```

Alternatively, install the mobile dependencies once, start Expo, and scan the QR code with an iPhone running Expo Go:

```bash
npm run mobile:install
npm run mobile
```

Validate the native project with `npm run typecheck:mobile` and `npm --prefix apps/mobile run export:ios`.
