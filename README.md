# Bozor Store — Elektronika do'koni

Real vaqt rejimidagi elektronika do'koni. Admin o'zgartirsa, saytga kirgan barcha odamlarga darhol ko'rinadi (SSE orqali).

## ⚡ Eng oson yo'l: Glitch.com (BEPUL, disk qo'shish kerak emas!)

Render bepul planida **Disk qo'shish pullik** va fayllar vaqtinchalik saqlanadi. Glitch da bunday muammo yo'q — ma'lumotlar avtomatik saqlanadi, hech qanday disk/karta kerak emas.

### Glitch ga 1 daqiqada joylash:

1. **[glitch.com](https://glitch.com)** ga kiring (GitHub bilan kirish mumkin)
2. Bosh sahifada **"New Project"** → **"Import from GitHub"** ni bosing
3. Repo URL ni kiriting:
   ```
   https://github.com/muhammadsazamjonov-art/Mir_elektronika3
   ```
4. **OK** bosing — 30 soniyada sayt yuklanadi
5. Yuqoridagi **"Share"** tugmasi → **"Live App"** havolasini oling — bu sizning doimiy saytingiz (masalan: `https://something.glitch.me`)
6. **Tayyor!** Shu havolani odamlarga ulashing.

Glitch da:
- ✅ Ma'lumotlar doimiy saqlanadi (hech qachon o'chmaydi)
- ✅ Hech qanday disk/karta sozlash kerak emas
- ✅ Bepul (oyiga 1000 soat — bitta doimiy sayt uchun yetarli)
- ✅ Har GitHub push'da avtomatik yangilash qo'lda (qayta import qilish kerak yoki Glitch orqali edit)

## 🛡️ Backup (Zaxira nusxa) — HAR DOIM QILING!

Admin panelga kiring → **⚙️ Sozlamalar**:
- **⬇️ Zaxira nusxa olish** — barcha mahsulotlar, buyurtmalar, sozlamalar, adminlar bitta JSON faylga tushiriladi. Uni kompyuteringizga saqlab qo'ying.
- **⬆️ Zaxiradan tiklash** — faylni tanlang va hamma narsa tiklanadi.

⚠️ Har katta o'zgarishdan keyin zaxira olib qo'ying.

## Admin panelga kirish

```
Login: ibrohim
Parol: 2013
```

Saytga kirib, yuqoridagi **"Admin panel"** tugmasini bosing yoki URL oxiriga `#admin` qo'shing.

## Xususiyatlari

- 🛒 Mahsulot katalogi, qidiruv, kategoriyalar, savat
- 🎟️ Promokodlar va chegirmalar
- 📦 Buyurtma tizimi (Payme/Click/Uzum/Naqd/Karta)
- ⚡ Real vaqt sinxronizatsiya (admin o'zgartirsa hammada darhol ko'rinadi)
- 📊 Admin panelda statistika
- 👥 Ko'p admin qo'llab-quvvatlash (yangi adminlar qo'shish/o'chirish)
- 🖼️ Rasmlar (base64 sifatida saqlanadi — alohida fayl serveri kerak emas)
- 📱 Mobil mos dizayn

## Lokalda ishlatish

```bash
npm install
npm start
```

Keyin `http://localhost:3000` ni oching.
