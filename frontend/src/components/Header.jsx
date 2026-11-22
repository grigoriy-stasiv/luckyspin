function Header({
  balance,
  displayName,
  isAdmin,
  isAdminPanelOpen,
  onToggleAdminPanel,
  activeSection,
  onNavigate,
}) {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">♛</span>
        <span>LUCKY</span>
        <strong>SPIN</strong>
      </div>

      <nav className="nav">
        <button className={activeSection === "home" ? "active" : ""} onClick={() => onNavigate("home")}>Головна</button>
        <button className={activeSection === "games" ? "active" : ""} onClick={() => onNavigate("games")}>Ігри</button>
        <a href="/">Бонуси</a>
        <a href="/">Турніри</a>
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
