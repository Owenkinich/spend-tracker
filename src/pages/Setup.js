import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

function Setup() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [incomeSource, setIncomeSource] = useState('Personal');
  const [currency, setCurrency] = useState('₱'); 
  const [loading, setLoading] = useState(false);

  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  
  const [newExpCat, setNewExpCat] = useState('');
  const [newIncCat, setNewIncCat] = useState('');

  // --- VALIDATION LOGIC ---
  // All income categories must have a non-empty, positive target
  const allIncomeFilled = incomeCategories.length > 0 && incomeCategories.every(cat => cat.name.trim() !== '' && cat.target !== '' && Number(cat.target) > 0);
  const isStep2Valid = username.trim() !== '' && allIncomeFilled;

  const totalPlannedIncome = incomeCategories.reduce((sum, cat) => sum + (Number(cat.target) || 0), 0);
  const totalPlannedExpenses = expenseCategories.reduce((sum, cat) => sum + (Number(cat.limit) || 0), 0);
  const remainingIncome = totalPlannedIncome - totalPlannedExpenses;
  const isOverSpent = remainingIncome < 0;
  
  // All expense categories must have a non-empty, positive limit
  const allExpenseFilled = expenseCategories.length > 0 && expenseCategories.every(cat => cat.name.trim() !== '' && cat.limit !== '' && Number(cat.limit) > 0);
  const isStep3Valid = allExpenseFilled && !isOverSpent;

  useEffect(() => {
    const defaults = {
      Business: {
        inc: [{ name: 'Client Sales', target: '' }, { name: 'Service Fees', target: '' }],
        exp: [{ name: 'Office Rent', limit: '' }, { name: 'Payroll', limit: '' }, { name: 'Marketing', limit: '' }]
      },
      Freelancer: {
        inc: [{ name: 'Project Fee', target: '' }, { name: 'Monthly Retainer', target: '' }],
        exp: [{ name: 'Software/Tools', limit: '' }, { name: 'Internet', limit: '' }, { name: 'Equipment', limit: '' }]
      },
      Family: {
        inc: [{ name: 'Main Salary', target: '' }, { name: 'Passive Income', target: '' }],
        exp: [{ name: 'Groceries', limit: '' }, { name: 'Education', limit: '' }, { name: 'Healthcare', limit: '' }]
      },
      Personal: {
        inc: [{ name: 'Monthly Salary', target: '' }, { name: 'Side Hustle', target: '' }],
        exp: [{ name: 'Food', limit: '' }, { name: 'Transport', limit: '' }, { name: 'Rent', limit: '' }]
      }
    };
    const selected = defaults[incomeSource] || defaults.Personal;
    setIncomeCategories(selected.inc);
    setExpenseCategories(selected.exp);
  }, [incomeSource]);

  const handleAddExp = () => { 
    if (newExpCat.trim()) { 
      setExpenseCategories([...expenseCategories, { name: newExpCat, limit: '' }]); 
      setNewExpCat(''); 
    } 
  };

  const handleAddInc = () => { 
    if (newIncCat.trim()) { 
      setIncomeCategories([...incomeCategories, { name: newIncCat, target: '' }]); 
      setNewIncCat(''); 
    } 
  };

  const removeIncomeCat = (index) => setIncomeCategories(incomeCategories.filter((_, i) => i !== index));
  const removeExpenseCat = (index) => setExpenseCategories(expenseCategories.filter((_, i) => i !== index));

  const handleCompleteSetup = async (e) => {
    e.preventDefault();
    if (!isStep3Valid) return;
    // If there is still budget left, show a confirmation dialog
    if (remainingIncome > 0) {
      const proceed = window.confirm(`There is still ${currency}${remainingIncome.toLocaleString()} left in your budget allocation. Are you sure you want to proceed?`);
      if (!proceed) return;
    }
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, "userProfiles", user.uid), {
          username,
          incomeSource,
          initialBudget: totalPlannedIncome,
          currency,
          incomeCategories: incomeCategories.map(c => ({ ...c, target: Number(c.target) || 0 })),
          categories: expenseCategories.map(c => ({ ...c, limit: Number(c.limit) || 0 })),
          uid: user.uid,
          setupComplete: true,
          darkMode: false,
          createdAt: new Date().toISOString()
        });
        sessionStorage.setItem('myspend_just_setup', 'true');
        window.location.href = "/dashboard";
      } catch (err) { 
        alert("Error: " + err.message); 
        setLoading(false); 
      }
    }
  };

  const accountTypes = [
    { id: 'Personal', title: 'Personal', icon: '👤', color: '#4e73df' },
    { id: 'Family', title: 'Family', icon: '👥', color: '#1cc88a' },
    { id: 'Freelancer', title: 'Freelancer', icon: '💼', color: '#36b9cc' },
    { id: 'Business', title: 'Business', icon: '🏢', color: '#f6c23e' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.backgroundElements}>
        <div style={styles.floatingShape1}></div>
        <div style={styles.floatingShape2}></div>
        <div style={styles.floatingShape3}></div>
      </div>

      <div style={styles.card}>
        {/* Back Button (top left) */}
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            style={styles.backBtn}
            aria-label="Back"
          >
            ← Back
          </button>
        )}

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          <div style={{...styles.stepDot, backgroundColor: step >= 1 ? '#4e73df' : '#eaecf4'}}></div>
          <div style={{...styles.stepLine, backgroundColor: step >= 2 ? '#4e73df' : '#eaecf4'}}></div>
          <div style={{...styles.stepDot, backgroundColor: step >= 2 ? '#4e73df' : '#eaecf4'}}></div>
          <div style={{...styles.stepLine, backgroundColor: step >= 3 ? '#4e73df' : '#eaecf4'}}></div>
          <div style={{...styles.stepDot, backgroundColor: step >= 3 ? '#4e73df' : '#eaecf4'}}></div>
        </div>

        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>What's your focus?</h2>
            <p style={styles.stepSubtitle}>Choose the account type that best fits your financial goals</p>
            <div style={styles.optionGrid}>
              {accountTypes.map((type) => (
                <div key={type.id} onClick={() => setIncomeSource(type.id)} 
                  style={{ ...styles.selectableCard, borderColor: incomeSource === type.id ? type.color : '#eaecf4', backgroundColor: incomeSource === type.id ? `${type.color}10` : 'white', transform: incomeSource === type.id ? 'scale(1.05)' : 'scale(1)' }}>
                  <div style={{ ...styles.iconBox, backgroundColor: `${type.color}20`, color: type.color }}>{type.icon}</div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#333' }}>{type.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    {type.id === 'Personal' && 'Individual budgeting'}
                    {type.id === 'Family' && 'Household expenses'}
                    {type.id === 'Freelancer' && 'Project-based income'}
                    {type.id === 'Business' && 'Company finances'}
                  </div>
                </div>
              ))}
            </div>
            <button style={{...styles.primaryBtn, opacity: incomeSource ? 1 : 0.5}} disabled={!incomeSource} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Income Setup 💰</h2>
            <p style={styles.stepSubtitle}>Set up your income sources and targets</p>

            <label style={styles.label}>Full Name <span style={{color: '#e74a3b'}}>*</span></label>
            <input style={styles.input} placeholder="e.g. Alex Johnson" value={username} onChange={(e)=>setUsername(e.target.value)} />

            <label style={styles.label}>Preferred Currency</label>
            <select style={styles.input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="₱">PHP (₱)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="¥">JPY (¥)</option>
            </select>

            <label style={styles.label}>Add Income Source</label>
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
              <input style={{...styles.input, marginBottom:0, flex: 1}} placeholder="e.g. Side Hustle" value={newIncCat} onChange={(e)=>setNewIncCat(e.target.value)} />
              <button type="button" onClick={handleAddInc} style={{...styles.addBtn, backgroundColor: '#1cc88a'}}>Add</button>
            </div>

            <div style={styles.catBox}>
              {incomeCategories.map((cat, i) => {
                const isEmpty = !cat.target || Number(cat.target) <= 0;
                return (
                  <div key={i} style={styles.catItem}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <button onClick={() => removeIncomeCat(i)} style={styles.delBtn}>×</button>
                      <span style={{fontWeight: '500'}}>{cat.name}</span>
                      {isEmpty && <span style={{color:'#e74a3b', marginLeft:4}} title="Required">*</span>}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span style={{fontSize:'14px', color: '#666'}}>{currency}</span>
                      <input type="number" placeholder="0" value={cat.target} 
                        style={{...styles.limitInput, borderColor: isEmpty ? '#e74a3b' : '#e3e6f0'}} 
                        onChange={(e) => {
                          const up = [...incomeCategories]; up[i].target = e.target.value; setIncomeCategories(up);
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button style={{...styles.primaryBtn, opacity: isStep2Valid ? 1 : 0.5}} disabled={!isStep2Valid} onClick={() => isStep2Valid && setStep(3)}>
              {isStep2Valid ? 'Next: Set Expenses' : 'All fields required'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Expense Limits 💸</h2>
            <p style={styles.stepSubtitle}>Set budget limits for your expense categories</p>

            <div style={{...styles.budgetTracker, borderColor: isOverSpent ? '#e74a3b' : '#4e73df'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                  <span style={{fontSize:'14px', fontWeight:'600'}}>Budget Remaining:</span>
                  <span style={{color: isOverSpent ? '#e74a3b' : '#1cc88a', fontSize: '18px', fontWeight: 'bold'}}>{currency}{remainingIncome.toLocaleString()}</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill, 
                    width: `${Math.min((totalPlannedExpenses / totalPlannedIncome) * 100, 100)}%`,
                    backgroundColor: isOverSpent ? '#e74a3b' : '#4e73df'
                  }} />
                </div>
            </div>

            <label style={styles.label}>Add Custom Expense</label>
            <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
              <input style={{...styles.input, marginBottom:0, flex: 1}} placeholder="e.g. Gym Membership" value={newExpCat} onChange={(e)=>setNewExpCat(e.target.value)} />
              <button type="button" onClick={handleAddExp} style={{...styles.addBtn, backgroundColor: '#4e73df'}}>Add</button>
            </div>

            <div style={styles.catBox}>
              {expenseCategories.map((cat, i) => {
                const isEmpty = !cat.limit || Number(cat.limit) <= 0;
                return (
                  <div key={i} style={styles.catItem}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <button onClick={() => removeExpenseCat(i)} style={styles.delBtn}>×</button>
                      <span style={{fontWeight: '500'}}>{cat.name}</span>
                      {isEmpty && <span style={{color:'#e74a3b', marginLeft:4}} title="Required">*</span>}
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span style={{fontSize:'14px', color: '#666'}}>{currency}</span>
                      <input type="number" placeholder="0" value={cat.limit} 
                        style={{...styles.limitInput, borderColor: isEmpty ? '#e74a3b' : '#e3e6f0'}} 
                        onChange={(e) => {
                          const up = [...expenseCategories]; up[i].limit = e.target.value; setExpenseCategories(up);
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{display:'flex', gap:'15px'}}>
              <button type="button" onClick={() => setStep(2)} style={styles.secondaryBtn}>Back</button>
              <button type="button" onClick={handleCompleteSetup} disabled={!isStep3Valid || loading} 
                style={{...styles.primaryBtn, flex: 2, opacity: isStep3Valid ? 1 : 0.5}}>
                {loading ? 'Saving...' : (isOverSpent ? 'Over Budget!' : 'Finish Setup')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backBtn: {
    position: 'absolute',
    top: 18,
    left: 18,
    background: 'none',
    border: 'none',
    color: '#4e73df',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    zIndex: 2,
    padding: '6px 12px',
    borderRadius: '8px',
    transition: 'background 0.2s, color 0.2s',
  },
  container: { 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
    padding: '20px',
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
    backgroundColor: 'rgba(255,255,255,0.95)', 
    backdropFilter: 'blur(10px)', 
    padding: '50px', 
    borderRadius: '28px', 
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
    width: '100%', 
    maxWidth: '600px',
    border: '1px solid rgba(255,255,255,0.2)',
    animation: 'fadeInUp 0.8s ease-out'
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '40px'
  },
  stepDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'background-color 0.3s ease'
  },
  stepLine: {
    width: '60px',
    height: '2px',
    margin: '0 10px',
    transition: 'background-color 0.3s ease'
  },
  stepContent: {
    animation: 'fadeInUp 0.6s ease-out 0.2s both'
  },
  stepTitle: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '10px',
    fontSize: '28px',
    fontWeight: '700'
  },
  stepSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
    fontSize: '16px'
  },
  label: { 
    display: 'block', 
    fontSize: '12px', 
    fontWeight: '800', 
    color: '#4e73df', 
    marginBottom: '10px', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: { 
    width: '100%', 
    padding: '16px 20px', 
    marginBottom: '25px', 
    borderRadius: '12px', 
    border: '2px solid #e3e6f0', 
    fontSize: '16px', 
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    backgroundColor: '#fafbfc'
  },
  optionGrid: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '20px', 
    marginBottom: '35px' 
  },
  selectableCard: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    padding: '25px 20px', 
    borderRadius: '16px', 
    border: '2px solid', 
    cursor: 'pointer', 
    transition: 'all 0.3s ease',
    textAlign: 'center'
  },
  iconBox: { 
    width: '50px', 
    height: '50px', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: '15px',
    fontSize: '24px'
  },
  catBox: { 
    maxHeight: '250px', 
    overflowY: 'auto', 
    marginBottom: '25px', 
    padding: '15px', 
    backgroundColor: '#fcfcfc', 
    border: '2px solid #f0f0f0', 
    borderRadius: '12px' 
  },
  catItem: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '12px', 
    padding: '12px 15px', 
    borderRadius: '10px', 
    backgroundColor: '#fff', 
    border: '1px solid #e3e6f0',
    transition: 'box-shadow 0.3s ease'
  },
  limitInput: { 
    width: '100px', 
    padding: '8px 12px', 
    borderRadius: '8px', 
    border: '2px solid #d1d3e2', 
    fontSize: '14px', 
    textAlign: 'right',
    transition: 'border-color 0.3s ease'
  },
  addBtn: { 
    color: 'white', 
    border: 'none', 
    borderRadius: '10px', 
    padding: '12px 20px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'transform 0.3s ease'
  },
  delBtn: { 
    backgroundColor: '#ffe5e5', 
    color: '#e74a3b', 
    border: 'none', 
    borderRadius: '50%', 
    width: '28px', 
    height: '28px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '16px', 
    lineHeight: '1',
    transition: 'all 0.3s ease'
  },
  primaryBtn: { 
    width: '100%', 
    padding: '18px', 
    background: 'linear-gradient(45deg, #4e73df, #224abe)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '14px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    boxShadow: '0 4px 15px rgba(78, 115, 223, 0.3)',
    marginTop: '10px'
  },
  secondaryBtn: { 
    flex: 1, 
    padding: '18px', 
    backgroundColor: '#eaecf4', 
    color: '#858796', 
    border: 'none', 
    borderRadius: '14px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  budgetTracker: { 
    padding: '20px', 
    borderRadius: '14px', 
    border: '2px solid', 
    marginBottom: '25px',
    backgroundColor: '#fafbfc'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#eaecf4',
    borderRadius: '3px',
    marginTop: '10px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.5s ease'
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

// Add hover effects
styleSheet.insertRule(`
  .input:focus {
    border-color: #4e73df !important;
    box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1) !important;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .selectableCard:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .catItem:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .primaryBtn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(78, 115, 223, 0.4);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .secondaryBtn:hover {
    background-color: #d1d3e2;
    color: #333;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .addBtn:hover {
    transform: translateY(-1px);
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .delBtn:hover {
    background-color: #e74a3b;
    color: white;
  }
`, styleSheet.cssRules.length);
styleSheet.insertRule(`
  .limitInput:focus {
    border-color: #4e73df;
    box-shadow: 0 0 0 2px rgba(78, 115, 223, 0.2);
  }
`, styleSheet.cssRules.length);

export default Setup;