# Firestore Schema (Free-Tier / Client-Only Build)

Two collections plus one singleton doc — everything the browser can read
and write directly, since there's no Cloud Functions layer.

## `meta/currentBatch`

```
meta/currentBatch
  batchId:      string
  startDate:    timestamp
  endDate:      timestamp    startDate + 7 real days
  seatLimit:    number       randomly 5–10, picked fresh each batch
  seatsFilled:  number       incremented by the browser, constrained by rules
```

Firestore Rules restrict updates to exactly +1 increments (while seats
remain) or a full rollover once `endDate` has genuinely passed — see
`firestore.rules` for the exact logic. This is weaker than a server-enforced
transaction (a devtools user could spam +1s without applying) but stops
casual tampering with `seatLimit` or `endDate` themselves.

## `tasks` (the pool — seeded once via `seed/seed-tasks.js`)

```
tasks/{taskId}
  title, displayId, track, objective, techRequirements[], mustInclude[],
  submissionNotes, active
```

Unchanged from the server version — public read, no client writes.

## `applications/{appId}`

```
applications/{appId}
  name, email, phone, track
  status:            "assigned" | "waitlisted" | "submitted" | "certified"
  batchId
  createdAt

  assignedTaskIds:   string[]
  assignedTasks:      array<map>    (denormalized snapshot, same as before)
  assignedAt, deadline

  submissionLinks:   array<map>    [{ taskId, githubUrl, liveUrl }]
  submittedAt, submittedLate

  paymentClaimed:    boolean       set by the browser after Razorpay's
                                    checkout callback fires — NOT
                                    cryptographically verified (no secret
                                    key in the browser)
  paymentId:         string        Razorpay payment ID, for manual audit
  paidAt

  certId, certifiedAt
  # no certificateUrl — the PDF is generated client-side on demand and
  # downloaded directly, never uploaded anywhere
```

### The `appId` is the access control

There's no Firebase Auth and no server to check "does this email match
this application" — so the Firestore auto-generated document ID itself
(long, random, effectively unguessable) is what gates access. This is a
standard pattern ("capability URL") for no-backend apps: whoever has the
link, has access. Rules block `list`ing all applications, so nobody can
enumerate the collection to go fishing for valid IDs — but a specific ID,
once known, works.

### Why the update rules are shaped the way they are

Each status transition is guarded individually in `firestore.rules`
(`assigned → submitted`, `submitted → paymentClaimed`, `→ certified`) so
that even without a server, the *order* of the pipeline can't be skipped —
someone can't jump straight to `certified` without first having a
`submitted` application with `paymentClaimed: true`, for example. It's not
as strong as a Cloud Function checking full business logic, but it's real
protection against the obvious shortcuts.
