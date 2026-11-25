import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
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
      { projection: { email: 1, phone: 1, displayName: 1, createdAt: 1 } },
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
      displayName: user.displayName || "",
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

router.patch("/profile", requireAuth, async (request, response) => {
  const displayName = String(request.body.displayName || "").trim();

  if (displayName.length < 2 || displayName.length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(displayName)) {
    return response.status(400).json({
      error: "Нікнейм має містити 2–20 символів: літери, цифри, пробіли, дефіс або підкреслення",
    });
  }

  try {
    const result = await request.app.locals.database.collection("users").updateOne(
      { _id: new ObjectId(request.userId) },
      { $set: { displayName } },
    );

    if (result.matchedCount === 0) {
      return response.status(404).json({ error: "Профіль користувача не знайдено" });
    }

    return response.json({ displayName });
  } catch (error) {
    console.error("Updating user display name failed:", error.message);
    return response.status(500).json({ error: "Не вдалося зберегти нікнейм" });
  }
});

router.put("/profile", requireAuth, async (request, response) => {
  const phone = String(request.body.phone || "").trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (!/^[+\d\s()-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return response.status(400).json({ error: "Введіть коректний номер телефону з 10–15 цифр" });
  }

  try {
    const result = await request.app.locals.database.collection("users").updateOne(
      { _id: new ObjectId(request.userId) },
      { $set: { phone } },
    );

    if (result.matchedCount === 0) {
      return response.status(404).json({ error: "Профіль користувача не знайдено" });
    }

    return response.json({ phone });
  } catch (error) {
    console.error("Updating user phone failed:", error.message);
    return response.status(500).json({ error: "Не вдалося оновити номер телефону" });
  }
});

router.put("/password", requireAuth, async (request, response) => {
  const newPassword = String(request.body.newPassword || "");

  if (newPassword.length < 8 || newPassword.length > 72) {
    return response.status(400).json({ error: "Новий пароль має містити від 8 до 72 символів" });
  }

  try {
    const users = request.app.locals.database.collection("users");
    const userId = new ObjectId(request.userId);
    const user = await users.findOne({ _id: userId }, { projection: { passwordHash: 1 } });

    if (!user) {
      return response.status(404).json({ error: "Користувача не знайдено" });
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return response.status(400).json({ error: "Новий пароль має відрізнятися від поточного" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await users.updateOne({ _id: userId }, { $set: { passwordHash } });

    return response.json({ message: "Пароль успішно змінено" });
  } catch (error) {
    console.error("Changing password failed:", error.message);
    return response.status(500).json({ error: "Не вдалося змінити пароль" });
  }
});

router.post("/password-reset/request", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const genericMessage = "Якщо акаунт із такою адресою існує, ми надіслали лист з інструкціями.";

  if (!email.includes("@")) {
    return response.status(400).json({ error: "Введіть коректну email-адресу" });
  }

  const requiredMailSettings = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "EMAIL_FROM",
    "FRONTEND_URL",
  ];
  if (requiredMailSettings.some((key) => !process.env[key])) {
    return response.status(503).json({ error: "Відновлення пароля тимчасово недоступне" });
  }

  try {
    const users = request.app.locals.database.collection("users");
    const user = await users.findOne(
      { email },
      { projection: { email: 1, passwordResetRequestedAt: 1 } },
    );
    if (!user) {
      return response.json({ message: genericMessage });
    }

    const now = new Date();
    const lastRequestTime = user.passwordResetRequestedAt?.getTime?.() || 0;
    if (now.getTime() - lastRequestTime < 60_000) {
      return response.json({ message: genericMessage });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(now.getTime() + 15 * 60_000);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: resetTokenHash,
          passwordResetExpiresAt: expiresAt,
          passwordResetRequestedAt: now,
        },
      },
    );

    const frontendUrl = process.env.FRONTEND_URL.trim().replace(/\/+$/, "");
    const resetLink = `${frontendUrl}/#reset-password?token=${encodeURIComponent(resetToken)}`;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Відновлення пароля LuckySpin",
        text: `Щоб задати новий пароль, відкрийте посилання (діє 15 хвилин): ${resetLink}

Якщо ви не запитували зміну пароля, проігноруйте цей лист.`,
        html: `<p>Ви запросили зміну пароля LuckySpin.</p><p><a href="${resetLink}">Задати новий пароль</a></p><p>Посилання діє 15 хвилин. Якщо ви не запитували зміну пароля, проігноруйте цей лист.</p>`,
      });
    } catch (mailError) {
      await users.updateOne(
        { _id: user._id, passwordResetTokenHash: resetTokenHash },
        { $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" } },
      );
      console.error("Password reset email failed:", mailError.message);
    }

    return response.json({ message: genericMessage });
  } catch (error) {
    console.error("Password reset request failed:", error.message);
    return response.status(500).json({ error: "Не вдалося обробити запит" });
  }
});

router.post("/password-reset/confirm", async (request, response) => {
  const token = String(request.body.token || "");
  const newPassword = String(request.body.newPassword || "");

  if (newPassword.length < 8 || newPassword.length > 72) {
    return response.status(400).json({ error: "Новий пароль має містити від 8 до 72 символів" });
  }
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return response.status(400).json({ error: "Посилання недійсне або строк його дії минув. Запросіть нове." });
  }

  try {
    const users = request.app.locals.database.collection("users");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const user = await users.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: now },
    });

    if (!user) {
      return response.status(400).json({ error: "Посилання недійсне або строк його дії минув. Запросіть нове." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await users.updateOne(
      {
        _id: user._id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: now },
      },
      {
        $set: { passwordHash },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetExpiresAt: "",
          passwordResetRequestedAt: "",
        },
      },
    );

    if (result.matchedCount === 0) {
      return response.status(400).json({ error: "Посилання недійсне або строк його дії минув. Запросіть нове." });
    }

    return response.json({ message: "Пароль змінено. Тепер увійдіть із новим паролем." });
  } catch (error) {
    console.error("Password reset confirmation failed:", error.message);
    return response.status(500).json({ error: "Не вдалося змінити пароль" });
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
      pharaohFreeSpins: 0,
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
          pharaohFreeSpins: 0,
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
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || "",
      },
      dailyBonusAwarded: Boolean(dailyBonus),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return response.status(500).json({ error: "Не вдалося виконати вхід" });
  }
});

export default router;
