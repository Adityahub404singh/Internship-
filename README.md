# Dev Internship Platform

A 100% free-tier internship application, task-submission, and certification
platform — no billing account, no card, no Cloud Functions, no Cloud
Storage. Built entirely on Firebase's free **Spark plan**, using only
**Firestore** and **Hosting**.

--

## How it works, end to end

```
Applicant                          Admin                         Applicant
    │                                │                                │
    ├─ fills application form        │                                │
    │  (index.html)                  │                                │
    │                                │                                │
    ├─ status: "assigned"            │                                │
    │  (or "waitlisted" if full)     │                                │
    │                                │                                │
    │                        ├─ opens admin.html                      │
    │                        ├─ reviews new applicants                │
    │                        └─ clicks Approve ─────► task email +    │
    │                                                  offer email    │
    │                                                  sent together  │
    │                                                                 │
    │                                                        ├─ opens submit.html?app=<id>
    │                                                        ├─ submits GitHub + live links
    │                                                        ├─ status: "submitted"
    │                                                        ├─ completes Razorpay checkout
    │                                                        ├─ paymentClaimed: true
    │                                                        ├─ status: "certified"
    │                                                        └─ certificate PDF generated
```

Emails are **not** sent automatically the moment someone applies. An admin
reviews each new applicant in `admin.html` and clicks **Approve**, which
sends the task list and the internship offer in the same step and marks
the application so it can't be double-approved.

---

## Why this looks different from a "normal" backend

Firebase's free plan doesn't support Cloud Functions or Cloud Storage —
that's a platform limit, not a design choice. Without a server, these
pieces moved into the browser:

| Piece | Server version | This free version |
|---|---|---|
| Task assignment | Cloud Function picks tasks | Browser picks tasks, writes directly to Firestore |
| Batch/seat counter | Server enforces atomicity | Firestore Rules constrain it as much as possible |
| Identity check | Email match, server-verified | The `appId` itself is an unguessable "capability URL" |
| Approval + email | Admin action via secured backend | `admin.html`, gated by a client-side password prompt |
| Payment | Razorpay order + signature verified server-side | Razorpay Checkout only — **not cryptographically verified** |
| Certificate PDF | Generated + stored server-side | Generated in-browser, downloaded directly, not stored |

**Trade-off, stated plainly:** anyone with devtools open can tamper with
this — fake tasks, faked "payment," or (since `admin.html`'s password
check happens entirely in the browser) reading the page's source to find
it. That's an acceptable trade for a low-stakes practice/portfolio
internship run on a free plan. If this ever needs to be trustworthy for
something people pay real money for at scale, move the approval,
payment-verification, and email logic into Cloud Functions on a paid
(Blaze) plan.

---

## File structure

```
landing-page.html / backend/public/index.html   ← application form
submit.html       / backend/public/submit.html   ← task submission + payment + certificate
                     backend/public/admin.html    ← password-gated approval panel

backend/
  README.md                 ← this file
  SCHEMA.md                 ← data model
  firebase.json              ← firestore + hosting config
  firestore.rules            ← capability-URL + constrained-transition rules
  firestore.indexes.json     ← composite index for the task-pool query
  public/                     ← what actually gets hosted
  seed/
    tasks-data.json           ← the sample task pool
    seed-tasks.js              ← one-time script to push tasks into Firestore
    package.json
    .gitignore
```

---

## Setup, in order

1. **Create the Firebase project.** Enable Firestore (Build → Firestore
   Database → Create database, Native mode, any region). Leave Functions
   and Storage untouched — they're not used.

2. **Deploy rules + indexes**
   ```
   npm install -g firebase-tools
   firebase login
   firebase use --add          # select your project
   firebase deploy --only "firestore:rules,firestore:indexes"
   ```

3. **Seed the task pool** (uses the Admin SDK directly via Node.js — this
   does *not* require the Blaze plan, since it isn't a Cloud Function):
   ```
   cd seed
   npm install
   # add serviceAccountKey.json here
   # (Firebase Console → Project Settings → Service Accounts → Generate new private key)
   node seed-tasks.js
   ```

4. **Get your web app's Firebase config.**
   Firebase Console → ⚙️ Project Settings → General → "Your apps" → Add
   web app → copy the `firebaseConfig` object.

5. **Fill in config** in `index.html`, `submit.html`, and `admin.html`:
   - `firebaseConfig` — same object, all three files
   - `RAZORPAY_KEY_ID` in `submit.html` (public Key ID only — never put
     the Key Secret in a browser file)
   - `ADMIN_PASSWORD` in `admin.html` — change this from the default
     before deploying; anyone who guesses it can approve applicants
   - EmailJS keys (sign up free at emailjs.com, 200 emails/month, no
     card): `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`,
     `EMAILJS_TASKS_TEMPLATE_ID`, `EMAILJS_OFFER_TEMPLATE_ID` in
     `admin.html`, and `EMAILJS_CERT_TEMPLATE_ID` in `submit.html`.
     Without these, applicants still see their tasks on-screen and the
     certificate still downloads — they just won't get emails.

6. **Deploy hosting**
   ```
   firebase deploy --only hosting
   ```
   You'll get a live URL like `https://your-project.web.app`. The admin
   panel lives at `https://your-project.web.app/admin.html` — don't link
   to it from anywhere public.

---

## Razorpay note

Since there's no server to verify payments, use **Razorpay Test Mode**
while building, and treat "payment claimed" as exactly that — a claim,
not a verified fact. To double-check someone before honoring a
certificate, cross-reference the `paymentId` stored on their application
against the Razorpay Dashboard → Transactions.

## Admin panel note

`admin.html` has no real authentication — the password prompt is a
client-side UI gate, not a Firestore-enforced permission. Firestore Rules
allow *anyone* to list and read applications and to flip `emailsSent` on
an `"assigned"` application (that's what makes the Approve button work
without a server). Don't put anything in this app you wouldn't want a
determined visitor to see or trigger; that's the deliberate trade-off of
running with no backend and no card on file.

## What's genuinely still manual with this version

- **Waitlist rollover** — waitlisted applications aren't automatically
  moved into the next batch.
- **Payment verification** — trust-based, as explained above.
- **No hosted certificate link** — the PDF only exists as a browser
  download. If someone loses it, revisiting `submit.html?app=<id>` and
  confirming their email will regenerate it for them (the data's still
  in Firestore).

## If you outgrow this later

Everything here maps directly onto a Cloud Functions version — the data
model is unchanged. Moving to Blaze later mostly means re-adding
server-side functions for task assignment, approval/email sending,
payment verification, and certificate storage, without needing to
redesign the data model.
