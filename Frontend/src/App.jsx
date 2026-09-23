import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home";
import AddExpense from "./pages/AddExpense";
import Expenses from "./pages/Expenses";
import ApiKeySetup from "./components/ApiKeySetup";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

function Navbar() {
  return (
    <nav className="navbar">
      <h2>💸 Spend Tracker</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/add-expense">Add Expense</Link>
        <Link to="/expenses">Expenses</Link>
      </div>
    </nav>
  );
}

function App() {
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  const handleApiKeySet = () => {
    setApiKeyVersion(prev => prev + 1);
  };

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Navbar />

        <main className="container">
          <Routes>
            <Route path="/" element={<Home key={apiKeyVersion} />} />
            <Route path="/add-expense" element={<AddExpense />} />
            <Route path="/expenses" element={<Expenses key={apiKeyVersion} />} />
          </Routes>
        </main>

        <ApiKeySetup onKeySet={handleApiKeySet} />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;