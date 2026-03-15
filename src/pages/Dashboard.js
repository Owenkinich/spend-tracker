import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { useNavigate } from 'react-router-dom';

import { jsPDF } from "jspdf"; 
import autoTable from "jspdf-autotable";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2'; 
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Joyride from 'react-joyride';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function Dashboard() {
  const [userProfile, setUserProfile] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomeList, setIncomeList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("User");
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [entryType, setEntryType] = useState('expense'); 
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [searchDate, setSearchDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); 

  const [runTour, setRunTour] = useState(false); 

  const [base64Image, setBase64Image] = useState(''); 
  const [selectedImage, setSelectedImage] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();

  // --- TOUR STEPS ---
  const tourSteps = [
    {
      target: '.welcome-header',
      content: 'Welcome to MySpend! This is your personalized dashboard where you can track all your expenses and income.',
      placement: 'center'
    },
    {
      target: '.date-display',
      content: 'Here you can see the current date and time. All your financial data is tracked in real-time.',
    },
    {
      target: '.balance-summary',
      content: 'This section shows your total income, expenses, and net balance for the selected period.',
    },
    {
      target: '.charts-section',
      content: 'Visualize your spending and income patterns with these interactive charts. Click on categories to see details.',
    },
    {
      target: '.add-expense-form',
      content: 'Use this form to add new expenses or income entries. Select the type, amount, category, and date.',
    },
    {
      target: '.transactions-list',
      content: 'View all your recent transactions here. You can search, filter by month, and edit or delete entries.',
    },
    {
      target: '.export-buttons',
      content: 'Generate PDF reports of your financial data. Choose between general or filtered reports.',
    },
    {
      target: '.sidebar-nav',
      content: 'Navigate to different sections using the sidebar. Access settings or sign out from here.',
    }
  ];

  // --- HELPERS ---
  const formatReportDate = (dateStr) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const getCurrencyAbrv = (symbol) => {
    const map = { '₱': 'PHP', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
    return map[symbol] || symbol; 
  };

  const currency = userProfile?.currency || '₱';
  const currencyLabel = getCurrencyAbrv(currency);

  // Export Filter Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    categories: [],
    dateFrom: '',
    dateTo: '',
    includeExpenses: true,
    includeIncome: true
  });

  const handleExportPDF = (type = 'general', filters = null) => {
    const docPDF = new jsPDF();
    const dateStr = currentTime.toLocaleDateString();
    const timeStr = currentTime.toLocaleTimeString();

    // Determine theme colors based on report type
    const themeColors = type === 'filtered' 
      ? { primary: [54, 185, 204], secondary: [28, 200, 138], accent: [102, 16, 242] } // Teal theme for filtered
      : { primary: [78, 115, 223], secondary: [28, 200, 138], accent: [246, 194, 62] }; // Blue theme for general

    // 1. Determine Data Source
    let sourceExpenses = type === 'filtered' ? filteredExpenses : expenses;
    let sourceIncome = type === 'filtered' ? filteredIncome : incomeList;
    // Apply export filters if present
    if (type === 'filtered' && filters) {
      if (filters.categories && filters.categories.length > 0) {
        sourceExpenses = sourceExpenses.filter(e => filters.categories.includes(e.category));
        sourceIncome = sourceIncome.filter(i => filters.categories.includes(i.category));
      }
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        sourceExpenses = sourceExpenses.filter(e => new Date(e.date) >= from);
        sourceIncome = sourceIncome.filter(i => new Date(i.date) >= from);
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        sourceExpenses = sourceExpenses.filter(e => new Date(e.date) <= to);
        sourceIncome = sourceIncome.filter(i => new Date(i.date) <= to);
      }
      if (!filters.includeExpenses) sourceExpenses = [];
      if (!filters.includeIncome) sourceIncome = [];
    }
    // Combine both for the detailed list
    const combinedData = [...sourceExpenses, ...sourceIncome].sort((a, b) => new Date(b.date) - new Date(a.date));

    const reportTitle = type === 'filtered' ? "Filtered Transaction Report" : "General Financial Summary";

    // Header Branding with theme color
    docPDF.setFontSize(24);
    docPDF.setTextColor(themeColors.primary[0], themeColors.primary[1], themeColors.primary[2]); 
    docPDF.text("MySpend Report", 14, 20);
    
    docPDF.setFontSize(12);
    docPDF.setTextColor(133, 135, 150);
    docPDF.text(reportTitle, 14, 30);
    docPDF.text(`User: ${displayName} | Generated: ${dateStr} ${timeStr}`, 14, 37);
    
    // Add a colored rectangle for branding
    docPDF.setFillColor(themeColors.primary[0], themeColors.primary[1], themeColors.primary[2]);
    docPDF.rect(14, 42, 180, 8, 'F');
    docPDF.setFontSize(10);
    docPDF.setTextColor(255, 255, 255);
    docPDF.text(`${type.toUpperCase()} REPORT`, 16, 47);

    // --- TABLE 1: PERIOD TOTALS (EXPENSES ONLY) ---
    autoTable(docPDF, {
      startY: 55,
      head: [['Time Period', `Total Spending (${currencyLabel})`]],
      body: [
        ['Today', `${currencyLabel} ${periodTotals.today.toLocaleString()}`],
        ['Last 7 Days', `${currencyLabel} ${periodTotals.week.toLocaleString()}`],
        ['Current Month', `${currencyLabel} ${periodTotals.month.toLocaleString()}`],
        ['Current Year', `${currencyLabel} ${periodTotals.year.toLocaleString()}`],
      ],
      headStyles: { fillColor: themeColors.primary, textColor: [255, 255, 255] },
      theme: 'striped',
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // --- TABLE 2: OVERALL BALANCE (INCOME vs EXPENSE) ---
    const totalExp = sourceExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalInc = totalIncome;

    autoTable(docPDF, {
      startY: docPDF.lastAutoTable.finalY + 10,
      head: [['Financial Summary', `Amount (${currencyLabel})`]],
      body: [
        ['Total Income Recorded', `${currencyLabel} ${totalInc.toLocaleString()}`],
        ['Total Expenses Recorded', `${currencyLabel} ${totalExp.toLocaleString()}`],
        ['Total Balance/Savings', `${currencyLabel} ${(totalInc - totalExp).toLocaleString()}`],
      ],
      headStyles: { fillColor: themeColors.secondary, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 255, 244] },
    });

    // --- TABLE 3: DETAILED TRANSACTION LOG ---
    docPDF.setFontSize(16);
    docPDF.setTextColor(themeColors.primary[0], themeColors.primary[1], themeColors.primary[2]);
    docPDF.text("Transaction Details", 14, docPDF.lastAutoTable.finalY + 15);

    autoTable(docPDF, {
      startY: docPDF.lastAutoTable.finalY + 20,
      head: [['Date', 'Type', 'Category', 'Amount', 'Receipt']],
      body: combinedData.map(item => [
        formatReportDate(item.date),
        item.type.toUpperCase(),
        item.category,
        `${item.type === 'income' ? '+' : '-'} ${currencyLabel}${Number(item.amount).toLocaleString()}`,
        ''
      ]),
      headStyles: { fillColor: themeColors.accent, textColor: [255, 255, 255] },
      columnStyles: { 
        1: { fontStyle: 'bold' },
        3: { halign: 'right' }, 
        4: { cellWidth: 25, minCellHeight: 18 } 
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didDrawCell: (data) => {
        // Apply color based on transaction type
        if (data.section === 'body' && data.column.index === 1) {
          const typeValue = data.cell.raw;
          if (typeValue === 'INCOME') {
            data.cell.styles.textColor = [28, 200, 138];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [231, 74, 59];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        // Handle Images
        if (data.section === 'body' && data.column.index === 4) {
          const item = combinedData[data.row.index];
          if (item.receiptImage) {
            try {
              docPDF.addImage(item.receiptImage, 'JPEG', data.cell.x + 2, data.cell.y + 2, 21, 14);
            } catch (err) {
              console.error("PDF Image Error", err);
            }
          }
        }
      }
    });

    // Add footer with report type identifier
    const pageCount = docPDF.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      docPDF.setPage(i);
      docPDF.setFontSize(8);
      docPDF.setTextColor(150, 150, 150);
      docPDF.text(`${type.toUpperCase()} REPORT - MySpend App`, 14, docPDF.internal.pageSize.height - 10);
      docPDF.text(`Page ${i} of ${pageCount}`, docPDF.internal.pageSize.width - 30, docPDF.internal.pageSize.height - 10);
    }

    docPDF.save(`${displayName}_${type}_Financial_Report_${dateStr}.pdf`);
  };
  const handleEditClick = (item, type = 'expense') => {
    setEditingId(item.id);
    setAmount(item.amount);
    setCategory(item.category);
    setExpenseDate(item.date);
    setEntryType(type);
    setBase64Image(item.receiptImage || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setBase64Image('');
    setEntryType('expense');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    if (userProfile?.categories?.length > 0) {
      setCategory(userProfile.categories[0].name || userProfile.categories[0]);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setUserProfile(profileData);
          setDisplayName(profileData.username || user.displayName || "User");
          
          if (profileData.categories?.length > 0) {
            setCategory(profileData.categories[0].name || profileData.categories[0]);
          }

          const qExp = query(collection(db, "expenses"), where("userId", "==", user.uid));
          const qInc = query(collection(db, "income"), where("userId", "==", user.uid));

          const unsubscribeExpenses = onSnapshot(qExp, (snapshot) => {
            let items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' }));
            setExpenses(items.sort((a, b) => new Date(b.date) - new Date(a.date)));
            setLoading(false);
          });

          const unsubscribeIncome = onSnapshot(qInc, (snapshot) => {
            let items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'income' }));
            setIncomeList(items.sort((a, b) => new Date(b.date) - new Date(a.date)));
            setLoading(false);
          });

          return () => { unsubscribeExpenses(); unsubscribeIncome(); };
          
        } else {
          setLoading(false);
          navigate('/setup');
        }
      } else {
        setLoading(false);
        navigate('/'); 
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // --- TOUR AUTO-START ---
  useEffect(() => {
    // Start tour after setup if not completed
    if (!loading && userProfile) {
      const tourCompleted = localStorage.getItem('myspend_tour_completed');
      // Detect if user just completed setup (first visit to dashboard)
      const justSetup = userProfile.setupComplete && sessionStorage.getItem('myspend_just_setup') !== 'false';
      if ((!tourCompleted && userProfile.setupComplete) || justSetup) {
        setTimeout(() => {
          setRunTour(true);
          localStorage.removeItem('myspend_tour_completed');
          sessionStorage.setItem('myspend_just_setup', 'false');
        }, 1000);
      }
    }
  }, [loading, userProfile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedData = canvas.toDataURL('image/jpeg', 0.6); 
        setBase64Image(compressedData);
      };
    };
    e.target.value = null;
  };

  const isDark = userProfile?.darkMode || false;
  const theme = {
    bg: isDark ? '#121212' : '#f0f2f5',
    sidebar: isDark ? '#1e1e1e' : '#4e73df',
    card: isDark ? '#1e1e1e' : '#ffffff',
    text: isDark ? '#ffffff' : '#333333',
    subText: isDark ? '#aaaaaa' : '#858796',
    border: isDark ? '#333333' : '#e3e6f0'
  };

 const filteredExpenses = expenses.filter(exp => {
  const dateObj = new Date(exp.date);
  const matchesMonth = selectedMonth === "All" || dateObj.getMonth().toString() === selectedMonth;
  
  // ADD THIS: Ensure it only shows the CURRENT year if a specific month is selected
  const matchesYear = selectedMonth === "All" || dateObj.getFullYear() === currentTime.getFullYear();
  
  const search = searchTerm.toLowerCase();
  const matchesCategory = exp.category.toLowerCase().includes(search);
  const matchesDate = exp.date && exp.date.toLowerCase().includes(search);
  // Support natural language date search (e.g., 'march 14 2026')
  let matchesNaturalDate = false;
  if (search.trim().length > 0) {
    const dateObj = new Date(exp.date);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    matchesNaturalDate = dateStr.includes(search);
  }
  const matchesSearch = matchesCategory || matchesDate || matchesNaturalDate;
  return matchesMonth && matchesYear && matchesSearch;
});

const filteredIncome = incomeList.filter(inc => {
  const dateObj = new Date(inc.date);
  const matchesMonth = selectedMonth === "All" || dateObj.getMonth().toString() === selectedMonth;
  const matchesYear = selectedMonth === "All" || dateObj.getFullYear() === currentTime.getFullYear();
  
  const search = searchTerm.toLowerCase();
  const matchesCategory = inc.category.toLowerCase().includes(search);
  const matchesDate = inc.date && inc.date.toLowerCase().includes(search);
  // Support natural language date search (e.g., 'march 14 2026')
  let matchesNaturalDate = false;
  if (search.trim().length > 0) {
    const dateObj = new Date(inc.date);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
    matchesNaturalDate = dateStr.includes(search);
  }
  const matchesSearch = matchesCategory || matchesDate || matchesNaturalDate;
  return matchesMonth && matchesYear && matchesSearch;
});
  const totalSpent = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  // eslint-disable-next-line no-unused-vars
  const totalEarned = filteredIncome.reduce((sum, inc) => sum + Number(inc.amount), 0);

  const initialBudget = userProfile?.initialBudget || 0;
  const totalIncome = userProfile?.incomeCategories?.reduce((sum, cat) => {
    const catName = cat.name || cat;
    const catTarget = Number(cat.target) || 0;
    const catEarned = filteredIncome.filter(i => i.category === catName).reduce((s, i) => s + Number(i.amount), 0);
    return sum + catTarget + catEarned;
  }, 0) || initialBudget;

  // --- DAILY LIMIT BASED ON MONTHLY INCOME ---
  // Use both planned (target) and actual income for the current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Planned income (target)
  const plannedMonthlyIncome = userProfile?.incomeCategories?.reduce((sum, cat) => sum + (Number(cat.target) || 0), 0) || initialBudget;
  // Actual income added this month
  const actualMonthlyIncome = incomeList.filter(inc => {
    const d = new Date(inc.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, inc) => sum + Number(inc.amount), 0);
  // Use the greater of planned or actual for daily limit
  const effectiveMonthlyIncome = Math.max(plannedMonthlyIncome, actualMonthlyIncome);
  const dailyLimit = effectiveMonthlyIncome > 0 ? effectiveMonthlyIncome / daysInMonth : 0;

  // --- DAILY EXPENSES ---
  const todayStr = now.toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.date && e.date.split('T')[0] === todayStr);
  const todaySpent = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const dailyPercent = dailyLimit > 0 ? (todaySpent / dailyLimit) * 100 : 0;
  const isDailyOver = todaySpent > dailyLimit;
  const isDailyNearing = !isDailyOver && dailyPercent >= 80;
  const totalExpenseBudget = userProfile?.categories?.reduce((sum, cat) => sum + (Number(cat.limit) || 0), 0) || 0;
  
  const netBalance = totalIncome - totalSpent;
  
  const totalEarnedThisMonth = incomeList.filter(inc => {
    const d = new Date(inc.date);
    return d.getMonth() === currentTime.getMonth() && d.getFullYear() === currentTime.getFullYear();
  }).reduce((sum, inc) => sum + Number(inc.amount), 0);

  const monthlyGoal = userProfile?.budgetPeriod === 'Monthly' ? totalIncome : totalIncome / 12;
  // eslint-disable-next-line
  const incomeProgress = monthlyGoal > 0 ? (totalEarnedThisMonth / monthlyGoal) * 100 : 0;
  
  const isOverBudget = totalSpent >= totalExpenseBudget;
  const isNearingLimit = (totalExpenseBudget > 0 ? (totalSpent / totalExpenseBudget) * 100 : 0) >= 80 && !isOverBudget;

  const startOfToday = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
  const startOfWeek = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
  const startOfYear = new Date(currentTime.getFullYear(), 0, 1);

 const getSum = (startDate) => {
  return expenses
    .filter(exp => {
      const d = new Date(exp.date);
      // Ensure we compare the actual time values
      return d.getTime() >= startDate.getTime();
    })
    .reduce((sum, exp) => sum + Number(exp.amount), 0);
};

  const periodTotals = {
    today: getSum(startOfToday),
    week: getSum(startOfWeek),
    month: getSum(startOfMonth),
    year: getSum(startOfYear)
  };

  const handleDelete = async (id, type = 'expense') => {
    if (window.confirm(`Delete this ${type}?`)) {
      const collectionName = type === 'income' ? 'income' : 'expenses';
      await deleteDoc(doc(db, collectionName, id));
      if(editingId === id) resetForm();
    }
  };

// --- EXPENSE CHART DATA ---
const chartLabels = [...new Set(filteredExpenses.map(e => e.category))];
const chartDataValues = chartLabels.map(cat => 
  filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
);

// --- INCOME CHART DATA (New) ---
const incomeChartLabels = [...new Set(filteredIncome.map(i => i.category))];
const incomeChartValues = incomeChartLabels.map(cat => 
  filteredIncome.filter(i => i.category === cat).reduce((s, i) => s + Number(i.amount), 0)
);

// Reusable Chart Options
const getOptions = (title) => ({
  maintainAspectRatio: false,
  cutout: '60%',
  animation: {
    animateScale: true,
    animateRotate: true,
    duration: 1000,
    easing: 'easeOutQuart'
  },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { 
        font: { size: 12, weight: '600' }, 
        color: theme.text, 
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    datalabels: {
      display: true,
      color: 'white',
      font: { size: 14, weight: 'bold' },
      formatter: (value, context) => {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = ((value / total) * 100).toFixed(1);
        return percentage + '%';
      },
      anchor: 'center',
      align: 'center'
    }
  },
  hover: {
    mode: 'nearest',
    intersect: true
  },
  elements: {
    arc: {
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      hoverBorderWidth: 3,
      hoverBorderColor: 'white'
    }
  }
});
  

  const combinedHistory = [...filteredExpenses, ...filteredIncome].sort((a,b) => new Date(b.date) - new Date(a.date));

  // --- CATEGORY WARNING COMPUTATIONS ---
  const expenseCategoryWarnings = (userProfile?.categories || []).map(cat => {
    const catName = cat.name || cat;
    const catLimit = Number(cat.limit) || 0;
    const catSpent = filteredExpenses
      .filter(e => e.category === catName)
      .reduce((s, e) => s + Number(e.amount), 0);
    const percent = catLimit > 0 ? (catSpent / catLimit) * 100 : 0;
    return { name: catName, limit: catLimit, spent: catSpent, percent };
  });

  const nearingExpenseCats = expenseCategoryWarnings.filter(c => c.limit > 0 && c.percent >= 80 && c.percent < 100);
  const overExpenseCats = expenseCategoryWarnings.filter(c => c.limit > 0 && c.percent >= 100);



  if (loading) return (
    <div style={{...styles.loading, backgroundColor: '#f8f9fc', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <h2 style={{color: '#4e73df'}}>Syncing your MYSPEND data...</h2>
      <p style={{color: '#858796'}}>Hang tight, we're fetching your latest records.</p>
    </div>
  );

  return (
    <div style={{ ...styles.appLayout, backgroundColor: theme.bg }}>
      {/* Export Filter Modal */}
      {showExportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowExportModal(false)}>
          <div style={{ background: 'white', borderRadius: 28, padding: 48, minWidth: 520, maxWidth: 700, boxShadow: '0 12px 48px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 28, color: '#36b9cc', fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-1px' }}>Export Filtered Report</h2>
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontWeight: 700, fontSize: '1.1rem' }}>Categories:</label>
              <select
                multiple
                value={exportFilters.categories}
                onChange={e => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setExportFilters(f => ({ ...f, categories: options }));
                }}
                style={{ width: '100%', minHeight: 80, borderRadius: 12, border: '2px solid #36b9cc', marginTop: 8, fontSize: '1.1rem', padding: 8 }}
              >
                {/* Show only relevant categories based on selection */}
                {exportFilters.includeExpenses && !exportFilters.includeIncome && (userProfile?.categories || []).map((cat, i) => (
                  <option key={i} value={cat.name || cat}>{cat.name || cat}</option>
                ))}
                {exportFilters.includeIncome && !exportFilters.includeExpenses && (userProfile?.incomeCategories || []).map((cat, i) => (
                  <option key={i + 1000} value={cat.name || cat}>{cat.name || cat}</option>
                ))}
                {exportFilters.includeIncome && exportFilters.includeExpenses && (
                  <>
                    {(userProfile?.categories || []).map((cat, i) => (
                      <option key={i} value={cat.name || cat}>{cat.name || cat}</option>
                    ))}
                    {(userProfile?.incomeCategories || []).map((cat, i) => (
                      <option key={i + 1000} value={cat.name || cat}>{cat.name || cat}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div style={{ marginBottom: 28, display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: '1.1rem' }}>From:</label>
                <input type="date" value={exportFilters.dateFrom} onChange={e => setExportFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ width: '100%', borderRadius: 12, border: '2px solid #36b9cc', marginTop: 8, fontSize: '1.1rem', padding: 8 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: '1.1rem' }}>To:</label>
                <input type="date" value={exportFilters.dateTo} onChange={e => setExportFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ width: '100%', borderRadius: 12, border: '2px solid #36b9cc', marginTop: 8, fontSize: '1.1rem', padding: 8 }} />
              </div>
            </div>
            <div style={{ marginBottom: 28, display: 'flex', gap: 32, justifyContent: 'center' }}>
              <label style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={exportFilters.includeExpenses} onChange={e => setExportFilters(f => ({ ...f, includeExpenses: e.target.checked }))} /> Expenses
              </label>
              <label style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={exportFilters.includeIncome} onChange={e => setExportFilters(f => ({ ...f, includeIncome: e.target.checked }))} /> Income
              </label>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
              <button
                style={{ flex: 1, background: '#36b9cc', color: 'white', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', letterSpacing: '1px' }}
                onClick={() => {
                  setShowExportModal(false);
                  handleExportPDF('filtered', exportFilters);
                }}
              >Export</button>
              <button
                style={{ flex: 1, background: '#eee', color: '#333', border: 'none', borderRadius: 12, padding: '18px 0', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', letterSpacing: '1px' }}
                onClick={() => setShowExportModal(false)}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setRunTour(false);
            // Save completion status to localStorage
            localStorage.setItem('myspend_tour_completed', 'true');
          }
        }}
        styles={{
          options: {
            primaryColor: theme.sidebar,
            textColor: theme.text,
            backgroundColor: theme.card,
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltip: {
            backgroundColor: theme.card,
            color: theme.text,
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          },
          buttonNext: {
            backgroundColor: theme.sidebar,
            color: '#fff',
          },
          buttonBack: {
            color: theme.sidebar,
          },
          buttonSkip: {
            color: theme.subText,
          },
        }}
      />
      
      <nav style={{ ...styles.sidebar, backgroundColor: theme.sidebar }} className="sidebar-nav">
        <div style={styles.logoSection}>
          <h2 style={styles.logoText}>MySpend</h2>
        </div>
        <div style={styles.navLinks}>
          <button style={{...styles.navItem, backgroundColor: 'rgba(255,255,255,0.1)'}}> DASHBOARD</button>
          <button style={styles.navItem} onClick={() => {
            localStorage.removeItem('myspend_tour_completed');
            setRunTour(true);
          }}>🚀 Start Tour</button>
          <div className="export-buttons" style={{marginTop: '10px'}}>
             <small style={{color: 'rgba(255,255,255,0.6)', paddingLeft: '15px', fontWeight: 'bold'}}>EXPORTS</small>
             <button style={styles.navItem} onClick={() => handleExportPDF('general')}> General Report</button>
             <button style={{...styles.navItem, color: '#36b9cc'}} onClick={() => setShowExportModal(true)}>Filtered Report</button>
          </div>
          <button style={styles.navItem} onClick={() => navigate('/settings')}>Settings</button>
        </div>
        <button onClick={() => signOut(auth)} style={styles.sidebarLogout}>Sign Out</button>
      </nav>

    <main style={styles.mainContent}>
  {/* --- ENHANCED TOP HEADER --- */}
  <div style={{ ...styles.topHeader, alignItems: 'flex-start', marginBottom: '50px' }}>
    <div style={{ flex: 1 }}>
      <h1 className="welcome-header" style={{ ...styles.pageTitle, color: theme.text, fontSize: '3.5rem', marginBottom: '15px', letterSpacing: '-2px' }}>
        Welcome, {displayName}!
      </h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

        {/* --- HIGH VISIBILITY DATE BOX & DAILY LIMIT HEALTH BAR --- */}
        <div className="date-display" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '15px', 
          backgroundColor: theme.card, 
          padding: '12px 25px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          borderLeft: `6px solid ${theme.sidebar}` 
        }}>
          <span style={{ fontSize: '2.5rem' }}>📅</span>
          <div>
            <div style={{ color: theme.text, fontSize: '1.6rem', fontWeight: '800', lineHeight: '1.2' }}>
              {currentTime.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ color: theme.subText, fontSize: '1.1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long' })} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isDailyOver ? '#e74a3b' : isDailyNearing ? '#f6c23e' : '#1cc88a' }}>
                Daily Limit: {currency}{dailyLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div style={{ width: 220, height: 12, background: '#eaecf4', borderRadius: 8, marginTop: 6, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(dailyPercent, 100)}%`,
                  height: '100%',
                  background: isDailyOver ? '#e74a3b' : isDailyNearing ? '#f6c23e' : '#1cc88a',
                  borderRadius: 8,
                  transition: 'width 0.5s',
                  position: 'absolute',
                  left: 0, top: 0
                }} />
                <div style={{
                  position: 'absolute',
                  left: 0, top: 0, width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '0.95rem', color: isDailyOver ? '#fff' : '#333',
                  zIndex: 2
                }}>
                  {currency}{todaySpent.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {currency}{dailyLimit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              {isDailyOver && (
                <div style={{ color: '#e74a3b', fontWeight: 'bold', fontSize: '0.98rem', marginTop: 4 }}>
                  🚨 Over daily limit!
                </div>
              )}
              {isDailyNearing && !isDailyOver && (
                <div style={{ color: '#f6c23e', fontWeight: 'bold', fontSize: '0.98rem', marginTop: 4 }}>
                  ⚠️ Nearing daily limit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- MONTH EXPENSE PROGRESS TRACKER --- */}
        <div style={{ maxWidth: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <small style={{ color: theme.subText, fontWeight: 'bold', fontSize: '0.8rem' }}>MONTH EXPENSE PROGRESS</small>
            <small style={{ color: theme.text, fontWeight: 'bold', fontSize: '0.8rem' }}>
              {(() => {
                // Calculate percent of monthly budget spent
                const startOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
                const monthSpent = expenses.filter(e => {
                  const d = new Date(e.date);
                  return d >= startOfMonth && d.getMonth() === currentTime.getMonth() && d.getFullYear() === currentTime.getFullYear();
                }).reduce((sum, e) => sum + Number(e.amount), 0);
                return totalExpenseBudget > 0 ? `${Math.round(Math.min((monthSpent / totalExpenseBudget) * 100, 100))}%` : '0%';
              })()}
            </small>
          </div>
          <div style={{ ...styles.progressBg, marginTop: 0, height: '6px' }}>
            <div style={{ 
              ...styles.progressFill, 
              backgroundColor: theme.sidebar, 
              width: (() => {
                const startOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
                const monthSpent = expenses.filter(e => {
                  const d = new Date(e.date);
                  return d >= startOfMonth && d.getMonth() === currentTime.getMonth() && d.getFullYear() === currentTime.getFullYear();
                }).reduce((sum, e) => sum + Number(e.amount), 0);
                return `${Math.min(totalExpenseBudget > 0 ? (monthSpent / totalExpenseBudget) * 100 : 0, 100)}%`;
              })() 
            }} />
          </div>
        </div>
      </div>
    </div>
    
    {/* --- PROFILE SECTION --- */}
    <div style={styles.headerProfile}>
      <div style={{ textAlign: 'right' }}>
        <small style={{ display: 'block', color: theme.subText, fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase' }}>
          {userProfile?.incomeSource || 'Income Source'}
        </small>
        <strong style={{ color: theme.text, fontSize: '1.8rem', fontWeight: '800' }}>{displayName}</strong>
      </div>

      {userProfile?.photoURL ? (
        <img 
          src={userProfile.photoURL} 
          alt="Profile" 
          style={{ ...styles.headerAvatar, width: '90px', height: '90px', border: `4px solid ${theme.sidebar}` }} 
        />
      ) : (
        <div style={{ 
          ...styles.headerAvatarPlaceholder, 
          width: '90px', 
          height: '90px', 
          fontSize: '2.5rem',
          background: 'linear-gradient(135deg, #4e73df 0%, #224abe 100%)',
          boxShadow: '0 10px 20px rgba(78, 115, 223, 0.3)',
          border: '3px solid white'
        }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  

  {/* Rest of your Dashboard (Alerts, Snapshot Grid, etc.) stays the same */}

        </div>

        {selectedImage && (
          <div style={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <img src={selectedImage} alt="Receipt Full" style={styles.fullImage} />
              <button style={styles.closeModalBtn} onClick={() => setSelectedImage(null)}>Close View</button>
            </div>
          </div>
        )}

        {(isOverBudget || isNearingLimit) && (
          <div style={{ ...styles.alertBanner, backgroundColor: isOverBudget ? '#e74a3b' : '#f6c23e' }}>
             {isOverBudget ? `🚨 Over budget by ${currency}${(totalSpent - totalExpenseBudget).toLocaleString()}` : `⚠️ Used ${((totalExpenseBudget > 0 ? (totalSpent / totalExpenseBudget) * 100 : 0)).toFixed(0)}% of budget`}
          </div>
        )}

        {/* --- UPDATED SNAPSHOT GRID --- */}
        <div className="balance-summary" style={styles.snapshotGrid}>
          <div style={{ ...styles.card, backgroundColor: theme.card, borderLeft: '5px solid #4e73df' }}>
            <small style={styles.cardLabel}>💰 BUDGET ALLOCATION</small>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <h2 style={{color: '#4e73df', fontSize: '2.2rem', margin: 0}}>{currency}{totalExpenseBudget.toLocaleString()}</h2>
            </div>
            <div style={{ ...styles.progressBg, position: 'relative', marginTop: 10 }}>
              <div style={{ ...styles.progressFill, width: `${Math.min(totalExpenseBudget > 0 ? (totalSpent / totalExpenseBudget) * 100 : 0, 100)}%`, backgroundColor: '#4e73df' }} />
            </div>
            <div style={{ width: '100%', marginTop: 4, display: 'flex', justifyContent: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#333' }}>
                {totalExpenseBudget > 0 ? `${Math.min((totalSpent / totalExpenseBudget) * 100, 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <small style={{color: theme.subText, marginTop: '5px', display: 'block'}}></small>
          </div>

          <div style={{ ...styles.card, backgroundColor: theme.card }}>
            <small style={styles.cardLabel}>💵 TOTAL INCOME</small>
            <h2 style={{color: '#1cc88a', fontSize: '2.2rem'}}>{currency}{totalIncome.toLocaleString()}</h2>
          </div>

          <div style={{ ...styles.card, backgroundColor: theme.card }}>
            <small style={styles.cardLabel}>💸 TOTAL EXPENSES</small>
            <h2 style={{color: isOverBudget ? '#e74a3b' : '#f6c23e', fontSize: '2.2rem'}}>{currency}{totalSpent.toLocaleString()}</h2>
          </div>

          <div style={{ ...styles.card, backgroundColor: theme.card }}>
            <small style={styles.cardLabel}>💾 TOTAL BALANCE/SAVINGS</small>
            <h2 style={{color: netBalance >= 0 ? '#1cc88a' : '#e74a3b', fontSize: '2.2rem'}}>{currency}{netBalance.toLocaleString()}</h2>
          </div>
        </div>

        <div style={styles.mainGrid}>
          <div style={styles.col}>
            <div style={{ ...styles.card, backgroundColor: theme.card }}>
 {/* --- EXPENSE HEALTH --- */}
 {overExpenseCats.length > 0 && (
   <div style={{ ...styles.alertBanner, backgroundColor: '#e74a3b', marginBottom: '15px' }}>
     🚨 Over limit: {overExpenseCats.map(c => c.name).join(', ')}
   </div>
 )}
 {nearingExpenseCats.length > 0 && (
   <div style={{ ...styles.alertBanner, backgroundColor: '#f6c23e', color: '#222', marginBottom: '15px' }}>
     ⚠️ Nearing limit: {nearingExpenseCats.map(c => c.name).join(', ')}
   </div>
 )}
 <h3 style={{ color: theme.text, fontSize: '1.4rem', marginBottom: '20px' }}>📉 Expense Limits</h3>
 {userProfile?.categories?.map((cat, i) => {
   const catName = cat.name || cat;
   const catLimit = Number(cat.limit) || 0;
   
   // FIX: Changed 'expenses' to 'filteredExpenses' to respect the Month/Search
   const catSpent = filteredExpenses
     .filter(e => e.category === catName)
     .reduce((s, e) => s + Number(e.amount), 0);
     
   const catPercent = catLimit > 0 ? (catSpent / catLimit) * 100 : 0;

   let statusColor = '#4e73df';
   if (catPercent >= 100) statusColor = '#e74a3b';
   else if (catPercent >= 80) statusColor = '#f6c23e';

   return (
     <div key={`exp-${i}`} style={{ marginBottom: '20px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
         <span style={{ fontWeight: 'bold', color: theme.text }}>
           {catName}
           {catPercent >= 100 ? (
             <span style={{ ...styles.badge, backgroundColor: '#e74a3b', marginLeft: '8px' }}>OVER</span>
           ) : catPercent >= 80 ? (
             <span style={{ ...styles.badge, backgroundColor: '#f6c23e', color: '#222', marginLeft: '8px' }}>NEARING</span>
           ) : null}
         </span>
         <span style={{ color: theme.subText }}>{currency}{catSpent.toLocaleString()} / {currency}{catLimit.toLocaleString()}</span>
       </div>
       <div style={styles.progressBg}>
         <div style={{ ...styles.progressFill, width: `${Math.min(catPercent, 100)}%`, backgroundColor: statusColor }} />
       </div>
     </div>
   );
 })}

 <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}`, margin: '25px 0' }} />

 <h3 style={{ color: theme.text, fontSize: '1.4rem', marginBottom: '20px' }}>💰 Income Sources</h3>
 {userProfile?.incomeCategories?.map((cat, i) => {
   const catName = cat.name || cat;
   const catTarget = Number(cat.target) || 0; 
   const catEarned = filteredIncome
     .filter(i => i.category === catName)
     .reduce((s, i) => s + Number(i.amount), 0);
   
   return (
     <div key={`inc-${i}`} style={{ marginBottom: '15px', padding: '10px', backgroundColor: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
         <span style={{ fontWeight: 'bold', color: theme.text }}>
           {catName}
         </span>
         <span style={{ color: theme.subText }}>{currency}{(catTarget + catEarned).toLocaleString()}</span>
       </div>
     </div>
   );
 })}
</div>

           <div className="charts-section" style={{ ...styles.card, backgroundColor: theme.card }}>
  <h3 style={{ color: theme.text, fontSize: '1.5rem', marginBottom: '25px' }}>📊 Financial Analysis</h3>
  
  <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
    {/* Expense Section */}
    <div>
      <h4 style={{ color: theme.subText, fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>EXPENSE DISTRIBUTION</h4>
      <div style={{ height: '220px' }}>
        <Doughnut 
          data={{
            labels: chartLabels,
            datasets: [{
              data: chartDataValues,
              backgroundColor: ['#4e73df', '#f6c23e', '#e74a3b', '#36b9cc', '#6610f2', '#20c997', '#fd7e14', '#6f42c1', '#28a745'],
              borderWidth: 0,
            }]
          }} 
          options={getOptions()} 
        />
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: `1px solid ${theme.border}` }} />

    {/* Income Section */}
    <div>
      <h4 style={{ color: theme.subText, fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>INCOME DISTRIBUTION</h4>
      <div style={{ height: '220px' }}>
        <Doughnut 
          data={{
            labels: incomeChartLabels,
            datasets: [{
              data: incomeChartValues,
              backgroundColor: ['#1cc88a', '#36b9cc', '#4e73df', '#fd7e14', '#20c997', '#6610f2', '#e74a3b', '#f6c23e', '#6f42c1'],
              borderWidth: 0,
            }]
          }} 
          options={getOptions()} 
        />
      </div>
    </div>
  </div>
</div>
          </div>

          <div style={styles.col}>
            <div style={{ ...styles.card, backgroundColor: theme.card, border: editingId ? '2px solid #4e73df' : 'none' }}>
  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
    <button 
      onClick={() => {
        setEntryType('expense');
        // FIX: Force category to the first expense option when switching
        const firstExp = userProfile?.categories?.[0];
        setCategory(firstExp?.name || firstExp || "");
      }} 
      style={{ ...styles.toggleBtn, backgroundColor: entryType === 'expense' ? '#e74a3b' : '#eee', color: entryType === 'expense' ? 'white' : '#333' }}
    >
      Expense
    </button>
    <button 
      onClick={() => {
        setEntryType('income');
        // FIX: Force category to the first income option when switching
        const firstInc = userProfile?.incomeCategories?.[0] || { name: 'General Income' };
        setCategory(firstInc.name || firstInc);
      }} 
      style={{ ...styles.toggleBtn, backgroundColor: entryType === 'income' ? '#1cc88a' : '#eee', color: entryType === 'income' ? 'white' : '#333' }}
    >
      Income
    </button>
  </div>

  <h3 style={{ marginTop: 0, color: theme.text, fontSize: '1.5rem' }}>
    {editingId ? "📝 Edit Record" : `ADD ${entryType.toUpperCase()}`}
  </h3>

  <form className="add-expense-form" onSubmit={async (e) => {
    e.preventDefault();
    const colName = entryType === 'income' ? 'income' : 'expenses';
    const payload = { userId: auth.currentUser.uid, amount: Number(amount), category, date: expenseDate, receiptImage: base64Image };
    if (editingId) { await updateDoc(doc(db, colName, editingId), payload); setEditingId(null); }
    else { await addDoc(collection(db, colName), payload); }
    resetForm();
  }}>
    <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.input} required />
    <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
      {(entryType === 'income' ? (userProfile?.incomeCategories || [{ name: 'General Income' }]) : userProfile?.categories)?.map((c, i) => (
        <option key={i} value={c.name || c}>{c.name || c}</option>
      ))}
    </select>
    <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} style={styles.input} />
    <label style={styles.fileLabel}>
      {base64Image ? "✅ Image Selected" : "📷 Receipt Photo"}
      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
    </label>
    <button type="submit" style={{ ...styles.saveBtn, backgroundColor: entryType === 'expense' ? '#e74a3b' : '#1cc88a' }}>
      {editingId ? "Update Record" : `Log ${entryType}`}
    </button>
    {editingId && <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel Edit</button>}
  </form>
</div>

            <div className="transactions-list" style={{ ...styles.card, backgroundColor: theme.card }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <h3 style={{ margin: 0, color: theme.text, fontSize: '1.5rem' }}>History</h3>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={() => handleExportPDF('filtered')} style={{ backgroundColor: '#36b9cc', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Filtered View</button>
      <select 
  value={selectedMonth} 
  onChange={(e) => setSelectedMonth(e.target.value)} 
  style={styles.monthSelect}
>
  <option value="All">All Time</option>
  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
    <option key={i} value={i.toString()}>{m}</option>
  ))}
</select>
    </div>
  </div>


  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
    <input 
      type="text" 
      placeholder=" Search by category..." 
      value={searchTerm} 
      onChange={(e) => setSearchTerm(e.target.value)} 
      style={{ ...styles.input, marginBottom: 0 }} 
    />
    <input
      type="date"
      value={searchDate}
      onChange={e => setSearchDate(e.target.value)}
      style={{ ...styles.input, width: 180, minWidth: 120, marginBottom: 0 }}
      placeholder="Search by date"
    />
  </div>

  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
    {/* This filter ensures only your specific search term results pop up */}
    {combinedHistory
      .filter(item => {
        const matchesCategory = item.category.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchDate) return matchesCategory;
        // Compare only date part (YYYY-MM-DD)
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return matchesCategory && itemDate === searchDate;
      })
      .map(item => (
        <div key={item.id} style={{ ...styles.historyItem, borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {item.receiptImage ? (
              <img src={item.receiptImage} alt="Receipt" style={styles.historyThumb} onClick={() => setSelectedImage(item.receiptImage)} />
            ) : (
              <div style={styles.noImgPlaceholder}>
                {item.type === 'income' ? '💰' : '💸'}
              </div>
            )}
            <div>
              <strong style={{ color: theme.text, fontSize: '1.2rem' }}>{item.category}</strong><br />
              <small style={{ color: theme.subText, fontSize: '0.9rem' }}>{formatReportDate(item.date)}</small>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: item.type === 'income' ? '#1cc88a' : '#e74a3b', fontWeight: 'bold', fontSize: '1.3rem' }}>
              {item.type === 'income' ? '+' : '-'}{currency}{Number(item.amount).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '5px' }}>
              <button onClick={() => handleEditClick(item, item.type)} style={{ ...styles.actionBtn, color: '#4e73df' }}>Edit</button>
              <button onClick={() => handleDelete(item.id, item.type)} style={{ ...styles.actionBtn, color: '#e74a3b' }}>Delete</button>
            </div>
          </div>
        </div>
      ))}

    {/* Optional: Show "No Results" only if the search is active and finds nothing */}
    {(searchTerm || searchDate) &&
      combinedHistory.filter(item => {
        const matchesCategory = item.category.toLowerCase().includes(searchTerm.toLowerCase());
        if (!searchDate) return matchesCategory;
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return matchesCategory && itemDate === searchDate;
      }).length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: theme.subText }}>
          No transactions found for
          {searchTerm && ` "${searchTerm}"`}
          {searchDate && ` on ${searchDate}`}
        </div>
      )}
  </div>
</div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  sidebar: { width: '280px', position: 'fixed', top: 0, left: 0, bottom: 0, padding: '40px 25px', color: 'white', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', borderRight: '1px solid rgba(255,255,255,0.1)' },
  logoSection: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '50px' },
  logoText: { fontSize: '28px', margin: 0, fontWeight: '800', letterSpacing: '-1px', background: 'linear-gradient(45deg, #fff, #f0f0f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' },
  navItem: { padding: '15px', border: 'none', borderRadius: '15px', textAlign: 'left', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', width: '100%', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  sidebarLogout: { backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', borderRadius: '15px', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  mainContent: { flex: 1, marginLeft: '280px', padding: '50px', backgroundColor: '#f8f9fc' },
  topHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  pageTitle: { margin: 0, fontSize: '3.5rem', fontWeight: '800', background: 'linear-gradient(45deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  headerProfile: { display: 'flex', alignItems: 'center', gap: '20px' },
  headerAvatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #667eea', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' },
  headerAvatarPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' },
  snapshotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '40px' },
  card: { padding: '30px', borderRadius: '25px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', background: 'white', transition: 'transform 0.3s ease, box-shadow 0.3s ease', border: '1px solid rgba(255,255,255,0.8)' },
  cardHover: { transform: 'translateY(-5px)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' },
  cardLabel: { fontSize: '14px', fontWeight: '900', color: '#858796', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' },
  progressBg: { width: '100%', height: '12px', backgroundColor: '#eaecf4', borderRadius: '15px', marginTop: '15px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '15px', transition: 'width 0.5s ease', background: 'linear-gradient(90deg, #667eea, #764ba2)' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '40px' },
  col: { display: 'flex', flexDirection: 'column', gap: '40px' },
  input: { width: '100%', padding: '18px', marginBottom: '20px', borderRadius: '15px', border: '2px solid #e3e6f0', fontSize: '1.1rem', transition: 'border-color 0.3s ease', background: '#fafafa' },
  fileLabel: { display: 'block', padding: '18px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '2px dashed #e3e6f0', borderRadius: '15px', textAlign: 'center', cursor: 'pointer', marginBottom: '20px', fontSize: '1rem', fontWeight: '600', color: 'white', transition: 'opacity 0.3s ease' },
  saveBtn: { width: '100%', padding: '20px', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight:'bold', fontSize: '1.2rem', transition: 'all 0.3s ease', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
  cancelBtn: { width: '100%', padding: '15px', background: 'none', border: '2px solid #858796', borderRadius: '15px', cursor: 'pointer', fontSize: '1rem', color: '#858796', transition: 'all 0.3s ease' },
  historyItem: { display:'flex', justifyContent:'space-between', padding:'25px 0', borderBottom: '1px solid #e3e6f0', transition: 'background 0.3s ease' },
  historyThumb: { width: '60px', height: '60px', borderRadius: '12px', cursor: 'pointer', objectFit: 'cover', transition: 'transform 0.3s ease' },
  noImgPlaceholder: { width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
  actionBtn: { border: 'none', background: 'none', fontSize: '1rem', cursor: 'pointer', padding: '5px 10px', borderRadius: '8px', transition: 'background 0.3s ease', fontWeight: '600' },
  monthSelect: { border: '2px solid #e3e6f0', color: '#667eea', fontWeight: '900', background: 'white', cursor: 'pointer', fontSize: '1.1rem', padding: '8px 12px', borderRadius: '10px', transition: 'border-color 0.3s ease' },
  loading: { textAlign: 'center', padding: '100px', fontSize: '1.5rem', background: 'white', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  alertBanner: { padding: '20px', borderRadius: '15px', color: 'white', marginBottom: '25px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' },
  modalContent: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  fullImage: { maxWidth: '90%', maxHeight: '80vh', borderRadius: '15px' },
  closeModalBtn: { marginTop: '20px', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', background: '#667eea', color: 'white', transition: 'background 0.3s ease' },
  badge: { fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', color: 'white', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' },
  toggleBtn: { flex: 1, padding: '12px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }
};

export default Dashboard;