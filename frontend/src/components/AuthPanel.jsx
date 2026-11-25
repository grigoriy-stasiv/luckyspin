import { useEffect, useState } from "react";

function getPasswordResetTokenFromHash() {
  const hash = window.location.hash;
  if (!hash.startsWith("#reset-password?")) {
    return "";
  }

  return new URLSearchParams(hash.slice(hash.indexOf("?") + 1)).get("token") || "";
}

function AuthPanel({ account, onLogin, onLogout, onDisplayNameChange }) {
  const [mode, setMode] = useState("login");
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [passwordResetToken, setPasswordResetToken] = useState(getPasswordResetTokenFromHash);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetRequestMessage, setResetRequestMessage] = useState("");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetPasswordDraft, setResetPasswordDraft] = useState("");
  const [confirmResetPasswordDraft, setConfirmResetPasswordDraft] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    const syncPasswordResetToken = () => {
      const token = getPasswordResetTokenFromHash();
      setPasswordResetToken(token);
      if (token) {
        setIsAuthPanelOpen(true);
      }
    };

    window.addEventListener("hashchange", syncPasswordResetToken);
    return () => window.removeEventListener("hashchange", syncPasswordResetToken);
  }, []);

  useEffect(() => {
    setProfile(null);
    setIsProfileOpen(false);
    setIsPhoneEditing(false);
    setIsNameEditing(false);
    setIsPasswordEditing(false);
    setNewPasswordDraft("");
    setConfirmPasswordDraft("");
    setProfileMessage("");
  }, [account?.email]);

  const toggleProfile = async () => {
    if (isProfileOpen) {
      setIsProfileOpen(false);
      setIsPhoneEditing(false);
      setIsPasswordEditing(false);
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
      setPhoneDraft(result.phone || "");
      setIsPhoneEditing(false);
      setDisplayNameDraft(result.displayName || "");
      setIsNameEditing(false);
      onDisplayNameChange(result.displayName || "");
      setIsProfileOpen(true);
    } catch (error) {
      setProfileMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setIsSavingPhone(true);
    setProfileMessage("");

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phoneDraft }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося оновити номер телефону");
      }

      setProfile((previousProfile) => ({ ...previousProfile, phone: result.phone }));
      setPhoneDraft(result.phone);
      setIsPhoneEditing(false);
      setProfileMessage("Номер телефону оновлено.");
    } catch (error) {
      setProfileMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const saveDisplayName = async (event) => {
    event.preventDefault();
    setIsSavingName(true);
    setProfileMessage("");

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: displayNameDraft }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося зберегти нікнейм");
      }

      setProfile((previousProfile) => ({ ...previousProfile, displayName: result.displayName }));
      setDisplayNameDraft(result.displayName);
      onDisplayNameChange(result.displayName);
      setIsNameEditing(false);
      setProfileMessage("Нікнейм збережено.");
    } catch (error) {
      setProfileMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsSavingName(false);
    }
  };

  const saveNewPassword = async (event) => {
    event.preventDefault();
    setProfileMessage("");

    if (newPasswordDraft !== confirmPasswordDraft) {
      setProfileMessage("Нові паролі не збігаються.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPasswordDraft }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося змінити пароль");
      }

      setCurrentPasswordDraft("");
      setNewPasswordDraft("");
      setConfirmPasswordDraft("");
      setIsPasswordEditing(false);
      setProfileMessage(result.message || "Пароль успішно змінено.");
    } catch (error) {
      setProfileMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const requestPasswordReset = async (event) => {
    event.preventDefault();
    setIsSendingResetEmail(true);
    setResetRequestMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося надіслати лист");
      }
      setResetRequestMessage(result.message);
    } catch (error) {
      setResetRequestMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const confirmPasswordReset = async (event) => {
    event.preventDefault();
    setResetMessage("");

    if (resetPasswordDraft !== confirmResetPasswordDraft) {
      setResetMessage("Нові паролі не збігаються.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: passwordResetToken, newPassword: resetPasswordDraft }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Не вдалося змінити пароль");
      }

      setResetPasswordDraft("");
      setConfirmResetPasswordDraft("");
      setPasswordResetToken("");
      setIsForgotPasswordOpen(false);
      setIsAuthPanelOpen(true);
      setMessage(result.message || "Пароль змінено. Тепер увійдіть із новим паролем.");
      setPassword("");
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    } catch (error) {
      setResetMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsResettingPassword(false);
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
      <details
        className="auth-panel"
        open={isAuthPanelOpen || Boolean(passwordResetToken)}
        onToggle={(event) => setIsAuthPanelOpen(event.currentTarget.open)}
      >
        <summary>{passwordResetToken ? "Відновлення пароля" : account ? account.email : "Вхід або реєстрація"}</summary>
        {passwordResetToken ? (
          <form className="auth-content auth-form" onSubmit={confirmPasswordReset}>
            <h2>Задайте новий пароль</h2>
            <label>
              Новий пароль (8–72 символи)
              <input
                type="password"
                value={resetPasswordDraft}
                onChange={(event) => setResetPasswordDraft(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <label>
              Повторіть новий пароль
              <input
                type="password"
                value={confirmResetPasswordDraft}
                onChange={(event) => setConfirmResetPasswordDraft(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <button className="auth-submit" type="submit" disabled={isResettingPassword}>
              {isResettingPassword ? "Збереження..." : "Зберегти новий пароль"}
            </button>
            <p className="auth-message" role="status">{resetMessage}</p>
          </form>
        ) : account ? (
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
                  <div><dt>Нікнейм</dt><dd>{profile.displayName || "Ще не задано"}</dd></div>
                  <div><dt>Email</dt><dd>{profile.email}</dd></div>
                  {!isPhoneEditing ? (
                    <div><dt>Телефон</dt><dd>{profile.phone || "Не вказано"}</dd></div>
                  ) : null}
                  <div><dt>Дата реєстрації</dt><dd>{new Date(profile.createdAt).toLocaleDateString("uk-UA")}</dd></div>
                  <div><dt>Баланс</dt><dd>{profile.balance.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Найбільший виграш</dt><dd>{profile.bestWin.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Усього виграно</dt><dd>{profile.totalWinnings.toLocaleString("uk-UA")} кредитів</dd></div>
                  <div><dt>Усього нараховано</dt><dd>{profile.totalCreditsGranted.toLocaleString("uk-UA")} кредитів</dd></div>
                </dl>
                {isNameEditing ? (
                  <form className="profile-edit-form" onSubmit={saveDisplayName}>
                    <label>
                      Нікнейм (2–20 символів)
                      <input
                        type="text"
                        value={displayNameDraft}
                        onChange={(event) => setDisplayNameDraft(event.target.value)}
                        minLength={2}
                        maxLength={20}
                        autoComplete="nickname"
                        placeholder="Наприклад, Олена_12"
                        required
                      />
                    </label>
                    <div>
                      <button className="profile-open-button" type="submit" disabled={isSavingName}>
                        {isSavingName ? "Збереження..." : "Зберегти нікнейм"}
                      </button>
                      <button
                        className="auth-switch"
                        type="button"
                        disabled={isSavingName}
                        onClick={() => {
                          setDisplayNameDraft(profile.displayName || "");
                          setIsNameEditing(false);
                        }}
                      >
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="profile-open-button"
                    onClick={() => {
                      setDisplayNameDraft(profile.displayName || "");
                      setIsNameEditing(true);
                      setProfileMessage("");
                    }}
                  >
                    {profile.displayName ? "Змінити нікнейм" : "Додати нікнейм"}
                  </button>
                )}
                {isPasswordEditing ? (
                  <form className="profile-edit-form" onSubmit={saveNewPassword}>
                    <label>
                      Новий пароль (8–72 символи)
                      <input
                        type="password"
                        value={newPasswordDraft}
                        onChange={(event) => setNewPasswordDraft(event.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                      />
                    </label>
                    <label>
                      Повторіть новий пароль
                      <input
                        type="password"
                        value={confirmPasswordDraft}
                        onChange={(event) => setConfirmPasswordDraft(event.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        required
                      />
                    </label>
                    <div>
                      <button className="profile-open-button" type="submit" disabled={isSavingPassword}>
                        {isSavingPassword ? "Збереження..." : "Змінити пароль"}
                      </button>
                      <button
                        className="auth-switch"
                        type="button"
                        disabled={isSavingPassword}
                        onClick={() => {
                          setNewPasswordDraft("");
                          setConfirmPasswordDraft("");
                          setIsPasswordEditing(false);
                        }}
                      >
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="profile-open-button"
                    onClick={() => {
                      setIsPasswordEditing(true);
                      setProfileMessage("");
                    }}
                  >
                    Змінити пароль
                  </button>
                )}
                {isPhoneEditing ? (
                  <form className="profile-phone-form" onSubmit={savePhone}>
                    <label>
                      Номер телефону
                      <input
                        type="tel"
                        value={phoneDraft}
                        onChange={(event) => setPhoneDraft(event.target.value)}
                        placeholder="+380 00 000 00 00"
                        autoComplete="tel"
                        required
                      />
                    </label>
                    <div>
                      <button className="profile-open-button" type="submit" disabled={isSavingPhone}>
                        {isSavingPhone ? "Збереження..." : "Зберегти"}
                      </button>
                      <button
                        className="auth-switch"
                        type="button"
                        disabled={isSavingPhone}
                        onClick={() => {
                          setPhoneDraft(profile.phone || "");
                          setIsPhoneEditing(false);
                        }}
                      >
                        Скасувати
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="profile-open-button"
                    onClick={() => {
                      setPhoneDraft(profile.phone || "");
                      setIsPhoneEditing(true);
                      setProfileMessage("");
                    }}
                  >
                    Змінити телефон
                  </button>
                )}
              </section>
            )}
            <button
              className="auth-submit"
              onClick={() => {
                setProfile(null);
                setIsProfileOpen(false);
                setIsNameEditing(false);
                onLogout();
              }}
            >
              Вийти
            </button>
          </div>
        ) : isForgotPasswordOpen ? (
          <form className="auth-content auth-form" onSubmit={requestPasswordReset}>
            <h2>Відновлення пароля</h2>
            <p>Вкажіть email акаунта — на нього надійде посилання для створення нового пароля.</p>
            <label>
              Email
              <input
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <button className="auth-submit" type="submit" disabled={isSendingResetEmail}>
              {isSendingResetEmail ? "Надсилання..." : "Надіслати лист"}
            </button>
            <p className="auth-message" role="status">{resetRequestMessage}</p>
            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setResetRequestMessage("");
              }}
            >
              Повернутися до входу
            </button>
          </form>
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
            {mode === "login" && (
              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setResetEmail(email);
                  setResetRequestMessage("");
                  setIsForgotPasswordOpen(true);
                }}
              >
                Забули пароль?
              </button>
            )}
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
