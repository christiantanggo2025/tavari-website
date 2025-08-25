// src/screens/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const Home = () => {
  const navigate = useNavigate();

  // Scroll to footer
  const handleContactClick = () => {
    const footer = document.querySelector("footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Navigate to login page
  const handleLoginClick = () => {
    navigate('/login');
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
            {/* HERO HEADLINE */}
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
              <span style={{ display: "block" }}>Complete</span>
              <span style={{ display: "block" }}>Business</span>
              <span style={{ display: "block" }}>Management</span>
            </div>
            
            {/* HERO SUBTITLE */}
            <div style={{
              color: "#fff",
              fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
              fontWeight: 400,
              textAlign: "left",
              textShadow: "0 2px 10px #0008",
              maxWidth: 600,
              marginTop: 20,
              lineHeight: 1.4
            }}>
              POS Systems • Background Music • Employee Management • Analytics
            </div>
          </div>
        </div>
      </main>

      {/* COMMAND CENTRE SECTION */}
      <section style={{
        background: "#fff",
        padding: "60px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          textAlign: "center"
        }}>
          <h2 style={{
            color: "#333",
            fontFamily: "Arial Black, Arial, sans-serif",
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
            fontWeight: 900,
            letterSpacing: 1,
            margin: 0,
            lineHeight: 1.2
          }}>
            Your Business's Command Centre
          </h2>
        </div>
      </section>

      {/* POS HERO SECTION */}
      <section style={{
        height: "70vh",
        minHeight: 400,
        background: `url('/POS-Hero.jpg') center center/cover no-repeat`,
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end"
      }}>
        {/* Overlay for readability */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 1
        }} />
        
        <div style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 450,
          margin: "40px 40px 0 0",
          padding: "60px 30px",
          background: "rgba(0,0,0,0.15)",
          borderRadius: 8,
          backdropFilter: "blur(2px)"
        }}>
          <div style={{
            color: "#fff",
            fontSize: "clamp(1.4rem, 3vw, 1.8rem)",
            fontWeight: 400,
            textAlign: "left",
            textShadow: "0 2px 8px #0008",
            lineHeight: 1.5
          }}>
            <strong style={{ fontWeight: 700 }}>Tavari POS</strong> is a fast, cloud-based system that streamlines sales, inventory, and employee management. With a clean interface, role-based security, and full Tavari Core integration, it's your all-in-one business command center.
          </div>
        </div>
      </section>

      {/* THREE FEATURE SECTIONS */}
      <section style={{
        background: "#fff",
        padding: "80px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "40px"
        }}>
          
          {/* Sales & Transactions */}
          <div style={{
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}>
            <div style={{
              padding: "30px 25px",
              background: "#f9f9f9",
              flex: 1,
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                color: "#333",
                fontSize: "1.4rem",
                fontWeight: 700,
                margin: "0 0 15px 0",
                lineHeight: 1.3
              }}>
                <strong>Sales & Transactions</strong>
              </h3>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center"
              }}>
                <ul style={{
                  color: "#555",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  margin: 0,
                  paddingLeft: "20px",
                  listStyle: "disc"
                }}>
                  <li>Fast, intuitive sales processing with touch-friendly layouts.</li>
                  <li>Support for multiple payment methods, tips, discounts, and fees.</li>
                  <li>Combo creation, recurring discounts, and one-off promotions.</li>
                  <li>Receipt customization, including business branding and layout control.</li>
                  <li>Ability to access past orders and transaction history instantly.</li>
                </ul>
              </div>
            </div>
            <div style={{
              height: "250px",
              background: `url('/POS-Description-1.jpg') center center/cover no-repeat`,
              backgroundSize: "cover"
            }} />
          </div>

          {/* Inventory Management */}
          <div style={{
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}>
            <div style={{
              padding: "30px 25px",
              background: "#f9f9f9",
              flex: 1,
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                color: "#333",
                fontSize: "1.4rem",
                fontWeight: 700,
                margin: "0 0 15px 0",
                lineHeight: 1.3
              }}>
                <strong>Inventory Management</strong>
              </h3>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center"
              }}>
                <ul style={{
                  color: "#555",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  margin: 0,
                  paddingLeft: "20px",
                  listStyle: "disc"
                }}>
                  <li>Add, edit, and categorize products with ease.</li>
                  <li>Full category management with sorting and color coding.</li>
                  <li>Support for modifiers, variants, and linked products.</li>
                  <li>Real-time stock tracking and automatic updates after each sale.</li>
                </ul>
              </div>
            </div>
            <div style={{
              height: "250px",
              background: `url('/POS-Description-2.jpg') center center/cover no-repeat`,
              backgroundSize: "cover"
            }} />
          </div>

          {/* Back-Office & Reporting */}
          <div style={{
            background: "#fff",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #f0f0f0",
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}>
            <div style={{
              padding: "30px 25px",
              background: "#f9f9f9",
              flex: 1,
              display: "flex",
              flexDirection: "column"
            }}>
              <h3 style={{
                color: "#333",
                fontSize: "1.4rem",
                fontWeight: 700,
                margin: "0 0 15px 0",
                lineHeight: 1.3
              }}>
                <strong>Back-Office & Reporting</strong>
              </h3>
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center"
              }}>
                <ul style={{
                  color: "#555",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  margin: 0,
                  paddingLeft: "20px",
                  listStyle: "disc"
                }}>
                  <li>Real-time sales dashboards.</li>
                  <li>Inventory and sales reports exportable to Excel/PDF.</li>
                  <li>Track product performance to optimize menus or product lines.</li>
                  <li>Multi-location support with unified reporting.</li>
                </ul>
              </div>
            </div>
            <div style={{
              height: "250px",
              background: `url('/POS-Description-3.jpg') center center/cover no-repeat`,
              backgroundSize: "cover"
            }} />
          </div>

        </div>
      </section>

      <Footer />

      {/* RESPONSIVE STYLES */}
      <style jsx global>{`
        @media (max-width: 700px) {
          header > div, main > div > div, section > div {
            max-width: 100vw !important;
            padding: 0 8px !important;
          }
          nav {
            gap: 9px;
          }
          main > div > div {
            padding: 10vw 8px !important;
          }
          section {
            padding: 40px 8px !important;
          }
          /* POS Hero mobile adjustments */
          section:nth-of-type(2) > div {
            max-width: 90% !important;
            margin: 20px auto 0 auto !important;
            padding: 40px 20px !important;
          }
          /* Three feature sections mobile */
          section:nth-of-type(3) > div {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
          }
          section:nth-of-type(3) {
            padding: 50px 8px !important;
          }
        }
        @media (max-width: 400px) {
          main > div > div > div {
            font-size: 1.2rem !important;
          }
          section:nth-of-type(2) > div {
            font-size: 1.1rem !important;
          }
          /* Feature cards mobile adjustments */
          section:nth-of-type(3) > div > div > div:first-child {
            padding: 25px 20px !important;
          }
          section:nth-of-type(3) > div > div > div:first-child h3 {
            font-size: 1.2rem !important;
          }
          section:nth-of-type(3) > div > div > div:first-child ul {
            font-size: 0.9rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;