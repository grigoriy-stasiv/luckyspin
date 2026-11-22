import { useEffect, useRef, useState } from "react";
import { slotSymbols, winMultipliers } from "./data/slotConfig.js";
import Header from "./components/Header.jsx";
import BetPanel from "./components/BetPanel.jsx";
import GameHistory from "./components/GameHistory.jsx";
import PopularGames from "./components/PopularGames.jsx";
import AuthPanel from "./components/AuthPanel.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import FruitFortuneDeluxe from "./components/FruitFortuneDeluxe.jsx";
import PharaohTreasures from "./components/PharaohTreasures.jsx";
import AutoSpinControls from "./components/AutoSpinControls.jsx";

function App() {

  const [reels, setReels] = useState(["🍒", "7️⃣", "💎"]);
  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem("luckyspin-balance");
    const parsedBalance = Number(savedBalance);

    return savedBalance !== null && Number.isFinite(parsedBalance) && parsedBalance >= 0
      ? parsedBalance
      : 10000;
  });
  const [bet, setBet] = useState(() => {
    const savedBet = Number(localStorage.getItem("luckyspin-bet"));
    const betOptions = [20, 50, 100, 250, 500, 1000];
    return betOptions.includes(savedBet) ? savedBet : 20;
  });
  const [message, setMessage] = useState("Удачі!");
  const [isSpinning, setIsSpinning] = useState(false);
  const [isClassicMusicOn, setIsClassicMusicOn] = useState(false);
  const [isClassicSpinSoundOn, setIsClassicSpinSoundOn] = useState(true);
  const [isClassicAutoSpinning, setIsClassicAutoSpinning] = useState(false);
  const [classicAutoSpinsRemaining, setClassicAutoSpinsRemaining] = useState(0);
  const classicAutoSpinRef = useRef(false);
  const classicMusicRef = useRef(null);
  const classicSpinSoundRef = useRef(null);
  const [lastWin, setLastWin] = useState(() => {
    const savedLastWin = Number(localStorage.getItem("luckyspin-last-win"));
    return Number.isFinite(savedLastWin) ? savedLastWin : 0;
  });
  const [bestWin, setBestWin] = useState(() => {
    const savedBestWin = Number(localStorage.getItem("luckyspin-best-win"));
    return Number.isFinite(savedBestWin) ? savedBestWin : 0;
  });
  const [history, setHistory] = useState(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem("luckyspin-history") || "[]");
      return Array.isArray(savedHistory) ? savedHistory.slice(0, 1) : [];
    } catch {
      return [];
    }
  });
  const [account, setAccount] = useState(() => {
    const token = localStorage.getItem("luckyspin-token");
    const email = localStorage.getItem("luckyspin-email");
    const displayName = localStorage.getItem("luckyspin-display-name") || "";
    return token && email ? { email, displayName } : null;
  });
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [fruitDeluxeFreeSpins, setFruitDeluxeFreeSpins] = useState(0);
  const [pharaohFreeSpins, setPharaohFreeSpins] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() =>
    window.location.hash.startsWith("#games") ? "games" : "home",
  );
  const [selectedGameId, setSelectedGameId] = useState(() =>
    window.location.hash.startsWith("#games/")
      ? window.location.hash.slice("#games/".length)
      : "",
  );

  const stopClassicMusic = () => {
    if (!classicMusicRef.current) return;
    clearInterval(classicMusicRef.current.timer);
    classicMusicRef.current.context.close();
    classicMusicRef.current = null;
    setIsClassicMusicOn(false);
  };

  const stopClassicSpinSound = (closeAfter = 250) => {
    if (!classicSpinSoundRef.current) return;
    const { context, oscillator, volume } = classicSpinSoundRef.current;
    classicSpinSoundRef.current = null;
    const now = context.currentTime;
    volume.gain.cancelScheduledValues(now);
    volume.gain.setTargetAtTime(0.0001, now, 0.04);
    oscillator.stop(now + 0.2);
    setTimeout(() => context.close(), closeAfter);
  };

  useEffect(() => () => {
    stopClassicMusic();
    classicAutoSpinRef.current = false;
    setIsClassicAutoSpinning(false);
    setClassicAutoSpinsRemaining(0);
    if (classicSpinSoundRef.current) {
      classicSpinSoundRef.current.context.close();
      classicSpinSoundRef.current = null;
    }
  }, [selectedGameId]);

  const startClassicSpinSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!isClassicSpinSoundOn || !AudioContext) return;

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
    classicSpinSoundRef.current = { context, oscillator, volume };
  };

  const playClassicReelStopSound = (reelIndex) => {
    const sound = classicSpinSoundRef.current;
    if (!sound || !isClassicSpinSoundOn) return;

    const oscillator = sound.context.createOscillator();
    const volume = sound.context.createGain();
    const now = sound.context.currentTime;
    const stopTones = [740, 620, 520];
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

  const playClassicWinSound = () => {
    const sound = classicSpinSoundRef.current;
    if (!sound || !isClassicSpinSoundOn) return;

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

  const toggleClassicMusic = () => {
    if (classicMusicRef.current) {
      stopClassicMusic();
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
    classicMusicRef.current = { context, timer };
    setIsClassicMusicOn(true);
  };

  const navigateSection = (section) => {
    setActiveSection(section);
    setSelectedGameId("");
    const nextUrl = section === "games"
      ? "#games"
      : `${window.location.pathname}${window.location.search}`;
    window.history.pushState({ section }, "", nextUrl);
  };

  const openClassicFruitGame = () => {
    setActiveSection("games");
    setSelectedGameId("classic-fruit");
    window.history.pushState({ section: "games", game: "classic-fruit" }, "", "#games/classic-fruit");
  };

  const openFruitDeluxeGame = () => {
    setActiveSection("games");
    setSelectedGameId("fruit-fortune-deluxe");
    window.history.pushState({ section: "games", game: "fruit-fortune-deluxe" }, "", "#games/fruit-fortune-deluxe");
  };

  const openPharaohGame = () => {
    setActiveSection("games");
    setSelectedGameId("pharaoh-treasures");
    window.history.pushState({ section: "games", game: "pharaoh-treasures" }, "", "#games/pharaoh-treasures");
  };

  useEffect(() => {
    const syncSectionWithUrl = () => {
      const isGamesSection = window.location.hash.startsWith("#games");
      setActiveSection(isGamesSection ? "games" : "home");
      setSelectedGameId(window.location.hash.startsWith("#games/")
        ? window.location.hash.slice("#games/".length)
        : "");
    };

    window.addEventListener("popstate", syncSectionWithUrl);
    return () => window.removeEventListener("popstate", syncSectionWithUrl);
  }, []);

  useEffect(() => {
    localStorage.setItem("luckyspin-balance", balance);
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("luckyspin-bet", bet);
  }, [bet]);

  useEffect(() => {
    localStorage.setItem("luckyspin-last-win", lastWin);
  }, [lastWin]);

  useEffect(() => {
    localStorage.setItem("luckyspin-best-win", bestWin);
  }, [bestWin]);

  useEffect(() => {
    localStorage.setItem("luckyspin-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (!account) {
      setIsProgressReady(false);
      return;
    }

    const token = localStorage.getItem("luckyspin-token");
    let cancelled = false;

    async function loadProgress() {
      setIsProgressReady(false);

      try {
        const response = await fetch("/api/progress", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const cloudProgress = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("luckyspin-token");
            localStorage.removeItem("luckyspin-email");
            setAccount(null);
          }
          throw new Error(cloudProgress.error || "Не вдалося завантажити прогрес");
        }

        if (!cancelled) {
          setBalance(cloudProgress.balance);
          setBet(cloudProgress.bet);
          setLastWin(cloudProgress.lastWin);
          setBestWin(cloudProgress.bestWin);
          setHistory(cloudProgress.history);
          setFruitDeluxeFreeSpins(cloudProgress.fruitDeluxeFreeSpins ?? 0);
          setPharaohFreeSpins(cloudProgress.pharaohFreeSpins ?? 0);
          setIsProgressReady(true);
          setMessage("Прогрес синхронізовано з акаунтом");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || "Не вдалося завантажити прогрес");
        }
      }
    }

    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [account]);

  useEffect(() => {
    if (!account || !isProgressReady) {
      return;
    }

    const token = localStorage.getItem("luckyspin-token");
    const saveTimer = setTimeout(async () => {
      try {
        const response = await fetch("/api/progress", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bet }),
        });

        if (!response.ok) {
          setMessage("Не вдалося зберегти ставку");
        }
      } catch {
        setMessage("Не вдалося з’єднатися із сервером прогресу");
      }
    }, 400);

    return () => clearTimeout(saveTimer);
  }, [account, isProgressReady, bet]);

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
    setMessage("🎰 Обертання...");
    startClassicSpinSound();

    const reelIntervals = [0, 1, 2].map((reelIndex) =>
      setInterval(() => {
        setReels((previousReels) => {
          const nextReels = [...previousReels];
          nextReels[reelIndex] = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
          return nextReels;
        });
      }, 100),
    );

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/game/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bet }),
      });
      const result = await response.json();

      if (!response.ok) {
        reelIntervals.forEach(clearInterval);
        if (Number.isSafeInteger(result.balance)) {
          setBalance(result.balance);
        }
        setMessage(result.error || "Не вдалося завершити обертання");
        stopClassicSpinSound();
        setIsSpinning(false);
        return false;
      }

      const newReels = result.reels;
      await new Promise((resolve) => setTimeout(resolve, 400));
      clearInterval(reelIntervals[0]);
      playClassicReelStopSound(0);
      setReels((previousReels) => [newReels[0], previousReels[1], previousReels[2]]);

      await new Promise((resolve) => setTimeout(resolve, 300));
      clearInterval(reelIntervals[1]);
      playClassicReelStopSound(1);
      setReels((previousReels) => [previousReels[0], newReels[1], previousReels[2]]);

      await new Promise((resolve) => setTimeout(resolve, 300));
      clearInterval(reelIntervals[2]);
      playClassicReelStopSound(2);
      setReels(newReels);
      setBalance(result.balance);
      setLastWin(result.lastWin);
      setBestWin(result.bestWin);
      setHistory(result.history);
      if (result.win > 0) {
        playClassicWinSound();
      }
      setMessage(result.win > 0
        ? `🎉 Виграш: ${result.win.toLocaleString("uk-UA")} кредитів`
        : `Спробуйте ще раз. Ставку ${bet.toLocaleString("uk-UA")} кредитів списано.`);
      stopClassicSpinSound(result.win > 0 ? 850 : 250);
      setIsSpinning(false);
      return true;
    } catch {
      reelIntervals.forEach(clearInterval);
      stopClassicSpinSound();
      setMessage("Не вдалося з’єднатися із сервером гри");
      setIsSpinning(false);
      return false;
    }
  };

  const startClassicAutoSpins = async (spinCount) => {
    if (classicAutoSpinRef.current) return;
    classicAutoSpinRef.current = true;
    setIsClassicAutoSpinning(true);
    setClassicAutoSpinsRemaining(spinCount);

    for (let spinNumber = 0; spinNumber < spinCount; spinNumber += 1) {
      if (!classicAutoSpinRef.current) break;
      const succeeded = await spin();
      if (!succeeded) break;
      if (!classicAutoSpinRef.current) break;
      const remaining = spinCount - spinNumber - 1;
      setClassicAutoSpinsRemaining(remaining);
      if (remaining > 0 && classicAutoSpinRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    classicAutoSpinRef.current = false;
    setIsClassicAutoSpinning(false);
    setClassicAutoSpinsRemaining(0);
  };

  const stopClassicAutoSpins = () => {
    classicAutoSpinRef.current = false;
    setIsClassicAutoSpinning(false);
    setClassicAutoSpinsRemaining(0);
  };

  const clearHistory = async () => {
    if (!account) {
      setHistory([]);
      return;
    }

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/progress/history", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Не вдалося очистити історію");
      }
      setHistory([]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleLogin = ({ token, user }) => {
    localStorage.setItem("luckyspin-token", token);
    localStorage.setItem("luckyspin-email", user.email);
    localStorage.setItem("luckyspin-display-name", user.displayName || "");
    setAccount(user);
  };

  const handleDisplayNameChange = (displayName) => {
    const nextDisplayName = displayName || "";
    setAccount((currentAccount) => currentAccount
      ? { ...currentAccount, displayName: nextDisplayName }
      : currentAccount);
    localStorage.setItem("luckyspin-display-name", nextDisplayName);
  };

  const handleLogout = () => {
    localStorage.removeItem("luckyspin-token");
    localStorage.removeItem("luckyspin-email");
    localStorage.removeItem("luckyspin-display-name");
    localStorage.removeItem("luckyspin-progress-owner");
    setAccount(null);
    setIsAdmin(false);
    setIsAdminPanelOpen(false);
    setIsProgressReady(false);
    setReels(["🍒", "7️⃣", "💎"]);
    setBalance(10000);
    setBet(20);
    setLastWin(0);
    setBestWin(0);
    setHistory([]);
    setFruitDeluxeFreeSpins(0);
    setPharaohFreeSpins(0);
    setMessage("Ви вийшли з акаунта");
  };

  const hasWinningCombination =
    !isSpinning && reels[0] === reels[1] && reels[1] === reels[2];

  return (
    <div className="app">
      <Header
        balance={balance}
        displayName={account?.displayName || account?.email || ""}
        isAdmin={isAdmin}
        isAdminPanelOpen={isAdminPanelOpen}
        onToggleAdminPanel={() => setIsAdminPanelOpen((isOpen) => !isOpen)}
        activeSection={activeSection}
        onNavigate={navigateSection}
      />
      <AuthPanel
        account={account}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onDisplayNameChange={handleDisplayNameChange}
      />
      <AdminPanel
        account={account}
        isOpen={isAdminPanelOpen}
        onAdminStatusChange={setIsAdmin}
        onBalanceChanged={setBalance}
      />

      <main className="main">
        {(activeSection === "home" || selectedGameId === "classic-fruit") && (
        <section className={`hero ${activeSection === "home" ? "home-page" : "games-page"}`}>
          {activeSection === "home" && (
            <div className="vegas-coins" aria-hidden="true">
              <span className="vegas-coin">L</span>
              <span className="vegas-coin">★</span>
              <span className="vegas-coin">L</span>
            </div>
          )}
          <div className="hero-content">
            <p className="eyebrow">WELCOME TO LUCKYSPIN</p>

            <h1>
              ВІДЧУЙ
              <span> АЗАРТ ГРИ</span>
            </h1>

            <p className="hero-text">
              Сучасні ігрові автомати, яскраві бонуси та незабутні перемоги.
            </p>

            <p className="daily-bonus-banner">
              <span aria-hidden="true">🪙</span>
              Заходьте щодня — отримуйте 100 бонусних кредитів!
            </p>

          </div>

          <div className="slot-preview">
            <button className="back-to-games" onClick={() => navigateSection("games")}>
              ← До списку ігор
            </button>
            <div className="slot-title">LUCKY SPIN</div>

            {selectedGameId === "classic-fruit" && (
              <div className="classic-fruit-sound-controls">
                <button
                  className="classic-fruit-music-button"
                  onClick={toggleClassicMusic}
                  aria-pressed={isClassicMusicOn}
                >
                  {isClassicMusicOn ? "🔊 Вимкнути музику" : "🎵 Увімкнути музику"}
                </button>
                <button
                  className="classic-fruit-music-button"
                  onClick={() => setIsClassicSpinSoundOn((enabled) => !enabled)}
                  aria-pressed={isClassicSpinSoundOn}
                >
                  {isClassicSpinSoundOn ? "🎰 Звук обертання: увімкнено" : "🔇 Звук обертання: вимкнено"}
                </button>
                <AutoSpinControls
                  isRunning={isClassicAutoSpinning}
                  remaining={classicAutoSpinsRemaining}
                  disabled={!account || !isProgressReady || isSpinning}
                  onStart={startClassicAutoSpins}
                  onStop={stopClassicAutoSpins}
                />
              </div>
            )}

            <div className="current-bet">
              СТАВКА: <strong>{bet.toLocaleString("uk-UA")}</strong> кредитів
            </div>

            {selectedGameId === "classic-fruit" && (
              <details className="classic-paytable">
                <summary>Таблиця виплат</summary>
                <p>Три однакові символи на барабанах:</p>
                <div className="classic-paytable-list">
                  {slotSymbols.map((symbol) => (
                    <div className="classic-paytable-row" key={symbol}>
                      <span>{symbol} {symbol} {symbol}</span>
                      <strong>{(bet * winMultipliers[symbol]).toLocaleString("uk-UA")} кредитів</strong>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="reels">
              <div className={`reel ${isSpinning ? "spinning" : ""} ${hasWinningCombination ? "winning" : ""}`}>
                <span key={reels[0]}>{reels[0]}</span>
              </div>

              <div className={`reel ${isSpinning ? "spinning" : ""} ${hasWinningCombination ? "winning" : ""}`}>
                <span key={reels[1]}>{reels[1]}</span>
              </div>

              <div className={`reel ${isSpinning ? "spinning" : ""} ${hasWinningCombination ? "winning" : ""}`}>
                <span key={reels[2]}>{reels[2]}</span>
              </div>
            </div>

            <button
              className="play-button"
              onClick={spin}
              disabled={isSpinning || isClassicAutoSpinning || !account || !isProgressReady}
              aria-busy={isSpinning || isClassicAutoSpinning || !account || !isProgressReady}
            >
              {isClassicAutoSpinning && !isSpinning
                ? "🔁 АВТООБЕРТАННЯ..."
                : isSpinning
                ? "🎰 ОБЕРТАННЯ..."
                : !account
                  ? "УВІЙДІТЬ, ЩОБ ГРАТИ"
                  : !isProgressReady
                    ? "ЗАВАНТАЖЕННЯ ПРОГРЕСУ..."
                    : "🎰 ГРАТИ ЗАРАЗ"}
            </button>

            <div className="slot-balance">
              <span>Віртуальні кредити</span>
              <strong>{balance.toLocaleString("uk-UA")}</strong>
            </div>

            <div className="game-message" aria-live="polite">{message}</div>

            <div className="win-statistics">
              <div className="stat-item">
                <span>ОСТАННІЙ ВИГРАШ</span>
                <strong>{lastWin.toLocaleString("uk-UA")}</strong>
              </div>

              <div className="stat-item">
                <span>НАЙБІЛЬШИЙ ВИГРАШ</span>
                <strong>{bestWin.toLocaleString("uk-UA")}</strong>
              </div>
            </div>

            <GameHistory history={history} onClear={clearHistory} />

            <BetPanel bet={bet} balance={balance} isSpinning={isSpinning || isClassicAutoSpinning || !account || !isProgressReady} onSelectBet={setBet} />

            <div className="win-text">JACKPOT</div>
          </div>
        </section>
        )}

        {selectedGameId === "fruit-fortune-deluxe" && (
          <FruitFortuneDeluxe
            account={account}
            isProgressReady={isProgressReady}
            bet={bet}
            balance={balance}
            freeSpins={fruitDeluxeFreeSpins}
            onBack={() => navigateSection("games")}
            onSelectBet={setBet}
            onBalanceChanged={setBalance}
            onProgressUpdated={(progress) => {
              setBalance(progress.balance);
              setLastWin(progress.lastWin);
              setBestWin(progress.bestWin);
              setHistory(progress.history);
              setFruitDeluxeFreeSpins(progress.fruitDeluxeFreeSpins ?? 0);
            }}
          />
        )}

        {selectedGameId === "pharaoh-treasures" && (
          <PharaohTreasures
            account={account}
            isProgressReady={isProgressReady}
            bet={bet}
            balance={balance}
            freeSpins={pharaohFreeSpins}
            onBack={() => navigateSection("games")}
            onSelectBet={setBet}
            onBalanceChanged={setBalance}
            onProgressUpdated={(progress) => {
              setBalance(progress.balance);
              setLastWin(progress.lastWin);
              setBestWin(progress.bestWin);
              setHistory(progress.history);
              setPharaohFreeSpins(progress.pharaohFreeSpins ?? 0);
            }}
          />
        )}

        {activeSection === "games" && !selectedGameId && (
          <PopularGames
            onSelectClassicFruit={openClassicFruitGame}
            onSelectFruitDeluxe={openFruitDeluxeGame}
            onSelectPharaohTreasures={openPharaohGame}
          />
        )}
      </main>

      <footer className="footer">
        <span>© 2026 LuckySpin</span>
        <span>Лише для розваги • Віртуальні кредити</span>
        <span>Прогрес зберігається у цьому браузері</span>
      </footer>
    </div>
  );
}

export default App;
