import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/status", requireAuth, async (request, response) => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const user = await request.app.locals.database.collection("users").findOne(
      { _id: new ObjectId(request.userId) },
      { projection: { email: 1 } },
    );

    return response.json({ isAdmin: Boolean(adminEmail && user?.email === adminEmail) });
  } catch (error) {
    console.error("Checking admin status failed:", error.message);
    return response.status(500).json({ error: "Не вдалося перевірити права адміністратора" });
  }
});

router.get("/users", requireAuth, requireAdmin, async (request, response) => {
  try {
    const users = await request.app.locals.database
      .collection("users")
      .find({}, { projection: { email: 1, displayName: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();
    const userIds = users.map((user) => user._id.toString());
    const progressRows = await request.app.locals.database
      .collection("progress")
      .find({ userId: { $in: userIds } }, {
        projection: {
          _id: 0,
          userId: 1,
          balance: 1,
          bestWin: 1,
          lastWin: 1,
          totalWinnings: 1,
          totalCreditsGranted: 1,
        },
      })
      .toArray();
    const progressByUserId = new Map(progressRows.map((progress) => [progress.userId, progress]));

    const results = users.map((user) => {
      const progress = progressByUserId.get(user._id.toString());
      return {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName || "",
        createdAt: user.createdAt,
        balance: progress?.balance ?? 0,
        lastWin: progress?.lastWin ?? 0,
        bestWin: progress?.bestWin ?? 0,
        totalWinnings: progress?.totalWinnings ?? 0,
        totalCreditsGranted: progress?.totalCreditsGranted ?? 0,
      };
    });

    return response.json({ totalUsers: results.length, users: results });
  } catch (error) {
    console.error("Loading admin users failed:", error.message);
    return response.status(500).json({ error: "Не вдалося завантажити список акаунтів" });
  }
});

router.post("/users/:userId/credits", requireAuth, requireAdmin, async (request, response) => {
  const amount = Number(request.body.amount);
  const { userId } = request.params;

  if (!ObjectId.isValid(userId) || !Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
    return response.status(400).json({ error: "Вкажіть суму від 1 до 100 000 кредитів" });
  }

  try {
    const database = request.app.locals.database;
    const user = await database.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return response.status(404).json({ error: "Акаунт не знайдено" });
    }

    const progress = database.collection("progress");
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
    await progress.updateOne(
      { userId },
      {
        $inc: { balance: amount, totalCreditsGranted: amount },
        $set: { updatedAt: new Date() },
      },
    );
    const updatedProgress = await progress.findOne({ userId }, { projection: { _id: 0, balance: 1 } });

    return response.json({ userId, balance: updatedProgress.balance });
  } catch (error) {
    console.error("Granting credits failed:", error.message);
    return response.status(500).json({ error: "Не вдалося нарахувати кредити" });
  }
});

router.delete("/users/:userId", requireAuth, requireAdmin, async (request, response) => {
  const { userId } = request.params;

  if (!ObjectId.isValid(userId)) {
    return response.status(400).json({ error: "Некоректний ідентифікатор користувача" });
  }

  if (userId === request.userId) {
    return response.status(400).json({ error: "Не можна видалити власний акаунт" });
  }

  try {
    const database = request.app.locals.database;
    const user = await database.collection("users").findOneAndDelete({ _id: new ObjectId(userId) });

    if (!user) {
      return response.status(404).json({ error: "Акаунт не знайдено" });
    }

    await database.collection("progress").deleteOne({ userId });
    return response.json({ message: "Акаунт і його прогрес видалено", userId });
  } catch (error) {
    console.error("Deleting user failed:", error.message);
    return response.status(500).json({ error: "Не вдалося видалити акаунт" });
  }
});

export default router;
