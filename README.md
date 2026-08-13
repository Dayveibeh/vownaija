# VowNaija

A Nigerian wedding-vendor marketplace for discovering trusted vendors by service and location.

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
