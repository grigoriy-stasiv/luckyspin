import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const symbols = ["🍒", "🍋", "🔔", "💎", "7️⃣", "👑"];
const multipliers = { "🍒": 5, "🍋": 8, "🔔": 10, "💎": 25, "7️⃣": 50, "👑": 100 };
const allowedBets = [20, 50, 100, 250, 500, 1000];
const fruitSymbolBag = [
  "🍒", "🍒", "🍒", "🍒", "🍒",
  "🍋", "🍋", "🍋", "🍋", "🍋",
  "🍊", "🍊", "🍊", "🍊", "🍊",
  "🍇", "🍇", "🍇", "🍇", "🍇",
  "🍉", "🍉",
  "🍍", "🍍", "🍍",
];
const fruitPayouts = {
  "🍒": { 3: 2, 4: 5, 5: 10 },
  "🍋": { 3: 3, 4: 6, 5: 12 },
  "🍊": { 3: 4, 4: 8, 5: 15 },
  "🍇": { 3: 5, 4: 10, 5: 20 },
  "🍉": { 3: 8, 4: 15, 5: 30 },
};
const wildPayouts = { 3: 10, 4: 25, 5: 50 };
const fruitPaylines = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

function createFruitGrid() {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => fruitSymbolBag[Math.floor(Math.random() * fruitSymbolBag.length)]),
  );
}

function getFruitLineWins(grid, bet) {
  return fruitPaylines.flatMap((rowsByColumn, lineIndex) => {
    const lineSymbols = rowsByColumn.map((row, column) => grid[row][column]);
    const symbol = lineSymbols.find((lineSymbol) => lineSymbol !== "🍍") ?? "🍍";
    let matchCount = 0;

    while (matchCount < lineSymbols.length &&
      (lineSymbols[matchCount] === symbol || lineSymbols[matchCount] === "🍍")) {
      matchCount += 1;
    }

    const multiplier = symbol === "🍍" ? wildPayouts[matchCount] : fruitPayouts[symbol][matchCount];
    if (!multiplier) {
      return [];
    }

    return [{
      lineIndex: lineIndex + 1,
      symbol,
      matchCount,
      containsWild: lineSymbols.slice(0, matchCount).includes("🍍"),
      rowsByColumn,
      win: bet * multiplier,
    }];
  });
}

router.post("/spin", requireAuth, async (request, response) => {
  const { bet } = request.body;
  if (!allowedBets.includes(bet)) {
    return response.status(400).json({ error: "Некоректна ставка" });
  }

  const reels = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
  const isWin = reels[0] === reels[1] && reels[1] === reels[2];
  const win = isWin ? bet * multipliers[reels[0]] : 0;
  const round = { symbols: reels.join(" "), win, bet };

  try {
    const progressCollection = request.app.locals.database.collection("progress");
    const updatedProgress = await progressCollection.findOneAndUpdate(
      { userId: request.userId, balance: { $gte: bet } },
      [
        {
          $set: {
            balance: { $add: ["$balance", win - bet] },
            bet: { $literal: bet },
            lastWin: {
              $cond: [
                { $gt: [{ $literal: win }, 0] },
                { $literal: win },
                { $ifNull: ["$lastWin", 0] },
              ],
            },
            bestWin: { $max: [{ $ifNull: ["$bestWin", 0] }, { $literal: win }] },
            totalWinnings: {
              $add: [{ $ifNull: ["$totalWinnings", 0] }, { $literal: win }],
            },
            history: { $literal: [round] },
            updatedAt: { $literal: new Date() },
          },
        },
      ],
      { returnDocument: "after", projection: { _id: 0, userId: 0, updatedAt: 0 } },
    );

    if (!updatedProgress) {
      const currentProgress = await progressCollection.findOne(
        { userId: request.userId },
        { projection: { _id: 0, balance: 1 } },
      );
      return response.status(409).json({
        error: "Недостатньо кредитів. Зверніться до адміністратора для поповнення.",
        balance: currentProgress?.balance ?? 0,
      });
    }

    return response.json({ ...updatedProgress, reels, win });
  } catch (error) {
    console.error("Spin failed:", error.message);
    return response.status(500).json({ error: "Не вдалося завершити обертання" });
  }
});

router.post("/fruit-deluxe/spin", requireAuth, async (request, response) => {
  const { bet } = request.body;
  if (!allowedBets.includes(bet)) {
    return response.status(400).json({ error: "Некоректна ставка" });
  }

  const grid = createFruitGrid();
  const lineWins = getFruitLineWins(grid, bet);
  const win = lineWins.reduce((sum, line) => sum + line.win, 0);
  const bonusSymbolCount = grid.flat().filter((symbol) => symbol === "🍉").length;
  const bonusSpinsAwarded = bonusSymbolCount >= 5 ? 5 : 0;

  try {
    const progressCollection = request.app.locals.database.collection("progress");
    const currentProgress = await progressCollection.findOne(
      { userId: request.userId },
      { projection: { _id: 0, balance: 1, fruitDeluxeFreeSpins: 1 } },
    );

    if (!currentProgress) {
      return response.status(404).json({ error: "Прогрес користувача не знайдено" });
    }

    const settleSpin = (isFreeSpin) => {
      const totalBet = isFreeSpin ? 0 : bet * fruitPaylines.length;
      const round = {
        symbols: grid.flat().join(" "),
        win,
        bet: totalBet,
        game: "Fruit Fortune Deluxe",
        isFreeSpin,
      };
      const filter = isFreeSpin
        ? { userId: request.userId, fruitDeluxeFreeSpins: { $gt: 0 } }
        : {
            userId: request.userId,
            balance: { $gte: totalBet },
            fruitDeluxeFreeSpins: { $in: [null, 0] },
          };

      return progressCollection.findOneAndUpdate(
        filter,
        [
          {
            $set: {
              balance: { $add: ["$balance", win - totalBet] },
              bet: { $literal: bet },
              fruitDeluxeFreeSpins: {
                $add: [
                  { $ifNull: ["$fruitDeluxeFreeSpins", 0] },
                  bonusSpinsAwarded - (isFreeSpin ? 1 : 0),
                ],
              },
              lastWin: {
                $cond: [
                  { $gt: [{ $literal: win }, 0] },
                  { $literal: win },
                  { $ifNull: ["$lastWin", 0] },
                ],
              },
              bestWin: { $max: [{ $ifNull: ["$bestWin", 0] }, { $literal: win }] },
              totalWinnings: {
                $add: [{ $ifNull: ["$totalWinnings", 0] }, { $literal: win }],
              },
              history: { $literal: [round] },
              updatedAt: { $literal: new Date() },
            },
          },
        ],
        { returnDocument: "after", projection: { _id: 0, userId: 0, updatedAt: 0 } },
      );
    };

    let isFreeSpin = (currentProgress.fruitDeluxeFreeSpins ?? 0) > 0;
    let updatedProgress = await settleSpin(isFreeSpin);

    if (!updatedProgress && isFreeSpin) {
      isFreeSpin = false;
      updatedProgress = await settleSpin(false);
    } else if (!updatedProgress) {
      const latestProgress = await progressCollection.findOne(
        { userId: request.userId },
        { projection: { _id: 0, balance: 1, fruitDeluxeFreeSpins: 1 } },
      );
      if ((latestProgress?.fruitDeluxeFreeSpins ?? 0) > 0) {
        isFreeSpin = true;
        updatedProgress = await settleSpin(true);
        if (!updatedProgress) {
          isFreeSpin = false;
          updatedProgress = await settleSpin(false);
        }
      }
    }

    if (!updatedProgress) {
      const latestProgress = await progressCollection.findOne(
        { userId: request.userId },
        { projection: { _id: 0, balance: 1 } },
      );
      return response.status(409).json({
        error: "Недостатньо кредитів для ставки на п’ять ліній. Зверніться до адміністратора.",
        balance: latestProgress?.balance ?? 0,
      });
    }

    const totalBet = isFreeSpin ? 0 : bet * fruitPaylines.length;
    return response.json({
      ...updatedProgress,
      grid,
      lineWins,
      win,
      totalBet,
      isFreeSpin,
      bonusAwarded: bonusSpinsAwarded > 0,
      bonusSpinsAwarded,
      bonusSymbolCount,
    });
  } catch (error) {
    console.error("Fruit Fortune Deluxe spin failed:", error.message);
    return response.status(500).json({ error: "Не вдалося завершити обертання" });
  }
});

export default router;
