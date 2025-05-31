// ===================================
// AUTHENTICATION MIDDLEWARE
// ===================================
// JWT token orqali foydalanuvchini autentifikatsiya qilish

import jwt from "jsonwebtoken"
import User from "../models/User.js"

// Asosiy auth middleware
export const auth = async (req, res, next) => {
  try {
    // Authorization header dan token olish
    const token = req.header("Authorization")?.replace("Bearer ", "")

    // Token mavjudligini tekshirish
    if (!token) {
      return res.status(401).json({
        message: "Avtorizatsiya talab qilinadi",
        code: "NO_TOKEN",
      })
    }

    // Token ni verify qilish
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Foydalanuvchini ma'lumotlar bazasidan topish
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return res.status(401).json({
        message: "Foydalanuvchi topilmadi",
        code: "USER_NOT_FOUND",
      })
    }

    // Foydalanuvchi aktiv ekanligini tekshirish
    if (!user.isActive) {
      return res.status(401).json({
        message: "Hisob bloklangan",
        code: "ACCOUNT_BLOCKED",
      })
    }

    // Request obyektiga foydalanuvchi ma'lumotlarini qo'shish
    req.user = user
    next() // Keyingi middleware ga o'tish
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Noto'g'ri token",
        code: "INVALID_TOKEN",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token muddati tugagan",
        code: "TOKEN_EXPIRED",
      })
    }

    console.error("Auth middleware error:", error)
    res.status(500).json({
      message: "Server xatosi",
      code: "SERVER_ERROR",
    })
  }
}

// Ixtiyoriy auth middleware (agar user login qilmagan bo'lsa ham davom etadi)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select("-password")

      if (user && user.isActive) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Xatolik bo'lsa ham davom etadi
    next()
  }
}

// Admin huquqlarini tekshirish
export const adminAuth = async (req, res, next) => {
  try {
    // Avval oddiy auth tekshirish
    await auth(req, res, () => {})

    // Admin ekanligini tekshirish
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin huquqlari talab qilinadi",
        code: "ADMIN_REQUIRED",
      })
    }

    next()
  } catch (error) {
    console.error("Admin auth error:", error)
    res.status(500).json({
      message: "Server xatosi",
      code: "SERVER_ERROR",
    })
  }
}
