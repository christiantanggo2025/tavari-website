import React from "react";
import Footer from "../components/Footer";

export default function Home() {
  // Scroll to footer
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      {/* HEADER */}
      <header style={{
        width: "100%",
        background: "#fff",
        borderBottom: "1px solid #eee",
        height: 68,
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: 1200,
          width: "100%",
          padding: "0 24px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {/* Logo */}
          <div style={{
            display: "flex", alignItems: "center", minWidth: 100
          }}>
            <img
              src="/tavari-logo.png"
              alt="Tavari Logo"
              style={{
                height: 40,
                width: "auto",
                objectFit: "contain"
              }}
            />
          </div>
          {/* Nav Buttons */}
          <nav style={{ display: "flex", gap: 14 }}>
            <button
              onClick={handleContactClick}
              style={{
                background: "none",
                border: "none",
                color: "#008080",
                fontWeight: 700,
                fontSize: 17,
                cursor: "pointer",
                padding: "7px 18px",
                borderRadius: 6,
                transition: "background 0.2s"
              }}
            >
              Contact
            </button>
            <button
              onClick={handleLoginClick}
              style={{
                background: "#008080",
                color: "#fff",
                fontWeight: 700,
                fontSize: 17,
                border: "none",
                borderRadius: 6,
                padding: "7px 22px",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              Login
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <main style={{
        flex: 1,
        minHeight: 0,
        background: `url('/hero-bg.jpg') center center/cover no-repeat`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {/* Overlay for readability */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.32)",
          zIndex: 1
        }} />
        <div style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}>
          <div style={{
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
            padding: "7vw 24px",
          }}>
            {/* HERO HEADLINE (three fixed lines) */}
            <div style={{
              color: "#fff",
              fontFamily: "Arial Black, Arial, sans-serif",
              fontSize: "clamp(2.1rem, 7vw, 3.9rem)",
              fontWeight: 900,
              textAlign: "left",
              textShadow: "0 4px 20px #0008, 0 2px 7px #000",
              letterSpacing: 2,
              maxWidth: 700,
              lineHeight: 1.08
            }}>
              <span style={{ display: "block" }}>Something</span>
              <span style={{ display: "block" }}>Exciting Is</span>
              <span style={{ display: "block" }}>Coming</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* RESPONSIVE STYLES */}
      <style jsx global>{`
        @media (max-width: 700px) {
          header > div, main > div > div {
            max-width: 100vw !important;
            padding: 0 8px !important;
          }
          nav {
            gap: 9px;
          }
          main > div > div {
            padding: 10vw 8px !important;
          }
        }
        @media (max-width: 400px) {
          main > div > div > div {
            font-size: 1.2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
