import React, { useState } from 'react';
import { auth } from './firebase'; 
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [strength, setStrength] = useState(0); 
  const [loading, setLoading] = useState(false); 
  const [passwordReqs, setPasswordReqs] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });
  const navigate = useNavigate();

  const checkStrength = (pass) => {
    const reqs = {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };
    setPasswordReqs(reqs);
    
    let score = 0;
    if (reqs.length) score++;
    if (reqs.upper) score++;
    if (reqs.number) score++;
    if (reqs.special) score++;
    setStrength(score);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    checkStrength(val);
  };

  const getStrengthColor = () => {
    if (strength === 0) return '#eaecf4';
    if (strength <= 2) return '#e74a3b';
    if (strength === 3) return '#f6c23e';
    return '#1cc88a';
  };

  const getStrengthText = () => {
    return ['None', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (strength < 2) {
      setError("Your password is too weak. Please add more variety.");
      return;
    }
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setIsSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyCheck = async () => {
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        navigate('/setup');
      } else {
        alert("Verification link not clicked yet. Please check your inbox!");
      }
    } catch (err) {
      setError("Session error. Please try logging in again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundElements}>
        <div style={styles.floatingShape1}></div>
        <div style={styles.floatingShape2}></div>
        <div style={styles.floatingShape3}></div>
      </div>
      
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logoText}>💰 MySpend</h1>
          <p style={styles.subTitle}>Create your account to start tracking.</p>
        </div>

        {isSent ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>📩</div>
            <h2 style={styles.successTitle}>Check your email!</h2>
            <p style={styles.successText}>Verification link sent to <strong>{email}</strong>.</p>
            <p style={styles.successSubtext}>
              Click the link in your email, then come back here to continue.
            </p>
            
            <button 
              onClick={handleVerifyCheck} 
              style={styles.signupBtn}
              disabled={loading}
            >
              {loading ? 'Checking...' : "I've Verified My Email"}
            </button>
            
            <button 
              onClick={() => navigate('/login')} 
              style={styles.backBtn}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            {error && <div style={styles.errorBox}>{error}</div>}
            <form onSubmit={handleSignup} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  style={styles.input} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="At least 8 characters" 
                    style={styles.input} 
                    value={password} 
                    onChange={handlePasswordChange} 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4e73df',
                      fontWeight: 600,
                      fontSize: 14,
                      padding: 0
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={styles.requirementsList}>
                  <div style={{...styles.requirement, color: passwordReqs.length ? '#1cc88a' : '#858796'}}>
                    {passwordReqs.length ? '✅' : '⚪'} At least 8 characters
                  </div>
                  <div style={{...styles.requirement, color: passwordReqs.upper ? '#1cc88a' : '#858796'}}>
                    {passwordReqs.upper ? '✅' : '⚪'} One uppercase letter (A-Z)
                  </div>
                  <div style={{...styles.requirement, color: passwordReqs.number ? '#1cc88a' : '#858796'}}>
                    {passwordReqs.number ? '✅' : '⚪'} One number (0-9)
                  </div>
                  <div style={{...styles.requirement, color: passwordReqs.special ? '#1cc88a' : '#858796'}}>
                    {passwordReqs.special ? '✅' : '⚪'} One special character (!@#$%)
                  </div>
                </div>
                <div style={styles.strengthContainer}>
                  <div style={styles.meterContainer}>
                    <div style={{ 
                      ...styles.meterFill, 
                      width: `${(strength / 4) * 100}%`, 
                      backgroundColor: getStrengthColor() 
                    }} />
                  </div>
                  <span style={{...styles.strengthText, color: getStrengthColor()}}>
                    {getStrengthText()}
                  </span>
                </div>
              </div>

              <button type="submit" style={styles.signupBtn}>Create Account</button>
            </form>
          </>
        )}
        
        {!isSent && (
          <div style={styles.footer}>
            <span>Already have an account? </span>
            <button onClick={() => navigate('/login')} style={styles.linkBtn}>Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  backgroundElements: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: '100%', 
    height: '100%', 
    pointerEvents: 'none'
  },
  floatingShape1: { 
    position: 'absolute', 
    top: '15%', 
    left: '10%', 
    width: '100px', 
    height: '100px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '50%', 
    animation: 'float 6s ease-in-out infinite'
  },
  floatingShape2: { 
    position: 'absolute', 
    top: '70%', 
    right: '20%', 
    width: '70px', 
    height: '70px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '20px', 
    animation: 'float 8s ease-in-out infinite reverse'
  },
  floatingShape3: { 
    position: 'absolute', 
    bottom: '15%', 
    left: '70%', 
    width: '120px', 
    height: '120px', 
    background: 'rgba(255,255,255,0.05)', 
    borderRadius: '50%', 
    animation: 'float 10s ease-in-out infinite'
  },
  card: { 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    backdropFilter: 'blur(10px)', 
    padding: '50px', 
    borderRadius: '24px', 
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
    width: '100%', 
    maxWidth: '450px', 
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.2)',
    animation: 'fadeInUp 0.8s ease-out'
  },
  header: { marginBottom: '40px' },
  logoText: { 
    margin: 0, 
    color: '#4e73df', 
    fontSize: '36px', 
    fontWeight: '800',
    background: 'linear-gradient(45deg, #4e73df, #224abe)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent',
    animation: 'bounceIn 1s ease-out'
  },
  subTitle: { 
    color: '#858796', 
    fontSize: '16px', 
    marginTop: '10px',
    animation: 'fadeInUp 0.8s ease-out 0.2s both'
  },
  form: { 
    textAlign: 'left',
    animation: 'fadeInUp 0.8s ease-out 0.4s both'
  },
  inputGroup: { marginBottom: '30px' },
  label: { 
    display: 'block', 
    marginBottom: '10px', 
    fontSize: '14px', 
    fontWeight: '700', 
    color: '#4e73df', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: { 
    width: '100%', 
    padding: '16px 20px', 
    borderRadius: '12px', 
    border: '2px solid #e3e6f0', 
    fontSize: '16px', 
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: '#fafbfc'
  },
  requirementsList: {
    marginTop: '15px',
    marginBottom: '15px'
  },
  requirement: {
    fontSize: '13px',
    marginBottom: '5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'color 0.3s ease'
  },
  strengthContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: '10px'
  },
  meterContainer: { 
    height: '8px', 
    width: '70%', 
    backgroundColor: '#eaecf4', 
    borderRadius: '4px', 
    overflow: 'hidden'
  },
  meterFill: { 
    height: '100%', 
    transition: 'all 0.3s ease',
    borderRadius: '4px'
  },
  strengthText: { 
    fontSize: '14px', 
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  signupBtn: { 
    width: '100%', 
    padding: '16px', 
    background: 'linear-gradient(45deg, #1cc88a, #17a2b8)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 4px 15px rgba(28, 200, 138, 0.3)',
    marginTop: '20px',
    animation: 'fadeInUp 0.8s ease-out 0.6s both'
  },
  errorBox: { 
    backgroundColor: '#fff1f0', 
    color: '#e74a3b', 
    padding: '15px', 
    borderRadius: '12px', 
    marginBottom: '25px', 
    fontSize: '14px', 
    border: '1px solid #ffa39e',
    animation: 'shake 0.5s ease-in-out'
  },
  successBox: { 
    padding: '30px', 
    borderRadius: '16px', 
    backgroundColor: '#f0fff4', 
    border: '2px solid #c6f6d5', 
    marginBottom: '20px',
    animation: 'fadeInUp 0.8s ease-out'
  },
  successIcon: { 
    fontSize: '50px', 
    marginBottom: '20px'
  },
  successTitle: { 
    color: '#1cc88a', 
    marginBottom: '15px', 
    fontSize: '24px', 
    fontWeight: 'bold'
  },
  successText: { 
    fontSize: '16px', 
    color: '#555', 
    marginBottom: '10px'
  },
  successSubtext: { 
    fontSize: '14px', 
    color: '#858796', 
    margin: '15px 0 25px 0'
  },
  backBtn: { 
    background: 'none', 
    border: '2px solid #4e73df', 
    color: '#4e73df', 
    padding: '12px', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '600',
    width: '100%',
    marginTop: '15px',
    transition: 'all 0.3s ease'
  },
  footer: { 
    marginTop: '30px', 
    fontSize: '15px', 
    color: '#858796',
    animation: 'fadeInUp 0.8s ease-out 0.8s both'
  },
  linkBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#4e73df', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    padding: 0,
    textDecoration: 'underline',
    transition: 'color 0.3s ease'
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0] || document.head.appendChild(document.createElement('style')).sheet;
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
styleSheet.insertRule(`
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`, styleSheet.cssRules.length);

// Add hover effects
styleSheet.insertRule(`
  .input:focus {
    border-color: #4e73df !important;
    box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1) !important;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .signupBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(28, 200, 138, 0.4);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .backBtn:hover {
    background-color: #4e73df;
    color: white;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .linkBtn:hover {
    opacity: 0.8;
  }
`, styleSheet.cssRules.length);

export default Signup;