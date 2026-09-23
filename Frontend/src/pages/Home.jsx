import { useEffect, useState } from "react";
import { getSummary } from "../services/api";

function Home() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSummary();
        setSummary(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) return <div className="loading">Loading summary...</div>;
  if (error) return <p className="error">Error: {error}</p>;
  if (!summary) return <p className="error">No data available</p>;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Determine if month-over-month is up or down
  const changeDirection = summary?.month_over_month_change >= 0 ? "up" : "down";
  const changeClass = changeDirection === "up" ? "up" : "down";

  return (
    <div>
      <h1>💸 Expense Summary</h1>

      {/* Total Spend Card */}
      <div className="summary-grid">
        <div className="card">
          <span>Total Spend (All Time)</span>
          <strong>{formatCurrency(summary?.total_spend || 0)}</strong>
        </div>

        {/* Current Month */}
        <div className="card">
          <span>Current Month ({summary?.current_month?.month || "Current"})</span>
          <strong>{formatCurrency(summary?.current_month?.total || 0)}</strong>
        </div>

        {/* Previous Month */}
        <div className="card">
          <span>Previous Month ({summary?.previous_month?.month || "Previous"})</span>
          <strong>{formatCurrency(summary?.previous_month?.total || 0)}</strong>
        </div>

        {/* Month-over-Month Change */}
        <div className="card">
          <span>Change vs Last Month</span>
          <strong className={changeClass}>
            {formatCurrency(summary?.month_over_month_change || 0)}
            {summary?.month_over_month_change_pct !== null && summary?.month_over_month_change_pct !== undefined && (
              <span>
                {" "}
                ({summary.month_over_month_change_pct > 0 ? "+" : ""}
                {summary.month_over_month_change_pct}%)
              </span>
            )}
          </strong>
        </div>
      </div>

      {/* Spending by Category */}
      <h2>Spending by Category</h2>
      {summary?.by_category?.length > 0 ? (
        <div className="category-list">
          {summary.by_category.map((item) => (
            <div key={item.category} className="category-item">
              <span className="category-name">{item.category}</span>
              <span className="category-total">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p>No spending data available</p>
      )}

      {/* Insights/Warnings */}
      {summary?.insights && summary.insights.length > 0 && (
        <>
          <h2>⚠️ Spending Alerts</h2>
          <div className="insights-list">
            {summary.insights.map((insight, idx) => (
              <div key={idx} className="insight">
                <strong>{insight.message}</strong>
                <p>
                  {insight.category}: ${insight.previous_month_total} → $
                  {insight.current_month_total} ({insight.pct_change}% increase)
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
