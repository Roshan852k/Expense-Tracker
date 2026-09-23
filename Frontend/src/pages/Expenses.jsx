import { useEffect, useState } from "react";
import { getExpenses } from "../services/api";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [filters, setFilters] = useState({
    category: "",
    date_from: "",
    date_to: "",
  });

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(25);
  const [hasMore, setHasMore] = useState(false);

  // Fetch expenses
  const fetchExpenses = async (newOffset = 0) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        ...filters,
        limit: limit + 1, // Fetch one extra to know if there are more results
        offset: newOffset,
      };

      // Remove empty filter values non-destructively
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "")
      );

      const data = await getExpenses(cleanParams);

      // Check if there are more results (we fetched limit+1)
      if (data.length > limit) {
        setHasMore(true);
        data.pop(); // Remove the extra one
      } else {
        setHasMore(false);
      }

      setExpenses(data);
      setOffset(newOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchExpenses(0);
  }, []); // Only on mount

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Apply filters (reset pagination)
  const handleApplyFilters = () => {
    fetchExpenses(0);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      category: "",
      date_from: "",
      date_to: "",
    });
    setOffset(0);
  };

  // Pagination
  const handleNext = () => {
    fetchExpenses(offset + limit);
  };

  const handlePrev = () => {
    if (offset >= limit) {
      fetchExpenses(offset - limit);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      <h1>Expenses</h1>

      {/* Filters */}
      <div className="filters">
        <label>
          Category:
          <input
            type="text"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            placeholder="e.g., Food, Transport"
          />
        </label>

        <label>
          From:
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
          />
        </label>

        <label>
          To:
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
          />
        </label>

        <button onClick={handleApplyFilters}>Apply Filters</button>
        <button onClick={handleClearFilters} style={{ background: "#666" }}>
          Clear
        </button>
      </div>

      {error && <p className="error">Error: {error}</p>}

      {/* Expenses Table */}
      {loading ? (
        <p className="loading">Loading expenses...</p>
      ) : expenses.length > 0 ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.category}</td>
                  <td style={{ textAlign: "right" }}>
                    {formatCurrency(expense.amount)}
                  </td>
                  <td>{expense.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination" style={{ marginTop: "1rem" }}>
            <button onClick={handlePrev} disabled={offset === 0}>
              ← Previous
            </button>
            <span>
              Showing {offset + 1}-{offset + expenses.length} • Page{" "}
              {Math.floor(offset / limit) + 1}
            </span>
            <button onClick={handleNext} disabled={!hasMore}>
              Next →
            </button>
          </div>
        </>
      ) : (
        <p>No expenses found. Try adjusting your filters.</p>
      )}
    </div>
  );
}

export default Expenses;
