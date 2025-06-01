// ===================================
// USER MODEL
// ===================================
// Foydalanuvchi ma'lumotlari uchun Mongoose modeli

import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    // Foydalanuvchi ismi
    name: {
      type: String,
      required: [true, "Ism kiritish majburiy"],
      trim: true,
      minlength: [2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"],
      maxlength: [50, "Ism 50 ta belgidan oshmasligi kerak"],
    },

    // Email manzil
    email: {
      type: String,
      required: [true, "Email kiritish majburiy"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Email formati noto'g'ri"],
    },

    // Parol (hash qilingan)
    password: {
      type: String,
      required: [true, "Parol kiritish majburiy"],
      minlength: [6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"],
    },

    // Foydalanuvchi roli (kelajakda admin funksiyalari uchun)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Profil rasmi (ixtiyoriy)
    avatar: {
      type: String,
      default: "null",
    },

    // Foydalanuvchi haqida ma'lumot
    bio: {
      type: String,
      maxlength: [500, "Bio 500 ta belgidan oshmasligi kerak"],
      default: "",
    },

    // Ijtimoiy tarmoq havolalari
    socialLinks: {
      website: { type: String, default: "" },
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },

    // Hisob holati
    isActive: {
      type: Boolean,
      default: true,
    },

    // Email tasdiqlangan holati
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Oxirgi kirish vaqti
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    // Avtomatik createdAt va updatedAt maydonlarini qo'shish
    timestamps: true,
  },
)

// Email bo'yicha indeks yaratish (tezroq qidiruv uchun)
userSchema.index({ email: 1 })

// Parolni qaytarishdan oldin uni yashirish
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  return user
}

// Foydalanuvchi statistikasini olish uchun virtual maydon
userSchema.virtual("articlesCount", {
  ref: "Article",
  localField: "_id",
  foreignField: "author",
  count: true,
})

userSchema.virtual("portfolioCount", {
  ref: "Portfolio",
  localField: "_id",
  foreignField: "author",
  count: true,
})

// Virtual maydonlarni JSON ga qo'shish
userSchema.set("toJSON", { virtuals: true })

export default mongoose.model("User", userSchema)
