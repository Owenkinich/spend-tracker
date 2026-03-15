import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function Settings() {
  const [username, setUsername] = useState('');
  const [incomeSource, setIncomeSource] = useState(''); 
  const [budgetPeriod, setBudgetPeriod] = useState('Monthly');
  const [currency, setCurrency] = useState('₱');
  const [customCurrency, setCustomCurrency] = useState('');
  const [categories, setCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]); 
  const [darkMode, setDarkMode] = useState(false);
  
  const [newIncName, setNewIncName] = useState('');
  const [newIncTarget, setNewIncTarget] = useState(''); 
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Computed initialBudget as sum of income targets
  const initialBudget = incomeCategories.reduce((sum, inc) => sum + (Number(inc.target) || 0), 0);
  const allocatedExpenses = categories.reduce((sum, cat) => sum + (Number(cat.limit) || 0), 0);
  const remainingBudget = Number(initialBudget) - allocatedExpenses;
  const isOverBudget = remainingBudget < 0;

  const allocatedIncome = incomeCategories.reduce((sum, inc) => sum + (Number(inc.target) || 0), 0);
  const remainingIncomeToAssign = Number(initialBudget) - allocatedIncome;

  const displayCurrency = currency === 'Custom' ? (customCurrency || '') : currency;

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername(data.username || '');
          setIncomeSource(data.incomeSource || '');
          setBudgetPeriod(data.budgetPeriod || 'Monthly');
          // If saved currency is not one of our common symbols, treat it as a custom symbol
          const common = ['₱', '$', '€', '£', '¥'];
          if (data.currency && !common.includes(data.currency)) {
            setCurrency('Custom');
            setCustomCurrency(data.currency);
          } else {
            setCurrency(data.currency || '₱');
          }
          setCategories(data.categories || []);
          setIncomeCategories(data.incomeCategories || []);
          setDarkMode(data.darkMode || false);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleResetMonth = async () => {
    const confirmReset = window.confirm("⚠️ This will delete ALL logged expenses and income records. Continue?");
    if (confirmReset) {
      try {
        const user = auth.currentUser;
        const qExp = query(collection(db, "expenses"), where("userId", "==", user.uid));
        const qInc = query(collection(db, "income"), where("userId", "==", user.uid));
        const [expSnap, incSnap] = await Promise.all([getDocs(qExp), getDocs(qInc)]);
        
        const deletes = [
          ...expSnap.docs.map(d => deleteDoc(doc(db, "expenses", d.id))),
          ...incSnap.docs.map(d => deleteDoc(doc(db, "income", d.id)))
        ];

        await Promise.all(deletes);
        alert("🚀 Data reset successful!");
        navigate('/dashboard');
      } catch (err) {
        alert("Error: " + err.message);
      }
    }
  };

  const addIncomeCategory = () => {
    if (!newIncName) return;
    setIncomeCategories([...incomeCategories, { name: newIncName, target: Number(newIncTarget) || 0 }]);
    setNewIncName('');
    setNewIncTarget('');
  };

  const addCategory = () => {
    if (!newCatName) return;
    const limitToAdd = Number(newCatLimit) || 0;
    if (allocatedExpenses + limitToAdd > Number(initialBudget)) {
      alert(`⚠️ Budget exceeded! Only ${displayCurrency}${remainingBudget} left.`);
      return;
    }
    setCategories([...categories, { name: newCatName, limit: limitToAdd }]);
    setNewCatName('');
    setNewCatLimit('');
  };

  const removeCategory = (index, type) => {
    if (type === 'expense') setCategories(categories.filter((_, i) => i !== index));
    else setIncomeCategories(incomeCategories.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent saving before data is fetched
    if (isOverBudget) {
      alert("⚠️ Your expense categories exceed your total budget!");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        const finalCurrency = currency === 'Custom' ? (customCurrency || '') : currency;
        await setDoc(doc(db, "userProfiles", user.uid), {
          username,
          incomeSource,
          initialBudget: Number(initialBudget),
          budgetPeriod,
          currency: finalCurrency,
          categories,
          incomeCategories,
          darkMode,
          uid: user.uid
        }, { merge: true });
        alert("✅ Settings Saved!");
        navigate('/dashboard');
      } catch (err) {
        alert("Error: " + err.message);
      }
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingSpinner}></div>
      <p style={styles.loadingText}>Syncing settings...</p>
    </div>
  );

  const theme = {
    bg: darkMode ? '#121212' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    card: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)',
    text: darkMode ? '#ffffff' : '#333333',
    subText: darkMode ? '#aaaaaa' : '#858796',
    inputBg: darkMode ? '#2d2d2d' : '#fafbfc',
    inputBorder: darkMode ? '#444444' : '#e3e6f0',
    sectionBg: darkMode ? 'rgba(45, 45, 45, 0.5)' : 'rgba(255,255,255,0.7)',
    hr: darkMode ? '#444444' : '#e3e6f0'
  };

  return (
    <div style={{ ...styles.container, background: theme.bg }}>
      <div style={styles.backgroundElements}>
        <div style={styles.floatingShape1}></div>
        <div style={styles.floatingShape2}></div>
        <div style={styles.floatingShape3}></div>
      </div>
      
      <div style={{ ...styles.card, backgroundColor: theme.card, backdropFilter: 'blur(10px)', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}` }}>
        
        <div style={styles.header}>
          <h2 style={{ ...styles.title, color: theme.text }}>⚙️ Settings</h2>
          <div style={styles.darkModeToggle}>
            <span style={{ ...styles.toggleLabel, color: theme.subText }}>🌙</span>
            <label style={styles.switch}>
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span style={styles.slider}></span>
            </label>
            <span style={{ ...styles.toggleLabel, color: theme.subText }}>☀️</span>
          </div>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          <div style={{ ...styles.section, backgroundColor: theme.sectionBg, border: `1px solid ${theme.inputBorder}` }}>
            <h3 style={{ ...styles.sectionTitle, color: theme.text }}>👤 Profile Settings</h3>
            <label style={styles.label}>Display Name</label>
            <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} value={username} onChange={(e) => setUsername(e.target.value)} required />

            <label style={styles.label}>Primary Income Source</label>
            <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} value={incomeSource} placeholder="e.g. Monthly Salary" onChange={(e) => setIncomeSource(e.target.value)} />

            <label style={styles.label}>Total Income Goal / Budget</label>
            <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} type="number" value={initialBudget} disabled />

            <label style={styles.label}>Currency</label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <select style={{ ...styles.input, flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="₱">Philippine Peso (₱)</option>
                <option value="$">US Dollar ($)</option>
                <option value="€">Euro (€)</option>
                <option value="£">Pound (£)</option>
                <option value="¥">Yen (¥)</option>
                <option value="Custom">Custom</option>
              </select>
              {currency === 'Custom' && (
                <input style={{ ...styles.input, flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} placeholder="Symbol (e.g. ¢)" value={customCurrency} onChange={(e) => setCustomCurrency(e.target.value)} />
              )}
            </div>
          </div>

          <div style={{ ...styles.section, backgroundColor: theme.sectionBg, border: `1px solid ${theme.inputBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ ...styles.sectionTitle, color: theme.text }}>💰 Income Categories</h3>
              <span style={{ color: '#1cc88a', fontSize: '14px', fontWeight: 'bold', backgroundColor: darkMode ? 'rgba(28, 200, 138, 0.1)' : '#f0fff4', padding: '5px 10px', borderRadius: '20px' }}>To Assign: {displayCurrency}{remainingIncomeToAssign.toLocaleString()}</span>
            </div>
            <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} placeholder="Stream Name (e.g. Side Hustle)" value={newIncName} onChange={(e) => setNewIncName(e.target.value)} />
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
              <input style={{ ...styles.input, flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} type="number" placeholder="Target Amount" value={newIncTarget} onChange={(e) => setNewIncTarget(e.target.value)} />
              <button type="button" onClick={addIncomeCategory} style={{...styles.addBtn, backgroundColor: '#1cc88a'}}>Add</button>
            </div>
            <div style={styles.catList}>
              {incomeCategories.map((inc, i) => (
                <div key={i} style={{ ...styles.catItem, backgroundColor: darkMode ? 'rgba(28, 200, 138, 0.1)' : '#f1fcf7', border: `1px solid ${darkMode ? 'rgba(28, 200, 138, 0.3)' : '#1cc88a'}` }}>
                  <span style={{ color: theme.text, fontWeight: '600' }}>{inc.name} — {displayCurrency}{Number(inc.target).toLocaleString()}</span>
                  <button type="button" onClick={() => removeCategory(i, 'income')} style={styles.delBtn}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...styles.section, backgroundColor: theme.sectionBg, border: `1px solid ${theme.inputBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ ...styles.sectionTitle, color: theme.text }}>🏷️ Expense Categories</h3>
              <span style={{ color: isOverBudget ? '#e74a3b' : '#4e73df', fontSize: '14px', fontWeight: 'bold', backgroundColor: isOverBudget ? (darkMode ? 'rgba(231, 74, 59, 0.1)' : '#fff1f0') : (darkMode ? 'rgba(78, 115, 223, 0.1)' : '#f0f2ff'), padding: '5px 10px', borderRadius: '20px' }}>Left: {displayCurrency}{remainingBudget.toLocaleString()}</span>
            </div>
            <input style={{ ...styles.input, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} placeholder="Category (e.g. Groceries)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
              <input style={{ ...styles.input, flex: 1, marginBottom: 0, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }} type="number" placeholder="Limit" value={newCatLimit} onChange={(e) => setNewCatLimit(e.target.value)} />
              <button type="button" onClick={addCategory} style={styles.addBtn}>Add</button>
            </div>
            <div style={styles.catList}>
              {categories.map((cat, i) => (
                <div key={i} style={{ ...styles.catItem, backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fc', border: `1px solid ${theme.inputBorder}` }}>
                  <span style={{ color: theme.text, fontWeight: '600' }}>{cat.name} — {displayCurrency}{Number(cat.limit).toLocaleString()}</span>
                  <button type="button" onClick={() => removeCategory(i, 'expense')} style={styles.delBtn}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isOverBudget} style={{ ...styles.saveBtn, opacity: isOverBudget ? 0.5 : 1, background: isOverBudget ? '#e74a3b' : 'linear-gradient(45deg, #1cc88a, #17a2b8)' }}>Save Changes</button>
          
          <div style={styles.dangerZone}>
            <button type="button" onClick={handleResetMonth} style={styles.resetBtn}>Reset Financial Data</button>
          </div>

          <button type="button" onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Back to Dashboard</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
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
    left: '5%', 
    width: '120px', 
    height: '120px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '50%', 
    animation: 'float 8s ease-in-out infinite'
  },
  floatingShape2: { 
    position: 'absolute', 
    top: '60%', 
    right: '10%', 
    width: '80px', 
    height: '80px', 
    background: 'rgba(255,255,255,0.1)', 
    borderRadius: '20px', 
    animation: 'float 10s ease-in-out infinite reverse'
  },
  floatingShape3: { 
    position: 'absolute', 
    bottom: '15%', 
    left: '60%', 
    width: '100px', 
    height: '100px', 
    background: 'rgba(255,255,255,0.05)', 
    borderRadius: '50%', 
    animation: 'float 12s ease-in-out infinite'
  },
  card: { 
    padding: '50px', 
    borderRadius: '28px', 
    width: '100%', 
    maxWidth: '650px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
    animation: 'fadeInUp 0.8s ease-out'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#ffffff',
    fontSize: '18px',
    marginTop: '20px',
    fontWeight: '600'
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '40px' 
  },
  title: { 
    margin: 0, 
    fontSize: '32px', 
    fontWeight: '800',
    background: 'linear-gradient(45deg, #4e73df, #224abe)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent'
  },
  darkModeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  toggleLabel: {
    fontSize: '16px'
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px'
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.4s',
    borderRadius: '24px'
  },
  form: {
    animation: 'fadeInUp 0.8s ease-out 0.2s both'
  },
  section: { 
    marginBottom: '30px', 
    padding: '25px', 
    borderRadius: '16px',
    backdropFilter: 'blur(5px)',
    animation: 'fadeInUp 0.6s ease-out both'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: '700'
  },
  label: { 
    display: 'block', 
    marginBottom: '8px', 
    fontSize: '12px', 
    fontWeight: '800', 
    color: '#4e73df', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: { 
    width: '100%', 
    padding: '16px 20px', 
    borderRadius: '12px', 
    border: '2px solid', 
    fontSize: '16px', 
    boxSizing: 'border-box', 
    marginBottom: '20px', 
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: '#fafbfc'
  },
  addBtn: { 
    padding: '16px 24px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'transform 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
  },
  catList: { 
    maxHeight: '200px', 
    overflowY: 'auto',
    borderRadius: '8px'
  },
  catItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '15px 20px', 
    borderRadius: '10px', 
    marginBottom: '10px', 
    fontSize: '14px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  delBtn: { 
    background: 'none', 
    border: 'none', 
    color: '#e74a3b', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: 'bold',
    transition: 'color 0.3s ease'
  },
  saveBtn: { 
    width: '100%', 
    padding: '18px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '14px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 4px 15px rgba(28, 200, 138, 0.3)',
    marginTop: '20px'
  },
  dangerZone: { 
    marginTop: '30px', 
    borderTop: '2px dashed #e74a3b', 
    paddingTop: '25px', 
    textAlign: 'center' 
  },
  resetBtn: { 
    background: 'none', 
    border: '2px solid #e74a3b', 
    color: '#e74a3b', 
    padding: '12px 20px', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  backBtn: { 
    width: '100%', 
    padding: '15px', 
    backgroundColor: 'transparent', 
    color: '#858796', 
    border: 'none', 
    cursor: 'pointer', 
    marginTop: '15px',
    fontSize: '16px',
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
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
  .catItem:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .addBtn:hover {
    transform: translateY(-2px);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .saveBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(28, 200, 138, 0.4);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .resetBtn:hover {
    background-color: #e74a3b;
    color: white;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .backBtn:hover {
    color: #4e73df;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .switch input:checked + .slider {
    background-color: #4e73df;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .switch .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .switch input:checked + .slider:before {
    transform: translateX(26px);
  }
`, styleSheet.cssRules.length);

export default Settings;