import jwt from "jsonwebtoken";

export function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ error: "Потрібно увійти в акаунт" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload.sub !== "string") {
      return response.status(401).json({ error: "Недійсний токен" });
    }

    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ error: "Сеанс завершився. Увійдіть знову" });
  }
}
