import React from "react";
import { useEffect, useState } from "react";
import { getSummary, getMonthly } from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function Home() {
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryData, monthlyResult] = await Promise.all([
        getSummary(),
        getMonthly(6),
      ]);

      setSummary(summaryData);
      setMonthlyData(monthlyResult.months ?? []);
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
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
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

      <h2>Monthly Spending</h2>

      <div className="chart-card">
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${value}`} />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(value),
                  "Total Spend",
                ]}
              />
              <Bar
                dataKey="total"
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No monthly spending data available.</p>
        )}
      </div>
      

      {/* Spending by Category */}
      <h2>Spending by Category (This Month)</h2>
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
                  {insight.category}: {formatCurrency(insight.previous_month_total)} →{" "}
                  {formatCurrency(insight.current_month_total)} ({insight.pct_change}% increase)
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
