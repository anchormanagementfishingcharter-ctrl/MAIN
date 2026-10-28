# Quick start: GitHub + Vercel (photos, Catch of the Day, admin)

This folder is a complete Next.js project. Push the whole folder to a new GitHub repository.

1. Supabase (free): create a project. SQL editor: run `00-schema.sql`, `01-database.sql`, `02-availability.sql`, `03-tags-media.sql` in order.
2. Put your logo at `public/logo.png`.
3. GitHub: create a repository and push this folder (`.env` files are ignored, so no secrets are uploaded).
4. Vercel: "Add New Project", import the repository, and add these Environment Variables (see `.env.example`):
   SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, SESSION_SECRET, SITE_URL.
   The Stripe, email and text settings can wait until you take real reservations (the photo alert quietly does nothing without them).
5. Deploy. Test: upload a photo at /photos, sign in at /login, approve it under Photos, refresh the home page.

Local test: copy `.env.example` to `.env.local`, fill it in, run `npm install` then `npm run dev`.

---

# Anchor Management: live reservation, payment, deposit hold, alerts

Starting contacts (change later at /admin/settings, no code changes needed):
- Text: (850) 362-9295
- Email: anchormanagementfishingcharter@gmail.com

## What a reservation does
1. The form calls `submitReservation()` (`lib/submitReservation.ts`) -> `POST /api/checkout`.
2. The server re-prices everything from the database (the browser's prices are ignored), checks stock for every date,
   and holds the gear for 35 minutes (`reserve_booking` in `00-schema.sql`). Two people cannot take the last set.
3. It saves the customer's signed agreement as a PDF in private storage and opens Stripe's payment page.
4. Customer pays -> Stripe calls `/api/stripe-webhook` -> booking confirmed -> owner gets email + text,
   customer gets a receipt. If they abandon payment, the gear is freed automatically.
5. Deposit: the card is saved at checkout. On delivery day a daily job (`/api/deposit-holds`) places a HOLD (not a charge).
   In /admin/bookings you tap "Gear returned: release deposit" or "Charge for damage".
6. A daily job (`/api/retry-alerts`) resends any alert or receipt that failed.

## Setup order
1. Supabase SQL editor: run `00-schema.sql`, then `01-database.sql`, then `02-availability.sql`, then `03-tags-media.sql` (tags, videos, photos and their storage).
2. Copy `lib/`, `app/` and `vercel.json` into the Next.js project.
3. `npm i stripe zod pdf-lib resend twilio @supabase/supabase-js`
4. Environment variables (Vercel):
   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   RESEND_API_KEY, ALERT_FROM_EMAIL (an address on your own domain, verified in Resend),
   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM,
   ADMIN_PASSWORD (the password for /login), SESSION_SECRET (a long random string), CRON_SECRET (another long random string), SITE_URL (your live web address).
5. Stripe webhook: `https://YOUR-SITE/api/stripe-webhook`, events `checkout.session.completed` AND `checkout.session.expired`.
6. Register your Twilio number for US business texting (A2P 10DLC or toll-free verification). Can take days to weeks.
7. Replace the sample text in `lib/terms.ts` with attorney-approved terms. Replace the starting products, prices,
   inventory, delivery cities and bait in `00-schema.sql` with your real ones (or edit them in the database).

## Admin area (/admin, password login at /login, set by ADMIN_PASSWORD)
- Starting password: AMadmin. CHANGE IT to something long before launch: the admin area can charge deposits and see customer details.
- The footer has an "Admin login" link. Sessions last 12 hours; "Log out" is in the admin menu.
- Bookings (new count badge, deposit release/charge), Prices, Package contents, Inventory (CSV import + tag numbers),
  Delivery cities and fees, Bait, Alerts (change the phone and email).
- The reservation page reads `/api/catalog` (packages, prices, "includes" line, cities, bait) and
  `/api/availability?start=&end=` (how many of each package are left for the dates picked).
  Editing in the admin changes what customers see within a minute.

## Tags, videos and photos
- /admin/tags: "Assign tags from inventory" gives a delivered booking its tag numbers (RR-001...), with "All gear returned"
  or per-tag returns, an "Add a tag" box (for the cart or a swap), and a search by client or tag. A tag can only be out once.
- /admin/videos: upload cooking and how-to videos (MP4, up to 50 MB; sent straight to storage). They show on /recipes and /howto.
- /photos: anyone can upload a photo (first name + permission box). Limits: 5 per hour per visitor, JPG/PNG/WebP, 3 MB.
  /admin/photos: Approve or Reject. The newest 6 approved photos rotate as Catch of the Day.
- Put `<CatchOfTheDay />` (components/CatchOfTheDay.tsx) near the top of the home page.
- Photos and videos are stored in public buckets under random file names, so a pending photo's link is not guessable
  but is not strictly private either. Do not accept anything sensitive.

## Reservation page and photo alert
- `app/page.tsx` (also served at /reserve) is the customer page: logo (put yours at `public/logo.png`), links, Catch of the Day,
  `app/reserve/Reserve.tsx` (packages, calendar, add-ons, delivery, bait, totals, agreement + signature, then Stripe) and the FWC license box.
- New photo alert: when a customer photo reaches the approval queue you get an email every time, and a text only when the queue
  goes from empty to one photo. The Photos tab in /admin shows a count badge.

## Rules built in (change in the `settings` table, key `rental`)
- Rentals up to 7 days, because card holds usually last about 7 days. Deposit starts at $100.

## Test before going live (Stripe test mode, card 4242 4242 4242 4242)
- Book, pay: you get the email + text, the customer gets the receipt, /admin/bookings shows it as New.
- Book the last set of gear in two browser tabs at once: the second one must be refused as sold out.
- Start checkout and close the page: after ~30 minutes the gear is available again.
- Use delivery date = today: the deposit hold appears in Stripe as "Uncaptured". Release it from /admin/bookings.
- Send the same Stripe event twice: only one alert.
- Use card 4000 0000 0000 9995 for the hold on a later booking to see the "HOLD FAILED" alert.
