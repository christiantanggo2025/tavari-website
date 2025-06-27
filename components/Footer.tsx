import React from "react";

export default function Footer() {
  return (
    <footer style={{
      background: "#fff",
      padding: "40px 0 0 0",
      borderTop: "1px solid #e5e5e5",
      marginTop: "auto"
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 24px",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          minWidth: 120,
          marginBottom: 16,
        }}>
          <img
            src="/tavari-logo.png"
            alt="Tavari logo"
            style={{
              height: 54,
              width: "auto",
              borderRadius: 8,
              background: "#fff",
              boxShadow: "0 2px 8px #0001"
            }}
          />
        </div>

        {/* Contact Info */}
        <div style={{
          flex: 1,
          minWidth: 260,
          marginBottom: 16,
        }}>
          <h3 style={{
            margin: 0,
            marginBottom: 10,
            fontWeight: 700,
            color: "#14213d",
            fontSize: 20,
            letterSpacing: "0.01em"
          }}>
            Contact Us
          </h3>
          <p style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 16,
            color: "#353535",
            maxWidth: 420,
            lineHeight: 1.5
          }}>
            Got questions or feedback? We're here to help! Reach out to us anytime.<br />
            Our team is standing by to assist you with anything you need.
          </p>
          <div style={{ fontSize: 16 }}>
            <b>Address:</b> 539 First Street, London, ON<br />
            <a
              href="mailto:info@tanggo.ca?subject=Tavari Inquiry"
              style={{
                color: "#008080",
                fontWeight: 600,
                textDecoration: "underline",
                display: "inline-block",
                marginTop: 4,
                fontSize: 16
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>

      <div style={{
        textAlign: "center",
        color: "#888",
        fontSize: 14,
        marginTop: 30,
        background: "#f7f7f7",
        padding: "14px 0",
        borderRadius: "0 0 12px 12px"
      }}>
        Tavari Systems 2025. All rights reserved.
      </div>
    </footer>
  );
}
