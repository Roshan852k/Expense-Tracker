import { useState } from "react";
import { getApiKey, setApiKey } from "../services/api";

function ApiKeySetup({ onKeySet }) {
  const [isOpen, setIsOpen] = useState(!getApiKey());
  const [inputKey, setInputKey] = useState(getApiKey() || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setSaved(true);
      if (onKeySet) onKeySet();
      // Auto-close after 2 seconds
      setTimeout(() => setIsOpen(false), 2000);
    }
  };

  const handleClear = () => {
    setInputKey("");
    setApiKey("");
    setSaved(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "10px 15px",
          background: "#222",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
        title="Click to change API key"
      >
        🔑 API Key
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          maxWidth: "500px",
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>API Key Setup</h2>

        <p style={{ color: "#666", fontSize: "0.95rem" }}>
          Enter your API key below. It will be stored in your browser's session
          and sent with each request.
        </p>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ display: "block", marginBottom: "0.4rem" }}>
            API Key:
          </span>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setSaved(false);
            }}
            placeholder="Enter your API key (e.g., dev-local-only-key)"
            style={{ width: "100%", boxSizing: "border-box" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
            }}
          />
        </label>

        {saved && (
          <p
            style={{
              color: "#087f23",
              marginBottom: "1rem",
              fontWeight: "bold",
            }}
          >
            ✓ API key saved!
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            onClick={handleClear}
            style={{ background: "#666" }}
            disabled={!inputKey}
          >
            Clear
          </button>
          <button onClick={handleClose}>Close</button>
          <button onClick={handleSave} disabled={!inputKey.trim()}>
            Save
          </button>
        </div>

        <p
          style={{
            fontSize: "0.85rem",
            color: "#999",
            marginTop: "1rem",
            borderTop: "1px solid #eee",
            paddingTop: "1rem",
          }}
        >
          <strong>For local development:</strong> Use the default API key
          <code style={{ background: "#f5f5f5", padding: "2px 4px", borderRadius: "3px" }}>
            dev-local-only-key
          </code>
        </p>
      </div>
    </div>
  );
}

export default ApiKeySetup;
