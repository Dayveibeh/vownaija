# VowNaija

A Nigerian wedding-vendor marketplace for discovering trusted vendors by service, location and budget. The repository contains the web marketplace and the native iOS app in one workspace.

## Codebase

- `app/` — Next.js web marketplace, customer account, Vowi matching and vendor portal
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
- Shared Vowi recommendations across the web and iOS experiences

## Current status

This repository contains the interactive MVP. The live demo is available at [vownaija.ehebarighe.chatgpt.site](https://vownaija.ehebarighe.chatgpt.site).

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
npm run mobile:ios
```

Alternatively, run `npm run mobile` and open the project with Expo Go on an iPhone. Validate the native project with `npm run typecheck:mobile` and `npm run export:ios --workspace @vownaija/mobile`.
