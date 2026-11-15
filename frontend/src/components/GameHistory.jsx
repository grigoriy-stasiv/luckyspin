function GameHistory({ history, onClear }) {
  return (
    <div className="recent-results">
      <p className="recent-results-title">ОСТАННІЙ РАУНД</p>
      {history.length === 0 ? (
        <span className="recent-results-empty">Поки що раундів немає</span>
      ) : (
        history.map((round, index) => (
          <div className="recent-result-item" key={`${index}-${round.symbols}`}>
            <span>{round.symbols}</span>
            <strong className={round.win > 0 ? "history-win" : "history-loss"}>
              {round.win > 0 ? "+" : "−"}
              {(round.win > 0 ? round.win : round.bet).toLocaleString("uk-UA")} кредитів
            </strong>
          </div>
        ))
      )}
      {history.length > 0 && (
        <button className="clear-history-button" onClick={onClear}>
          Очистити історію
        </button>
      )}
    </div>
  );
}

export default GameHistory;
