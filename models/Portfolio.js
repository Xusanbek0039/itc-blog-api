// ===================================
// PORTFOLIO MODEL
// ===================================
// Portfolio elementlari uchun Mongoose modeli

import mongoose from "mongoose"

const portfolioSchema = new mongoose.Schema(
  {
    // Loyiha nomi
    title: {
      type: String,
      required: [true, "Loyiha nomi kiritish majburiy"],
      trim: true,
      minlength: [3, "Loyiha nomi kamida 3 ta belgidan iborat bo'lishi kerak"],
      maxlength: [100, "Loyiha nomi 100 ta belgidan oshmasligi kerak"],
    },

    // Loyiha tavsifi
    content: {
      type: String,
      required: [true, "Loyiha tavsifi kiritish majburiy"],
      minlength: [20, "Loyiha tavsifi kamida 20 ta belgidan iborat bo'lishi kerak"],
    },

    // Loyiha rasmi
    image: {
      type: String,
      default: null,
    },

    // Loyiha kategoriyasi
    category: {
      type: String,
      required: [true, "Kategoriya tanlash majburiy"],
      enum: [
        "Web Development",
        "Mobile App",
        "Desktop App",
        "API Development",
        "Database Design",
        "UI/UX Design",
        "Machine Learning",
        "Blockchain",
        "Game Development",
        "Other",
      ],
      default: "Other",
    },

    // Loyiha muallifi
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Muallif kiritish majburiy"],
    },

    // Loyiha holati
    status: {
      type: String,
      enum: ["planning", "in-progress", "completed", "on-hold"],
      default: "completed",
    },

    // Ishlatilgan texnologiyalar
    technologies: [
      {
        type: String,
        trim: true,
      },
    ],

    // Loyiha havolalari
    links: {
      demo: { type: String, default: "" },
      github: { type: String, default: "" },
      live: { type: String, default: "" },
      documentation: { type: String, default: "" },
    },

    // Loyiha davomiyligi
    duration: {
      type: String,
      default: "",
    },

    // Loyiha roli (agar jamoa loyihasi bo'lsa)
    role: {
      type: String,
      default: "Full Stack Developer",
    },

    // Loyiha xususiyatlari
    features: [
      {
        type: String,
        trim: true,
      },
    ],

    // Ko'rilish soni
    viewsCount: {
      type: Number,
      default: 0,
    },

    // Loyiha teglar
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Loyiha prioriteti
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    // Avtomatik createdAt va updatedAt maydonlarini qo'shish
    timestamps: true,
  },
)

// Indekslar yaratish (tezroq qidiruv uchun)
portfolioSchema.index({ title: "text", content: "text" })
portfolioSchema.index({ author: 1, createdAt: -1 })
portfolioSchema.index({ category: 1, createdAt: -1 })
portfolioSchema.index({ status: 1 })
portfolioSchema.index({ technologies: 1 })

export default mongoose.model("Portfolio", portfolioSchema)
