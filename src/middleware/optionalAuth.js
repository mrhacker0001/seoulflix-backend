const { auth, db } = require("../config/firebaseAdmin");

/**
 * Like requireAuth, but never blocks the request. If a valid Bearer token is
 * present, req.uid/req.userDoc are populated; otherwise they stay null.
 * Useful for routes that behave differently for logged-in users but should
 * still work for anonymous ones (e.g. while PREMIUM_ENABLED=false).
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    req.uid = null;
    req.userDoc = null;
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.uid = decoded.uid;

    const userRef = db.collection("users").doc(decoded.uid);
    const snap = await userRef.get();
    req.userDoc = snap.exists ? snap.data() : null;
  } catch (err) {
    req.uid = null;
    req.userDoc = null;
  }

  next();
}

module.exports = { optionalAuth };
