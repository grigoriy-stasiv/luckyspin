import { useEffect, useState } from "react";

function AdminPanel({ account, isOpen, onAdminStatusChange, onBalanceChanged }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditUserId, setCreditUserId] = useState("");
  const [grantingUserId, setGrantingUserId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");

  const loadUsers = async () => {
    if (!account) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("luckyspin-token");
      const statusResponse = await fetch("/api/admin/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await statusResponse.json();

      if (!statusResponse.ok || !status.isAdmin) {
        setIsAdmin(false);
        onAdminStatusChange(false);
        return;
      }

      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Не вдалося завантажити акаунти");
      }

      setUsers(result.users);
      setIsAdmin(true);
      onAdminStatusChange(true);
    } catch (error) {
      setMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsAdmin(false);
    onAdminStatusChange(false);
    setUsers([]);
    if (account) {
      loadUsers();
    }
  }, [account]);

  const grantCredits = async (user) => {
    const amount = Number(creditAmount);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
      setMessage("Вкажіть суму від 1 до 100 000 кредитів");
      return;
    }

    setGrantingUserId(user.id);
    setMessage("");

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch(`/api/admin/users/${user.id}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Не вдалося нарахувати кредити");
      }

      setUsers((previousUsers) => previousUsers.map((currentUser) =>
        currentUser.id === user.id
          ? {
              ...currentUser,
              balance: result.balance,
              totalCreditsGranted: currentUser.totalCreditsGranted + amount,
            }
          : currentUser,
      ));
      if (user.email === account.email) {
        onBalanceChanged(result.balance);
      }
      setMessage(`Нараховано ${amount.toLocaleString("uk-UA")} кредитів для ${user.email}`);
      setCreditUserId("");
      setCreditAmount("");
    } catch (error) {
      setMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setGrantingUserId("");
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Видалити акаунт ${user.email} та весь його прогрес? Цю дію не можна скасувати.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    setMessage("");

    try {
      const token = localStorage.getItem("luckyspin-token");
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Не вдалося видалити акаунт");
      }

      setUsers((previousUsers) => previousUsers.filter((currentUser) => currentUser.id !== user.id));
      setCreditUserId("");
      setMessage(`Акаунт ${user.email} видалено`);
    } catch (error) {
      setMessage(error.message || "Не вдалося з’єднатися із сервером");
    } finally {
      setDeletingUserId("");
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  if (!account || !isAdmin || !isOpen) {
    return null;
  }

  return (
    <section className="admin-area">
      <div className="admin-panel">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">АДМІНІСТРУВАННЯ</p>
            <h2>Користувачі LuckySpin</h2>
          </div>
          <button className="admin-refresh" onClick={loadUsers} disabled={isLoading}>
            {isLoading ? "Завантаження..." : "Оновити список"}
          </button>
        </div>

        <p className="admin-count">Акаунтів: {users.length}</p>
        <label className="admin-search">
          Пошук за email
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="name@example.com"
          />
        </label>
        {message && <p className="admin-message" role="status">{message}</p>}

        <div className="admin-user-list">
          {filteredUsers.map((user) => (
            <article className="admin-user" key={user.id}>
              <strong>{user.email}</strong>
              <span>Баланс: {user.balance.toLocaleString("uk-UA")} кредитів</span>
              <span>Найбільший виграш: {user.bestWin.toLocaleString("uk-UA")}</span>
              <span>Усього поповнено: {user.totalCreditsGranted.toLocaleString("uk-UA")} кредитів</span>
              <span>Усього виграно: {user.totalWinnings.toLocaleString("uk-UA")} кредитів</span>
              <span>Реєстрація: {new Date(user.createdAt).toLocaleDateString("uk-UA")}</span>
              <div className="admin-user-actions">
                <button
                  className="admin-credit-button"
                  onClick={() => {
                    setCreditUserId(creditUserId === user.id ? "" : user.id);
                    setCreditAmount("");
                    setMessage("");
                  }}
                  disabled={grantingUserId === user.id || deletingUserId === user.id}
                >
                  {creditUserId === user.id ? "Закрити" : "Нарахувати"}
                </button>
                {user.id !== account.id && (
                  <button
                    className="admin-delete-button"
                    onClick={() => deleteUser(user)}
                    disabled={deletingUserId === user.id || grantingUserId === user.id}
                  >
                    {deletingUserId === user.id ? "Видалення..." : "Видалити"}
                  </button>
                )}
              </div>
              {creditUserId === user.id && (
                <div className="admin-user-credit-form">
                  <label>
                    Сума (1–100 000 кредитів)
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      value={creditAmount}
                      onChange={(event) => setCreditAmount(event.target.value)}
                      placeholder="Наприклад, 500"
                    />
                  </label>
                  <button
                    className="admin-credit-button"
                    onClick={() => grantCredits(user)}
                    disabled={grantingUserId === user.id}
                  >
                    {grantingUserId === user.id ? "Нарахування..." : "Підтвердити"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdminPanel;
