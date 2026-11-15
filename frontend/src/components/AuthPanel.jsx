import { useState } from "react";

function AuthPanel({ account, onLogin, onLogout }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            <button className="auth-submit" onClick={onLogout}>Вийти</button>
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
