const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { db, admin } = require("../config/firebaseAdmin");

const router = express.Router();

router.use(requireAuth, requireAdmin);

// POST /api/admin/dramas
router.post("/dramas", async (req, res) => {
  const {
    title,
    description,
    thumbnail,
    year,
    lang,
    genres,
    duration,
    status,
    ageRating,
    downloadUrl,
    isPremiumOnly,
  } = req.body;

  if (!title) return res.status(400).json({ error: "title majburiy." });

  const ref = await db.collection("dramas").add({
    title,
    description: description || "",
    thumbnail: thumbnail || "",
    year: year ? Number(year) : null,
    lang: lang || "",
    genres: Array.isArray(genres) ? genres : [],
    duration: duration || "",
    status: status || "Yakunlangan",
    ageRating: ageRating || "13+",
    downloadUrl: downloadUrl || "",
    isPremiumOnly: !!isPremiumOnly,

    episodeCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    ratingSum: 0,
    ratingCount: 0,

    uploadDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({ id: ref.id });
});

// POST /api/admin/dramas/:dramaId/episodes
router.post("/dramas/:dramaId/episodes", async (req, res) => {
  const { dramaId } = req.params;
  const { episode, season, videoId } = req.body;

  if (!videoId) return res.status(400).json({ error: "videoId majburiy." });

  const dramaRef = db.collection("dramas").doc(dramaId);
  const dramaSnap = await dramaRef.get();
  if (!dramaSnap.exists) return res.status(404).json({ error: "Drama topilmadi." });

  const epRef = await dramaRef.collection("episodes").add({
    episode: Number(episode),
    season: Number(season || 1),
    videoId,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    ratingSum: 0,
    ratingCount: 0,
    uploadDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  await dramaRef.update({ episodeCount: admin.firestore.FieldValue.increment(1) });

  res.json({ id: epRef.id });
});

// DELETE /api/admin/dramas/:dramaId
router.delete("/dramas/:dramaId", async (req, res) => {
  await db.collection("dramas").doc(req.params.dramaId).delete();
  res.json({ success: true });
});

// GET /api/admin/orders - view recent orders (basic revenue visibility)
router.get("/orders", async (req, res) => {
  const snap = await db.collection("orders").orderBy("createdAt", "desc").limit(50).get();
  res.json(snap.docs.map((d) => d.data()));
});

module.exports = router;
