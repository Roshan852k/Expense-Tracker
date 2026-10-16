const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "spend_tracker_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

// Called when the server says our session is invalid/expired (AuthContext sets this).
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function fetchJSON(url, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // empty body (e.g. 204)
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      onUnauthorized();
      throw new Error("Your session expired. Please sign in again.");
    }
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.detail
        ? JSON.stringify(data.detail)
        : response.statusText || "An error occurred"
    );
  }
  return data;
}

export const loginWithGoogle = (credential) =>
  fetchJSON("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

export const getMe = () => fetchJSON("/auth/me");

export const getSummary = () => fetchJSON("/summary");

export const getExpenses = (params = {}) => {
  const query = new URLSearchParams();
  ["category", "date_from", "date_to", "limit", "offset"].forEach((k) => {
    if (params[k] !== undefined && params[k] !== "") query.set(k, params[k]);
  });
  return fetchJSON(`/expenses?${query.toString()}`);
};

export const addExpense = (expense) =>
  fetchJSON("/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });

export const deleteExpense = (id) => fetchJSON(`/expenses/${id}`, { method: "DELETE" });

export const getMonthly = (months = 6) => fetchJSON(`/summary/monthly?months=${months}`);