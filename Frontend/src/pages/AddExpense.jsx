import React from "react";
import { useState } from "react";
import { addExpense } from "../services/api";
import { useNavigate } from "react-router-dom";

function AddExpense() {
  const navigate = useNavigate();

  const categories = [ "Food", "Travel", "Shopping", "Bills", "Entertainment", "Healthcare", "Education", "Groceries", "Rent", "Other", ];

  // Get local date YYYY-MM-DD
  const getLocalDate = () => {
    const offset = new Date().getTimezoneOffset();
    return new Date(new Date().getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    amount: "",
    category: "",
    note: "",
    date: getLocalDate(),
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await addExpense({
        amount: Number(form.amount),
        category: form.category,
        note: form.note,
        date: form.date,
      });

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Add Expense</h1>

      {error && <p className="error">{error}</p>}

      <form className="expense-form" onSubmit={handleSubmit}>
        <label>
          Amount
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
          />
        </label>

        <label> 
          Category 
            <select name="category" value={form.category} onChange={handleChange} required style={{ width: "100%", padding: "10px 12px", marginTop: "6px", border: "1px solid #ccc", borderRadius: "6px", backgroundColor: "white", fontSize: "16px", boxSizing: "border-box", cursor: "pointer", }}> 
              <option value="">Select category</option> {categories.map((category) => ( <option key={category} value={category}> {category} </option> ))}
            </select> 
        </label>

        <label>
          Date
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Note
          <input
            type="text"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Optional"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
}

export default AddExpense;