# MAS Technical Mobile

Expo React Native mobile app for the MAS technical admin dashboard.

## Setup

1. Make sure the main project root `.env.local` is configured.
2. Optional supported keys in the root `.env.local`:
   - `GRAPHQL_API_URL`
   - `MOBILE_WEB_APP_URL`
   - `WEB_APP_URL`
   - `NEXT_PUBLIC_WEB_APP_URL`
   - `NEXT_PUBLIC_APP_URL`
3. Install dependencies:

```bash
npm install
```

4. Start Expo:

```bash
npm start
```

## Included Screens

- Login
- Overview
- Orders
- Status Board
- All Companies
- Company Detail
- Recent Activity
- Settings
- Add Order

## Notes

- GraphQL calls go directly to the backend API using access/refresh tokens.
- The mobile app reads shared environment values from the main dashboard root `.env.local`.
- `webAppUrl` is used for Cloudinary signed upload and secure PDF preview/download.
