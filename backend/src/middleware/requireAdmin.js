import { ObjectId } from "mongodb";

export async function requireAdmin(request, response, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!adminEmail) {
    return response.status(503).json({ error: "На сервері не налаштовано адміністратора" });
  }

  try {
    const user = await request.app.locals.database.collection("users").findOne(
      { _id: new ObjectId(request.userId) },
      { projection: { email: 1 } },
    );

    if (!user || user.email !== adminEmail) {
      return response.status(403).json({ error: "Ця сторінка доступна лише адміністратору" });
    }

    return next();
  } catch (error) {
    console.error("Admin access check failed:", error.message);
    return response.status(500).json({ error: "Не вдалося перевірити права адміністратора" });
  }
}
