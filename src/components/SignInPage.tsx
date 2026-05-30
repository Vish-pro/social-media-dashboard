"use client";

import React from "react";
import { signIn } from "next-auth/react";
import "./SignInPage.css";

export default function SignInPage() {
  return (
    <div className="signin-root">
      {/* Animated background orbs */}
      <div className="signin-orb signin-orb-1" />
      <div className="signin-orb signin-orb-2" />
      <div className="signin-orb signin-orb-3" />

      <div className="signin-card">
        {/* Logo */}
        <div className="signin-logo">
          <div className="signin-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="url(#logoGrad)" />
              <path d="M8 14l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="signin-logo-text">SocialPulse</span>
        </div>

        {/* Headline */}
        <div className="signin-hero">
          <h1 className="signin-title">
            Your social media,<br />
            <span className="signin-title-gradient">unified.</span>
          </h1>
          <p className="signin-subtitle">
            Schedule posts, track analytics, and manage every platform from one powerful dashboard.
          </p>
        </div>

        {/* Feature pills */}
        <div className="signin-features">
          <div className="signin-feature-pill">📺 YouTube</div>
          <div className="signin-feature-pill">📷 Instagram</div>
          <div className="signin-feature-pill">🧵 Threads</div>
          <div className="signin-feature-pill">📅 Scheduler</div>
        </div>

        {/* Sign in button */}
        <button
          id="btn-signin-google"
          className="signin-google-btn"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="signin-google-icon">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <p className="signin-terms">
          By signing in you agree to our{" "}
          <a href="#" className="signin-link">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="signin-link">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
