const admin = require("firebase-admin");

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON topilmadi. .env faylida uni to'ldiring (Firebase Console -> Project Settings -> Service Accounts)."
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON noto'g'ri JSON formatida. Butun service account faylini bitta qatorga joylashtiring."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
