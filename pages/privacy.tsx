import React from "react";

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
        </div>
        <p style={{ color: "#444", fontSize: 17, marginBottom: 26 }}>
          <b>Last Updated:</b> June 26, 2025
        </p>

        {/* Section 1 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>1. Introduction</h2>
          <p>
            Tavari App Template ("we", "us", or "our") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("App").
            By using the App, you consent to the data practices described in this policy.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>2. Information We Collect</h2>
          <b>a) Personal Information</b>
          <p>
            When you create an account or use the App, we may collect the following types of personal information:
          </p>
          <ul>
            <li>Email address (for authentication and account management)</li>
            <li>Username</li>
            <li>Profile information (first name, last name, optional location/city, profile picture, cover photo)</li>
            <li>Time zone</li>
            <li>Account activity logs (such as posts, comments, likes, shares, recent activity)</li>
            <li>Other data you provide (such as "About Me" section or visibility preferences)</li>
          </ul>
          <b>b) Content You Provide</b>
          <p>
            We collect and store the content you create, upload, or share on the App, including:
          </p>
          <ul>
            <li>Profile images, cover photos, and other uploaded media</li>
            <li>Posts, captions, and comments</li>
            <li>Activity metadata (when you loop/follow, like, comment, or share)</li>
          </ul>
          <b>c) Automatically Collected Data</b>
          <p>
            We may automatically collect certain information about your device and usage, such as:
          </p>
          <ul>
            <li>Device type (mobile, tablet)</li>
            <li>Operating system and version</li>
            <li>App version</li>
            <li>Usage logs (for analytics and security)</li>
          </ul>
          <p><i>No device ID, GPS, or biometric data is collected.</i></p>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>3. How We Use Your Information</h2>
          <ul>
            <li>Create and manage your user account</li>
            <li>Enable you to use features such as posting, commenting, sharing, liking, and looping/following other users or businesses</li>
            <li>Display your content and profile to other users according to your privacy and visibility preferences</li>
            <li>Personalize your experience (such as showing relevant posts, displaying your profile info, and time zone adjustment)</li>
            <li>Provide customer support and communicate important information about your account</li>
            <li>Improve app functionality and security, and monitor usage for compliance with our Terms and Conditions</li>
            <li>Allow employee accounts to moderate reported posts and comments</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>4. How We Share Your Information</h2>
          <p>We do not sell or rent your personal information.<br />We may share your information as follows:</p>
          <ul>
            <li>
              <b>With other users:</b> Your profile information, posts, and public activity may be visible to other users of the app.
            </li>
            <li>
              <b>With our employees:</b> Designated employee or admin accounts can access user-generated content (such as reported posts/comments) for moderation.
            </li>
            <li>
              <b>With service providers:</b> We use Supabase to host and process authentication, user data, and uploaded files. Supabase acts as our data processor.
            </li>
            <li>
              <b>As required by law:</b> If compelled by legal request or regulatory obligation, we may disclose information to law enforcement or other authorities.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>5. Data Storage & Security</h2>
          <ul>
            <li>
              All data is securely stored using Supabase, which provides industry-standard encryption in transit and at rest.
            </li>
            <li>
              Uploaded images and files are stored in Supabase Storage, with access managed via public or secured URLs as per app configuration.
            </li>
            <li>
              We use authentication and access controls to prevent unauthorized access to user data.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>6. Your Rights & Choices</h2>
          <ul>
            <li>
              <b>Profile & Content:</b> You can view and edit your profile information and visibility preferences within the App.
            </li>
            <li>
              <b>Account Deletion:</b> You can request account deletion by contacting support. Deleted accounts and content may be removed from our systems, subject to backup retention for a limited time.
            </li>
            <li>
              <b>Communication:</b> We may send you important notifications related to your account or app updates, but will not send marketing communications without consent.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>7. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide services. Content you delete (such as posts, comments, or your account) may be removed from the app immediately, but residual copies may remain in system backups for a limited period.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>8. Children’s Privacy</h2>
          <p>
            Our app is not intended for children under 13 years old. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with information, please contact us for removal.
          </p>
        </section>

        {/* Section 9 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>9. International Users</h2>
          <p>
            Our app may be used by individuals outside of Canada. By using the app, you consent to the transfer and storage of your information in the country where our servers and Supabase are located.
          </p>
        </section>

        {/* Section 10 */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted in the App or via an in-app notice. Your continued use after changes means you accept the revised policy.
          </p>
        </section>

        {/* Section 11 */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#008080" }}>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact:
          </p>
          <div style={{ fontSize: 16, marginTop: 6, marginBottom: 10 }}>
            Tavari Operating Systems<br />
            539 First Street, London, ON<br />
            E-mail:{" "}
            <a
              href="mailto:info@tanggo.ca?subject=Tavari App Privacy Policy"
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
