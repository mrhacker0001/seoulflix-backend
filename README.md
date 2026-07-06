# SeoulFlix Backend

Auth (Firebase), Premium obuna logikasi, Admin API va Click.uz to'lov integratsiyasi.

## Nima uchun kerak edi

Avval sayt to'g'ridan-to'g'ri brauzerdan Firestore'ga yozardi (admin panel ham shu jumladan) va
premium tekshiruvi umuman yo'q edi. Bu backend endi:

- Foydalanuvchi kim ekanini Firebase ID token orqali tekshiradi
- Admin panel yozuvlarini himoyalaydi (faqat `role: admin` bo'lgan userlar)
- Bepul foydalanuvchilar uchun oyiga N ta epizod limitini serverda hisoblaydi (client-side emas,
  chunki client kodni har doim aylanib o'tish mumkin)
- Click orqali to'lovni qabul qilib, premium holatni avtomatik yoqadi

## O'rnatish

```bash
npm install
cp .env.example .env
```

`.env` faylini to'ldiring:

1. **FIREBASE_SERVICE_ACCOUNT_JSON** — Firebase Console → Project Settings → Service Accounts →
   "Generate new private key". Tushgan JSON faylning **butun mazmunini** bitta qatorga solib shu
   o'zgaruvchiga joylashtiring.
2. **CLICK_SERVICE_ID / CLICK_MERCHANT_ID / CLICK_SECRET_KEY / CLICK_MERCHANT_USER_ID** — Click
   Merchant Cabinet'da (my.click.uz) ro'yxatdan o'tgach beriladi.
3. **CORS_ORIGIN** — saytingiz va (keyinchalik) ilova domeningizni vergul bilan ajratib yozing.

Lokal ishga tushirish:

```bash
npm run dev
```

Birinchi adminni tayinlash (masalan o'zingizni):

```bash
node src/scripts/setAdmin.js sizning@emailingiz.uz
```

## Bunny.net Stream sozlash

1. [bunny.net](https://bunny.net) da ro'yxatdan o'ting, **Stream** bo'limida yangi video kutubxona yarating.
2. Kutubxona ichida **API** bo'limidan quyidagilarni oling:
   - Library ID → `BUNNY_STREAM_LIBRARY_ID`
   - API Key → `BUNNY_STREAM_API_KEY`
   - Hostname (odatda `vz-xxxxxxx.b-cdn.net`) → `BUNNY_STREAM_HOSTNAME`
3. Bularni `.env` fayliga qo'shing.

**Muhim:** epizod qo'shishda endi `sourceUrl` maydoniga hozirgi DigitalOcean video linkini kiritasiz —
qayta yuklashning hojati yo'q, Bunny uni o'zi import qilib, avtomatik HLS (adaptive bitrate) formatga
o'giradi. Bu jarayon video uzunligiga qarab 1-10 daqiqa davom etadi; shu vaqt ichida foydalanuvchi
"video qayta ishlanmoqda" degan xabarni ko'radi va u avtomatik yangilanadi.

## Railway'ga deploy qilish

1. Railway'da yangi loyiha yarating, GitHub repo'ni ulang (yoki `railway up` orqali CLI bilan).
2. **Variables** bo'limida `.env`dagi barcha o'zgaruvchilarni qo'shing.
3. Root Directory sifatida bu backend papkasini ko'rsating (agar frontend bilan bitta repoda
   bo'lsa).
4. Start command: `npm start` (Railway buni `package.json`dan avtomatik oladi).
5. Deploy tugagach, Railway bergan domenni Click Merchant Cabinet'da webhook manzillari sifatida
   kiriting:
   - Prepare URL: `https://<railway-domeningiz>/api/payments/click/prepare`
   - Complete URL: `https://<railway-domeningiz>/api/payments/click/complete`

## API endpointlari

| Method | Path | Auth | Tavsif |
|---|---|---|---|
| GET | `/health` | - | Server ishlayaptimi tekshirish |
| GET | `/api/users/me` | ✅ | Joriy foydalanuvchi profili + premium holati |
| POST | `/api/episodes/:dramaId/:episodeId/access` | ✅ | Epizodni ko'rish huquqini tekshiradi va video URL qaytaradi |
| POST | `/api/orders` | ✅ | Yangi obuna buyurtmasi yaratadi, Click checkout URL qaytaradi |
| GET | `/api/orders/:id` | ✅ | Buyurtma holatini tekshirish (pending/paid) |
| POST | `/api/payments/click/prepare` | Click webhook | Click serverlari chaqiradi |
| POST | `/api/payments/click/complete` | Click webhook | Click serverlari chaqiradi, premiumni yoqadi |
| POST | `/api/admin/dramas` | ✅ admin | Yangi drama qo'shish |
| POST | `/api/admin/dramas/:id/episodes` | ✅ admin | Yangi epizod qo'shish |
| DELETE | `/api/admin/dramas/:id` | ✅ admin | Dramani o'chirish |
| GET | `/api/admin/orders` | ✅ admin | So'nggi 50 ta buyurtma (daromad monitoring) |

Barcha `✅` endpointlar `Authorization: Bearer <Firebase ID Token>` headerini talab qiladi.

## Frontendda qanday chaqiriladi

```js
import { getAuth } from "firebase/auth";

async function callApi(path, options = {}) {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;

  const res = await fetch(`${process.env.REACT_APP_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
  return res.json();
}

// Misol: epizodni ochishdan oldin
const access = await callApi(`/api/episodes/${dramaId}/${episodeId}/access`, { method: "POST" });
// access.videoUrl, access.ads, access.quality, access.remainingFree

// Misol: premium sotib olish
const order = await callApi("/api/orders", {
  method: "POST",
  body: JSON.stringify({ tierId: "monthly" }),
});
window.location.href = order.payUrl; // Click checkout sahifasiga o'tkazadi
```

## Keyingi bosqichlar (hali qilinmagan)

- [x] Video HLS + CDN'ga o'tish - Bunny.net Stream orqali amalga oshirildi
- [x] `AdminAddDrama.jsx` / `AdminAddEpisode.jsx` backend API'ga ulandi
- [x] `DramaPage.jsx`dagi video pleer backend access-check javobiga qarab ishlaydi
- [ ] Eski epizodlarni (agar ko'p bo'lsa) ommaviy Bunny'ga import qilish uchun bir martalik migratsiya skripti
- [ ] Capacitor bilan ilovaga o'rash
