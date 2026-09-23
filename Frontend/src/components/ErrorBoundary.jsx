import React from "react";
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1>⚠️ Something went wrong</h1>
          <p className="error">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={() =>
              this.setState({ hasError: false, error: null })
            }
            style={{
              padding: "0.6rem 1rem",
              background: "#222",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <p style={{ fontSize: "0.85rem", color: "#999", marginTop: "1rem" }}>
            If the problem persists, check your API key and network connection.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
