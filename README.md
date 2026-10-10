# Still / Form Barber Appointments

A beginner-friendly MERN appointment system. React/Vite runs customer, barber, and admin interfaces, Express provides the API, and MongoDB Atlas stores accounts, services, barbers, appointments, and reviews.

## Requirements

- Node.js 20.19 or later
- npm
- A MongoDB Atlas cluster or a local MongoDB Community Server

## Configure MongoDB

1. For Atlas, create a database user and allow your development IP address under Network Access. For local development, start MongoDB Community Server.
2. Copy `server/.env.example` to `server/.env`.
3. Set `MONGO_URI` to your Atlas connection string or `mongodb://127.0.0.1:27017/barber_db`. URL-encode special characters in the database password.
4. Replace `JWT_SECRET` with a long, random value. Keep `server/.env` private.

The API will not start until `MONGO_URI` (or `MONGODB_URI`) and `JWT_SECRET` are configured and the database is reachable. On first start, it creates the default administrator and the example service/barber records when those collections are empty.

## Email verification

Customer registration sends a six-digit code through Gmail SMTP. Enable 2-Step Verification on the sender account, create a new Google App Password, and set `EMAIL_USER` and `EMAIL_PASS` in `server/.env`. Do not use your regular Gmail password. Codes expire after 10 minutes, allow five attempts, and can be resent once per minute. Registration remains blocked until the code is verified. Rotate any app password previously shared in chat.

Appointment request, confirmation, rejection, cancellation, and upcoming reminders are emailed through these SMTP settings. The reminder worker checks every two minutes while the API process is running.

The current scheduler sends separate 24-hour and 2-hour notices from a two-minute cron check. Barber avatar images are loaded from the barber profile's HTTPS `avatarUrl`, then `BARBER_AVATAR_FALLBACK`, then a monogram. Email templates respect light/dark mail-client preferences.

## Checkout and reviews

Customers can choose pay-at-shop or `Demo online checkout`. Demo checkout records a clearly labeled `DEMO-` reference and does not charge money or collect card details. Use a real provider integration and verified webhooks before accepting online payments in production.

Customers can leave one 1–5 star review with optional feedback after each completed appointment. Published reviews appear on the homepage. Barber management supports recurring breaks and date-specific days off; both are enforced in availability and booking validation.

## AI-style assistance

Style recommendations use the face shape selected by the customer and never upload/analyze the optional local photo preview. Recommendations and peak-hour insights are explainable history/count heuristics; review sentiment is a simple keyword triage signal, not an authoritative model. The booking assistant checks actual slots and always returns a proposal for the customer to review; it never creates an appointment from chat alone.

An OpenAI-compatible chat completion adapter can be enabled with `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. It is opt-in per chat message, uses HTTPS, masks email addresses and phone numbers, and is not used for images. Set no key to keep all assistant parsing local. Review the provider's data terms before enabling it.

## Install and run

From this project directory:

```sh
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

Open the Vite address shown in the terminal (normally `http://localhost:5173`). The Express API listens on `http://localhost:5001`; `GET /api/health` reports its status.

Default administrator for local development:

- Email: `admin@barber.com`
- Password: `Admin123!`

Do not deploy with the default credentials. Change the seeded credentials in `server/config/seed.js` before creating the production admin account.

## Checks

```sh
npm run lint
npm run build
npm --prefix server test
```

## Project map

- `client/src/pages/` contains the customer pages and admin dashboard.
- `client/src/context/` and `client/src/hooks/` handle the signed-in user session.
- `client/src/services/api.js` configures Axios and attaches the JWT.
- `server/models/` defines the user, barber, service, appointment, and review collections.
- `server/routes/` contains authentication, catalog, booking, and customer APIs.
- `server/config/seed.js` creates the first admin and starter catalog records.
- `server/utils/schedule.js` contains appointment time and reservation helpers.
- `server/services/aiAssistant.js` contains local recommendation, chat-intent, peak-hour, and review-triage heuristics.

Admin-created barber logins use the `barber` role and are linked to exactly one barber profile. Barber API routes scope every appointment query to that profile. The admin must give the initial password to the barber through a separate secure channel.

## AI boundaries

Local face-shape guidance does not inspect images. The optional reference photo preview remains in the browser and is never uploaded. Local booking intent parsing proposes slots but never creates appointments. Optional external LLM parsing requires an explicit per-message checkbox and configured `AI_API_KEY`; email and phone patterns are masked before sending. Recommendations use customer history, saved hair/style preferences, popularity, and review averages. Peak-hour and sentiment insights are heuristics and should be reviewed by a human. No automatic price changes are made.

An actual virtual hairstyle try-on requires a tested on-device face-landmark/hair-rendering model and licensed hairstyle assets; this project does not simulate a try-on or claim facial analysis.

## Booking rules

Customers can book active services with active barbers on configured working days, outside scheduled breaks and date-specific days off, and during working hours. Availability is returned in 15-minute increments; service duration determines the end time. MongoDB unique reservation keys prevent overlapping bookings even when requests arrive concurrently. Customers can see only their own appointment records and can cancel pending or confirmed appointments at least 24 hours before the start. Admins confirm or reject pending requests and mark confirmed appointments completed.

The default administrator credentials are for local development only. Set a production `JWT_SECRET`, configure Atlas network access securely, and replace the default credentials before deployment.