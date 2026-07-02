const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { isPremiumActive, FREE_MONTHLY_EPISODE_LIMIT, currentMonthKey } = require("../services/premiumService");
const { db } = require("../config/firebaseAdmin");

const router = express.Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  const monthKey = currentMonthKey();
  const logSnap = await db
    .collection("users")
    .doc(req.uid)
    .collection("watchLog")
    .doc(monthKey)
    .get();

  const watchedThisMonth = logSnap.exists ? logSnap.data().count || 0 : 0;

  res.json({
    uid: req.uid,
    email: req.userDoc.email,
    role: req.userDoc.role || "user",
    isPremium: isPremiumActive(req.userDoc),
    premiumExpiresAt: req.userDoc.premiumExpiresAt || null,
    freeEpisodesWatchedThisMonth: watchedThisMonth,
    freeEpisodeLimit: FREE_MONTHLY_EPISODE_LIMIT,
  });
});

module.exports = router;
