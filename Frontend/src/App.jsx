import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate  } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home";
import AddExpense from "./pages/AddExpense";
import Expenses from "./pages/Expenses";
import Login from "./pages/Login";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import "./index.css";

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <h2>💸 Spend Tracker</h2>
      {user && (
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/add-expense">Add Expense</Link>
          <Link to="/expenses">Expenses</Link>
          <span className="nav-user">
            {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
            {user.name || user.email}
          </span>
          <button className="nav-logout" onClick={logout}>Sign out</button>
        </div>
      )}
    </nav>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Navbar />

        <main className="container">
          <Routes>
             <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Home key={user?.id} /></Protected>} />
            <Route path="/add-expense" element={<Protected><AddExpense /></Protected>} />
            <Route path="/expenses" element={<Protected><Expenses key={user?.id} /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;