import React from "react";

export default function Footer() {
  return (
    <footer style={{
      background: "#f9f9f9",
      padding: "40px 0 0 0",
      marginTop: "auto",
      borderTop: "1px solid #eee"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        padding: "0 24px"
      }}>
        {/* Logo Left */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src="/tavari-logo.png" alt="Tavari Logo" style={{ width: 60, height: 60 }} />
        </div>
        {/* Contact Us */}
        <div style={{
          maxWidth: 500,
          paddingLeft: 24
        }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>Contact Us</h3>
          <p style={{ margin: "10px 0" }}>
            Got questions or feedback? We're here to help! Reach out to us anytime. Our team is standing by to assist you with anything you need.
          </p>
          <div>
            <strong>Address:</strong> 539 First Street, London, ON<br />
            <strong>Email:</strong>{" "}
            <a
              href="mailto:info@tanggo.ca?subject=Tavari Inquiry"
              style={{ color: "#008080", textDecoration: "underline", fontWeight: 600 }}
            >
              info@tanggo.ca
            </a>
          </div>
        </div>
      </div>
      <div style={{
        textAlign: "center",
        color: "#888",
        fontSize: 14,
        marginTop: 30,
        background: "#f1f1f1",
        padding: "12px 0"
      }}>
        Tavari Systems 2025. All rights reserved.
      </div>
    </footer>
  );
}
