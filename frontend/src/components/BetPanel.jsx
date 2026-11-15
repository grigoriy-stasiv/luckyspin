function BetPanel({ bet, balance, isSpinning, onSelectBet, betMultiplier = 1, description = "МНОЖНИКИ: 🍒 ×5 · 🍋 ×8 · 🔔 ×10 · 💎 ×25 · 7️⃣ ×50 · 👑 ×100" }) {
  const betOptions = [20, 50, 100, 250, 500, 1000];

  return (
    <div className="bet-panel">
      <p>ВАША СТАВКА</p>

      <div className="bet-options">
        {betOptions.map((amount) => (
          <button
            key={amount}
            aria-pressed={bet === amount}
            className={bet === amount ? "bet-option active" : "bet-option"}
            onClick={() => onSelectBet(amount)}
            disabled={isSpinning || amount * betMultiplier > balance}
          >
            {amount}
          </button>
        ))}
      </div>

      <p>{description}</p>
    </div>
  );
}

export default BetPanel;
