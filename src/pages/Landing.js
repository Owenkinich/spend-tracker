import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <header style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.logo}>💰 MySpend</h1>
          <p style={styles.tagline}>Stop wondering where your money went. Start telling it where to go.</p>
          <button onClick={() => navigate('/login')} style={styles.ctaBtn}>Get Started</button>
        </div>
        <div style={styles.heroImage}>
          <div style={styles.floatingIcon}>📈</div>
          <div style={styles.floatingIcon2}>💳</div>
          <div style={styles.floatingIcon3}>📊</div>
        </div>
      </header>

      {/* Features Grid */}
      <div style={styles.features}>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>📊</div>
          <h3>Visual Insights</h3>
          <p>See your spending habits clearly with beautiful, real-time pie charts and progress trackers.</p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>🛡️</div>
          <h3>Budget Safety</h3>
          <p>Set limits for categories like Food, Transport, and more. Get alerts when nearing your budget.</p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>📄</div>
          <h3>Monthly Reports</h3>
          <p>Export detailed PDF reports for your records. Perfect for taxes or personal reviews.</p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>💰</div>
          <h3>Income Tracking</h3>
          <p>Track your income sources and see progress towards your financial goals.</p>
        </div>
      </div>

      {/* Call to Action Section */}
      <div style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to Take Control of Your Finances?</h2>
        <p style={styles.ctaText}>Join thousands of users who are already managing their money smarter.</p>
        <button onClick={() => navigate('/login')} style={styles.ctaBtnSecondary}>Start Your Journey</button>
      </div>

      <footer style={styles.footer}>
        <p>© 2026 MySpend. Your financial clarity starts here.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: { 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
    minHeight: '100vh', 
    fontFamily: "'Inter', sans-serif",
    color: '#333'
  },
  hero: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '100px 50px', 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: { 
    flex: 1, 
    textAlign: 'left', 
    zIndex: 2,
    animation: 'fadeInUp 1s ease-out'
  },
  logo: { 
    fontSize: '64px', 
    color: '#4e73df', 
    margin: '0 0 20px 0',
    background: 'linear-gradient(45deg, #4e73df, #224abe)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent',
    animation: 'bounceIn 1.2s ease-out'
  },
  tagline: { 
    fontSize: '24px', 
    color: '#858796', 
    maxWidth: '500px', 
    margin: '0 0 40px 0',
    lineHeight: '1.4',
    animation: 'fadeInUp 1s ease-out 0.2s both'
  },
  ctaBtn: { 
    padding: '18px 50px', 
    fontSize: '20px', 
    background: 'linear-gradient(45deg, #1cc88a, #17a2b8)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '50px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    boxShadow: '0 8px 25px rgba(28, 200, 138, 0.4)',
    transition: 'all 0.3s ease',
    animation: 'fadeInUp 1s ease-out 0.4s both'
  },
  heroImage: { 
    flex: 1, 
    position: 'relative', 
    height: '300px'
  },
  floatingIcon: { 
    position: 'absolute', 
    top: '20%', 
    left: '20%', 
    fontSize: '60px', 
    animation: 'float 3s ease-in-out infinite'
  },
  floatingIcon2: { 
    position: 'absolute', 
    top: '60%', 
    right: '30%', 
    fontSize: '50px', 
    animation: 'float 3s ease-in-out infinite 1s'
  },
  floatingIcon3: { 
    position: 'absolute', 
    bottom: '20%', 
    left: '50%', 
    fontSize: '55px', 
    animation: 'float 3s ease-in-out infinite 2s'
  },
  features: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
    gap: '40px', 
    padding: '80px 50px', 
    maxWidth: '1400px', 
    margin: '0 auto'
  },
  featureCard: { 
    backgroundColor: 'white', 
    padding: '40px 30px', 
    borderRadius: '20px', 
    textAlign: 'center', 
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease, boxShadow 0.3s ease',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  featureIcon: { 
    fontSize: '50px', 
    marginBottom: '20px'
  },
  ctaSection: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    padding: '80px 50px', 
    textAlign: 'center',
    margin: '40px 0'
  },
  ctaTitle: { 
    fontSize: '36px', 
    color: '#4e73df', 
    margin: '0 0 20px 0',
    fontWeight: 'bold'
  },
  ctaText: { 
    fontSize: '18px', 
    color: '#858796', 
    maxWidth: '600px', 
    margin: '0 auto 40px auto'
  },
  ctaBtnSecondary: { 
    padding: '15px 40px', 
    fontSize: '18px', 
    backgroundColor: '#4e73df', 
    color: 'white', 
    border: 'none', 
    borderRadius: '30px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    boxShadow: '0 4px 15px rgba(78, 115, 223, 0.3)',
    transition: 'all 0.3s ease'
  },
  footer: { 
    textAlign: 'center', 
    padding: '40px', 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: '14px',
    backgroundColor: 'rgba(0,0,0,0.1)'
  }
};

// Add CSS animations (since inline styles don't support keyframes, we'll add them via style tag)
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  @keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
`, styleSheet.cssRules.length);

// Add hover effects
styleSheet.insertRule(`
  .featureCard:hover {
    transform: translateY(-10px);
    boxShadow: 0 20px 40px rgba(0,0,0,0.15);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .ctaBtn:hover, .ctaBtnSecondary:hover {
    transform: translateY(-2px);
    boxShadow: 0 10px 25px rgba(0,0,0,0.3);
  }
`, styleSheet.cssRules.length);

export default Landing;