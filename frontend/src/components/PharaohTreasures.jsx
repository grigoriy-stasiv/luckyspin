import { useEffect, useRef, useState } from "react";
import BetPanel from "./BetPanel.jsx";
import AutoSpinControls from "./AutoSpinControls.jsx";

const symbolBag = [
  "🪙", "🪙", "🪙", "🪙", "🪙",
  "🐍", "🐍", "🐍", "🐍", "🐍",
  "👁️", "👁️", "👁️", "👁️", "👁️",
  "🏺", "🏺", "🏺", "🏺", "🏺",
  "💎", "💎", "💎",
  "🪲", "🪲",
  "🦁", "🦁", "🦁",
];
const initialGrid = [
  ["🪙", "🐍", "👁️", "🏺", "💎"],
  ["🏺", "🪲", "🪙", "🦁", "🐍"],
  ["🐍", "👁️", "🏺", "🪙", "🪲"],
];
const payoutTable = [
  { symbol: "🪙", payouts: { 3: 2, 4: 5, 5: 10 } },
  { symbol: "🐍", payouts: { 3: 3, 4: 6, 5: 12 } },
  { symbol: "👁️", payouts: { 3: 4, 4: 8, 5: 15 } },
  { symbol: "🏺", payouts: { 3: 5, 4: 10, 5: 20 } },
  { symbol: "💎", payouts: { 3: 8, 4: 15, 5: 30 } },
  { symbol: "🦁 WILD", payouts: { 3: 10, 4: 25, 5: 50 } },
];

function createRandomGrid() {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => symbolBag[Math.floor(Math.random() * symbolBag.length)]),
  );
}

function PharaohTreasures({
  account,
  isProgressReady,
  bet,
  balance,
  freeSpins,
  onBack,
  onSelectBet,
  onBalanceChanged,
  onProgressUpdated,
}) {
  const [grid, setGrid] = useState(initialGrid);
  const [winningCells, setWinningCells] = useState([]);
  const [bonusCells, setBonusCells] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState(0);
  const [message, setMessage] = useState("Збирай скарби на виграшних лініях.");
  const autoSpinRef = useRef(false);

  useEffect(() => () => {
    autoSpinRef.current = false;
  }, []);

  const spin = async () => {
    if (isSpinning || !account || !isProgressReady) return false;

    setIsSpinning(true);
    setWinningCells([]);
    setBonusCells([]);
    setMessage("🔺 Піраміда відкриває свої скарби...");
    let stoppedReels = 0;
    let spinWin = 0;
    const animation = setInterval(() => {
      const randomGrid = createRandomGrid();
      setGrid((previousGrid) => previousGrid.map((row, rowIndex) =>
        row.map((symbol, columnIndex) => columnIndex < stoppedReels ? symbol : randomGrid[rowIndex][columnIndex]),
      ));
    }, 100);

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/game/pharaoh-treasures/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bet }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (Number.isSafeInteger(result.balance)) onBalanceChanged(result.balance);
        setMessage(result.error || "Не вдалося завершити обертання");
        return false;
      }

      spinWin = result.win;
      await new Promise((resolve) => setTimeout(resolve, 400));
      for (let column = 0; column < 5; column += 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        stoppedReels = column + 1;
        setGrid((previousGrid) => previousGrid.map((row, rowIndex) =>
          row.map((symbol, columnIndex) => columnIndex === column ? result.grid[rowIndex][columnIndex] : symbol),
        ));
      }

      setWinningCells(result.lineWins.flatMap((line) =>
        line.rowsByColumn.slice(0, line.matchCount).map((row, column) => `${row}-${column}`),
      ));
      setBonusCells(result.bonusAwarded
        ? result.grid.flatMap((row, rowIndex) => row.flatMap((symbol, columnIndex) =>
          symbol === "🪲" ? [`${rowIndex}-${columnIndex}`] : [],
        ))
        : []);
      onProgressUpdated(result);

      const firstWinningLine = result.lineWins[0];
      const winningCombination = firstWinningLine
        ? firstWinningLine.rowsByColumn
          .slice(0, firstWinningLine.matchCount)
          .map((row, column) => result.grid[row][column])
          .join(" + ")
        : "";
      const bonusMessage = result.bonusAwarded
        ? `🪲 Знайдено ${result.scarabCount} скарабеїв! +${result.bonusSpinsAwarded} бонусних обертань.`
        : "";
      const spinMessage = result.win > 0
        ? `🎉 Виграш ${result.win.toLocaleString("uk-UA")} кредитів на ${result.lineWins.length} лінії. ${winningCombination}${firstWinningLine.containsWild ? " (🦁 WILD замінив символ)" : ""}.`
        : result.isFreeSpin
          ? "Бонусне обертання — кредитів не списано."
          : `Спробуй ще раз. Ставку ${result.totalBet.toLocaleString("uk-UA")} кредитів списано.`;
      setMessage([bonusMessage, spinMessage].filter(Boolean).join(" "));
      return true;
    } catch {
      setMessage("Не вдалося з’єднатися із сервером гри");
      return false;
    } finally {
      clearInterval(animation);
      setIsSpinning(false);
    }
  };

  const startAutoSpins = async (spinCount) => {
    if (autoSpinRef.current) return;
    autoSpinRef.current = true;
    setIsAutoSpinning(true);
    setAutoSpinsRemaining(spinCount);

    for (let spinNumber = 0; spinNumber < spinCount; spinNumber += 1) {
      if (!autoSpinRef.current) break;
      const succeeded = await spin();
      if (!succeeded || !autoSpinRef.current) break;
      const remaining = spinCount - spinNumber - 1;
      setAutoSpinsRemaining(remaining);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, 350));
    }

    autoSpinRef.current = false;
    setIsAutoSpinning(false);
    setAutoSpinsRemaining(0);
  };

  const stopAutoSpins = () => {
    autoSpinRef.current = false;
    setIsAutoSpinning(false);
    setAutoSpinsRemaining(0);
  };

  return (
    <section className="fruit-deluxe-screen pharaoh-screen">
      <button className="back-to-games" onClick={onBack}>← До списку ігор</button>
      <div className="pharaoh-marquee">
        <span className="pharaoh-marquee-eye" aria-hidden="true">👁️</span>
        <div>
          <p className="eyebrow">ЄГИПЕТСЬКИЙ АВТОМАТ</p>
          <h1>Скарби <span>фараона</span></h1>
          <p className="fruit-deluxe-description">5 барабанів · 3 ряди · 5 виграшних ліній</p>
        </div>
        <span className="pharaoh-marquee-eye" aria-hidden="true">👁️</span>
      </div>
      <div className="pharaoh-rules">
        <p className="fruit-deluxe-wild-info"><strong>🦁 WILD</strong> Сфінкс замінює символи на лінії.</p>
        <p className="fruit-deluxe-bonus-info"><strong>🪲 БОНУС</strong> П’ять або більше скарабеїв дають 5 безкоштовних обертань.</p>
      </div>

      <details className="fruit-deluxe-paytable">
        <summary>Таблиця скарбів</summary>
        <p>Виплата за одну лінію при ставці {bet.toLocaleString("uk-UA")} кредитів:</p>
        <div className="fruit-deluxe-paytable-scroll">
          <table>
            <thead><tr><th>Символ</th><th>3 в ряд</th><th>4 в ряд</th><th>5 в ряд</th></tr></thead>
            <tbody>
              {payoutTable.map(({ symbol, payouts }) => (
                <tr key={symbol}>
                  <th scope="row">{symbol}</th>
                  {[3, 4, 5].map((count) => (
                    <td key={count}>{(bet * payouts[count]).toLocaleString("uk-UA")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Змішана комбінація зі Сфінксом рахується за символом, який він замінив.</p>
      </details>

      <div className="fruit-deluxe-board pharaoh-board" aria-label="Ігрове поле: 5 барабанів і 3 ряди" aria-busy={isSpinning}>
        {grid.flatMap((row, rowIndex) => row.map((symbol, columnIndex) => {
          const cellId = `${rowIndex}-${columnIndex}`;
          return (
            <div
              className={`fruit-deluxe-cell pharaoh-cell ${winningCells.includes(cellId) ? "winning" : ""} ${bonusCells.includes(cellId) ? "bonus" : ""}`}
              key={cellId}
            >
              {symbol}
            </div>
          );
        }))}
      </div>

      <div className="pharaoh-console">
        <div className="pharaoh-console-status">
          <p className="fruit-deluxe-current-bet">
            Ставка за лінію: {bet.toLocaleString("uk-UA")} · До списання: {(freeSpins > 0 ? 0 : bet * 5).toLocaleString("uk-UA")} кредитів
          </p>
          {freeSpins > 0 && <p className="fruit-deluxe-bonus-count" role="status">🎁 Бонусних обертань залишилося: {freeSpins}</p>}
          <div className="slot-balance">
            <span>Віртуальні кредити</span>
            <strong>{balance.toLocaleString("uk-UA")}</strong>
          </div>
        </div>

        <AutoSpinControls
          isRunning={isAutoSpinning}
          remaining={autoSpinsRemaining}
          disabled={!account || !isProgressReady || isSpinning}
          onStart={startAutoSpins}
          onStop={stopAutoSpins}
        />

        <BetPanel
          bet={bet}
          balance={balance}
          isSpinning={isSpinning || isAutoSpinning || !account || !isProgressReady || freeSpins > 0}
          onSelectBet={onSelectBet}
          betMultiplier={5}
          description="ОБЕРИ СТАВКУ ЗА КОЖНУ З 5 ЛІНІЙ"
        />

        <button
          className="play-button fruit-deluxe-spin-button pharaoh-spin-button"
          onClick={spin}
          disabled={isSpinning || isAutoSpinning || !account || !isProgressReady || (freeSpins === 0 && bet * 5 > balance)}
          aria-busy={isSpinning || isAutoSpinning}
        >
          {isSpinning
            ? "🔺 БАРАБАНИ ОБЕРТАЮТЬСЯ..."
            : !account
              ? "УВІЙДИ, ЩОБ ГРАТИ"
              : !isProgressReady
                ? "ЗАВАНТАЖЕННЯ ПРОГРЕСУ..."
                : freeSpins > 0
                  ? `🎁 БОНУСНЕ ОБЕРТАННЯ · ${freeSpins}`
                  : "🔺 ВІДКРИТИ СКАРБИ"}
        </button>
      </div>
      <div className="game-message" aria-live="polite">{message}</div>
    </section>
  );
}

export default PharaohTreasures;
