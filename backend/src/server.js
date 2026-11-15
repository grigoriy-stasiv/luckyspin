import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectToDatabase } from "./database.js";
import authRouter from "./routes/auth.js";
import progressRouter from "./routes/progress.js";
import gameRouter from "./routes/game.js";
import adminRouter from "./routes/admin.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/progress", progressRouter);
app.use("/api/game", gameRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", database: "connected" });
});

async function startServer() {
  try {
    app.locals.database = await connectToDatabase();
    await app.locals.database.collection("users").createIndex({ email: 1 }, { unique: true });
    await app.locals.database.collection("progress").createIndex({ userId: 1 }, { unique: true });
    app.listen(port, () => {
      console.log(`LuckySpin API is running on port ${port}`);
    });
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
