import { useEffect, useState } from "react";

function AuthPanel({ account, onLogin, onLogout }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    setProfile(null);
    setIsProfileOpen(false);
    setProfileMessage("");
  }, [account?.email]);

  const toggleProfile = async () => {
    if (isProfileOpen) {
      setIsProfileOpen(false);
      return;
    }

    setIsProfileLoading(true);
    setProfileMessage("");
    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося завантажити профіль");
      }
      setProfile(result);
      setIsProfileOpen(true);
    } catch (error) {
      setProfileMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { phone } : {}),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Не вдалося виконати запит");
        return;
      }

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setMessage("Акаунт створено. Тепер увійдіть.");
        return;
      }

      onLogin(result);
      setMessage(result.dailyBonusAwarded
        ? "Вхід виконано. Щоденний бонус: +100 кредитів!"
        : "Вхід виконано. Сьогодні щоденний бонус уже нараховано.");
    } catch {
      setMessage("Не вдалося з’єднатися із сервером");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-area">
      <details className="auth-panel">
        <summary>{account ? account.email : "Вхід або реєстрація"}</summary>
        {account ? (
          <div className="auth-content">
            <p>Ви увійшли до акаунта LuckySpin.</p>
            {message && <p className="auth-message" role="status">{message}</p>}
            <button className="profile-open-button" onClick={toggleProfile} disabled={isProfileLoading}>
              {isProfileLoading ? "Завантаження профілю..." : isProfileOpen ? "Закрити профіль" : "Мій профіль"}
            </button>
            {profileMessage && <p className="auth-message" role="alert">{profileMessage}</p>}
            {isProfileOpen && profile && (
              <section className="user-profile" aria-label="Профіль користувача">
                <h3>Мій профіль</h3>
                <dl>
                  <div><dt>Email</dt><dd>{profile.email}</dd></div>
                  <div><dt>Телефон</dt><dd>{profile.phone || "Не вказано"}</dd></div>
                  <div><dt>Дата реєстрації</dt><dd>{new Date(profile.createdAt).toLocaleDateString("uk-UA")}</dd></div>
                  <div><dt>Баланс</dt><dd>{profile.balance.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Найбільший виграш</dt><dd>{profile.bestWin.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Усього виграно</dt><dd>{profile.totalWinnings.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Усього нараховано</dt><dd>{profile.totalCreditsGranted.toLocaleString("uk-UA")} кредитів</dd></div>
                </dl>
              </section>
            )}
            <button
              className="auth-submit"
              onClick={() => {
                setProfile(null);
                setIsProfileOpen(false);
                onLogout();
              }}
            >
              Вийти
            </button>
          </div>
        ) : (
          <form className="auth-content auth-form" onSubmit={handleSubmit}>
            <h2>{mode === "login" ? "Вхід" : "Створити акаунт"}</h2>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {mode === "register" && (
              <label>
                Номер телефону
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  placeholder="+380 00 000 00 00"
                  required
                />
              </label>
            )}
            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <button className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? "Зачекайте..." : mode === "login" ? "Увійти" : "Зареєструватися"}
            </button>
            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Створити новий акаунт" : "Уже є акаунт? Увійти"}
            </button>
            <p className="auth-message" aria-live="polite">{message}</p>
          </form>
        )}
      </details>
    </div>
  );
}

export default AuthPanel;
