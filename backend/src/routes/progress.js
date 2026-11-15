import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const allowedBets = [20, 50, 100, 250, 500, 1000];

router.get("/", requireAuth, async (request, response) => {
  try {
    const progressCollection = request.app.locals.database.collection("progress");
    const progress = await progressCollection.findOne(
      { userId: request.userId },
      { projection: { _id: 0, userId: 0, updatedAt: 0 } },
    );

    if (!progress) {
      return response.status(404).json({ error: "Прогрес не знайдено. Зверніться до адміністратора" });
    }

    return response.json(progress);
  } catch (error) {
    console.error("Loading progress failed:", error.message);
    return response.status(500).json({ error: "Не вдалося завантажити прогрес" });
  }
});

router.put("/", requireAuth, async (request, response) => {
  const { bet } = request.body;

  if (!allowedBets.includes(bet)) {
    return response.status(400).json({ error: "Некоректна ставка" });
  }

  try {
    const result = await request.app.locals.database.collection("progress").updateOne(
      { userId: request.userId },
      { $set: { bet, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return response.status(404).json({ error: "Прогрес користувача не знайдено" });
    }

    return response.json({ message: "Ставку збережено" });
  } catch (error) {
    console.error("Saving bet failed:", error.message);
    return response.status(500).json({ error: "Не вдалося зберегти ставку" });
  }
});

router.delete("/history", requireAuth, async (request, response) => {
  try {
    await request.app.locals.database.collection("progress").updateOne(
      { userId: request.userId },
      { $set: { history: [], updatedAt: new Date() } },
    );
    return response.json({ message: "Історію очищено" });
  } catch (error) {
    console.error("Clearing history failed:", error.message);
    return response.status(500).json({ error: "Не вдалося очистити історію" });
  }
});

export default router;
