import { useState } from "react";

function Header({
  balance,
  displayName,
  isAdmin,
  isAdminPanelOpen,
  onToggleAdminPanel,
  activeSection,
  onNavigate,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateTo = (section) => {
    onNavigate(section);
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      <button
        className="logo"
        type="button"
        aria-label="LuckySpin — на головну"
        onClick={() => navigateTo("home")}
      >
        <span className="logo-icon">♛</span>
        <span>LUCKY</span>
        <strong>SPIN</strong>
      </button>

      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={isMenuOpen ? "Закрити меню" : "Відкрити меню"}
        aria-expanded={isMenuOpen}
        aria-controls="main-navigation"
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
      >
        {isMenuOpen ? "✕" : "☰"}
      </button>
      <nav id="main-navigation" className={`nav ${isMenuOpen ? "nav-open" : ""}`}>
        <button className={activeSection === "home" ? "active" : ""} onClick={() => navigateTo("home")}>Головна</button>
        <button className={activeSection === "games" ? "active" : ""} onClick={() => navigateTo("games")}>Ігри</button>
        <a href="/" onClick={() => setIsMenuOpen(false)}>Бонуси</a>
        <a href="/" onClick={() => setIsMenuOpen(false)}>Турніри</a>
        {isAdmin && (
          <button
            className="nav-admin-button"
            onClick={() => {
              onToggleAdminPanel();
              setIsMenuOpen(false);
            }}
            aria-expanded={isAdminPanelOpen}
          >
            {isAdminPanelOpen ? "Закрити адмін-панель" : "Адмін-панель"}
          </button>
        )}
      </nav>

      <div className="header-actions">
        {displayName && <span className="header-user-name">👤 {displayName}</span>}
        {isAdmin && (
          <button
            className="admin-header-button"
            onClick={onToggleAdminPanel}
            aria-expanded={isAdminPanelOpen}
          >
            {isAdminPanelOpen ? "Закрити адмін-панель" : "Адмін-панель"}
          </button>
        )}
        <div className="balance">
          <span>Віртуальні кредити</span>
          <strong>{balance.toLocaleString("uk-UA")}</strong>
        </div>
      </div>
    </header>
  );
}

export default Header;
