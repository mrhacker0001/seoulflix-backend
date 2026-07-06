const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
// Video library'ning "Hostname" qiymati (Bunny dashboard -> Stream -> kutubxonangiz -> API/Overview),
// odatda vz-xxxxxxx.b-cdn.net ko'rinishida bo'ladi.
const BUNNY_STREAM_HOSTNAME = process.env.BUNNY_STREAM_HOSTNAME;

const BUNNY_BASE_URL = "https://video.bunnycdn.com";

function assertConfigured() {
  if (!BUNNY_STREAM_LIBRARY_ID || !BUNNY_STREAM_API_KEY || !BUNNY_STREAM_HOSTNAME) {
    throw new Error(
      "Bunny Stream sozlanmagan. .env faylida BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_STREAM_HOSTNAME'ni to'ldiring."
    );
  }
}

module.exports = {
  BUNNY_STREAM_LIBRARY_ID,
  BUNNY_STREAM_API_KEY,
  BUNNY_STREAM_HOSTNAME,
  BUNNY_BASE_URL,
  assertConfigured,
};
