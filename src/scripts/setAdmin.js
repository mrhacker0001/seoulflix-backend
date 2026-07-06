/**
 * Birinchi adminni tayinlash uchun bir martalik skript.
 * Ishlatish: node src/scripts/setAdmin.js someone@example.com
 */
require("dotenv").config();
const { auth, db } = require("../config/firebaseAdmin");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Foydalanish: node src/scripts/setAdmin.js azwebdanaterrr@gmail.com");
    process.exit(1);
  }

  const user = await auth.getUserByEmail(email);
  await db.collection("users").doc(user.uid).set({ role: "admin" }, { merge: true });

  console.log(`✅ ${email} (uid: ${user.uid}) endi admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Xato:", err.message);
  process.exit(1);
});
