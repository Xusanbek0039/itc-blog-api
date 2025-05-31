// ===================================
// COMMENT MODEL
// ===================================
// Izohlar uchun Mongoose modeli

import mongoose from "mongoose"

const commentSchema = new mongoose.Schema(
  {
    // Izoh matni
    content: {
      type: String,
      required: [true, "Izoh matni kiritish majburiy"],
      trim: true,
      minlength: [1, "Izoh matni kamida 1 ta belgidan iborat bo'lishi kerak"],
      maxlength: [1000, "Izoh matni 1000 ta belgidan oshmasligi kerak"],
    },

    // Qaysi maqolaga tegishli
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: [true, "Maqola ID si kiritish majburiy"],
    },

    // Izoh muallifi
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Muallif kiritish majburiy"],
    },

    // Ota-izoh (agar javob bo'lsa)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Izoh holati
    status: {
      type: String,
      enum: ["active", "hidden", "deleted"],
      default: "active",
    },

    // Izoh turi
    type: {
      type: String,
      enum: ["comment", "reply"],
      default: "comment",
    },

    // Izoh like lari
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Izoh o'zgartirilgan vaqti
    editedAt: {
      type: Date,
      default: null,
    },

    // Izoh o'zgartirilganmi
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Avtomatik createdAt va updatedAt maydonlarini qo'shish
    timestamps: true,
  },
)

// Indekslar yaratish (tezroq qidiruv uchun)
commentSchema.index({ article: 1, createdAt: -1 })
commentSchema.index({ author: 1, createdAt: -1 })
commentSchema.index({ parentComment: 1 })
commentSchema.index({ status: 1 })

// Virtual maydon - javob izohlar soni
commentSchema.virtual("repliesCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
  count: true,
})

// Virtual maydon - like lar soni
commentSchema.virtual("likesCount", function () {
  return this.likes ? this.likes.length : 0
})

// Virtual maydonlarni JSON ga qo'shish
commentSchema.set("toJSON", { virtuals: true })

// Izoh o'zgartirilganda editedAt ni yangilash
commentSchema.pre("save", function (next) {
  if (this.isModified("content") && !this.isNew) {
    this.editedAt = new Date()
    this.isEdited = true
  }
  next()
})

export default mongoose.model("Comment", commentSchema)
