const {
  BUNNY_STREAM_LIBRARY_ID,
  BUNNY_STREAM_API_KEY,
  BUNNY_STREAM_HOSTNAME,
  BUNNY_BASE_URL,
  assertConfigured,
} = require("../config/bunny");

function authHeaders() {
  return {
    AccessKey: BUNNY_STREAM_API_KEY,
    accept: "application/json",
    "content-type": "application/json",
  };
}

/**
 * Mavjud video URL'ni (masalan hozirgi DigitalOcean Spaces linkini) Bunny
 * Stream kutubxonasiga import qiladi. Bunny o'zi videoni yuklab oladi va
 * fonda transkodlashni boshlaydi - biz faylni qayta yuklab yubormaymiz.
 *
 * Eslatma: manba URL ochiq (public) bo'lishi kerak - signed/vaqtinchalik
 * linklar ishlamaydi.
 */
async function importVideoFromUrl(title, sourceUrl) {
  assertConfigured();

  const res = await fetch(
    `${BUNNY_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/fetch`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ url: sourceUrl, title }),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.Message || data?.message || "Bunny import xatosi.");
  }

  // Fetch endpoint javobi odatda yaratilgan videoning guid'ini qaytaradi.
  const guid = data.guid || data.videoId || data.id;
  if (!guid) {
    throw new Error("Bunny javobidan video ID topilmadi: " + JSON.stringify(data));
  }

  return guid;
}

/**
 * Videoning joriy transkodlash holatini tekshiradi.
 * status kodlari (Bunny API): 0 Created, 1 Uploaded, 2 Processing,
 * 3 Transcoding, 4 Finished, 5 Error, 6 UploadFailed
 */
async function getVideoStatus(videoGuid) {
  assertConfigured();

  const res = await fetch(
    `${BUNNY_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoGuid}`,
    { headers: authHeaders() }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.Message || data?.message || "Bunny status xatosi.");
  }

  const statusMap = {
    0: "created",
    1: "uploaded",
    2: "processing",
    3: "transcoding",
    4: "ready",
    5: "error",
    6: "error",
  };

  return {
    raw: data.status,
    status: statusMap[data.status] || "unknown",
    encodeProgress: data.encodeProgress ?? null,
  };
}

function getHlsUrl(videoGuid) {
  return `https://${BUNNY_STREAM_HOSTNAME}/${videoGuid}/playlist.m3u8`;
}

function getThumbnailUrl(videoGuid) {
  return `https://${BUNNY_STREAM_HOSTNAME}/${videoGuid}/thumbnail.jpg`;
}

async function deleteVideo(videoGuid) {
  assertConfigured();
  await fetch(`${BUNNY_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoGuid}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

module.exports = {
  importVideoFromUrl,
  getVideoStatus,
  getHlsUrl,
  getThumbnailUrl,
  deleteVideo,
};
