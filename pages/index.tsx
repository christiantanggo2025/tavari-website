import React from "react";
import Footer from "../components/Footer";

export default function Home() {
  // Scroll to footer handler
  const handleContactClick = () => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Login alert
  const handleLoginClick = () => {
    window.alert("Login Coming Soon");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        width: "100%",
        background: "#fff",
        borderBottom: "1px solid #eee",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        height: 72,
        position: "relative",
        zIndex: 2
      }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <img src="/tavari-logo.png" alt="Tavari Logo" style={{ width: 48, height: 48, marginRight: 16 }} />
        </div>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
          <button
            onClick={handleContactClick}
            style={{
              background: "none",
              border: "none",
              color: "#008080",
              fontWeight: 600,
              fontSize: 18,
              cursor: "pointer",
              padding: "8px 18px",
              borderRadius: 6,
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#f1f1f1"}
            onMouseOut={e => e.currentTarget.style.background = "none"}
          >
            Contact
          </button>
          <button
            onClick={handleLoginClick}
            style={{
              background: "#008080",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              border: "none",
              borderRadius: 6,
              padding: "8px 22px",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#005f5f"}
            onMouseOut={e => e.currentTarget.style.background = "#008080"}
          >
            Login
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `url('/hero-bg.jpg') center center/cover no-repeat`,
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 1
        }} />
        <h1 style={{
          position: "relative",
          zIndex: 2,
          color: "#fff",
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "3.5rem",
          textAlign: "center",
          textShadow: "0 4px 24px #0008, 0 2px 8px #000",
          letterSpacing: 2,
          padding: "0 24px"
        }}>
          Something Exciting Is Coming
        </h1>
      </main>

      <Footer />
    </div>
  );
}
