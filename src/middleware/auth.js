const { auth, db } = require("../config/firebaseAdmin");

/**
 * Requires a valid Firebase ID token in the Authorization header:
 *   Authorization: Bearer <idToken>
 *
 * On success attaches:
 *   req.uid          -> Firebase user id
 *   req.tokenEmail   -> email from the token
 *   req.userDoc      -> the Firestore users/{uid} document data (created if missing)
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Avtorizatsiya talab qilinadi (Bearer token yo'q)." });
    }

    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;
    req.tokenEmail = decoded.email || null;

    const userRef = db.collection("users").doc(decoded.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      // First time this user hits a protected route -> create their profile doc
      const newUser = {
        email: decoded.email || null,
        isPremium: false,
        premiumExpiresAt: null,
        role: "user",
        createdAt: new Date().toISOString(),
      };
      await userRef.set(newUser);
      req.userDoc = newUser;
    } else {
      req.userDoc = snap.data();
    }

    next();
  } catch (err) {
    console.error("Auth xatosi:", err.message);
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan." });
  }
}

/**
 * Must be used AFTER requireAuth. Blocks non-admins.
 */
function requireAdmin(req, res, next) {
  if (req.userDoc?.role !== "admin") {
    return res.status(403).json({ error: "Bu amal faqat administratorlar uchun." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
