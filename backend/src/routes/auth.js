import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

function getKyivDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

router.get("/profile", requireAuth, async (request, response) => {
  try {
    const database = request.app.locals.database;
    const user = await database.collection("users").findOne(
      { _id: new ObjectId(request.userId) },
      { projection: { email: 1, phone: 1, createdAt: 1 } },
    );

    if (!user) {
      return response.status(404).json({ error: "Профіль користувача не знайдено" });
    }

    const progress = await database.collection("progress").findOne(
      { userId: request.userId },
      {
        projection: {
          _id: 0,
          balance: 1,
          bestWin: 1,
          totalWinnings: 1,
          totalCreditsGranted: 1,
        },
      },
    );

    return response.json({
      id: user._id.toString(),
      email: user.email,
      phone: user.phone || "",
      createdAt: user.createdAt,
      balance: progress?.balance ?? 0,
      bestWin: progress?.bestWin ?? 0,
      totalWinnings: progress?.totalWinnings ?? 0,
      totalCreditsGranted: progress?.totalCreditsGranted ?? 0,
    });
  } catch (error) {
    console.error("Loading user profile failed:", error.message);
    return response.status(500).json({ error: "Не вдалося завантажити профіль" });
  }
});

router.post("/register", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const phone = String(request.body.phone || "").trim();
  const password = String(request.body.password || "");

  if (!email.includes("@")) {
    return response.status(400).json({ error: "Введіть коректну email-адресу" });
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^[+\d\s()-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return response.status(400).json({ error: "Введіть коректний номер телефону з 10–15 цифр" });
  }

  if (password.length < 8 || password.length > 72) {
    return response.status(400).json({ error: "Пароль має містити від 8 до 72 символів" });
  }

  try {
    const users = request.app.locals.database.collection("users");
    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return response.status(409).json({ error: "Ця email-адреса вже зареєстрована" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await users.insertOne({
      email,
      phone,
      passwordHash,
      createdAt: new Date(),
    });

    await request.app.locals.database.collection("progress").insertOne({
      userId: newUser.insertedId.toString(),
      balance: 10000,
      bet: 20,
      lastWin: 0,
      bestWin: 0,
      totalWinnings: 0,
      totalCreditsGranted: 0,
      fruitDeluxeFreeSpins: 0,
      history: [],
      updatedAt: new Date(),
    });

    return response.status(201).json({ message: "Акаунт створено" });
  } catch (error) {
    console.error("Registration failed:", error.message);
    return response.status(500).json({ error: "Не вдалося створити акаунт" });
  }
});

router.post("/login", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");

  try {
    const users = request.app.locals.database.collection("users");
    const user = await users.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: "Невірний email або пароль" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === "replace-with-a-long-random-string" || jwtSecret.length < 32) {
      return response.status(503).json({ error: "На сервері потрібно налаштувати JWT_SECRET" });
    }

    const token = jwt.sign(
      { sub: user._id.toString() },
      jwtSecret,
      { expiresIn: "7d" },
    );

    const userId = user._id.toString();
    const progress = request.app.locals.database.collection("progress");
    await progress.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          balance: 0,
          bet: 20,
          lastWin: 0,
          bestWin: 0,
          totalWinnings: 0,
          totalCreditsGranted: 0,
          fruitDeluxeFreeSpins: 0,
          history: [],
        },
      },
      { upsert: true },
    );

    const today = getKyivDateKey();
    const dailyBonus = await progress.findOneAndUpdate(
      { userId, dailyBonusClaimedOn: { $ne: today } },
      [
        {
          $set: {
            balance: { $add: [{ $ifNull: ["$balance", 0] }, 100] },
            dailyBonusClaimedOn: { $literal: today },
            updatedAt: { $literal: new Date() },
          },
        },
      ],
      { returnDocument: "after", projection: { _id: 0, balance: 1 } },
    );

    return response.json({
      token,
      user: { id: user._id.toString(), email: user.email },
      dailyBonusAwarded: Boolean(dailyBonus),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return response.status(500).json({ error: "Не вдалося виконати вхід" });
  }
});

export default router;
