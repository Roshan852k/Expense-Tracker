import React from "react";
import { useEffect, useState } from "react";
import { getExpenses, deleteExpense  } from "../services/api";

function Expenses() {
   const categories = [ "Food", "Travel", "Shopping", "Bills", "Entertainment", "Healthcare", "Education", "Groceries", "Rent", "Other", ];

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

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

  // const handleDelete = async (expense) => {
  //   const ok = window.confirm(
  //     `Delete this expense (${expense.category}, ${formatCurrency(expense.amount)})? This cannot be undone.`
  //   );
  //   if (!ok) return;

  //   try {
  //     setDeletingId(expense.id);
  //     setError("");
  //     await deleteExpense(expense.id);

  //     const isLastRowOnPage = expenses.length === 1 && offset > 0;
  //     await fetchExpenses(isLastRowOnPage ? offset - limit : offset);
  //   } catch (err) {
  //     setError(err.message);
  //   } finally {
  //     setDeletingId(null);
  //   }
  // };

  // Open the confirmation modal
  const handleDelete = (expense) => {
    setPendingDelete(expense);
  };

  // Delete after confirmation
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    const expense = pendingDelete;

    try {
      setDeletingId(expense.id);
      setError("");

      await deleteExpense(expense.id);

      const isLastRowOnPage =
        expenses.length === 1 && offset > 0;

      setPendingDelete(null);

      await fetchExpenses(
        isLastRowOnPage ? offset - limit : offset
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Format currency
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
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
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
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
        <button className="btn-clear" onClick={handleClearFilters}>
          Clear
        </button>
      </div>

      {error && <p className="error">Error: {error}</p>}

      {/* Expenses Table */}
      {loading ? (
        <p className="loading">Loading expenses...</p>
      ) : expenses.length > 0 ? (
        <>
          <div className="table-wrap">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td data-label="Date">{formatDate(expense.date)}</td>
                  <td data-label="Category">{expense.category}</td>
                  <td data-label="Amount" className="amount-cell">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td data-label="Note">{expense.note || "-"}</td>
                  <td className="action-cell">
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(expense)}
                      disabled={deletingId === expense.id}
                    >
                      {deletingId === expense.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
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
      {pendingDelete && (
        <div className="modal-overlay">
          <div
            className="delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="delete-modal-icon">
              <span>🗑</span>
            </div>

            <h2 id="delete-modal-title">
              Delete expense?
            </h2>

            <p>
              Are you sure you want to delete this expense?
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setPendingDelete(null)}
                disabled={deletingId !== null}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
              >
                {deletingId === pendingDelete.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;