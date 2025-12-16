import React, { useState, useCallback } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, Wallet, Tag, List, Trash2, Edit2, X, Check, ArrowUp, ArrowDown, Users, LogIn, UserPlus, Share2, Link, Copy } from 'lucide-react';

const BudgetApp = () => {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'join'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', familyName: '' });
  const [authError, setAuthError] = useState('');

  // Family/household members (dynamic users)
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyName, setFamilyName] = useState('');
  
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({
    expense: ['סופר', 'אוכל בחוץ והזמנות', 'לימודים', 'רכב', 'חיסכון', 'שונות'],
    income: ['הכנסה קבועה', 'הכנסה משתנה']
  });

  // מקורות/יעדים כספיים - יווצרו דינמית לכל משתמש
  const [accounts, setAccounts] = useState([]);

  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    user: '',
    account: '',
    note: '',
    isRecurring: false,
    frequency: 'monthly'
  });

  const [isEditingTransaction, setIsEditingTransaction] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [filterOptions, setFilterOptions] = useState({
    startDate: '',
    endDate: '',
    period: 'monthly',
    user: 'all'
  });

  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');

  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccountBalance, setNewAccountBalance] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'ascending' });

  // State for adding new account
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    user: '',
    balance: 0,
    parentAccount: null,
    billingDay: null
  });

  // State for inline adding in transactions table
  const [isAddingInline, setIsAddingInline] = useState(null);
  const [inlineTransaction, setInlineTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    user: '',
    account: '',
    note: '',
    isRecurring: false,
    frequency: 'monthly'
  });

  // State for member management
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editingMemberName, setEditingMemberName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareType, setShareType] = useState('invite'); // 'invite' or 'app'
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Generate invite link
  const generateInviteLink = (type = 'invite') => {
    setShareType(type);
    if (type === 'invite') {
      // Link to join this family account
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const link = `${window.location.origin}?invite=${inviteCode}&family=${encodeURIComponent(familyName)}`;
      setInviteLink(link);
    } else {
      // Link to the app itself
      setInviteLink(window.location.origin);
    }
    setShowShareDialog(true);
    setShowShareMenu(false);
    setLinkCopied(false);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Helper functions
  const userColors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
  const getUserColor = (userName) => {
    const index = familyMembers.findIndex(m => m.name === userName);
    return userColors[index % userColors.length] || 'bg-gray-500';
  };

  // Create default accounts for a new member
  const createDefaultAccountsForMember = (memberName) => {
    const maxId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) : 0;
    const defaultAccounts = [
      { id: maxId + 1, name: 'חשבון בנק', user: memberName, balance: 0, parentAccount: null, billingDay: null, order: 0 },
      { id: maxId + 2, name: 'מזומן', user: memberName, balance: 0, parentAccount: null, billingDay: null, order: 1 },
      { id: maxId + 3, name: 'Bit', user: memberName, balance: 0, parentAccount: null, billingDay: null, order: 2 },
    ];
    return defaultAccounts;
  };

  // Authentication functions
  const handleRegister = () => {
    if (!authForm.name.trim() || !authForm.familyName.trim()) {
      setAuthError('נא למלא שם ושם משפחה/חשבון');
      return;
    }
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('נא למלא אימייל וסיסמה');
      return;
    }
    if (authForm.password.length < 6) {
      setAuthError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    // Create first member and family
    const firstMember = {
      id: 1,
      name: authForm.name.trim(),
      email: authForm.email.trim(),
      role: 'admin', // מנהל - יכול להזמין אחרים
      createdAt: new Date().toISOString()
    };

    setFamilyMembers([firstMember]);
    setFamilyName(authForm.familyName.trim());
    setCurrentUser(firstMember);
    
    // Create default accounts for first member
    const defaultAccounts = createDefaultAccountsForMember(firstMember.name);
    setAccounts(defaultAccounts);
    
    // Set default user in forms
    setNewTransaction(prev => ({ ...prev, user: firstMember.name }));
    setNewAccount(prev => ({ ...prev, user: firstMember.name }));
    setInlineTransaction(prev => ({ ...prev, user: firstMember.name }));
    
    setIsLoggedIn(true);
    setAuthError('');
    setAuthForm({ email: '', password: '', name: '', familyName: '' });
  };

  const handleLogin = () => {
    // For demo purposes - in real app this would check against database
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('נא למלא אימייל וסיסמה');
      return;
    }
    
    // Simulate login - in real app would verify credentials
    setAuthError('משתמש לא נמצא. אם אין לך חשבון, לחץ על "הרשמה"');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFamilyMembers([]);
    setFamilyName('');
    setAccounts([]);
    setTransactions([]);
    setAuthMode('login');
  };

  // Member management functions
  const addFamilyMember = () => {
    if (!newMemberName.trim()) {
      alert('נא להזין שם');
      return;
    }
    
    if (familyMembers.some(m => m.name === newMemberName.trim())) {
      alert('כבר קיים משתמש בשם זה');
      return;
    }

    const newMember = {
      id: Math.max(...familyMembers.map(m => m.id), 0) + 1,
      name: newMemberName.trim(),
      email: '',
      role: 'member', // חבר רגיל
      createdAt: new Date().toISOString()
    };

    setFamilyMembers([...familyMembers, newMember]);
    
    // Create default accounts for new member
    const newAccounts = createDefaultAccountsForMember(newMember.name);
    setAccounts([...accounts, ...newAccounts]);
    
    setNewMemberName('');
    setIsAddingMember(false);
  };

  const updateMemberName = (memberId, newName) => {
    if (!newName.trim()) return;
    
    const oldMember = familyMembers.find(m => m.id === memberId);
    if (!oldMember) return;
    
    const oldName = oldMember.name;
    
    // Update member name
    setFamilyMembers(familyMembers.map(m => 
      m.id === memberId ? { ...m, name: newName.trim() } : m
    ));
    
    // Update all accounts with this user
    setAccounts(accounts.map(a => 
      a.user === oldName ? { ...a, user: newName.trim() } : a
    ));
    
    // Update all transactions with this user
    setTransactions(transactions.map(t => 
      t.user === oldName ? { ...t, user: newName.trim() } : t
    ));
    
    setEditingMember(null);
    setEditingMemberName('');
  };

  const deleteFamilyMember = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;
    
    if (familyMembers.length <= 1) {
      alert('לא ניתן למחוק את המשתמש האחרון');
      return;
    }
    
    // Check if member has transactions
    const hasTransactions = transactions.some(t => t.user === member.name);
    if (hasTransactions) {
      alert('לא ניתן למחוק משתמש שיש לו תנועות. יש למחוק קודם את התנועות.');
      return;
    }
    
    if (confirm(`האם אתה בטוח שברצונך למחוק את "${member.name}"?`)) {
      // Delete member's accounts
      setAccounts(accounts.filter(a => a.user !== member.name));
      // Delete member
      setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
    }
  };

  const sortTransactions = useCallback((items, config) => {
    if (!config.key) return items;
    
    const sortedItems = [...items].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];

      if (config.key === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (config.key === 'account') {
        const aName = accounts.find(acc => acc.id === parseInt(aValue))?.name;
        const bName = accounts.find(acc => acc.id === parseInt(bValue))?.name;
        return config.direction === 'ascending' 
          ? (aName || '').localeCompare(bName || '')
          : (bName || '').localeCompare(aName || '');
      } else if (config.key === 'user' || config.key === 'category') {
        return config.direction === 'ascending'
          ? (aValue || '').localeCompare(bValue || '')
          : (bValue || '').localeCompare(aValue || '');
      }

      if (aValue < bValue) return config.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return sortedItems;
  }, [accounts]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const updateAccountBalance = useCallback((accountId, amount, type, isRevert = false) => {
    setAccounts(prevAccounts => {
      const account = prevAccounts.find(a => a.id === parseInt(accountId));
      if (!account) return prevAccounts;
      
      let change = amount;
      if (type === 'expense') change = -change;
      if (isRevert) change = -change;
      
      // Check if this is a direct debit account (billingDay === 0)
      const isDirectDebit = account.billingDay === 0;
      
      return prevAccounts.map(acc => {
        // עדכון המקור שנבחר
        if (acc.id === parseInt(accountId)) {
          // דיירקט - מתאפס אחרי כל עסקה (יתרה תמיד 0)
          if (isDirectDebit && !isRevert) {
            return { ...acc, balance: 0 };
          }
          return { ...acc, balance: acc.balance + change };
        }
        // עדכון חשבון האב (אם קיים)
        if (account.parentAccount && acc.id === account.parentAccount) {
          return { ...acc, balance: acc.balance + change };
        }
        return acc;
      });
    });
  }, []);

  // Transaction management
  const addTransaction = () => {
    if (!newTransaction.amount || !newTransaction.category || !newTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    const transaction = {
      id: Date.now(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount)
    };

    setTransactions([...transactions, transaction]);
    updateAccountBalance(transaction.account, transaction.amount, transaction.type);

    setNewTransaction({
      type: 'expense',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      user: familyMembers.length > 0 ? familyMembers[0].name : '',
      account: '',
      note: '',
      isRecurring: false,
      frequency: 'monthly'
    });
  };

  const deleteTransaction = (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      updateAccountBalance(transaction.account, transaction.amount, transaction.type, true);
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const startEditTransaction = (transaction) => {
    setEditingTransaction({
      ...transaction,
      amount: transaction.amount.toString()
    });
    setIsEditingTransaction(transaction.id);
  };

  const saveEditTransaction = () => {
    if (!editingTransaction.amount || !editingTransaction.category || !editingTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    const oldTransaction = transactions.find(t => t.id === editingTransaction.id);
    const newAmount = parseFloat(editingTransaction.amount);

    if (oldTransaction) {
      updateAccountBalance(oldTransaction.account, oldTransaction.amount, oldTransaction.type, true);
      updateAccountBalance(editingTransaction.account, newAmount, editingTransaction.type);
      
      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id ? { ...editingTransaction, amount: newAmount } : t
      ));
    }

    setIsEditingTransaction(null);
    setEditingTransaction(null);
  };

  const cancelEditTransaction = () => {
    setIsEditingTransaction(null);
    setEditingTransaction(null);
  };

  // Inline add transaction functions
  const startInlineAdd = (type) => {
    setIsAddingInline(type);
    setInlineTransaction({
      type: type,
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      user: familyMembers.length > 0 ? familyMembers[0].name : '',
      account: '',
      note: '',
      isRecurring: false,
      frequency: 'monthly'
    });
  };

  const saveInlineTransaction = () => {
    if (!inlineTransaction.amount || !inlineTransaction.category || !inlineTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    const transaction = {
      id: Date.now(),
      ...inlineTransaction,
      amount: parseFloat(inlineTransaction.amount)
    };

    setTransactions([...transactions, transaction]);
    updateAccountBalance(transaction.account, transaction.amount, transaction.type);
    
    setIsAddingInline(null);
    setInlineTransaction({
      type: 'expense',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      user: familyMembers.length > 0 ? familyMembers[0].name : '',
      account: '',
      note: '',
      isRecurring: false,
      frequency: 'monthly'
    });
  };

  const cancelInlineAdd = () => {
    setIsAddingInline(null);
  };

  // Summary calculation
  const calculateSummary = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filtered = transactions;

    // סינון לפי תקופה
    if (filterOptions.period === 'monthly') {
      filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      });
    } else if (filterOptions.period === 'yearly') {
      filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === currentYear;
      });
    } else if (filterOptions.startDate && filterOptions.endDate) {
      filtered = transactions.filter(t => {
        return t.date >= filterOptions.startDate && t.date <= filterOptions.endDate;
      });
    }

    // סינון לפי משתמש
    if (filterOptions.user !== 'all') {
      filtered = filtered.filter(t => t.user === filterOptions.user);
    }

    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    return { income, expense, balance, filtered };
  }, [transactions, filterOptions]);

  const summary = calculateSummary();

  const expensesByCategory = {};
  summary.filtered.filter(t => t.type === 'expense').forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
  });

  // Category management
  const addCategory = () => {
    if (!newCategoryName.trim() || categories[newCategoryType].includes(newCategoryName.trim())) return;
    setCategories({
      ...categories,
      [newCategoryType]: [...categories[newCategoryType], newCategoryName.trim()]
    });
    setNewCategoryName('');
  };

  const deleteCategory = (type, category) => {
    const isUsed = transactions.some(t => t.category === category);
    if (isUsed) {
      alert('לא ניתן למחוק קטגוריה בשימוש');
      return;
    }
    setCategories({
      ...categories,
      [type]: categories[type].filter(c => c !== category)
    });
  };

  const startEditCategory = (type, category) => {
    setEditingCategory({ type, category });
    setNewCategoryName(category);
    setNewCategoryType(type);
  };

  const saveEditCategory = () => {
    if (!newCategoryName.trim() || !editingCategory) return;
    
    const oldName = editingCategory.category;
    const newName = newCategoryName.trim();
    const type = editingCategory.type;

    setCategories({
      ...categories,
      [type]: categories[type].map(c => c === oldName ? newName : c)
    });

    setTransactions(transactions.map(t => 
      t.category === oldName ? { ...t, category: newName } : t
    ));

    setEditingCategory(null);
    setNewCategoryName('');
  };

  const moveCategory = (type, category, direction) => {
    const list = categories[type];
    const index = list.indexOf(category);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const newList = [...list];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setCategories({ ...categories, [type]: newList });
  };

  // Account management
  const updateAccountInitialBalance = () => {
    if (!editingAccount) return;
    const newBalance = parseFloat(newAccountBalance);
    
    setAccounts(prevAccounts => prevAccounts.map(a => 
      a.id === editingAccount.id 
        ? { 
            ...a, 
            name: editingAccount.name,
            balance: newBalance, 
            parentAccount: editingAccount.parentAccount,
            billingDay: editingAccount.billingDay
          } 
        : a
    ));
    setEditingAccount(null);
  };

  const addNewAccount = () => {
    if (!newAccount.name.trim()) {
      alert('נא להזין שם למקור');
      return;
    }

    const maxId = Math.max(...accounts.map(a => a.id), 0);
    const userAccounts = accounts.filter(a => a.user === newAccount.user);
    const maxOrder = userAccounts.length > 0 ? Math.max(...userAccounts.map(a => a.order || 0)) : -1;

    const account = {
      id: maxId + 1,
      name: newAccount.name.trim(),
      user: newAccount.user,
      balance: parseFloat(newAccount.balance) || 0,
      parentAccount: newAccount.parentAccount ? parseInt(newAccount.parentAccount) : null,
      billingDay: newAccount.billingDay,
      order: maxOrder + 1
    };

    setAccounts([...accounts, account]);
    setNewAccount({
      name: '',
      user: familyMembers.length > 0 ? familyMembers[0].name : '',
      balance: 0,
      parentAccount: null,
      billingDay: null
    });
    setIsAddingAccount(false);
  };

  const deleteAccount = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    // Check if account is used in transactions
    const isUsed = transactions.some(t => parseInt(t.account) === accountId);
    if (isUsed) {
      alert('לא ניתן למחוק מקור שיש בו תנועות. יש למחוק קודם את התנועות.');
      return;
    }

    // Check if account is a parent to other accounts
    const hasChildren = accounts.some(a => a.parentAccount === accountId);
    if (hasChildren) {
      alert('לא ניתן למחוק מקור שיש לו חשבונות משויכים. יש לשנות את החשבונות המשויכים קודם.');
      return;
    }

    if (confirm(`האם אתה בטוח שברצונך למחוק את "${account.name}"?`)) {
      setAccounts(accounts.filter(a => a.id !== accountId));
    }
  };

  const moveAccount = (user, accountId, direction) => {
    const userAccounts = accounts
      .filter(a => a.user === user && a.parentAccount === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const index = userAccounts.findIndex(a => a.id === accountId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= userAccounts.length) return;

    // Swap orders
    const currentOrder = userAccounts[index].order || 0;
    const targetOrder = userAccounts[newIndex].order || 0;

    setAccounts(prevAccounts => prevAccounts.map(a => {
      if (a.id === userAccounts[index].id) return { ...a, order: targetOrder };
      if (a.id === userAccounts[newIndex].id) return { ...a, order: currentOrder };
      return a;
    }));
  };

  // Get sorted accounts with children under parents
  const getSortedAccountsForUser = (user) => {
    const userAccounts = accounts.filter(a => a.user === user);
    const parents = userAccounts
      .filter(a => a.parentAccount === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const result = [];
    parents.forEach(parent => {
      result.push(parent);
      // Add children right after parent
      const children = userAccounts
        .filter(a => a.parentAccount === parent.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      result.push(...children);
    });
    
    return result;
  };

  // Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-semibold">הכנסות</p>
              <p className="text-2xl font-bold text-green-700">₪{summary.income.toFixed(2)}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-semibold">הוצאות</p>
              <p className="text-2xl font-bold text-red-700">₪{summary.expense.toFixed(2)}</p>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>
        <div className={`${summary.balance >= 0 ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border-2 rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">סיכום חודשי</p>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                ₪{summary.balance.toFixed(2)}
              </p>
            </div>
            <Wallet className={summary.balance >= 0 ? 'text-green-700' : 'text-red-700'} size={32} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-3 text-gray-700">סינון תצוגה</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            className="border rounded p-2 text-sm"
            value={filterOptions.period}
            onChange={(e) => setFilterOptions({ ...filterOptions, period: e.target.value })}
          >
            <option value="monthly">חודשי</option>
            <option value="yearly">שנתי</option>
            <option value="custom">מותאם אישית</option>
          </select>
          {filterOptions.period === 'custom' && (
            <>
              <input
                type="date"
                className="border rounded p-2 text-sm"
                value={filterOptions.startDate}
                onChange={(e) => setFilterOptions({ ...filterOptions, startDate: e.target.value })}
              />
              <input
                type="date"
                className="border rounded p-2 text-sm"
                value={filterOptions.endDate}
                onChange={(e) => setFilterOptions({ ...filterOptions, endDate: e.target.value })}
              />
            </>
          )}
          <select
            className="border rounded p-2 text-sm"
            value={filterOptions.user}
            onChange={(e) => setFilterOptions({ ...filterOptions, user: e.target.value })}
          >
            <option value="all">כולם</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
        </div>
      </div>

      {Object.keys(expensesByCategory).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold mb-3 text-gray-700">התפלגות הוצאות לפי קטגוריות</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).map(([category, amount]) => {
              const percentage = (amount / summary.expense) * 100;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{category}</span>
                    <span className="font-semibold">₪{amount.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-3 text-gray-700">הוספה מהירה</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="border rounded p-2"
            value={newTransaction.type}
            onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value, category: '' })}
          >
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </select>
          <input
            type="number"
            placeholder="סכום"
            className="border rounded p-2"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
          />
          <select
            className="border rounded p-2"
            value={newTransaction.category}
            onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
          >
            <option value="">בחר קטגוריה</option>
            {categories[newTransaction.type].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="date"
            className="border rounded p-2"
            value={newTransaction.date}
            onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
          />
          <select
            className="border rounded p-2"
            value={newTransaction.user}
            onChange={(e) => setNewTransaction({ ...newTransaction, user: e.target.value, account: '' })}
          >
            <option value="">בחר משתמש</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.name}>{member.name}</option>
            ))}
          </select>
          <select
            className="border rounded p-2"
            value={newTransaction.account}
            onChange={(e) => setNewTransaction({ ...newTransaction, account: e.target.value })}
          >
            <option value="">בחר {newTransaction.type === 'income' ? 'יעד' : 'מקור'}</option>
            {accounts.filter(a => a.user === newTransaction.user).map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="הערה (אופציונלי)"
            className="border rounded p-2 md:col-span-2"
            value={newTransaction.note}
            onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })}
          />
          <div className="flex items-center space-x-2 space-x-reverse">
            <input
              type="checkbox"
              id="recurring"
              checked={newTransaction.isRecurring}
              onChange={(e) => setNewTransaction({ ...newTransaction, isRecurring: e.target.checked })}
            />
            <label htmlFor="recurring" className="text-sm">הוצאה קבועה</label>
          </div>
          {newTransaction.isRecurring && (
            <select
              className="border rounded p-2"
              value={newTransaction.frequency}
              onChange={(e) => setNewTransaction({ ...newTransaction, frequency: e.target.value })}
            >
              <option value="daily">יומי</option>
              <option value="weekly">שבועי</option>
              <option value="monthly">חודשי</option>
              <option value="yearly">שנתי</option>
            </select>
          )}
        </div>
        <button
          onClick={addTransaction}
          className="mt-4 w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 flex items-center justify-center"
        >
          <PlusCircle className="ml-2" size={20} />
          הוסף
        </button>
      </div>
    </div>
  );

  // Categories
  const renderCategories = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold mb-3 text-gray-700">
          {editingCategory ? 'ערוך קטגוריה' : 'הוסף קטגוריה חדשה'}
        </h3>
        <div className="flex gap-2">
          <select
            className="border rounded p-2"
            value={newCategoryType}
            onChange={(e) => setNewCategoryType(e.target.value)}
            disabled={!!editingCategory}
          >
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </select>
          <input
            type="text"
            placeholder="שם קטגוריה"
            className="border rounded p-2 flex-1"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          {editingCategory ? (
            <>
              <button
                onClick={saveEditCategory}
                className="bg-green-600 text-white px-4 rounded hover:bg-green-700 flex items-center gap-1"
              >
                <Check size={18} />
                שמור
              </button>
              <button
                onClick={() => { setEditingCategory(null); setNewCategoryName(''); }}
                className="bg-red-500 text-white px-4 rounded hover:bg-red-600 flex items-center gap-1"
              >
                <X size={18} />
                ביטול
              </button>
            </>
          ) : (
            <button
              onClick={addCategory}
              className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
            >
              הוסף
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold mb-3 text-red-700">קטגוריות הוצאות</h3>
          <div className="space-y-2">
            {categories.expense.map((cat, index) => (
              <div key={cat} className="flex justify-between items-center border-b pb-2">
                <span>{cat}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveCategory('expense', cat, 'up')}
                    disabled={index === 0}
                    className={`p-1 ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveCategory('expense', cat, 'down')}
                    disabled={index === categories.expense.length - 1}
                    className={`p-1 ${index === categories.expense.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => startEditCategory('expense', cat)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCategory('expense', cat)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold mb-3 text-green-700">קטגוריות הכנסות</h3>
          <div className="space-y-2">
            {categories.income.map((cat, index) => (
              <div key={cat} className="flex justify-between items-center border-b pb-2">
                <span>{cat}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveCategory('income', cat, 'up')}
                    disabled={index === 0}
                    className={`p-1 ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveCategory('income', cat, 'down')}
                    disabled={index === categories.income.length - 1}
                    className={`p-1 ${index === categories.income.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => startEditCategory('income', cat)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCategory('income', cat)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Transactions
  const renderTransactions = () => {
    const expenses = sortTransactions(summary.filtered.filter(t => t.type === 'expense'), sortConfig);
    const incomes = sortTransactions(summary.filtered.filter(t => t.type === 'income'), sortConfig);

    const getSortIndicator = (key) => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const renderTable = (items, type) => {
      const isExpense = type === 'expense';
      
      return (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-lg font-bold ${isExpense ? 'text-red-700' : 'text-green-700'}`}>
              {isExpense ? 'הוצאות' : 'הכנסות'}
            </h3>
            <button
              onClick={() => startInlineAdd(type)}
              className={`flex items-center gap-1 px-3 py-1 rounded text-white text-sm ${
                isExpense ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              <PlusCircle size={16} />
              {isExpense ? 'הוספת הוצאה' : 'הוספת הכנסה'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => requestSort('date')}>
                    תאריך{getSortIndicator('date')}
                  </th>
                  <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => requestSort('category')}>
                    קטגוריה{getSortIndicator('category')}
                  </th>
                  <th className="p-2 text-right">סכום</th>
                  <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => requestSort('user')}>
                    משתמש{getSortIndicator('user')}
                  </th>
                  <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => requestSort('account')}>
                    {isExpense ? 'מקור' : 'יעד'}{getSortIndicator('account')}
                  </th>
                  <th className="p-2 text-right">הערה</th>
                  <th className="p-2 text-right">קבוע</th>
                  <th className="p-2 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {/* Inline add row */}
                {isAddingInline === type && (
                  <tr className="border-b bg-green-50">
                    <td className="p-2">
                      <input
                        type="date"
                        value={inlineTransaction.date}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, date: e.target.value })}
                        className="border rounded p-1 w-full"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={inlineTransaction.category}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, category: e.target.value })}
                        className="border rounded p-1 w-full"
                      >
                        <option value="">בחר</option>
                        {categories[type].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={inlineTransaction.amount}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, amount: e.target.value })}
                        className="border rounded p-1 w-full"
                        placeholder="סכום"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={inlineTransaction.user}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, user: e.target.value, account: '' })}
                        className="border rounded p-1 w-full"
                      >
                        <option value="">בחר</option>
                        {familyMembers.map(member => (
                          <option key={member.id} value={member.name}>{member.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={inlineTransaction.account}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, account: e.target.value })}
                        className="border rounded p-1 w-full"
                      >
                        <option value="">בחר</option>
                        {accounts.filter(a => a.user === inlineTransaction.user).map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={inlineTransaction.note}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, note: e.target.value })}
                        className="border rounded p-1 w-full"
                        placeholder="הערה"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={inlineTransaction.isRecurring}
                        onChange={(e) => setInlineTransaction({ ...inlineTransaction, isRecurring: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button onClick={saveInlineTransaction} className="text-green-600 hover:text-green-800">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelInlineAdd} className="text-red-600 hover:text-red-800">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map(t => {
                  const isEditing = isEditingTransaction === t.id;
                  
                  if (isEditing) {
                    return (
                      <tr key={t.id} className="border-b bg-blue-50">
                        <td className="p-2">
                          <input
                            type="date"
                            value={editingTransaction.date}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                            className="border rounded p-1 w-full"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={editingTransaction.category}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                            className="border rounded p-1 w-full"
                          >
                            {categories[editingTransaction.type].map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={editingTransaction.amount}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                            className="border rounded p-1 w-full"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={editingTransaction.user}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, user: e.target.value, account: '' })}
                            className="border rounded p-1 w-full"
                          >
                            {familyMembers.map(member => (
                              <option key={member.id} value={member.name}>{member.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={editingTransaction.account}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, account: e.target.value })}
                            className="border rounded p-1 w-full"
                          >
                            <option value="">בחר</option>
                            {accounts.filter(a => a.user === editingTransaction.user).map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editingTransaction.note}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, note: e.target.value })}
                            className="border rounded p-1 w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={editingTransaction.isRecurring}
                            onChange={(e) => setEditingTransaction({ ...editingTransaction, isRecurring: e.target.checked })}
                          />
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <button onClick={saveEditTransaction} className="text-green-600 hover:text-green-800">
                              <Check size={16} />
                            </button>
                            <button onClick={cancelEditTransaction} className="text-red-600 hover:text-red-800">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(t.date).toLocaleDateString('he-IL')}</td>
                      <td className="p-2">{t.category}</td>
                      <td className={`p-2 font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                        ₪{t.amount.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <span className="flex items-center">
                          <span className={`w-2 h-2 rounded-full ${getUserColor(t.user)} ml-1`}></span>
                          {t.user}
                        </span>
                      </td>
                      <td className="p-2">{accounts.find(a => a.id === parseInt(t.account))?.name}</td>
                      <td className="p-2 text-xs text-gray-600">{t.note}</td>
                      <td className="p-2">{t.isRecurring ? `✓ (${t.frequency})` : '✗'}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <button onClick={() => startEditTransaction(t)} className="text-blue-500 hover:text-blue-700">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Filter Options - זהה לדשבורד */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold mb-3 text-gray-700">סינון תצוגה</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="border rounded p-2 text-sm"
              value={filterOptions.period}
              onChange={(e) => setFilterOptions({ ...filterOptions, period: e.target.value })}
            >
              <option value="monthly">חודשי</option>
              <option value="yearly">שנתי</option>
              <option value="custom">מותאם אישית</option>
            </select>
            {filterOptions.period === 'custom' && (
              <>
                <input
                  type="date"
                  className="border rounded p-2 text-sm"
                  value={filterOptions.startDate}
                  onChange={(e) => setFilterOptions({ ...filterOptions, startDate: e.target.value })}
                  placeholder="מתאריך"
                />
                <input
                  type="date"
                  className="border rounded p-2 text-sm"
                  value={filterOptions.endDate}
                  onChange={(e) => setFilterOptions({ ...filterOptions, endDate: e.target.value })}
                  placeholder="עד תאריך"
                />
              </>
            )}
            <select
              className="border rounded p-2 text-sm"
              value={filterOptions.user}
              onChange={(e) => setFilterOptions({ ...filterOptions, user: e.target.value })}
            >
              <option value="all">כולם</option>
              {familyMembers.map(member => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {renderTable(expenses, 'expense')}
        {renderTable(incomes, 'income')}
      </div>
    );
  };

  // Sources
  const renderSources = () => {
    // Get parent accounts (accounts without parentAccount) for a specific user
    const getParentAccounts = (userFilter) => {
      return accounts.filter(a => a.user === userFilter && a.parentAccount === null);
    };

    // Get billing day display text
    const getBillingDayText = (billingDay) => {
      if (billingDay === null) return null;
      if (billingDay === 0) return 'דיירקט';
      return `חיוב ב-${billingDay} לחודש`;
    };

    return (
      <div className="space-y-6">
        {/* Add new account button */}
        <div className="bg-white rounded-lg shadow-md p-4">
          {!isAddingAccount ? (
            <button
              onClick={() => setIsAddingAccount(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusCircle size={18} />
              הוספת מקור כספי חדש
            </button>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-700">הוספת מקור כספי חדש</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="שם המקור"
                  className="border rounded p-2"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                />
                <select
                  className="border rounded p-2"
                  value={newAccount.user}
                  onChange={(e) => setNewAccount({ ...newAccount, user: e.target.value, parentAccount: null })}
                >
                  <option value="">בחר משתמש</option>
                  {familyMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="יתרה התחלתית"
                  className="border rounded p-2"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                />
                <select
                  className="border rounded p-2"
                  value={newAccount.parentAccount || ''}
                  onChange={(e) => setNewAccount({ 
                    ...newAccount, 
                    parentAccount: e.target.value ? parseInt(e.target.value) : null 
                  })}
                >
                  <option value="">מקור עצמאי (ללא חשבון אב)</option>
                  {getParentAccounts(newAccount.user).map(pa => (
                    <option key={pa.id} value={pa.id}>משויך ל: {pa.name}</option>
                  ))}
                </select>
                <select
                  className="border rounded p-2"
                  value={newAccount.billingDay === null ? 'none' : newAccount.billingDay === 0 ? 'direct' : newAccount.billingDay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAccount({ 
                      ...newAccount, 
                      billingDay: val === 'none' ? null : val === 'direct' ? 0 : parseInt(val)
                    });
                  }}
                >
                  <option value="none">לא כרטיס אשראי</option>
                  <option value="direct">דיירקט (מתאפס בכל פעולה)</option>
                  <optgroup label="מועד חיוב חודשי">
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} לחודש</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addNewAccount}
                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Check size={18} />
                  הוסף
                </button>
                <button
                  onClick={() => {
                    setIsAddingAccount(false);
                    setNewAccount({ name: '', user: '', balance: 0, parentAccount: null, billingDay: null });
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <X size={18} />
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {familyMembers.map((member, memberIndex) => {
            const user = member.name;
            const sortedAccounts = getSortedAccountsForUser(user);
            const parentAccounts = getParentAccounts(user);
            const parentAccountsCount = parentAccounts.length;
            const headerColors = ['#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f97316', '#14b8a6'];
            
            return (
              <div key={member.id} className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-bold mb-3" style={{ color: headerColors[memberIndex % headerColors.length] }}>
                  מקורות כספיים - {user}
                </h3>
                <div className="space-y-2">
                  {sortedAccounts.map((account, idx) => {
                    const parentAccount = account.parentAccount 
                      ? accounts.find(a => a.id === account.parentAccount) 
                      : null;
                    const isChild = account.parentAccount !== null;
                    const parentIndex = parentAccounts.findIndex(p => p.id === account.id);
                    const billingText = getBillingDayText(account.billingDay);
                    
                    return (
                      <div 
                        key={account.id} 
                        className={`border rounded p-3 ${isChild ? 'mr-6 border-r-4 border-r-gray-300 bg-gray-50' : 'bg-white'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {/* Move buttons for parent accounts only */}
                            {!isChild && (
                              <div className="flex flex-col">
                                <button
                                  onClick={() => moveAccount(user, account.id, 'up')}
                                  disabled={parentIndex === 0}
                                  className={`p-0.5 ${parentIndex === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  onClick={() => moveAccount(user, account.id, 'down')}
                                  disabled={parentIndex === parentAccountsCount - 1}
                                  className={`p-0.5 ${parentIndex === parentAccountsCount - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>
                            )}
                            <div>
                              <span className={`font-semibold ${isChild ? 'text-sm' : ''}`}>{account.name}</span>
                              {parentAccount && (
                                <span className="text-xs text-gray-500 block">
                                  ← משויך ל{parentAccount.name}
                                </span>
                              )}
                              {billingText && (
                                <span className="text-xs text-blue-500 block">
                                  {billingText}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {editingAccount?.id === account.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                className="border rounded p-1 text-sm w-28"
                                value={editingAccount.name}
                                onChange={(e) => setEditingAccount({
                                  ...editingAccount,
                                  name: e.target.value
                                })}
                                placeholder="שם"
                              />
                              <input
                                type="number"
                                className="border rounded p-1 text-sm w-20"
                                value={newAccountBalance}
                                onChange={(e) => setNewAccountBalance(e.target.value)}
                                placeholder="יתרה"
                              />
                              <select
                                className="border rounded p-1 text-xs"
                                value={editingAccount.parentAccount || ''}
                                onChange={(e) => setEditingAccount({
                                  ...editingAccount,
                                  parentAccount: e.target.value ? parseInt(e.target.value) : null
                                })}
                              >
                                <option value="">עצמאי</option>
                                {parentAccounts
                                  .filter(pa => pa.id !== account.id)
                                  .map(pa => (
                                    <option key={pa.id} value={pa.id}>{pa.name}</option>
                                  ))
                                }
                              </select>
                              <select
                                className="border rounded p-1 text-xs"
                                value={editingAccount.billingDay === null ? 'none' : editingAccount.billingDay === 0 ? 'direct' : editingAccount.billingDay}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingAccount({ 
                                    ...editingAccount, 
                                    billingDay: val === 'none' ? null : val === 'direct' ? 0 : parseInt(val)
                                  });
                                }}
                              >
                                <option value="none">לא כ.אשראי</option>
                                <option value="direct">דיירקט</option>
                                <optgroup label="חיוב">
                                  {[...Array(31)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                  ))}
                                </optgroup>
                              </select>
                              <button onClick={updateAccountInitialBalance} className="text-green-600 hover:text-green-800">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingAccount(null)} className="text-red-600 hover:text-red-800">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {isChild ? (
                                // Child account - smaller font, in parentheses
                                <span className={`text-sm ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  (₪{account.balance.toFixed(2)})
                                </span>
                              ) : (
                                // Parent account - normal display
                                <span className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  ₪{account.balance.toFixed(2)}
                                </span>
                              )}
                              <button
                                onClick={() => { 
                                  setEditingAccount({...account}); 
                                  setNewAccountBalance(account.balance); 
                                }}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteAccount(account.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Members/Users management
  const renderMembers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-700">חברי המשפחה / משתמשים</h3>
          <div className="flex gap-2">
            <button
              onClick={() => generateInviteLink('invite')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Share2 size={18} />
              שיתוף קישור
            </button>
            {!isAddingMember && (
              <button
                onClick={() => setIsAddingMember(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserPlus size={18} />
                הוספה ידנית
              </button>
            )}
          </div>
        </div>

        {isAddingMember && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold mb-3">הוספת משתמש חדש</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="שם המשתמש"
                className="border rounded p-2 flex-1"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <button
                onClick={addFamilyMember}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Check size={18} />
                הוסף
              </button>
              <button
                onClick={() => { setIsAddingMember(false); setNewMemberName(''); }}
                className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <X size={18} />
                ביטול
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              * למשתמש חדש ייווצרו אוטומטית מקורות כספיים בסיסיים (חשבון בנק, מזומן, Bit)
            </p>
          </div>
        )}

        <div className="space-y-3">
          {familyMembers.map((member, index) => (
            <div key={member.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${userColors[index % userColors.length]} flex items-center justify-center text-white font-bold`}>
                  {member.name.charAt(0)}
                </div>
                {editingMember === member.id ? (
                  <input
                    type="text"
                    className="border rounded p-2"
                    value={editingMemberName}
                    onChange={(e) => setEditingMemberName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateMemberName(member.id, editingMemberName);
                      } else if (e.key === 'Escape') {
                        setEditingMember(null);
                        setEditingMemberName('');
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div>
                    <span className="font-semibold text-lg">{member.name}</span>
                    {member.role === 'admin' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mr-2">מנהל</span>
                    )}
                    {member.email && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingMember === member.id ? (
                  <>
                    <button
                      onClick={() => updateMemberName(member.id, editingMemberName)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => { setEditingMember(null); setEditingMemberName(''); }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingMember(member.id); setEditingMemberName(member.name); }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteFamilyMember(member.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {familyMembers.length === 0 && (
          <p className="text-center text-gray-500 py-8">אין משתמשים. הוסף משתמש חדש כדי להתחיל.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-bold text-gray-700 mb-3">פרטי החשבון</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">שם החשבון:</span> {familyName}</p>
          <p><span className="font-semibold">מספר משתמשים:</span> {familyMembers.length}</p>
          <p><span className="font-semibold">סה"כ מקורות כספיים:</span> {accounts.length}</p>
        </div>
      </div>
    </div>
  );

  // Auth Screen
  const renderAuthScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="text-purple-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ניהול תקציב משפחתי</h1>
          <p className="text-gray-500 mt-1">נהלו את הכספים שלכם בקלות</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setAuthMode('login'); setAuthError(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              authMode === 'login' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            התחברות
          </button>
          <button
            onClick={() => { setAuthMode('register'); setAuthError(''); }}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
              authMode === 'register' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            הרשמה
          </button>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {authError}
          </div>
        )}

        {authMode === 'register' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם החשבון / שם המשפחה</label>
              <input
                type="text"
                placeholder="לדוגמה: משפחת כהן"
                className="w-full border rounded-lg p-3"
                value={authForm.familyName}
                onChange={(e) => setAuthForm({ ...authForm, familyName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">השם שלך</label>
              <input
                type="text"
                placeholder="השם שיוצג באפליקציה"
                className="w-full border rounded-lg p-3"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full border rounded-lg p-3"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                placeholder="לפחות 6 תווים"
                className="w-full border rounded-lg p-3"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>
            <button
              onClick={handleRegister}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              צור חשבון חדש
            </button>
          </div>
        )}

        {authMode === 'login' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full border rounded-lg p-3"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                placeholder="הסיסמה שלך"
                className="w-full border rounded-lg p-3"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              התחבר
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          {authMode === 'login' 
            ? 'אין לך חשבון? לחץ על "הרשמה" למעלה'
            : 'יש לך חשבון? לחץ על "התחברות" למעלה'
          }
        </p>
      </div>
    </div>
  );

  // If not logged in, show auth screen
  if (!isLoggedIn) {
    return renderAuthScreen();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      {/* Share Dialog - Global */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowShareDialog(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {shareType === 'invite' ? 'הזמנת משתמש לחשבון' : 'שיתוף האפליקציה'}
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              {shareType === 'invite' 
                ? `שלח את הקישור הזה למי שתרצה להזמין לחשבון "${familyName}":`
                : 'שלח את הקישור הזה למי שרוצה ליצור חשבון משלו:'
              }
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="border rounded p-2 flex-1 text-sm bg-gray-50 text-left"
                dir="ltr"
              />
              <button
                onClick={copyInviteLink}
                className={`px-4 py-2 rounded flex items-center gap-2 ${linkCopied ? 'bg-green-600' : 'bg-blue-600'} text-white hover:opacity-90`}
              >
                <Copy size={16} />
                {linkCopied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {shareType === 'invite'
                ? '* כשהמוזמן יפתח את הקישור, הוא יוכל להצטרף לחשבון ולהזין את שמו.'
                : '* כשהנמען יפתח את הקישור, הוא יוכל ליצור חשבון חדש משלו.'
              }
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">ניהול תקציב משפחתי</h1>
              <p className="text-purple-100 mt-1">{familyName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-purple-100">שלום, {currentUser?.name}</span>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Share2 size={16} />
                  שיתוף
                </button>
                {showShareMenu && (
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg py-2 min-w-48 z-50">
                    <button
                      onClick={() => generateInviteLink('invite')}
                      className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <UserPlus size={16} />
                      הזמנה לחשבון שלי
                    </button>
                    <button
                      onClick={() => generateInviteLink('app')}
                      className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Link size={16} />
                      שיתוף האפליקציה
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                התנתק
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6 p-2 flex gap-2 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'דשבורד', icon: TrendingUp },
            { id: 'transactions', label: 'הוצאות והכנסות', icon: List },
            { id: 'categories', label: 'קטגוריות', icon: Tag },
            { id: 'sources', label: 'מקורות כספיים', icon: Wallet },
            { id: 'members', label: 'משתמשים', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'sources' && renderSources()}
        {activeTab === 'members' && renderMembers()}
      </div>
    </div>
  );
};

export default BudgetApp;