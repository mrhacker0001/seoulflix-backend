const express = require("express");
const { optionalAuth } = require("../middleware/optionalAuth");
const { checkAndRegisterEpisodeAccess, PREMIUM_ENABLED } = require("../services/premiumService");
const { db } = require("../config/firebaseAdmin");
const bunny = require("../services/bunnyService");

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

  const epRef = db.collection("dramas").doc(dramaId).collection("episodes").doc(episodeId);
  const epSnap = await epRef.get();

  if (!epSnap.exists) {
    return res.status(404).json({ error: "Epizod topilmadi." });
  }

  const episode = epSnap.data();

  if (!episode.bunnyVideoId) {
    return res.status(404).json({ error: "Bu epizod uchun video topilmadi." });
  }

  // Agar oxirgi bilgan holatimiz "tayyor emas" bo'lsa, Bunny'dan yangilab olamiz
  let bunnyStatus = episode.bunnyStatus;
  if (bunnyStatus !== "ready") {
    try {
      const live = await bunny.getVideoStatus(episode.bunnyVideoId);
      bunnyStatus = live.status;
      epRef.update({ bunnyStatus }).catch(() => {});
    } catch (err) {
      console.error("Bunny status tekshirishda xato:", err.message);
    }
  }

  if (bunnyStatus !== "ready") {
    return res.status(202).json({
      error: "VIDEO_PROCESSING",
      message: "Video hali qayta ishlanmoqda, biroz kuting.",
      status: bunnyStatus,
    });
  }

  const access = await checkAndRegisterEpisodeAccess(req.uid, req.userDoc, episodeId);

  if (!access.allowed) {
    return res.status(403).json({
      error: "FREE_LIMIT_REACHED",
      message: "Bepul tarifdagi oylik epizod limitiga yetdingiz. Premium sotib oling.",
    });
  }

  res.json({
    videoUrl: bunny.getHlsUrl(episode.bunnyVideoId),
    thumbnailUrl: bunny.getThumbnailUrl(episode.bunnyVideoId),
    ads: access.ads,
    quality: access.quality,
    remainingFree: access.remainingFree ?? null,
  });

  // Track a view count on the episode itself (fire and forget)
  epRef.update({ views: (episode.views || 0) + 1 }).catch(() => {});
});

module.exports = router;
