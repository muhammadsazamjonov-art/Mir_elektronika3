# Bozor Store — Elektronika do'koni

Real vaqt rejimidagi elektronika do'koni veb-sayti. Admin paneli orqali mahsulotlar, narxlar, sozlamalar o'zgartirilsa, saytga kirgan barcha odamlarga darhol (real vaqtda) ko'rinadi.

## Xususiyatlari

- 🛒 **Do'kon** — katalog, kategoriya, qidiruv, savat, promokodlar
- 📦 **Buyurtmalar** — Payme/Click/Uzum Bank/Naqd/Karta usullari bilan, Telegramga yuborish
- ⚡ **Real vaqt sinxronizatsiyasi** (Server-Sent Events) — admin o'zgartirsa barcha foydalanuvchilarga darhol ko'rinadi
- 👥 **Ko'p admin** — admin qo'shish/o'chirish, parol o'zgartirish
- 📊 **Admin panel** — barcha narsani boshqarish (maxsulotlar, kategoriyalar, promokodlar, buyurtmalar, sozlamalar, adminlar)
- 📱 **Mobil moslashuvchan dizayn**
- 🌙 Zamonaviy dark-tema dizayn

## Default admin

```
Login: ibrohim
Parol: 2013
```

⚠️ Sayt ishga tushgandan keyin **Adminlar** bo'limida parolni almashtirish tavsiya qilinadi.

## Lokal ishga tushirish

```bash
npm install
npm start
```

So'ng `http://localhost:3000` oching.

## Render orqali onlayn joylash

1. GitHub repository'ga push qiling
2. [Render](https://render.com) da ro'yxatdan o'ting (GitHub bilan)
3. **New → Web Service** → ushbu repo'ni tanlang
4. Quyidagi sozlamalarni kiriting:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Deploy qiling — Render avtomatik ravishda HTTPS domen beradi

Har GitHub push'dan keyin Render avtomatik redeploy qiladi.

## Render Disk (ma'lumotlar saqlanishi uchun)

> Data `data/store.json` faylida saqlanadi. Bepul Render rejasida fayl tizimi vaqtinchalik — restartda yo'qoladi. Doimiy saqlash uchun Render **Disk** (Persistent Disk) xususiyatini yoqing va `/opt/render/project/src/data` papkasiga ulang. Yoki tashqi baza (Postgres/Redis) ishlatish mumkin.
