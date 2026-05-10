import React from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import '../styles/landing.css';

export default function LandingPage() {
  return (
    <div className="landing-container">
      <div className="starry-bg"></div>
      
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="heading-title" style={{color: 'var(--text-primary)'}}>sketch</span>
          <span className="heading-title" style={{color: 'var(--accent)'}}>flow</span>
        </div>
        <div className="landing-nav-links">
          <Link to="/login" className="nav-link">Sign In</Link>
          <Link to="/register" className="nav-btn-outline">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-pretitle">
            Draw your architecture with
          </div>
          <h1 className="heading-display hero-title">
            <span className="text-outline">SKETCH</span>
            <span className="text-solid">FLOW</span>
          </h1>
          
          <div className="hero-cta-group">
            <Link to="/register" className="btn-primary-play">
              <div className="play-icon-wrapper">
                <Play size={24} fill="var(--accent)" strokeWidth={0} />
              </div>
              Start drawing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
