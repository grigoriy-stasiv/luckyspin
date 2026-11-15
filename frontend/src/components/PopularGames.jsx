function PopularGames({ onSelectClassicFruit, onSelectFruitDeluxe }) {
  return (
    <section className="games" id="games">
      <div className="section-heading">
        <div>
          <p className="eyebrow">НАШІ ІГРИ</p>
          <h2>Популярні автомати</h2>
        </div>
      </div>

      <div className="game-grid">
        <article className="game-card">
          <div className="game-image">🍒</div>
          <h3>Класичний фруктовий автомат</h3>
          <p>Фруктові символи та класичні комбінації</p>
          <button onClick={onSelectClassicFruit}>Грати</button>
        </article>

        <article className="game-card">
          <div className="game-image">🍋</div>
          <h3>Fruit Fortune Deluxe</h3>
          <p>Новий автомат із 5 барабанами та 3 рядами</p>
          <button onClick={onSelectFruitDeluxe}>Відкрити</button>
        </article>

        <article className="game-card">
          <div className="game-image">💎</div>
          <h3>Diamond Rush</h3>
          <p>Полювання за дорогоцінними каменями</p>
          <button disabled>Незабаром</button>
        </article>

        <article className="game-card">
          <div className="game-image">👑</div>
          <h3>Royal Gold</h3>
          <p>Королівський світ великих виграшів</p>
          <button disabled>Незабаром</button>
        </article>
      </div>
    </section>
  );
}

export default PopularGames;
