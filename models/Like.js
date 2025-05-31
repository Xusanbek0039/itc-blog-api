// ===================================
// LIKE MODEL
// ===================================
// Like lar uchun Mongoose modeli

import mongoose from "mongoose"

const likeSchema = new mongoose.Schema(
  {
    // Qaysi maqolaga like bosilgan
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: [true, "Maqola ID si kiritish majburiy"],
    },

    // Kim like bosgan
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Foydalanuvchi ID si kiritish majburiy"],
    },

    // Like turi (kelajakda dislike ham qo'shish mumkin)
    type: {
      type: String,
      enum: ["like", "dislike"],
      default: "like",
    },
  },
  {
    // Avtomatik createdAt va updatedAt maydonlarini qo'shish
    timestamps: true,
  },
)

// Compound index - bir foydalanuvchi bir maqolaga faqat bir marta like bosishi mumkin
likeSchema.index({ article: 1, user: 1 }, { unique: true })

// Boshqa indekslar
likeSchema.index({ article: 1, createdAt: -1 })
likeSchema.index({ user: 1, createdAt: -1 })
likeSchema.index({ type: 1 })

// Static method - maqola uchun like sonini hisoblash
likeSchema.statics.countLikesForArticle = function (articleId) {
  return this.countDocuments({ article: articleId, type: "like" })
}

// Static method - foydalanuvchi maqolani like qilganmi tekshirish
likeSchema.statics.isLikedByUser = function (articleId, userId) {
  return this.findOne({ article: articleId, user: userId, type: "like" })
}

// Instance method - like ni dislike ga o'zgartirish
likeSchema.methods.toggleType = function () {
  this.type = this.type === "like" ? "dislike" : "like"
  return this.save()
}

export default mongoose.model("Like", likeSchema)
