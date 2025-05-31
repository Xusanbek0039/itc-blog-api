# 📚 shoira-blog.uz

`shoira-blog.uz` — bu zamonaviy, xavfsiz va interaktiv blog platformasi bo‘lib, foydalanuvchilarga o‘z maqolalarini yozish, ularni tahrirlash va boshqalar bilan bo‘lishish imkonini beradi. Sayt to‘liq **mobilga mos**, **3 tilda** ishlaydi (O‘zbek, Rus, Ingliz), va foydalanuvchi qulayligi uchun **Dark / Light rejim** bilan jihozlangan.

![Loyiha rasmi](https://xusanbek0039.github.io/shoira-blog.uz/images/aboud-for-github.png)

## 🌐 Onlayn manzillar

- 🔗 Sayt: [https://shoira-blog.uz](https://shoira-blog.uz)
- 🔗 API: [https://shoira-blog-uz-api.vercel.app](https://shoira-blog-uz-api.vercel.app)

## 🚀 Asosiy imkoniyatlar

### 🔤 1. Ko‘p tilli qo‘llab-quvvatlash

`shoira-blog.uz` platformasi **3 ta til**da ishlaydi:

- 🇺🇿 O‘zbekcha
- 🇷🇺 Русский (Ruscha)
- 🇬🇧 English (Inglizcha)

Foydalanuvchi saytning istalgan joyida tilni almashtirishi mumkin, va sayt tarkibi avtomatik tarzda yangilanadi.

---

### 🌗 2. Dark / Light rejim

Sayt foydalanuvchining didiga qarab **qorong‘i (Dark)** yoki **yorug‘ (Light)** rejimga o‘tishi mumkin. Bu holat foydalanuvchi tanloviga qarab brauzerda saqlanadi.

---

### 📝 3. Maqolalar bilan ishlash

- Foydalanuvchilar **ro‘yxatdan o‘tib**, maqola yozishlari mumkin.
- Har bir maqola quyidagilarni o‘z ichiga oladi:
  - Sarlavha
  - Kontent
  - Tasvir (rasm)
  - Muallif va sana

🔒 Maqolalar **MongoDB** bazasida saqlanadi va REST API orqali ishlov beriladi:  
API manzili: [https://shoira-blog-uz-api.vercel.app](https://shoira-blog-uz-api.vercel.app)

---

### 👨‍🎓 4. Foydalanuvchi sahifalari

Ro‘yxatdan o‘tgan foydalanuvchilar quyidagi imkoniyatlarga ega:

- 🔐 Profilga kirish / sozlash
- 🧾 Shaxsiy maqolalarni ko‘rish va tahrirlash
- 🧑‍💻 **Portfolio qo‘shish** – foydalanuvchi o‘z shaxsiy loyihalarini kiritib, namoyish qilishi mumkin
- 📜 Sertifikatlar yoki yutuqlarni qo‘shish (kelajakda)

---

## 🧰 Texnologiyalar

- **Frontend**: TypeScript, React, Next.js
- **Stil**: Tailwind CSS + Framer Motion (animatsiyalar)
- **Ikonlar**: Lucide Icons
- **Tilni boshqarish**: `i18next`
- **Ma’lumotlar bazasi**: MongoDB
- **Autentifikatsiya**: Token (JWT) asosida

---

## 📂 Loyihaning struktura namunasi

```bash
shoira-blog.uz/
├── pages/             # Sahifalar (home, article, login, register)
├── components/        # UI komponentlar (Navbar, Footer, Modallar)
├── public/            # Rasm va ikonlar
├── styles/            # Tailwind konfiguratsiyasi
├── locales/           # Til fayllari (uz.json, ru.json, en.json)
├── utils/             # Foydali funksiyalar
└── services/          # API bilan ishlovchi fayllar
