# CareTrack

CareTrack is a Tailwind CSS + Next.js clinic CRM for patients, follow-ups, appointments, prescriptions, reports, invoices, analytics, and clinic settings. The frontend remains usable in offline demo mode; the Express/MongoDB API provides persistent, authenticated data.

## Start the application

In one terminal, start the API:

```bash
cd server
cp .env.example .env
# Add MONGODB_URI and JWT_SECRET to server/.env
npm install
npm run dev
```

In another terminal, start the Next.js frontend:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create the first doctor account from the login screen, then sign in.

To create representative data in an otherwise empty MongoDB database, run this once from `server/` after configuring its `.env`:

```bash
npm run seed
```

## Required environment values

`server/.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=use-a-long-random-secret
CORS_ORIGIN=http://localhost:3000
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Never commit real `.env` files. Templates are available in [.env.example](/Users/devanshumathur/Desktop/Follow-UP/.env.example) and [server/.env.example](/Users/devanshumathur/Desktop/Follow-UP/server/.env.example).

## Demo mode

If the API is unavailable, select **Use demo workspace** and sign in with:

```text
doctor@caretrack.demo
CareTrack@2026
```

Demo data is stored only in the browser. It is useful for UI testing; it is not a substitute for MongoDB persistence.

## Verify

```bash
npm run lint
npm run build
cd server && npm run check
```
