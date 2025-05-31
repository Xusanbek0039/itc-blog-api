// ===================================
// ARTICLE MODEL
// ===================================
// Maqola ma'lumotlari uchun Mongoose modeli

import mongoose from "mongoose"

const articleSchema = new mongoose.Schema(
  {
    // Maqola sarlavhasi
    title: {
      type: String,
      required: [true, "Sarlavha kiritish majburiy"],
      trim: true,
      minlength: [5, "Sarlavha kamida 5 ta belgidan iborat bo'lishi kerak"],
      maxlength: [200, "Sarlavha 200 ta belgidan oshmasligi kerak"],
    },

    // Maqola matni
    content: {
      type: String,
      required: [true, "Maqola matni kiritish majburiy"],
      minlength: [50, "Maqola matni kamida 50 ta belgidan iborat bo'lishi kerak"],
    },

    // Qisqa tavsif
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Tavsif 500 ta belgidan oshmasligi kerak"],
    },

    // Maqola rasmi
    image: {
      type: String,
      default: null,
    },

    // Kategoriya
    category: {
      type: String,
      required: [true, "Kategoriya tanlash majburiy"],
      enum: [
        "Frontend",
        "Backend",
        "Mobile",
        "DevOps",
        "Database",
        "AI/ML",
        "Web3",
        "Tutorial",
        "News",
        "Opinion",
        "Umumiy",
      ],
      default: "Umumiy",
    },

    // Maqola muallifi
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Muallif kiritish majburiy"],
    },

    // Maqola holati
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },

    // Maqola teglar
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Ko'rilish soni
    viewsCount: {
      type: Number,
      default: 0,
    },

    // O'qish vaqti (daqiqalarda)
    readingTime: {
      type: Number,
      default: 0,
    },

    // SEO uchun slug
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Meta ma'lumotlar SEO uchun
    metaDescription: {
      type: String,
      maxlength: [160, "Meta tavsif 160 ta belgidan oshmasligi kerak"],
    },

    // Maqola tili
    language: {
      type: String,
      enum: ["uz", "en", "ru"],
      default: "en",
    },
  },
  {
    // Avtomatik createdAt va updatedAt maydonlarini qo'shish
    timestamps: true,
  },
)

// Indekslar yaratish (tezroq qidiruv uchun)
articleSchema.index({ title: "text", content: "text", description: "text" },{default_language: "none"})
articleSchema.index({ author: 1, createdAt: -1 })
articleSchema.index({ category: 1, createdAt: -1 })
articleSchema.index({ status: 1, createdAt: -1 })
articleSchema.index({ slug: 1 })

// Virtual maydonlar - like va comment sonini hisoblash
articleSchema.virtual("likesCount", {
  ref: "Like",
  localField: "_id",
  foreignField: "article",
  count: true,
})

articleSchema.virtual("commentsCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "article",
  count: true,
})

// Virtual maydonlarni JSON ga qo'shish
articleSchema.set("toJSON", { virtuals: true })

// Slug yaratish uchun pre-save middleware
articleSchema.pre("save", function (next) {
  if (this.isModified("title") && !this.slug) {
    // Sarlavhadan slug yaratish
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Maxsus belgilarni olib tashlash
      .replace(/\s+/g, "-") // Bo'shliqlarni tire bilan almashtirish
      .replace(/-+/g, "-") // Bir nechta tireni bitta tire bilan almashtirish
      .trim("-") // Boshi va oxiridagi tirelarni olib tashlash
  }

  // O'qish vaqtini hisoblash (taxminan 200 so'z/daqiqa)
  if (this.isModified("content")) {
    const wordsCount = this.content.split(/\s+/).length
    this.readingTime = Math.ceil(wordsCount / 200)
  }

  next()
})

export default mongoose.model("Article", articleSchema)
