const spinCounts = [10, 25, 50];

function AutoSpinControls({ isRunning, remaining, disabled, onStart, onStop }) {
  return (
    <div className="auto-spin-controls">
      {isRunning ? (
        <>
          <span role="status">Автообертання · залишилося: {remaining}</span>
          <button className="auto-spin-stop" onClick={onStop}>Зупинити</button>
        </>
      ) : (
        <>
          <span>Автообертання:</span>
          {spinCounts.map((count) => (
            <button key={count} disabled={disabled} onClick={() => onStart(count)}>
              {count}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export default AutoSpinControls;
