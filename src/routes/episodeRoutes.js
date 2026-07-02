const express = require("express");
const { optionalAuth } = require("../middleware/optionalAuth");
const { checkAndRegisterEpisodeAccess, PREMIUM_ENABLED } = require("../services/premiumService");
const { db } = require("../config/firebaseAdmin");

const router = express.Router();

// POST /api/episodes/:dramaId/:episodeId/access
// Call this right before playing an episode. While PREMIUM_ENABLED=false this
// always allows access (no login required). Once turned on, it enforces the
// free monthly limit and requires the user to be logged in.
router.post("/:dramaId/:episodeId/access", optionalAuth, async (req, res) => {
  const { dramaId, episodeId } = req.params;

  if (PREMIUM_ENABLED && !req.uid) {
    return res.status(401).json({ error: "Avtorizatsiya talab qilinadi." });
  }

  const epSnap = await db
    .collection("dramas")
    .doc(dramaId)
    .collection("episodes")
    .doc(episodeId)
    .get();

  if (!epSnap.exists) {
    return res.status(404).json({ error: "Epizod topilmadi." });
  }

  const episode = epSnap.data();
  const access = await checkAndRegisterEpisodeAccess(req.uid, req.userDoc, episodeId);

  if (!access.allowed) {
    return res.status(403).json({
      error: "FREE_LIMIT_REACHED",
      message: "Bepul tarifdagi oylik epizod limitiga yetdingiz. Premium sotib oling.",
    });
  }

  // NOTE: once video infrastructure moves to HLS + CDN, replace `episode.videoId`
  // below with a short-lived signed CDN URL generated here instead of a raw one.
  res.json({
    videoUrl: episode.videoId,
    ads: access.ads,
    quality: access.quality,
    remainingFree: access.remainingFree ?? null,
  });

  // Track a view count on the episode itself (fire and forget)
  epSnap.ref.update({ views: (episode.views || 0) + 1 }).catch(() => {});
});

module.exports = router;
