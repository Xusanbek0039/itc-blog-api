// ===================================
// ITC-BLOG BACKEND API SERVER
// ===================================
// Bu fayl blog platformasi uchun backend API server hisoblanadi
// Express.js, MongoDB va JWT authentication ishlatilgan
// Comment va Like funksiyalari qo'shilgan

import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// ===================================
// MODELS IMPORT
// ===================================
// Ma'lumotlar bazasi modellari
import User from "./models/User.js" // Foydalanuvchi modeli
import Article from "./models/Article.js" // Maqola modeli
import Portfolio from "./models/Portfolio.js" // Portfolio modeli
import Comment from "./models/Comment.js" // Izoh modeli
import Like from "./models/Like.js" // Like modeli

// ===================================
// ENVIRONMENT VARIABLES
// ===================================
// Muhit o'zgaruvchilarini yuklash
dotenv.config()

// ===================================
// SERVER CONFIGURATION
// ===================================
const app = express()
const PORT = process.env.PORT || 5000 // Server porti
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key" // JWT maxfiy kaliti
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://itpark0071:1zoImG9EvXvlcM62@blog.3ynva8v.mongodb.net/?retryWrites=true&w=majority&appName=blog" // MongoDB ulanish manzili
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*" // CORS sozlamalari

// ===================================
// MIDDLEWARE SETUP
// ===================================
// CORS - Cross-Origin Resource Sharing sozlamalari
app.use(
  cors({
    origin: CORS_ORIGIN, // Qaysi domenlardan so'rov qabul qilish
    credentials: true, // Cookie va authentication ma'lumotlarini qabul qilish
  }),
)

// JSON ma'lumotlarni parse qilish uchun middleware
app.use(express.json())

// ===================================
// DATABASE CONNECTION
// ===================================
// MongoDB ga ulanish
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB ga muvaffaqiyatli ulandi"))
  .catch((err) => console.error("❌ MongoDB ga ulanishda xatolik:", err))

// ===================================
// HEALTH CHECK ENDPOINTS
// ===================================
// Asosiy endpoint - server holatini tekshirish
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ITC-Blog API server is running",
    version: "2.0.0",
    features: ["Authentication", "Articles", "Portfolio", "Comments", "Likes"],
  })
})

// API health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  })
})

// ===================================
// ENVIRONMENT LOGGING
// ===================================
// Server sozlamalarini console ga chiqarish (xavfsizlik uchun maxfiy ma'lumotlarsiz)
console.log("🚀 Server running with:")
console.log("📍 PORT:", PORT)
console.log("🌐 CORS_ORIGIN:", CORS_ORIGIN)
console.log("🗄️  MONGODB_URI:", MONGODB_URI ? "✅ Connected" : "❌ Not configured")
console.log("🔐 JWT_SECRET:", JWT_SECRET ? "✅ Configured" : "❌ Not configured")

// ===================================
// AUTHENTICATION MIDDLEWARE
// ===================================
// JWT token orqali foydalanuvchini autentifikatsiya qilish
const auth = async (req, res, next) => {
  try {
    // Authorization header dan token olish
    const token = req.header("Authorization")?.replace("Bearer ", "")

    // Token mavjudligini tekshirish
    if (!token) {
      return res.status(401).json({ message: "Avtorizatsiya talab qilinadi" })
    }

    // Token ni verify qilish
    const decoded = jwt.verify(token, JWT_SECRET)

    // Foydalanuvchini ma'lumotlar bazasidan topish
    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi" })
    }

    // Request obyektiga foydalanuvchi ma'lumotlarini qo'shish
    req.user = user
    next() // Keyingi middleware ga o'tish
  } catch (error) {
    res.status(401).json({ message: "Avtorizatsiya xatosi" })
  }
}

// ===================================
// USER AUTHENTICATION ROUTES
// ===================================

// 📝 FOYDALANUVCHI RO'YXATDAN O'TISH
app.post("/api/users/register", async (req, res) => {
  try {
    console.log("📝 Registration request received:", req.body)
    const { name, email, password } = req.body

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Barcha maydonlar to'ldirilishi shart" })
    }

    // Foydalanuvchi allaqachon mavjudligini tekshirish
    let user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: "Foydalanuvchi allaqachon mavjud" })
    }

    // Parolni hash qilish (xavfsizlik uchun)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Yangi foydalanuvchi yaratish
    user = new User({
      name,
      email,
      password: hashedPassword,
    })

    // Ma'lumotlar bazasiga saqlash
    await user.save()

    // JWT token yaratish (30 kun amal qiladi)
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" })

    // Muvaffaqiyatli javob qaytarish
    res.status(201).json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 🔐 FOYDALANUVCHI TIZIMGA KIRISH
app.post("/api/users/login", async (req, res) => {
  try {
    console.log("🔐 Login request received:", { email: req.body.email })
    const { email, password } = req.body

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email va parol kiritish shart" })
    }

    // Foydalanuvchi mavjudligini tekshirish
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Noto'g'ri email yoki parol" })
    }

    // Parolni tekshirish
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Noto'g'ri email yoki parol" })
    }

    // JWT token yaratish
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" })

    // Muvaffaqiyatli javob qaytarish
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 👤 FOYDALANUVCHI PROFILINI YANGILASH
app.put("/api/users/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body

    // Email boshqa foydalanuvchi tomonidan ishlatilayotganligini tekshirish
    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ message: "Bu email allaqachon ishlatilmoqda" })
      }
    }

    // Foydalanuvchi ma'lumotlarini yangilash
    const user = await User.findById(req.user._id)
    if (name) user.name = name
    if (email) user.email = email

    // O'zgarishlarni saqlash
    await user.save()

    res.json({
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 🔒 PAROLNI O'ZGARTIRISH
app.put("/api/users/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Joriy parolni tekshirish
    const user = await User.findById(req.user._id)
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Joriy parol noto'g'ri" })
    }

    // Yangi parolni hash qilish
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Parolni yangilash
    user.password = hashedPassword
    await user.save()

    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ===================================
// ARTICLE MANAGEMENT ROUTES
// ===================================

// 📚 BARCHA MAQOLALARNI OLISH (ommaviy)
app.get("/api/articles", async (req, res) => {
  try {
    // Maqolalarni eng yangi birinchi bo'lib saralash va author ma'lumotlarini populate qilish
    const articles = await Article.find().populate("author", "name email").sort({ createdAt: -1 })

    // Har bir maqola uchun like va comment sonini hisoblash
    const articlesWithStats = await Promise.all(
      articles.map(async (article) => {
        const likesCount = await Like.countDocuments({ article: article._id })
        const commentsCount = await Comment.countDocuments({ article: article._id })

        return {
          ...article.toObject(),
          likes: likesCount,
          commentsCount: commentsCount,
        }
      }),
    )

    res.json(articlesWithStats)
  } catch (error) {
    console.error("Get articles error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 📝 FOYDALANUVCHINING MAQOLALARINI OLISH (himoyalangan)
app.get("/api/articles/user", auth, async (req, res) => {
  try {
    // Faqat joriy foydalanuvchining maqolalarini olish
    const articles = await Article.find({ author: req.user._id })
      .populate("author", "name email")
      .sort({ createdAt: -1 })

    // Har bir maqola uchun like va comment sonini hisoblash
    const articlesWithStats = await Promise.all(
      articles.map(async (article) => {
        const likesCount = await Like.countDocuments({ article: article._id })
        const commentsCount = await Comment.countDocuments({ article: article._id })

        return {
          ...article.toObject(),
          likes: likesCount,
          commentsCount: commentsCount,
        }
      }),
    )

    res.json(articlesWithStats)
  } catch (error) {
    console.error("Get user articles error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 📖 BITTA MAQOLANI OLISH (ommaviy)
app.get("/api/articles/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate("author", "name email")

    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Like va comment sonini hisoblash
    const likesCount = await Like.countDocuments({ article: article._id })
    const commentsCount = await Comment.countDocuments({ article: article._id })

    const articleWithStats = {
      ...article.toObject(),
      likes: likesCount,
      commentsCount: commentsCount,
    }

    res.json(articleWithStats)
  } catch (error) {
    console.error("Get article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ✍️ YANGI MAQOLA YARATISH (himoyalangan)
app.post("/api/articles", auth, async (req, res) => {
  try {
    const { title, content, description, category, image } = req.body

    // Yangi maqola obyekti yaratish
    const newArticle = new Article({
      title,
      content,
      description,
      category,
      image,
      author: req.user._id, // Author ID sini saqlash
    })

    // Ma'lumotlar bazasiga saqlash
    await newArticle.save()

    // Author ma'lumotlarini populate qilish
    await newArticle.populate("author", "name email")

    res.status(201).json(newArticle)
  } catch (error) {
    console.error("Create article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ✏️ MAQOLANI YANGILASH (himoyalangan)
app.put("/api/articles/:id", auth, async (req, res) => {
  try {
    const { title, content, description, category, image } = req.body
    const article = await Article.findById(req.params.id)

    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Foydalanuvchi maqola egasi ekanligini tekshirish
    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    // Maqola ma'lumotlarini yangilash
    article.title = title
    article.content = content
    article.description = description
    article.category = category
    article.image = image

    // O'zgarishlarni saqlash
    await article.save()
    await article.populate("author", "name email")

    res.json(article)
  } catch (error) {
    console.error("Update article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 🗑️ MAQOLANI O'CHIRISH (himoyalangan)
app.delete("/api/articles/:id", auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)

    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Foydalanuvchi maqola egasi ekanligini tekshirish
    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    // Maqola bilan bog'liq barcha comment va like larni o'chirish
    await Comment.deleteMany({ article: req.params.id })
    await Like.deleteMany({ article: req.params.id })

    // Maqolani o'chirish
    await article.deleteOne()
    res.json({ message: "Maqola o'chirildi" })
  } catch (error) {
    console.error("Delete article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ===================================
// LIKE MANAGEMENT ROUTES
// ===================================

// ❤️ MAQOLANI LIKE QILISH (himoyalangan)
app.post("/api/articles/:id/like", auth, async (req, res) => {
  try {
    const articleId = req.params.id
    const userId = req.user._id

    // Maqola mavjudligini tekshirish
    const article = await Article.findById(articleId)
    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Foydalanuvchi allaqachon like bosganmi tekshirish
    const existingLike = await Like.findOne({
      article: articleId,
      user: userId,
    })

    if (existingLike) {
      return res.status(400).json({ message: "Siz allaqachon like bosgansiz" })
    }

    // Yangi like yaratish
    const newLike = new Like({
      article: articleId,
      user: userId,
    })

    await newLike.save()

    // Jami like sonini hisoblash
    const totalLikes = await Like.countDocuments({ article: articleId })

    res.json({
      message: "Like qo'shildi",
      likes: totalLikes,
      isLiked: true,
    })
  } catch (error) {
    console.error("Like article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 💔 MAQOLADAN LIKE NI OLIB TASHLASH (himoyalangan)
app.delete("/api/articles/:id/like", auth, async (req, res) => {
  try {
    const articleId = req.params.id
    const userId = req.user._id

    // Maqola mavjudligini tekshirish
    const article = await Article.findById(articleId)
    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Like mavjudligini tekshirish va o'chirish
    const deletedLike = await Like.findOneAndDelete({
      article: articleId,
      user: userId,
    })

    if (!deletedLike) {
      return res.status(400).json({ message: "Siz bu maqolani like qilmagansiz" })
    }

    // Jami like sonini hisoblash
    const totalLikes = await Like.countDocuments({ article: articleId })

    res.json({
      message: "Like olib tashlandi",
      likes: totalLikes,
      isLiked: false,
    })
  } catch (error) {
    console.error("Unlike article error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 📊 MAQOLA LIKE STATISTIKASINI OLISH (ommaviy)
app.get("/api/articles/:id/likes", async (req, res) => {
  try {
    const articleId = req.params.id
    const userId = req.user?._id // Optional, agar user login qilmagan bo'lsa

    // Maqola mavjudligini tekshirish
    const article = await Article.findById(articleId)
    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Jami like sonini hisoblash
    const totalLikes = await Like.countDocuments({ article: articleId })

    // Agar user login qilgan bo'lsa, uning like qilganligini tekshirish
    let isLiked = false
    if (userId) {
      const userLike = await Like.findOne({
        article: articleId,
        user: userId,
      })
      isLiked = !!userLike
    }

    res.json({
      count: totalLikes,
      isLiked: isLiked,
    })
  } catch (error) {
    console.error("Get article likes error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ===================================
// COMMENT MANAGEMENT ROUTES
// ===================================

// 💬 MAQOLA COMMENTLARINI OLISH (ommaviy)
app.get("/api/articles/:id/comments", async (req, res) => {
  try {
    const articleId = req.params.id

    // Maqola mavjudligini tekshirish
    const article = await Article.findById(articleId)
    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Commentlarni olish va author ma'lumotlarini populate qilish
    const comments = await Comment.find({ article: articleId }).populate("author", "name email").sort({ createdAt: -1 })

    res.json(comments)
  } catch (error) {
    console.error("Get comments error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ✍️ YANGI COMMENT QOSHISH (himoyalangan)
app.post("/api/articles/:id/comments", auth, async (req, res) => {
  try {
    const articleId = req.params.id
    const { content } = req.body

    // Maqola mavjudligini tekshirish
    const article = await Article.findById(articleId)
    if (!article) {
      return res.status(404).json({ message: "Maqola topilmadi" })
    }

    // Content mavjudligini tekshirish
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment matni bo'sh bo'lishi mumkin emas" })
    }

    // Yangi comment yaratish
    const newComment = new Comment({
      content: content.trim(),
      article: articleId,
      author: req.user._id,
    })

    await newComment.save()

    // Author ma'lumotlarini populate qilish
    await newComment.populate("author", "name email")

    res.status(201).json(newComment)
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ✏️ COMMENTNI YANGILASH (himoyalangan)
app.put("/api/articles/:articleId/comments/:commentId", auth, async (req, res) => {
  try {
    const { articleId, commentId } = req.params
    const { content } = req.body

    // Comment mavjudligini tekshirish
    const comment = await Comment.findById(commentId)
    if (!comment) {
      return res.status(404).json({ message: "Comment topilmadi" })
    }

    // Comment maqolaga tegishli ekanligini tekshirish
    if (comment.article.toString() !== articleId) {
      return res.status(400).json({ message: "Comment bu maqolaga tegishli emas" })
    }

    // Foydalanuvchi comment egasi ekanligini tekshirish
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    // Content mavjudligini tekshirish
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment matni bo'sh bo'lishi mumkin emas" })
    }

    // Comment ni yangilash
    comment.content = content.trim()
    comment.updatedAt = new Date()
    await comment.save()

    // Author ma'lumotlarini populate qilish
    await comment.populate("author", "name email")

    res.json(comment)
  } catch (error) {
    console.error("Update comment error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 🗑️ COMMENTNI O'CHIRISH (himoyalangan)
app.delete("/api/articles/:articleId/comments/:commentId", auth, async (req, res) => {
  try {
    const { articleId, commentId } = req.params

    // Comment mavjudligini tekshirish
    const comment = await Comment.findById(commentId)
    if (!comment) {
      return res.status(404).json({ message: "Comment topilmadi" })
    }

    // Comment maqolaga tegishli ekanligini tekshirish
    if (comment.article.toString() !== articleId) {
      return res.status(400).json({ message: "Comment bu maqolaga tegishli emas" })
    }

    // Foydalanuvchi comment egasi yoki maqola egasi ekanligini tekshirish
    const article = await Article.findById(articleId)
    const isCommentOwner = comment.author.toString() === req.user._id.toString()
    const isArticleOwner = article.author.toString() === req.user._id.toString()

    if (!isCommentOwner && !isArticleOwner) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    // Comment ni o'chirish
    await comment.deleteOne()

    res.json({ message: "Comment o'chirildi" })
  } catch (error) {
    console.error("Delete comment error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ===================================
// PORTFOLIO MANAGEMENT ROUTES
// ===================================

// 💼 BARCHA PORTFOLIO ELEMENTLARINI OLISH (ommaviy)
app.get("/api/portfolio", async (req, res) => {
  try {
    const portfolioItems = await Portfolio.find().populate("author", "name email").sort({ createdAt: -1 })
    res.json(portfolioItems)
  } catch (error) {
    console.error("Get portfolio items error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 👤 FOYDALANUVCHINING PORTFOLIO ELEMENTLARINI OLISH (himoyalangan)
app.get("/api/portfolio/user", auth, async (req, res) => {
  try {
    const portfolioItems = await Portfolio.find({ author: req.user._id })
      .populate("author", "name email")
      .sort({ createdAt: -1 })
    res.json(portfolioItems)
  } catch (error) {
    console.error("Get user portfolio items error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 📁 BITTA PORTFOLIO ELEMENTINI OLISH (ommaviy)
app.get("/api/portfolio/:id", async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findById(req.params.id).populate("author", "name email")

    if (!portfolioItem) {
      return res.status(404).json({ message: "Portfolio topilmadi" })
    }

    res.json(portfolioItem)
  } catch (error) {
    console.error("Get portfolio item error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ➕ YANGI PORTFOLIO ELEMENTI YARATISH (himoyalangan)
app.post("/api/portfolio", auth, async (req, res) => {
  try {
    const { title, content, image, category } = req.body

    const newPortfolio = new Portfolio({
      title,
      content,
      image,
      category,
      author: req.user._id,
    })

    await newPortfolio.save()
    await newPortfolio.populate("author", "name email")

    res.status(201).json(newPortfolio)
  } catch (error) {
    console.error("Create portfolio error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ✏️ PORTFOLIO ELEMENTINI YANGILASH (himoyalangan)
app.put("/api/portfolio/:id", auth, async (req, res) => {
  try {
    const { title, content, image, category } = req.body
    const portfolioItem = await Portfolio.findById(req.params.id)

    if (!portfolioItem) {
      return res.status(404).json({ message: "Portfolio topilmadi" })
    }

    // Foydalanuvchi portfolio egasi ekanligini tekshirish
    if (portfolioItem.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    // Portfolio ma'lumotlarini yangilash
    portfolioItem.title = title
    portfolioItem.content = content
    portfolioItem.image = image
    portfolioItem.category = category

    await portfolioItem.save()
    await portfolioItem.populate("author", "name email")

    res.json(portfolioItem)
  } catch (error) {
    console.error("Update portfolio error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// 🗑️ PORTFOLIO ELEMENTINI O'CHIRISH (himoyalangan)
app.delete("/api/portfolio/:id", auth, async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findById(req.params.id)

    if (!portfolioItem) {
      return res.status(404).json({ message: "Portfolio topilmadi" })
    }

    // Foydalanuvchi portfolio egasi ekanligini tekshirish
    if (portfolioItem.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Ruxsat berilmagan" })
    }

    await portfolioItem.deleteOne()
    res.json({ message: "Portfolio o'chirildi" })
  } catch (error) {
    console.error("Delete portfolio error:", error)
    res.status(500).json({ message: "Server xatosi" })
  }
})

// ===================================
// ERROR HANDLING MIDDLEWARE
// ===================================
// Global error handler
app.use((err, req, res, next) => {
  console.error("🔴 Global Error:", err.message)
  console.error(err.stack)

  res.status(err.status || 500).json({
    message: err.message || "Server xatosi",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
})

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({
    message: "API endpoint topilmadi",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/users/register",
      "POST /api/users/login",
      "PUT /api/users/profile",
      "PUT /api/users/password",
      "GET /api/articles",
      "GET /api/articles/:id",
      "POST /api/articles",
      "PUT /api/articles/:id",
      "DELETE /api/articles/:id",
      "POST /api/articles/:id/like",
      "DELETE /api/articles/:id/like",
      "GET /api/articles/:id/likes",
      "GET /api/articles/:id/comments",
      "POST /api/articles/:id/comments",
      "PUT /api/articles/:articleId/comments/:commentId",
      "DELETE /api/articles/:articleId/comments/:commentId",
      "GET /api/portfolio",
      "GET /api/portfolio/:id",
      "POST /api/portfolio",
      "PUT /api/portfolio/:id",
      "DELETE /api/portfolio/:id",
    ],
  })
})

// ===================================
// SERVER STARTUP
// ===================================
// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishga tushdi`)
  console.log(`🌐 API manzili: http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`📚 Available endpoints:`)
  console.log(`   - Authentication: /api/users/*`)
  console.log(`   - Articles: /api/articles/*`)
  console.log(`   - Comments: /api/articles/:id/comments/*`)
  console.log(`   - Likes: /api/articles/:id/like`)
  console.log(`   - Portfolio: /api/portfolio/*`)
})
