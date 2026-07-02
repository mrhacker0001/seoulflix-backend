const { db } = require("../config/firebaseAdmin");

const FREE_MONTHLY_EPISODE_LIMIT = Number(process.env.FREE_MONTHLY_EPISODE_LIMIT || 4);

// Premium tizimi hali yoqilmagan bo'lsa (masalan ilova hali mashhur bo'lmagan bosqichda),
// PREMIUM_ENABLED=false qilib qo'ying - hamma foydalanuvchi cheklovsiz tomosha qiladi,
// lekin barcha kod joyida qoladi va .env'da bitta qatorni o'zgartirish bilan qayta yoqiladi.
const PREMIUM_ENABLED = process.env.PREMIUM_ENABLED === "true";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isPremiumActive(userDoc) {
  if (!userDoc?.isPremium) return false;
  if (!userDoc?.premiumExpiresAt) return false;
  return new Date(userDoc.premiumExpiresAt).getTime() > Date.now();
}

/**
 * Decides whether a user is allowed to watch a given episode, and records
 * the view against their monthly free quota if they are not premium.
 *
 * Returns: { allowed, ads, quality, reason?, remainingFree? }
 */
async function checkAndRegisterEpisodeAccess(uid, userDoc, episodeId) {
  if (!PREMIUM_ENABLED) {
    return { allowed: true, ads: false, quality: "hd", remainingFree: null };
  }

  if (isPremiumActive(userDoc)) {
    return { allowed: true, ads: false, quality: "hd" };
  }

  const monthKey = currentMonthKey();
  const logRef = db.collection("users").doc(uid).collection("watchLog").doc(monthKey);
  const logSnap = await logRef.get();
  const log = logSnap.exists ? logSnap.data() : { count: 0, episodeIds: [] };

  // Already watched this episode this month -> allow again for free, don't recount
  if (log.episodeIds?.includes(episodeId)) {
    return {
      allowed: true,
      ads: true,
      quality: "sd",
      remainingFree: Math.max(0, FREE_MONTHLY_EPISODE_LIMIT - log.count),
    };
  }

  if (log.count >= FREE_MONTHLY_EPISODE_LIMIT) {
    return {
      allowed: false,
      reason: "FREE_LIMIT_REACHED",
      remainingFree: 0,
    };
  }

  await logRef.set(
    {
      count: (log.count || 0) + 1,
      episodeIds: [...(log.episodeIds || []), episodeId],
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    allowed: true,
    ads: true,
    quality: "sd",
    remainingFree: FREE_MONTHLY_EPISODE_LIMIT - (log.count + 1),
  };
}

module.exports = {
  FREE_MONTHLY_EPISODE_LIMIT,
  PREMIUM_ENABLED,
  isPremiumActive,
  checkAndRegisterEpisodeAccess,
  currentMonthKey,
};
