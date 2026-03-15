import React, { useState } from 'react';
import { auth, db } from './firebase'; 
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail,
  signOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false); 
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await user.reload();
      const refreshedUser = auth.currentUser;

      if (!refreshedUser.emailVerified) {
        setUnverified(true);
        setError("Please verify your email address before logging in.");
        await signOut(auth); 
        setLoading(false);
        return; 
      }

      const docRef = doc(db, "userProfiles", refreshedUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().setupComplete) {
        navigate('/dashboard');
      } else {
        navigate('/setup');
      }

    } catch (err) {
      console.error(err.code);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Login failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first!");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert("Password reset link sent! Check your inbox.");
    } catch (err) {
      setError("Failed to send reset email.");
    }
  };

  const handleResendPrompt = () => {
    alert("To verify: Click the link in your email. If you didn't get one, check your spam folder or try signing up again.");
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const docRef = doc(db, "userProfiles", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().setupComplete) {
        navigate('/dashboard');
      } else {
        navigate('/setup');
      }
    } catch (err) {
      setError("Google Login failed.");
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
          <p style={styles.subTitle}>Master your money, one click at a time.</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
            {unverified && (
              <button onClick={handleResendPrompt} style={styles.resendBtn}>
                Verification Help
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              style={styles.input} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword} 
                style={styles.forgotBtn}
              >
                Forgot Password?
              </button>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                style={styles.input} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  ...styles.eyeBtn,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#4e73df',
                  background: 'none',
                  border: 'none',
                  padding: 0
                }}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.loginBtn}>
            {loading ? 'Signing in...' : 'Login to MySpend'}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine}></div>
        </div>

        <button onClick={handleGoogleLogin} style={styles.googleBtn}>
          <img src="https://imgs.search.brave.com/PdE0_txzUdHcbHT5AhV0yUQJQp1HsegZYHyXHuGZ3vs/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9j/L2MxL0dvb2dsZV8l/MjJHJTIyX2xvZ28u/c3Zn" alt="G" style={styles.googleIcon} />
          Continue with Google
        </button>

        <div style={styles.footer}>
          <span>Don't have an account? </span>
          <button onClick={() => navigate('/signup')} style={styles.linkBtn}>Create Account</button>
        </div>
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
    top: '10%', 
    left: '10%', 
    width: '80px', 
    height: '80px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '50%', 
    animation: 'float 6s ease-in-out infinite'
  },
  floatingShape2: { 
    position: 'absolute', 
    top: '60%', 
    right: '15%', 
    width: '60px', 
    height: '60px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '20px', 
    animation: 'float 8s ease-in-out infinite reverse'
  },
  floatingShape3: { 
    position: 'absolute', 
    bottom: '20%', 
    left: '20%', 
    width: '100px', 
    height: '100px', 
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
  inputGroup: { marginBottom: '25px' },
  label: { 
    display: 'block', 
    marginBottom: '8px', 
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
  forgotBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#4e73df', 
    fontSize: '12px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    textDecoration: 'underline',
    transition: 'color 0.3s ease'
  },
  eyeBtn: { 
    position: 'absolute', 
    right: '15px', 
    top: '50%', 
    transform: 'translateY(-50%)', 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '20px', 
    padding: '0', 
    color: '#858796',
    transition: 'color 0.3s ease'
  },
  loginBtn: { 
    width: '100%', 
    padding: '16px', 
    background: 'linear-gradient(45deg, #4e73df, #224abe)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 4px 15px rgba(78, 115, 223, 0.3)',
    marginTop: '10px',
    animation: 'fadeInUp 0.8s ease-out 0.6s both'
  },
  divider: { 
    display: 'flex', 
    alignItems: 'center', 
    margin: '30px 0',
    animation: 'fadeInUp 0.8s ease-out 0.8s both'
  },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#eaecf4' },
  dividerText: { margin: '0 15px', color: '#b7b9cc', fontSize: '14px', fontWeight: '600' },
  googleBtn: { 
    width: '100%', 
    padding: '14px', 
    backgroundColor: '#fff', 
    color: '#555', 
    border: '2px solid #e3e6f0', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '12px', 
    fontWeight: '600',
    fontSize: '16px',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    animation: 'fadeInUp 0.8s ease-out 1s both'
  },
  googleIcon: { width: '20px' },
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
  footer: { 
    marginTop: '30px', 
    fontSize: '15px', 
    color: '#858796',
    animation: 'fadeInUp 0.8s ease-out 1.2s both'
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
  },
  resendBtn: { 
    display: 'block', 
    marginTop: '8px', 
    background: 'none', 
    border: 'none', 
    color: '#e74a3b', 
    textDecoration: 'underline', 
    cursor: 'pointer', 
    fontSize: '13px', 
    fontWeight: 'bold',
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
  .loginBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(78, 115, 223, 0.4);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .googleBtn:hover {
    border-color: #d1d3e2;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .forgotBtn:hover, .linkBtn:hover, .resendBtn:hover {
    opacity: 0.8;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .eyeBtn:hover {
    color: #4e73df;
  }
`, styleSheet.cssRules.length);

export default Login;