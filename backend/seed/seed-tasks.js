/**
 * One-time script to populate the `tasks` collection.
 * Run it once when setting up the project, and again any time you add
 * new tasks to tasks-data.json.
 *
 * Setup:
 *   1. npm install firebase-admin
 *   2. Download a service account key: Firebase Console → Project Settings
 *      → Service Accounts → Generate new private key.
 *   3. Save it as ./serviceAccountKey.json in this folder (already .gitignored
 *      below — never commit this file).
 *   4. node seed-tasks.js
 */
const admin = require("firebase-admin");
const tasks = require("./tasks-data.json");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seed() {
  const batch = db.batch();

  tasks.forEach((task) => {
    // Use the displayId as the doc ID so re-running this script updates
    // existing tasks instead of duplicating them.
    const ref = db.collection("tasks").doc(task.displayId);
    batch.set(ref, task, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${tasks.length} tasks (${tasks.filter(t => t.track === "frontend").length} frontend, ${tasks.filter(t => t.track === "backend").length} backend).`);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
