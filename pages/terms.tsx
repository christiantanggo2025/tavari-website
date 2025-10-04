import React from "react";

export default function TermsAndConditions() {
  return (
    <div style={{
      background: "#fff",
      minHeight: "100vh",
      padding: 0,
      fontFamily: "Segoe UI, Arial, sans-serif",
      color: "#222",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{
        maxWidth: 820,
        width: "100%",
        margin: "60px auto 40px auto",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 32px #0001",
        padding: "36px 30px"
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <img
            src="/tavari-logo.png"
            alt="Tavari Logo"
            style={{ height: 44, width: "auto", marginRight: 16, borderRadius: 8 }}
          />
          <h1 style={{
            fontWeight: 900,
            fontSize: 32,
            letterSpacing: 1,
            margin: 0
          }}>
            Terms and Conditions
          </h1>
        </div>
        <p style={{ color: "#444", fontSize: 17, marginBottom: 26 }}>
          <b>Last Updated:</b> June 26, 2025
        </p>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Tavari Operating Systems app (“App”), website, or any related services (“Services”), you agree to be bound by these Terms and Conditions (“Terms”). If you do not agree to these Terms, you may not use our Services.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>2. Eligibility</h2>
          <p>
            You must be at least 13 years old to use the App. By using the Services, you represent and warrant that you meet this requirement and that the information you provide is accurate and complete.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>3. User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
            <li>You agree to notify us immediately of any unauthorized use of your account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms or our policies.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>4. Acceptable Use</h2>
          <ul>
            <li>You agree to use the Services only for lawful purposes and in accordance with these Terms.</li>
            <li>You will not use the Services to post, upload, or share any content that is unlawful, offensive, or infringes on the rights of others.</li>
            <li>You may not attempt to disrupt or compromise the security or functionality of our Services.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>5. Intellectual Property</h2>
          <p>
            All content, trademarks, logos, and software provided through the Services are the property of Tavari Operating Systems or its licensors and are protected by copyright and intellectual property laws. You may not use, reproduce, or distribute any content from the Services without our express permission.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>6. User Content</h2>
          <ul>
            <li>You retain ownership of content you create or upload to the App (“User Content”).</li>
            <li>By submitting User Content, you grant us a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content as needed to provide the Services.</li>
            <li>You are solely responsible for your User Content and must ensure it does not violate any laws or rights of third parties.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>7. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our <a href="/privacy" style={{ color: "#008080", textDecoration: "underline" }}>Privacy Policy</a> to learn how we collect, use, and protect your information.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>8. Third-Party Services</h2>
          <p>
            Our Services may contain links to third-party websites or services. We are not responsible for the content or practices of those third parties.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>9. Disclaimers</h2>
          <p>
            The Services are provided “as is” and “as available” without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of the Services.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Tavari Operating Systems and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use or inability to use the Services.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Tavari Operating Systems and its affiliates from any claims, damages, or expenses arising from your use of the Services or violation of these Terms.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>12. Termination</h2>
          <p>
            We may suspend or terminate your access to the Services at any time, with or without cause or notice, including if you violate these Terms.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes will be posted in the App or on our website. Your continued use after any changes means you accept the revised Terms.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>14. Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact:
          </p>
          <div style={{ fontSize: 16, marginTop: 6, marginBottom: 10 }}>
            Tavari Operating Systems<br />
            539 First Street, London, ON<br />
            E-mail:{" "}
            <a
              href="mailto:info@tanggo.ca?subject=Tavari App Terms and Conditions"
              style={{ color: "#008080", textDecoration: "underline", fontWeight: 600 }}
            >
              info@tanggo.ca
            </a>
          </div>
        </section>
        <div style={{
          textAlign: "center",
          color: "#888",
          fontSize: 14,
          margin: "36px 0 0 0"
        }}>
          Tavari Operating Systems &copy; {new Date().getFullYear()}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
