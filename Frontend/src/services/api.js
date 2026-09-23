// Get API base URL from environment or use default
const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Get stored API key from sessionStorage
 */
export function getApiKey() {
  return sessionStorage.getItem("apiKey") || "";
}

/**
 * Set API key in sessionStorage
 */
export function setApiKey(key) {
  if (key) {
    sessionStorage.setItem("apiKey", key);
  } else {
    sessionStorage.removeItem("apiKey");
  }
}

/**
 * Check if API key is set
 */
export function hasApiKey() {
  return !!getApiKey();
}

async function fetchJSON(url, options = {}) {
  const apiKey = getApiKey();

  const headers = {
    ...(options.headers || {}),
    "X-API-Key": apiKey,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    // If it fails to parse JSON but the response was ok, we might still want to proceed
    // Or if it's not ok, we handle the error below anyway
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Missing or invalid API key. Please set your API key and try again."
      );
    }

    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : data.detail ? JSON.stringify(data.detail) : response.statusText || "An error occurred"
    );
  }

  return data;
}

export const getSummary = () => fetchJSON("/summary");

export const getExpenses = (params = {}) => {
  const query = new URLSearchParams();

  if (params.category) query.set("category", params.category);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);

  return fetchJSON(`/expenses?${query.toString()}`);
};

export const addExpense = (expense) =>
  fetchJSON("/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(expense),
  });