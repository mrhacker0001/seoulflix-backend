const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { db, admin } = require("../config/firebaseAdmin");
const bunny = require("../services/bunnyService");

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
    isFeatured,
    tagline,
    imdb,
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
    isFeatured: !!isFeatured, // bosh sahifa banner'ida ko'rsatiladimi
    tagline: tagline || "",   // banner subtitle uchun ixtiyoriy matn
    imdb: imdb || null,

    episodeCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    ratingSum: 0,
    ratingCount: 0,

    uploadDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Yangi drama qo'shilganda obunachilarga avtomatik in-app bildirishnoma
  await db.collection("notifications").add({
    title: "🎬 Yangi drama qo'shildi!",
    desc: `"${title}" endi SeoulFlix'da mavjud. Hoziroq tomosha qiling!`,
    dramaId: ref.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  res.json({ id: ref.id });
});

// POST /api/admin/dramas/:dramaId/episodes
// Body: { episode, season, sourceUrl }
//   sourceUrl - hozirgi DigitalOcean (yoki istalgan ochiq) video linki.
//   Bu endpoint videoni Bunny Stream'ga import qiladi; transkodlash fonda
//   boshlanadi (odatda 1-10 daqiqa, video uzunligiga qarab).
router.post("/dramas/:dramaId/episodes", async (req, res) => {
  const { dramaId } = req.params;
  const { episode, season, sourceUrl } = req.body;

  if (!sourceUrl) return res.status(400).json({ error: "sourceUrl majburiy." });

  const dramaRef = db.collection("dramas").doc(dramaId);
  const dramaSnap = await dramaRef.get();
  if (!dramaSnap.exists) return res.status(404).json({ error: "Drama topilmadi." });

  const dramaTitle = dramaSnap.data().title || "SeoulFlix";
  const episodeTitle = `${dramaTitle} - S${season || 1}E${episode}`;

  let bunnyVideoId;
  try {
    bunnyVideoId = await bunny.importVideoFromUrl(episodeTitle, sourceUrl);
  } catch (err) {
    console.error("Bunny import xatosi:", err.message);
    return res.status(502).json({ error: "Bunny'ga import qilishda xato: " + err.message });
  }

  const epRef = await dramaRef.collection("episodes").add({
    episode: Number(episode),
    season: Number(season || 1),
    bunnyVideoId,
    bunnyStatus: "processing",
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    ratingSum: 0,
    ratingCount: 0,
    uploadDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  await dramaRef.update({ episodeCount: admin.firestore.FieldValue.increment(1) });

  await db.collection("notifications").add({
    title: "🆕 Yangi qism chiqdi!",
    desc: `"${dramaTitle}" - ${episode}-qism endi mavjud.`,
    dramaId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  res.json({
    id: epRef.id,
    bunnyVideoId,
    message: "Video Bunny'ga yuborildi, transkodlash boshlandi. Holatni /status orqali tekshiring.",
  });
});

// GET /api/admin/dramas/:dramaId/episodes/:episodeId/status
// Transkodlash tugaganmi tekshiradi va Firestore'ni yangilaydi.
router.get("/dramas/:dramaId/episodes/:episodeId/status", async (req, res) => {
  const { dramaId, episodeId } = req.params;
  const epRef = db.collection("dramas").doc(dramaId).collection("episodes").doc(episodeId);
  const epSnap = await epRef.get();

  if (!epSnap.exists) return res.status(404).json({ error: "Epizod topilmadi." });
  const episode = epSnap.data();

  if (!episode.bunnyVideoId) {
    return res.status(400).json({ error: "Bu epizodda Bunny video ID yo'q." });
  }

  const result = await bunny.getVideoStatus(episode.bunnyVideoId);

  if (result.status !== episode.bunnyStatus) {
    await epRef.update({ bunnyStatus: result.status });
  }

  res.json(result);
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

// POST /api/admin/notifications - manual/custom announcement (OnlyAdminNotification.jsx)
router.post("/notifications", async (req, res) => {
  const { title, desc } = req.body;
  if (!title || !desc) return res.status(400).json({ error: "title va desc majburiy." });

  const ref = await db.collection("notifications").add({
    title,
    desc,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });

  res.json({ id: ref.id });
});

module.exports = router;
