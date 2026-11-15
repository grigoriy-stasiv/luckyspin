import { useEffect, useRef, useState } from "react";
import BetPanel from "./BetPanel.jsx";
import AutoSpinControls from "./AutoSpinControls.jsx";

const fruitSymbolBag = [
  "🍒", "🍒", "🍒", "🍒", "🍒",
  "🍋", "🍋", "🍋", "🍋", "🍋",
  "🍊", "🍊", "🍊", "🍊", "🍊",
  "🍇", "🍇", "🍇", "🍇", "🍇",
  "🍉", "🍉",
  "🍍", "🍍", "🍍",
];
const initialGrid = [
  ["🍒", "🍋", "🍊", "🍇", "🍉"],
  ["🍋", "🍉", "🍒", "🍍", "🍊"],
  ["🍇", "🍊", "🍋", "🍒", "🍉"],
];

function createRandomGrid() {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => fruitSymbolBag[Math.floor(Math.random() * fruitSymbolBag.length)]),
  );
}

function FruitFortuneDeluxe({
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
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [isSpinSoundOn, setIsSpinSoundOn] = useState(true);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState(0);
  const musicRef = useRef(null);
  const spinSoundRef = useRef(null);
  const autoSpinRef = useRef(false);
  const [message, setMessage] = useState("Збіг трьох або більше однакових фруктів на лінії приносить виграш.");

  useEffect(() => () => {
    autoSpinRef.current = false;
    if (musicRef.current) {
      clearInterval(musicRef.current.timer);
      musicRef.current.context.close();
    }
    if (spinSoundRef.current) {
      spinSoundRef.current.context.close();
    }
  }, []);

  const startSpinSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!isSpinSoundOn || !AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const filter = context.createBiquadFilter();
    const now = context.currentTime;
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 110;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.035, now + 0.15);
    oscillator.connect(filter);
    filter.connect(volume);
    volume.connect(context.destination);
    oscillator.start(now);
    spinSoundRef.current = { context, oscillator, volume };
  };

  const stopSpinSound = (closeAfter = 250) => {
    if (!spinSoundRef.current) return;

    const { context, oscillator, volume } = spinSoundRef.current;
    spinSoundRef.current = null;
    const now = context.currentTime;
    volume.gain.cancelScheduledValues(now);
    volume.gain.setTargetAtTime(0.0001, now, 0.04);
    oscillator.stop(now + 0.2);
    setTimeout(() => context.close(), closeAfter);
  };

  const playReelStopSound = (reelIndex) => {
    const sound = spinSoundRef.current;
    if (!sound || !isSpinSoundOn) return;

    const oscillator = sound.context.createOscillator();
    const volume = sound.context.createGain();
    const now = sound.context.currentTime;
    const stopTones = [740, 660, 587, 523, 440];
    oscillator.type = "sine";
    oscillator.frequency.value = stopTones[reelIndex];
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(volume);
    volume.connect(sound.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  };

  const playWinSound = () => {
    const sound = spinSoundRef.current;
    if (!sound || !isSpinSoundOn) return;

    const notes = [659.25, 783.99, 987.77, 1318.51];
    const startAt = sound.context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = sound.context.createOscillator();
      const volume = sound.context.createGain();
      const noteStart = startAt + index * 0.14;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, noteStart);
      volume.gain.exponentialRampToValueAtTime(0.08, noteStart + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32);
      oscillator.connect(volume);
      volume.connect(sound.context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.33);
    });
  };

  const toggleMusic = () => {
    if (musicRef.current) {
      clearInterval(musicRef.current.timer);
      musicRef.current.context.close();
      musicRef.current = null;
      setIsMusicOn(false);
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setMessage("Ваш браузер не підтримує музику в грі.");
      return;
    }

    const context = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    let noteIndex = 0;
    const playNote = () => {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.value = notes[noteIndex % notes.length];
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
      noteIndex += 1;
    };

    playNote();
    const timer = setInterval(playNote, 550);
    musicRef.current = { context, timer };
    setIsMusicOn(true);
  };

  const spin = async () => {
    if (isSpinning) {
      return false;
    }

    if (!account) {
      setMessage("Увійдіть в акаунт, щоб грати");
      return false;
    }

    if (!isProgressReady) {
      setMessage("Завантажується прогрес...");
      return false;
    }

    setIsSpinning(true);
    setWinningCells([]);
    setBonusCells([]);
    setMessage("🎰 Барабани обертаються...");
    startSpinSound();
    let stoppedReels = 0;
    const animation = setInterval(() => {
      const randomGrid = createRandomGrid();
      setGrid((previousGrid) => previousGrid.map((row, rowIndex) =>
        row.map((symbol, columnIndex) => columnIndex < stoppedReels ? symbol : randomGrid[rowIndex][columnIndex]),
      ));
    }, 100);
    let spinWin = 0;

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/game/fruit-deluxe/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bet }),
      });
      const result = await response.json();

      if (!response.ok) {
        if (Number.isSafeInteger(result.balance)) {
          onBalanceChanged(result.balance);
        }
        setMessage(result.error || "Не вдалося завершити обертання");
        return false;
      }

      spinWin = result.win;
      await new Promise((resolve) => setTimeout(resolve, 450));
      for (let column = 0; column < 5; column += 1) {
        await new Promise((resolve) => setTimeout(resolve, 170));
        stoppedReels = column + 1;
        setGrid((previousGrid) => previousGrid.map((row, rowIndex) =>
          row.map((symbol, columnIndex) => columnIndex === column ? result.grid[rowIndex][columnIndex] : symbol),
        ));
        playReelStopSound(column);
      }
      setWinningCells(result.lineWins.flatMap((line) =>
        line.rowsByColumn.slice(0, line.matchCount).map((row, column) => `${row}-${column}`),
      ));
      setBonusCells(result.bonusAwarded
        ? result.grid.flatMap((row, rowIndex) => row.flatMap((symbol, columnIndex) =>
          symbol === "🍉" ? [`${rowIndex}-${columnIndex}`] : [],
        ))
        : []);
      onProgressUpdated(result);
      const bonusMessage = result.bonusAwarded
        ? `🍉 П’ять або більше кавунів! +${result.bonusSpinsAwarded} бонусних обертань.`
        : "";
      const firstWinningLine = result.lineWins[0];
      const winningCombination = firstWinningLine
        ? firstWinningLine.rowsByColumn
          .slice(0, firstWinningLine.matchCount)
          .map((row, column) => result.grid[row][column])
          .join(" + ")
        : "";
      const spinMessage = result.win > 0
        ? `🎉 Виграш ${result.win.toLocaleString("uk-UA")} кредитів на ${result.lineWins.length} лінії! Комбінація: ${winningCombination}${firstWinningLine.containsWild ? " (🍍 WILD замінив фрукт)" : ""}.`
        : result.isFreeSpin
          ? "Бонусне обертання — кредитів не списано."
          : `Спробуйте ще раз. Ставку ${result.totalBet.toLocaleString("uk-UA")} кредитів списано.`;
      setMessage([bonusMessage, spinMessage].filter(Boolean).join(" "));
      if (result.win > 0) {
        playWinSound();
      }
    } catch {
      setMessage("Не вдалося з’єднатися із сервером гри");
      return false;
    } finally {
      clearInterval(animation);
      stopSpinSound(spinWin > 0 ? 850 : 250);
      setIsSpinning(false);
    }

    return true;
  };

  const startAutoSpins = async (spinCount) => {
    if (autoSpinRef.current) return;
    autoSpinRef.current = true;
    setIsAutoSpinning(true);
    setAutoSpinsRemaining(spinCount);

    for (let spinNumber = 0; spinNumber < spinCount; spinNumber += 1) {
      if (!autoSpinRef.current) break;
      const succeeded = await spin();
      if (!succeeded) break;
      if (!autoSpinRef.current) break;
      const remaining = spinCount - spinNumber - 1;
      setAutoSpinsRemaining(remaining);
      if (remaining > 0 && autoSpinRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
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
    <section className="fruit-deluxe-screen">
      <button className="back-to-games" onClick={onBack}>
        ← До списку ігор
      </button>
      <p className="eyebrow">НОВА ГРА</p>
      <h1>Fruit Fortune <span>Deluxe</span></h1>
      <p className="fruit-deluxe-description">5 фруктових барабанів · 3 ряди · 5 виграшних ліній</p>
      <button className="fruit-deluxe-music-button" onClick={toggleMusic} aria-pressed={isMusicOn}>
        {isMusicOn ? "🔊 Вимкнути музику" : "🎵 Увімкнути музику"}
      </button>
      <button
        className="fruit-deluxe-music-button"
        onClick={() => setIsSpinSoundOn((enabled) => !enabled)}
        aria-pressed={isSpinSoundOn}
      >
        {isSpinSoundOn ? "🎰 Звук обертання: увімкнено" : "🔇 Звук обертання: вимкнено"}
      </button>
      <p className="fruit-deluxe-wild-info"><strong>🍍 WILD</strong> замінює будь-який фрукт на лінії. Три WILD поспіль — множник ×10.</p>
      <p className="fruit-deluxe-bonus-info"><strong>🍉 БОНУС</strong> п’ять або більше кавунів на полі дають 5 безкоштовних обертань.</p>

      <div className="fruit-deluxe-board" aria-label="Ігрове поле: 5 барабанів і 3 ряди" aria-busy={isSpinning}>
        {grid.flatMap((row, rowIndex) => row.map((symbol, reelIndex) => {
          const cellId = `${rowIndex}-${reelIndex}`;
          return (
            <div
              className={`fruit-deluxe-cell ${winningCells.includes(cellId) ? "winning" : ""} ${bonusCells.includes(cellId) ? "bonus" : ""}`}
              key={cellId}
            >
              {symbol}
            </div>
          );
        }))}
      </div>

      <p className="fruit-deluxe-current-bet">
        Ставка за лінію: {bet.toLocaleString("uk-UA")} · До списання: {(freeSpins > 0 ? 0 : bet * 5).toLocaleString("uk-UA")} кредитів
      </p>

      {freeSpins > 0 && (
        <p className="fruit-deluxe-bonus-count" role="status">
          🎁 Залишилося бонусних обертань: {freeSpins}
        </p>
      )}

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
        description="ОБЕРІТЬ СТАВКУ ЗА КОЖНУ З 5 ЛІНІЙ"
      />

      <button
        className="play-button fruit-deluxe-spin-button"
        onClick={spin}
        disabled={isSpinning || isAutoSpinning || !account || !isProgressReady || (freeSpins === 0 && bet * 5 > balance)}
        aria-busy={isSpinning}
      >
        {isSpinning
          ? "🎰 ОБЕРТАННЯ..."
          : !account
            ? "УВІЙДІТЬ, ЩОБ ГРАТИ"
            : !isProgressReady
              ? "ЗАВАНТАЖЕННЯ ПРОГРЕСУ..."
              : freeSpins > 0
                ? `🎁 БОНУСНЕ ОБЕРТАННЯ · ${freeSpins}`
                : "🎰 ОБЕРНУТИ 5 ЛІНІЙ"}
      </button>

      <div className="slot-balance">
        <span>Віртуальні кредити</span>
        <strong>{balance.toLocaleString("uk-UA")}</strong>
      </div>

      <div className="game-message" aria-live="polite">{message}</div>
    </section>
  );
}

export default FruitFortuneDeluxe;
