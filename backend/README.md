# Dev Internship Platform — 100% Free-Tier Build (No Card Required)

This build runs entirely on Firebase's free **Spark plan** — no billing
account, no card, no Cloud Functions, no Cloud Storage. Only **Firestore**
(free) and **Hosting** (free) are used.

## What changed vs. a "proper" backend, and why

Firebase's free plan does not support Cloud Functions or Cloud Storage —
that's a Google rule, not something any code change can get around. Without
a server, the following moved into the browser:

| Piece | Server version | This free version |
|---|---|---|
| Task assignment | Cloud Function picks tasks | Browser picks tasks, writes directly to Firestore |
| Batch/seat counter | Server enforces atomicity | Firestore Rules constrain it as much as possible |
| Identity check | Email match, server-verified | appId itself is an unguessable "capability URL" |
| Email sending | SendGrid via Cloud Function | EmailJS, sent directly from the browser |
| Payment | Razorpay order + signature verified server-side | Razorpay Checkout only — **not cryptographically verified** |
| Certificate PDF | Generated + stored server-side | Generated in-browser, downloaded directly, not stored |

**Be honest with yourself about the trade-off**: this version can be
tampered with by anyone who opens devtools — fake tasks, faked "payment",
etc. For a low-stakes practice/portfolio internship this is a reasonable
trade against the cost of a card-linked plan. If this platform ever
needs to be trustworthy for something people pay real money for at scale,
it should move back to the Cloud Functions version.

## Full file structure

```
landing-page.html / backend/public/index.html   ← same file, application form
submit.html / backend/public/submit.html          ← same file, task submission + payment + certificate

backend/
  SCHEMA.md                ← data model
  README.md                ← this file
  firebase.json             ← firestore + hosting only
  firestore.rules           ← capability-URL + constrained-transition rules
  firestore.indexes.json    ← composite index for the task-pool query
  public/                    ← what actually gets hosted (copies of the two HTML files)
  seed/
    tasks-data.json          ← the 10 sample tasks
    seed-tasks.js             ← one-time script to push them into Firestore
    package.json
    .gitignore
```

## Setup, in order

1. **Create the Firebase project**, enable Firestore (Build → Firestore
   Database → Create database, Native mode, any region). Do **not** touch
   Functions or Storage — they're not used.

2. **Deploy rules + indexes**
   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add          # select your project
   firebase deploy --only "firestore:rules,firestore:indexes"
   ```

3. **Seed the task pool** (this step still uses the Admin SDK directly via
   Node.js — it does NOT require Blaze, since it's not a Cloud Function)
   ```
   cd seed
   npm install
   # add serviceAccountKey.json here (Firebase Console → Project Settings
   # → Service Accounts → Generate new private key)
   node seed-tasks.js
   ```

4. **Get your web app's Firebase config**
   Firebase Console → ⚙️ Project Settings → General → "Your apps" → Add
   web app → copy the `firebaseConfig` object.

5. **Fill in config in both `backend/public/index.html` and
   `backend/public/submit.html`**:
   - `firebaseConfig` (same object, both files)
   - `RAZORPAY_KEY_ID` in `submit.html` (public Key ID only — never put
     the Key Secret in a browser file)
   - Optionally: `EMAILJS_PUBLIC_KEY` / `EMAILJS_SERVICE_ID` /
     `EMAILJS_TASKS_TEMPLATE_ID` / `EMAILJS_CERT_TEMPLATE_ID` — sign up at
     emailjs.com (free, 200 emails/month, no card) if you want automated
     emails. Without this, tasks still show on-screen after applying, and
     the certificate still downloads — you just won't get emails.

6. **Deploy hosting**
   ```
   firebase deploy --only hosting
   ```
   You'll get a live URL like `https://your-project.web.app`.

## Razorpay note

Since there's no server to verify payments, use **Razorpay Test Mode**
while building, and treat "payment claimed" as exactly that — a claim, not
a verified fact. If you want to double check someone before honoring a
certificate, cross-reference `paymentId` stored on their application
against the Razorpay Dashboard → Transactions.

## What's genuinely still manual with this version

- **Waitlist rollover**: waitlisted applications aren't automatically
  moved into the next batch.
- **Payment verification**: trust-based, as explained above.
- **No hosted certificate link**: the PDF only exists as a browser
  download. If someone loses it, revisiting `submit.html?app=<id>` and
  confirming their email will regenerate it for them (data's still in
  Firestore).

## If you outgrow this later

Everything here maps directly onto the Cloud Functions version this was
built from — the data model (`SCHEMA.md`-equivalent fields) is unchanged.
Moving to Blaze later mostly means re-adding server-side functions for
task assignment, payment verification, and certificate storage, without
needing to redesign the data model.
