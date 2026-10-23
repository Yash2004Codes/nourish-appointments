# Nourish - Documentation

*(Draft - edit in your own words before exporting to PDF. Fill in the hosted link.)*

## What we were asked
A small appointments product with two sides sharing one dataset: a mobile-first client app (home with next appointment, booking with no double booking, upcoming/past visits with reschedule and cancel) and a nutritionist dashboard (list with Booked/Done/No-show status in different colours, manual add, "today" filter, two-way sync, preloaded sample data). Include at least one feature that helps with no-shows, and add anything important that was missed.

## Your approach
Next.js + TypeScript + Tailwind, with API routes backed by Amazon DynamoDB, hosted on AWS Amplify. One set of API routes serves both sides, so anything booked or changed on one shows on the other (the dashboard refreshes every few seconds and when the tab regains focus). The look is calm and warm (sage green, cream, a soft serif for headings) with a bottom tab bar on phones and a top bar on desktop.

## Decisions and assumptions
- **No logins** (as the brief says). Clients are recognised by mobile number, stored in the browser after their first booking. Trade-off: anyone who knows a number can see its visits; a real product would verify with a one-time code.
- **Double booking** is prevented in the database, not just the UI: each slot has a lock row created in a single DynamoDB transaction with the appointment, and only one request can create it. Tested with 8 simultaneous requests for one slot - exactly one wins.
- **Slots:** 30 minutes, 9:00-17:00, every day (the sample data has a Sunday booking), bookable up to 30 days ahead. All times are IST.
- **Cancelled** is a fourth status, shown in grey and hidden from the default dashboard list. The brief lists three statuses; cancelling needs somewhere to go, and keeping the row preserves history.
- **Sample data:** dates (`24/10/2026`, `2026-10-24`, `25-10-2026`) are read day-first and converted to ISO; times (`11:30am`, `4 pm`, `14:00`) to 24-hour; phones to digits only, which also shows the two Riya Shah rows are one client. Meera Iyer has no phone, so it stays blank ("No phone on file") rather than invented. Past rows keep their given status.
- Cancelling or rescheduling is allowed only for upcoming booked visits; rescheduling resets confirmation.

## What we added
- **Phone-number lookup** for returning clients, because without a login "my appointments" has nothing to attach to.
- (No-show helpers, also added: one-tap client confirmation, Confirmed/Not-confirmed badges, repeat no-show warning, no-show rate, WhatsApp reminder button.)

## What the AI got wrong
- Slot buttons sat inside the booking `<form>` without `type="button"`, so tapping a time submitted the form and booked immediately. Caught when an automated browser test created a booking nobody asked for; fixed by setting `type="button"`.
- The desktop booking page overflowed: the horizontally scrolling day strip stretched the CSS grid and pushed the details column off-screen. Caught in a screenshot; fixed with `min-w-0` and `minmax(0, ...)` columns.
- Under simultaneous bookings DynamoDB returned a transaction *conflict* (not a failed condition), which the code turned into a 500 error. Caught by firing parallel requests; conflicts now return the friendly "slot taken" 409.
- The Next.js project template ships experimental caching flags and a stricter lint rule than needed; these were removed/relaxed after the first build.
- *(Add anything else you noticed.)*

## How to run it
```
npm install
npm run dev          # http://localhost:3000, in-memory data with the sample rows
```
Real DynamoDB: `DYNAMODB_TABLE=nourish-appointments AWS_REGION=ap-south-1 npm run dev`. Client app at `/`, dashboard at `/dashboard`. "Reset demo data" at the bottom of the dashboard restores the sample rows.

Hosted: <paste link here> · Code: <paste GitHub link here>
