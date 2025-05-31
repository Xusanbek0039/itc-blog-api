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
const JWT_SECRET = process.env.JWT_SECRET || "itc-blog-secret-key-2024" // JWT maxfiy kaliti
const MONGODB_URI = "mongodb+srv://itpark0071:1zoImG9EvXvlcM62@blog.3ynva8v.mongodb.net/itc-blog?retryWrites=true&w=majority"
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*" // CORS sozlamalari

// ===================================
// MIDDLEWARE SETUP
// ===================================
// CORS - Cross-Origin Resource Sharing sozlamalari
app.use(
  cors({
    origin: CORS_ORIGIN, // Qaysi domenlardan so'rov qabul qilish
    credentials: true, // Cookie va authentication ma'lumotlarini qabul qilish
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// JSON ma'lumotlarni parse qilish uchun middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body }
    if (logBody.password) logBody.password = "***"
    console.log("Request body:", logBody)
  }
  next()
})

// ===================================
// DATABASE CONNECTION
// ===================================
// MongoDB ga ulanish
let isConnected = false

const connectDB = async () => {
  try {
    if (isConnected) {
      console.log("✅ MongoDB allaqachon ulangan")
      return
    }

    console.log("🔄 MongoDB ga ulanmoqda...")
    console.log("MongoDB URI:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"))

    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    })

    isConnected = true
    console.log("✅ MongoDB ga muvaffaqiyatli ulandi:", conn.connection.host)
    console.log("📊 Database nomi:", conn.connection.name)
  } catch (err) {
    console.error("❌ MongoDB ga ulanishda xatolik:", err.message)
    console.error("Full error:", err)
    isConnected = false
    // Don't exit, let the app continue and retry connection
  }
}

// Initial connection
connectDB()

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("🟢 MongoDB connected")
  isConnected = true
})

mongoose.connection.on("error", (err) => {
  console.error("🔴 MongoDB connection error:", err)
  isConnected = false
})

mongoose.connection.on("disconnected", () => {
  console.log("🟡 MongoDB disconnected")
  isConnected = false
})

// ===================================
// HEALTH CHECK ENDPOINTS
// ===================================
// Asosiy endpoint - server holatini tekshirish
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ITC-Blog API server is running",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    database: isConnected ? "connected" : "disconnected",
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
    database: isConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
  })
})

// Database connection check
app.get("/api/db-status", (req, res) => {
  res.json({
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  })
})

// ===================================
// ENVIRONMENT LOGGING
// ===================================
// Server sozlamalarini console ga chiqarish (xavfsizlik uchun maxfiy ma'lumotlarsiz)
console.log("🚀 Server running with:")
console.log("📍 PORT:", PORT)
console.log("🌐 CORS_ORIGIN:", CORS_ORIGIN)
console.log("🗄️  MONGODB_URI:", MONGODB_URI ? "✅ Configured" : "❌ Not configured")
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
    console.error("Auth middleware error:", error)
    res.status(401).json({ message: "Avtorizatsiya xatosi" })
  }
}

// ===================================
// INPUT VALIDATION HELPERS
// ===================================
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  return password && password.length >= 6
}

const validateName = (name) => {
  return name && name.trim().length >= 2
}

// ===================================
// USER AUTHENTICATION ROUTES
// ===================================

// 📝 FOYDALANUVCHI RO'YXATDAN O'TISH
app.post("/api/users/register", async (req, res) => {
  try {
    console.log("📝 Registration request received")
    console.log("Request body keys:", Object.keys(req.body))

    // Database connection check
    if (!isConnected) {
      console.error("❌ Database not connected")
      return res.status(500).json({ message: "Ma'lumotlar bazasiga ulanish yo'q" })
    }

    const { name, email, password } = req.body

    // Input validation
    if (!name || !email || !password) {
      console.log("❌ Missing required fields:", { name: !!name, email: !!email, password: !!password })
      return res.status(400).json({ message: "Barcha maydonlar to'ldirilishi shart" })
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log("❌ Invalid email format:", email)
      return res.status(400).json({ message: "Email formati noto'g'ri" })
    }

    // Validate password
    if (!validatePassword(password)) {
      console.log("❌ Invalid password")
      return res.status(400).json({ message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
    }

    // Validate name
    if (!validateName(name)) {
      console.log("❌ Invalid name")
      return res.status(400).json({ message: "Ism kamida 2 ta belgidan iborat bo'lishi kerak" })
    }

    console.log("✅ Input validation passed")

    // Foydalanuvchi allaqachon mavjudligini tekshirish
    console.log("🔍 Checking if user exists with email:", email)
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      console.log("❌ User already exists")
      return res.status(400).json({ message: "Bu email allaqachon ro'yxatdan o'tgan" })
    }

    console.log("✅ User does not exist, proceeding with registration")

    // Parolni hash qilish (xavfsizlik uchun)
    console.log("🔐 Hashing password")
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Yangi foydalanuvchi yaratish
    console.log("👤 Creating new user")
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    })

    // Ma'lumotlar bazasiga saqlash
    console.log("💾 Saving user to database")
    await user.save()
    console.log("✅ User saved successfully with ID:", user._id)

    // JWT token yaratish (30 kun amal qiladi)
    console.log("🎫 Creating JWT token")
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" })

    // Muvaffaqiyatli javob qaytarish
    const responseData = {
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    }

    console.log("✅ Registration successful for user:", user.email)
    res.status(201).json(responseData)
  } catch (error) {
    console.error("❌ Registration error:", error)
    console.error("Error stack:", error.stack)

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: "Bu email allaqachon ro'yxatdan o'tgan" })
    }

    // Validation error
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: messages.join(", ") })
    }

    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// 🔐 FOYDALANUVCHI TIZIMGA KIRISH
app.post("/api/users/login", async (req, res) => {
  try {
    console.log("🔐 Login request received")

    // Database connection check
    if (!isConnected) {
      console.error("❌ Database not connected")
      return res.status(500).json({ message: "Ma'lumotlar bazasiga ulanish yo'q" })
    }

    const { email, password } = req.body

    // Input validation
    if (!email || !password) {
      console.log("❌ Missing credentials")
      return res.status(400).json({ message: "Email va parol kiritish shart" })
    }

    // Validate email format
    if (!validateEmail(email)) {
      console.log("❌ Invalid email format:", email)
      return res.status(400).json({ message: "Email formati noto'g'ri" })
    }

    console.log("🔍 Looking for user with email:", email)

    // Foydalanuvchi mavjudligini tekshirish
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      console.log("❌ User not found")
      return res.status(400).json({ message: "Noto'g'ri email yoki parol" })
    }

    console.log("✅ User found, checking password")

    // Parolni tekshirish
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      console.log("❌ Password mismatch")
      return res.status(400).json({ message: "Noto'g'ri email yoki parol" })
    }

    console.log("✅ Password correct, creating token")

    // JWT token yaratish
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "30d" })

    // Muvaffaqiyatli javob qaytarish
    const responseData = {
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    }

    console.log("✅ Login successful for user:", user.email)
    res.json(responseData)
  } catch (error) {
    console.error("❌ Login error:", error)
    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// 👤 FOYDALANUVCHI PROFILINI YANGILASH
app.put("/api/users/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body

    // Email boshqa foydalanuvchi tomonidan ishlatilayotganligini tekshirish
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        return res.status(400).json({ message: "Bu email allaqachon ishlatilmoqda" })
      }
    }

    // Foydalanuvchi ma'lumotlarini yangilash
    const user = await User.findById(req.user._id)
    if (name) user.name = name.trim()
    if (email) user.email = email.toLowerCase().trim()

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
    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// 🔒 PAROLNI O'ZGARTIRISH
app.put("/api/users/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Joriy va yangi parol kiritish shart" })
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" })
    }

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
    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// ===================================
// ARTICLE MANAGEMENT ROUTES
// ===================================

// 📚 BARCHA MAQOLALARNI OLISH (ommaviy)
app.get("/api/articles", async (req, res) => {
  try {
    console.log("📚 Getting all articles")

    // Database connection check
    if (!isConnected) {
      console.error("❌ Database not connected")
      return res.status(500).json({ message: "Ma'lumotlar bazasiga ulanish yo'q" })
    }

    // Maqolalarni eng yangi birinchi bo'lib saralash va author ma'lumotlarini populate qilish
    const articles = await Article.find({ status: "published" })
      .populate("author", "name email")
      .sort({ createdAt: -1 })
      .limit(50) // Limit to 50 articles for performance

    console.log(`✅ Found ${articles.length} articles`)

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

    res.json({ articles: articlesWithStats })
  } catch (error) {
    console.error("Get articles error:", error)
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// ✍️ YANGI MAQOLA YARATISH (himoyalangan)
app.post("/api/articles", auth, async (req, res) => {
  try {
    const { title, content, description, category, image } = req.body

    // Input validation
    if (!title || !content) {
      return res.status(400).json({ message: "Sarlavha va kontent kiritish shart" })
    }

    // Yangi maqola obyekti yaratish
    const newArticle = new Article({
      title: title.trim(),
      content,
      description: description?.trim() || "",
      category: category || "Umumiy",
      image: image || "",
      author: req.user._id, // Author ID sini saqlash
    })

    // Ma'lumotlar bazasiga saqlash
    await newArticle.save()

    // Author ma'lumotlarini populate qilish
    await newArticle.populate("author", "name email")

    res.status(201).json(newArticle)
  } catch (error) {
    console.error("Create article error:", error)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ message: messages.join(", ") })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
      return res.status(403).json({ message: "Ruxsat berilmagan" })
    }

    // Maqola ma'lumotlarini yangilash
    if (title) article.title = title.trim()
    if (content) article.content = content
    if (description !== undefined) article.description = description.trim()
    if (category) article.category = category
    if (image !== undefined) article.image = image

    // O'zgarishlarni saqlash
    await article.save()
    await article.populate("author", "name email")

    res.json(article)
  } catch (error) {
    console.error("Update article error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
      return res.status(403).json({ message: "Ruxsat berilmagan" })
    }

    // Maqola bilan bog'liq barcha comment va like larni o'chirish
    await Comment.deleteMany({ article: req.params.id })
    await Like.deleteMany({ article: req.params.id })

    // Maqolani o'chirish
    await article.deleteOne()
    res.json({ message: "Maqola o'chirildi" })
  } catch (error) {
    console.error("Delete article error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    const comments = await Comment.find({ article: articleId, status: "active" })
      .populate("author", "name email")
      .sort({ createdAt: -1 })

    res.json({ comments })
  } catch (error) {
    console.error("Get comments error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri maqola ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
      return res.status(403).json({ message: "Ruxsat berilmagan" })
    }

    // Content mavjudligini tekshirish
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment matni bo'sh bo'lishi mumkin emas" })
    }

    // Comment ni yangilash
    comment.content = content.trim()
    comment.isEdited = true
    comment.editedAt = new Date()
    await comment.save()

    // Author ma'lumotlarini populate qilish
    await comment.populate("author", "name email")

    res.json(comment)
  } catch (error) {
    console.error("Update comment error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
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
      return res.status(403).json({ message: "Ruxsat berilmagan" })
    }

    // Comment ni o'chirish
    await comment.deleteOne()

    res.json({ message: "Comment o'chirildi" })
  } catch (error) {
    console.error("Delete comment error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Noto'g'ri ID" })
    }
    res.status(500).json({ message: "Server xatosi: " + error.message })
  }
})

// ===================================
// ERROR HANDLING MIDDLEWARE
// ===================================
// Global error handler
app.use((err, req, res, next) => {
  console.error("🔴 Global Error:", err.message)
  console.error("Error stack:", err.stack)

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
      "GET /api/db-status",
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
  console.log(`🗄️  Database status: http://localhost:${PORT}/api/db-status`)
  console.log(`📚 Available endpoints:`)
  console.log(`   - Authentication: /api/users/*`)
  console.log(`   - Articles: /api/articles/*`)
  console.log(`   - Comments: /api/articles/:id/comments/*`)
  console.log(`   - Likes: /api/articles/:id/like`)
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down server...")
  await mongoose.connection.close()
  console.log("🔌 Database connection closed")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down server...")
  await mongoose.connection.close()
  console.log("🔌 Database connection closed")
  process.exit(0)
})
