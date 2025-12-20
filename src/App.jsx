import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { PlusCircle, TrendingUp, TrendingDown, Wallet, Tag, List, Trash2, Edit2, X, Check, ArrowUp, ArrowDown, Users, LogIn, UserPlus, Share2, Link, Copy, Loader2 } from 'lucide-react';

const BudgetApp = () => {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', familyName: '' });
  const [authError, setAuthError] = useState('');

  // Family data
  const [familyId, setFamilyId] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyName, setFamilyName] = useState('');
  
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({
    expense: ['סופר', 'אוכל בחוץ והזמנות', 'לימודים', 'רכב', 'חיסכון', 'שונות'],
    income: ['הכנסה קבועה', 'הכנסה משתנה']
  });

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

  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    user: '',
    balance: 0,
    parentAccount: null,
    billingDay: null
  });

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

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editingMemberName, setEditingMemberName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareType, setShareType] = useState('invite');
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // ========================================
  // SUPABASE: Check session on load
  // ========================================
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (userId) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setIsLoading(false);
        return;
      }

      const { data: familyData } = await supabase
        .from('families')
        .select('*')
        .eq('id', userData.family_id)
        .single();

      setCurrentUser(userData);
      setFamilyId(userData.family_id);
      setFamilyName(familyData?.name || '');
      setIsLoggedIn(true);

      await loadFamilyData(userData.family_id);
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoading(false);
    }
  };

  const loadFamilyData = async (famId) => {
    try {
      const { data: members } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', famId)
        .order('created_at');
      
      if (members) {
        setFamilyMembers(members.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          createdAt: m.created_at
        })));
      }

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('family_id', famId)
        .order('sort_order');
      
      if (accountsData) {
        setAccounts(accountsData.map(a => ({
          id: a.id,
          name: a.name,
          user: a.user_name,
          balance: parseFloat(a.balance) || 0,
          parentAccount: a.parent_account,
          billingDay: a.billing_day,
          order: a.sort_order
        })));
        checkAndResetCreditCards(accountsData);
      }

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('family_id', famId)
        .order('sort_order');
      
      if (categoriesData && categoriesData.length > 0) {
        const expenseCats = categoriesData.filter(c => c.type === 'expense').map(c => c.name);
        const incomeCats = categoriesData.filter(c => c.type === 'income').map(c => c.name);
        if (expenseCats.length > 0 || incomeCats.length > 0) {
          setCategories({
            expense: expenseCats.length > 0 ? expenseCats : categories.expense,
            income: incomeCats.length > 0 ? incomeCats : categories.income
          });
        }
      }

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', famId)
        .order('date', { ascending: false });
      
      if (transactionsData) {
        setTransactions(transactionsData.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          category: t.category,
          date: t.date,
          user: t.user_name,
          account: t.account_id,
          note: t.note,
          isRecurring: t.is_recurring,
          frequency: t.frequency
        })));
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    }
  };

  const checkAndResetCreditCards = async (accountsList) => {
    const today = new Date();
    const currentDay = today.getDate();
    
    for (const account of accountsList) {
      if (account.billing_day && account.billing_day > 0 && currentDay === account.billing_day) {
        await supabase
          .from('accounts')
          .update({ balance: 0 })
          .eq('id', account.id);
        
        setAccounts(prev => prev.map(a => 
          a.id === account.id ? { ...a, balance: 0 } : a
        ));
      }
    }
  };

  // ========================================
  // SUPABASE: Authentication
  // ========================================
  const handleRegister = async () => {
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

    setIsSaving(true);
    setAuthError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: authForm.email.trim(),
        password: authForm.password,
      });

      if (authError) {
        setAuthError(authError.message.includes('already registered') ? 'האימייל הזה כבר רשום במערכת' : authError.message);
        setIsSaving(false);
        return;
      }

      if (!authData.user) {
        setAuthError('שגיאה ביצירת המשתמש');
        setIsSaving(false);
        return;
      }

      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({ name: authForm.familyName.trim() })
        .select()
        .single();

      if (familyError) {
        setAuthError('שגיאה ביצירת החשבון המשפחתי');
        setIsSaving(false);
        return;
      }

      await supabase.from('users').insert({
        id: authData.user.id,
        email: authForm.email.trim(),
        name: authForm.name.trim(),
        family_id: familyData.id,
        role: 'admin'
      });

      const defaultCategories = [
        { family_id: familyData.id, name: 'סופר', type: 'expense', sort_order: 0 },
        { family_id: familyData.id, name: 'אוכל בחוץ והזמנות', type: 'expense', sort_order: 1 },
        { family_id: familyData.id, name: 'לימודים', type: 'expense', sort_order: 2 },
        { family_id: familyData.id, name: 'רכב', type: 'expense', sort_order: 3 },
        { family_id: familyData.id, name: 'חיסכון', type: 'expense', sort_order: 4 },
        { family_id: familyData.id, name: 'שונות', type: 'expense', sort_order: 5 },
        { family_id: familyData.id, name: 'הכנסה קבועה', type: 'income', sort_order: 0 },
        { family_id: familyData.id, name: 'הכנסה משתנה', type: 'income', sort_order: 1 },
      ];
      await supabase.from('categories').insert(defaultCategories);

      const defaultAccounts = [
        { family_id: familyData.id, user_name: authForm.name.trim(), name: 'חשבון בנק', balance: 0, sort_order: 0 },
        { family_id: familyData.id, user_name: authForm.name.trim(), name: 'מזומן', balance: 0, sort_order: 1 },
        { family_id: familyData.id, user_name: authForm.name.trim(), name: 'Bit', balance: 0, sort_order: 2 },
      ];
      await supabase.from('accounts').insert(defaultAccounts);

      await loadUserData(authData.user.id);
      setAuthForm({ email: '', password: '', name: '', familyName: '' });
    } catch (error) {
      console.error('Registration error:', error);
      setAuthError('שגיאה בהרשמה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('נא למלא אימייל וסיסמה');
      return;
    }

    setIsSaving(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password,
      });

      if (error) {
        setAuthError(error.message.includes('Invalid login') ? 'אימייל או סיסמה שגויים' : error.message);
        setIsSaving(false);
        return;
      }

      if (data.user) {
        await loadUserData(data.user.id);
        setAuthForm({ email: '', password: '', name: '', familyName: '' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('שגיאה בהתחברות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFamilyId(null);
    setFamilyMembers([]);
    setFamilyName('');
    setAccounts([]);
    setTransactions([]);
    setCategories({
      expense: ['סופר', 'אוכל בחוץ והזמנות', 'לימודים', 'רכב', 'חיסכון', 'שונות'],
      income: ['הכנסה קבועה', 'הכנסה משתנה']
    });
    setAuthMode('login');
  };

  // ========================================
  // Helper Functions
  // ========================================
  const generateInviteLink = (type = 'invite') => {
    setShareType(type);
    if (type === 'invite') {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const link = `${window.location.origin}?invite=${inviteCode}&family=${encodeURIComponent(familyName)}`;
      setInviteLink(link);
    } else {
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

  const userColors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
  const getUserColor = (userName) => {
    const index = familyMembers.findIndex(m => m.name === userName);
    return userColors[index % userColors.length] || 'bg-gray-500';
  };

  // ========================================
  // SUPABASE: Member Management
  // ========================================
  const addFamilyMember = async () => {
    if (!newMemberName.trim()) {
      alert('נא להזין שם');
      return;
    }
    
    if (familyMembers.some(m => m.name === newMemberName.trim())) {
      alert('כבר קיים משתמש בשם זה');
      return;
    }

    setIsSaving(true);
    try {
      const memberId = `member_${Date.now()}`;
      const newMember = {
        id: memberId,
        name: newMemberName.trim(),
        email: '',
        role: 'member',
        createdAt: new Date().toISOString()
      };

      const defaultAccounts = [
        { family_id: familyId, user_name: newMemberName.trim(), name: 'חשבון בנק', balance: 0, sort_order: 0 },
        { family_id: familyId, user_name: newMemberName.trim(), name: 'מזומן', balance: 0, sort_order: 1 },
        { family_id: familyId, user_name: newMemberName.trim(), name: 'Bit', balance: 0, sort_order: 2 },
      ];

      const { data: newAccounts, error } = await supabase
        .from('accounts')
        .insert(defaultAccounts)
        .select();

      if (error) throw error;

      setFamilyMembers([...familyMembers, newMember]);
      
      if (newAccounts) {
        const mappedAccounts = newAccounts.map(a => ({
          id: a.id,
          name: a.name,
          user: a.user_name,
          balance: parseFloat(a.balance) || 0,
          parentAccount: a.parent_account,
          billingDay: a.billing_day,
          order: a.sort_order
        }));
        setAccounts([...accounts, ...mappedAccounts]);
      }
      
      setNewMemberName('');
      setIsAddingMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
      alert('שגיאה בהוספת המשתמש');
    } finally {
      setIsSaving(false);
    }
  };

  const updateMemberName = async (memberId, newName) => {
    if (!newName.trim()) return;
    
    const oldMember = familyMembers.find(m => m.id === memberId);
    if (!oldMember) return;
    
    const oldName = oldMember.name;

    try {
      await supabase
        .from('accounts')
        .update({ user_name: newName.trim() })
        .eq('family_id', familyId)
        .eq('user_name', oldName);

      await supabase
        .from('transactions')
        .update({ user_name: newName.trim() })
        .eq('family_id', familyId)
        .eq('user_name', oldName);

      setFamilyMembers(familyMembers.map(m => 
        m.id === memberId ? { ...m, name: newName.trim() } : m
      ));
      
      setAccounts(accounts.map(a => 
        a.user === oldName ? { ...a, user: newName.trim() } : a
      ));
      
      setTransactions(transactions.map(t => 
        t.user === oldName ? { ...t, user: newName.trim() } : t
      ));
      
      setEditingMember(null);
      setEditingMemberName('');
    } catch (error) {
      console.error('Error updating member name:', error);
      alert('שגיאה בעדכון שם המשתמש');
    }
  };

  const deleteFamilyMember = async (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;
    
    if (familyMembers.length <= 1) {
      alert('לא ניתן למחוק את המשתמש האחרון');
      return;
    }
    
    const hasTransactions = transactions.some(t => t.user === member.name);
    if (hasTransactions) {
      alert('לא ניתן למחוק משתמש שיש לו תנועות. יש למחוק קודם את התנועות.');
      return;
    }
    
    if (confirm(`האם אתה בטוח שברצונך למחוק את "${member.name}"?`)) {
      try {
        await supabase
          .from('accounts')
          .delete()
          .eq('family_id', familyId)
          .eq('user_name', member.name);

        setAccounts(accounts.filter(a => a.user !== member.name));
        setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('שגיאה במחיקת המשתמש');
      }
    }
  };

  // ========================================
  // Sorting & Calculations
  // ========================================
  const sortTransactions = useCallback((items, config) => {
    if (!config.key) return items;
    
    const sortedItems = [...items].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];

      if (config.key === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (config.key === 'account') {
        const aName = accounts.find(acc => acc.id === aValue)?.name || '';
        const bName = accounts.find(acc => acc.id === bValue)?.name || '';
        return config.direction === 'ascending' 
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
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

  const calculateSummary = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filtered = transactions;

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

  // ========================================
  // SUPABASE: Account Balance Updates
  // ========================================
  const updateAccountBalance = useCallback(async (accountId, amount, type, isRevert = false) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    let change = amount;
    if (type === 'expense') change = -change;
    if (isRevert) change = -change;
    
    const isDirectDebit = account.billingDay === 0;
    let newBalance = isDirectDebit && !isRevert ? 0 : account.balance + change;

    await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId);

    if (account.parentAccount) {
      const parentAccount = accounts.find(a => a.id === account.parentAccount);
      if (parentAccount) {
        const parentNewBalance = parentAccount.balance + change;
        await supabase
          .from('accounts')
          .update({ balance: parentNewBalance })
          .eq('id', account.parentAccount);
      }
    }

    setAccounts(prevAccounts => prevAccounts.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, balance: newBalance };
      }
      if (account.parentAccount && acc.id === account.parentAccount) {
        return { ...acc, balance: acc.balance + change };
      }
      return acc;
    }));
  }, [accounts]);

  // ========================================
  // SUPABASE: Transaction Management
  // ========================================
  const addTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.category || !newTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsSaving(true);
    try {
      const transactionData = {
        family_id: familyId,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        category: newTransaction.category,
        date: newTransaction.date,
        user_name: newTransaction.user,
        account_id: newTransaction.account,
        note: newTransaction.note || null,
        is_recurring: newTransaction.isRecurring,
        frequency: newTransaction.frequency
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      const transaction = {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date,
        user: data.user_name,
        account: data.account_id,
        note: data.note,
        isRecurring: data.is_recurring,
        frequency: data.frequency
      };

      setTransactions([transaction, ...transactions]);
      await updateAccountBalance(transaction.account, transaction.amount, transaction.type);

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
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('שגיאה בהוספת התנועה');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTransaction = async (id) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    try {
      await updateAccountBalance(transaction.account, transaction.amount, transaction.type, true);
      
      await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('שגיאה במחיקת התנועה');
    }
  };

  const startEditTransaction = (transaction) => {
    setEditingTransaction({
      ...transaction,
      amount: transaction.amount.toString()
    });
    setIsEditingTransaction(transaction.id);
  };

  const saveEditTransaction = async () => {
    if (!editingTransaction.amount || !editingTransaction.category || !editingTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      const oldTransaction = transactions.find(t => t.id === editingTransaction.id);
      const newAmount = parseFloat(editingTransaction.amount);

      if (oldTransaction) {
        await updateAccountBalance(oldTransaction.account, oldTransaction.amount, oldTransaction.type, true);
        await updateAccountBalance(editingTransaction.account, newAmount, editingTransaction.type);
      }

      await supabase
        .from('transactions')
        .update({
          type: editingTransaction.type,
          amount: newAmount,
          category: editingTransaction.category,
          date: editingTransaction.date,
          user_name: editingTransaction.user,
          account_id: editingTransaction.account,
          note: editingTransaction.note || null
        })
        .eq('id', editingTransaction.id);

      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id ? { ...editingTransaction, amount: newAmount } : t
      ));

      setIsEditingTransaction(null);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('שגיאה בעדכון התנועה');
    }
  };

  const cancelEditTransaction = () => {
    setIsEditingTransaction(null);
    setEditingTransaction(null);
  };

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

  const saveInlineTransaction = async () => {
    if (!inlineTransaction.amount || !inlineTransaction.category || !inlineTransaction.account) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsSaving(true);
    try {
      const transactionData = {
        family_id: familyId,
        type: inlineTransaction.type,
        amount: parseFloat(inlineTransaction.amount),
        category: inlineTransaction.category,
        date: inlineTransaction.date,
        user_name: inlineTransaction.user,
        account_id: inlineTransaction.account,
        note: inlineTransaction.note || null,
        is_recurring: inlineTransaction.isRecurring,
        frequency: inlineTransaction.frequency
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      const transaction = {
        id: data.id,
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date,
        user: data.user_name,
        account: data.account_id,
        note: data.note,
        isRecurring: data.is_recurring,
        frequency: data.frequency
      };

      setTransactions([transaction, ...transactions]);
      await updateAccountBalance(transaction.account, transaction.amount, transaction.type);
      
      setIsAddingInline(null);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('שגיאה בהוספת התנועה');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelInlineAdd = () => {
    setIsAddingInline(null);
  };

  // ========================================
  // SUPABASE: Category Management
  // ========================================
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const type = newCategoryType;
    if (categories[type].includes(newCategoryName.trim())) {
      alert('קטגוריה זו כבר קיימת');
      return;
    }

    try {
      await supabase.from('categories').insert({
        family_id: familyId,
        name: newCategoryName.trim(),
        type: type,
        sort_order: categories[type].length
      });

      setCategories({
        ...categories,
        [type]: [...categories[type], newCategoryName.trim()]
      });

      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('שגיאה בהוספת קטגוריה');
    }
  };

  const deleteCategory = async (type, categoryName) => {
    const isUsed = transactions.some(t => t.category === categoryName && t.type === type);
    if (isUsed) {
      alert('לא ניתן למחוק קטגוריה שיש בה תנועות');
      return;
    }
    
    try {
      await supabase
        .from('categories')
        .delete()
        .eq('family_id', familyId)
        .eq('name', categoryName)
        .eq('type', type);

      setCategories({
        ...categories,
        [type]: categories[type].filter(c => c !== categoryName)
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('שגיאה במחיקת קטגוריה');
    }
  };

  const startEditCategory = (type, categoryName) => {
    setEditingCategory({ type, name: categoryName });
    setNewCategoryName(categoryName);
    setNewCategoryType(type);
  };

  const saveEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    
    const { type, name: oldName } = editingCategory;
    const newName = newCategoryName.trim();
    
    if (oldName === newName) {
      setEditingCategory(null);
      setNewCategoryName('');
      return;
    }

    try {
      await supabase
        .from('categories')
        .update({ name: newName })
        .eq('family_id', familyId)
        .eq('name', oldName)
        .eq('type', type);

      await supabase
        .from('transactions')
        .update({ category: newName })
        .eq('family_id', familyId)
        .eq('category', oldName)
        .eq('type', type);

      setCategories({
        ...categories,
        [type]: categories[type].map(c => c === oldName ? newName : c)
      });

      setTransactions(transactions.map(t => 
        t.category === oldName && t.type === type ? { ...t, category: newName } : t
      ));

      setEditingCategory(null);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('שגיאה בעדכון קטגוריה');
    }
  };

  const moveCategory = (type, categoryName, direction) => {
    const list = [...categories[type]];
    const index = list.indexOf(categoryName);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;

    const newList = [...list];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setCategories({ ...categories, [type]: newList });
  };

  // ========================================
  // SUPABASE: Account Management
  // ========================================
  const updateAccountInitialBalance = async () => {
    if (!editingAccount) return;
    const newBalance = parseFloat(newAccountBalance);
    
    try {
      await supabase
        .from('accounts')
        .update({
          name: editingAccount.name,
          balance: newBalance,
          parent_account: editingAccount.parentAccount,
          billing_day: editingAccount.billingDay
        })
        .eq('id', editingAccount.id);

      setAccounts(accounts.map(a => 
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
    } catch (error) {
      console.error('Error updating account:', error);
      alert('שגיאה בעדכון המקור');
    }
  };

  const addNewAccount = async () => {
    if (!newAccount.name.trim()) {
      alert('נא להזין שם למקור');
      return;
    }

    setIsSaving(true);
    try {
      const userAccounts = accounts.filter(a => a.user === newAccount.user);
      const maxOrder = userAccounts.length > 0 ? Math.max(...userAccounts.map(a => a.order || 0)) : -1;

      const accountData = {
        family_id: familyId,
        user_name: newAccount.user,
        name: newAccount.name.trim(),
        balance: parseFloat(newAccount.balance) || 0,
        parent_account: newAccount.parentAccount || null,
        billing_day: newAccount.billingDay,
        sort_order: maxOrder + 1
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;

      const account = {
        id: data.id,
        name: data.name,
        user: data.user_name,
        balance: parseFloat(data.balance) || 0,
        parentAccount: data.parent_account,
        billingDay: data.billing_day,
        order: data.sort_order
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
    } catch (error) {
      console.error('Error adding account:', error);
      alert('שגיאה בהוספת המקור');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const isUsed = transactions.some(t => t.account === accountId);
    if (isUsed) {
      alert('לא ניתן למחוק מקור שיש בו תנועות. יש למחוק קודם את התנועות.');
      return;
    }

    const hasChildren = accounts.some(a => a.parentAccount === accountId);
    if (hasChildren) {
      alert('לא ניתן למחוק מקור שיש לו חשבונות משויכים.');
      return;
    }

    if (confirm(`האם אתה בטוח שברצונך למחוק את "${account.name}"?`)) {
      try {
        await supabase
          .from('accounts')
          .delete()
          .eq('id', accountId);

        setAccounts(accounts.filter(a => a.id !== accountId));
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('שגיאה במחיקת המקור');
      }
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

    const currentOrder = userAccounts[index].order || 0;
    const targetOrder = userAccounts[newIndex].order || 0;

    setAccounts(prevAccounts => prevAccounts.map(a => {
      if (a.id === userAccounts[index].id) return { ...a, order: targetOrder };
      if (a.id === userAccounts[newIndex].id) return { ...a, order: currentOrder };
      return a;
    }));
  };

  const getSortedAccountsForUser = (user) => {
    const userAccounts = accounts.filter(a => a.user === user);
    const parents = userAccounts
      .filter(a => a.parentAccount === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const result = [];
    parents.forEach(parent => {
      result.push(parent);
      const children = userAccounts
        .filter(a => a.parentAccount === parent.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      result.push(...children);
    });
    
    return result;
  };

  const getParentAccounts = (user) => {
    return accounts.filter(a => a.user === user && a.parentAccount === null);
  };

  const getBillingDayText = (billingDay) => {
    if (billingDay === null) return null;
    if (billingDay === 0) return 'דיירקט';
    return `חיוב ב-${billingDay} לחודש`;
  };

  // ========================================
  // UI COMPONENTS
  // ========================================

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center" dir="rtl">
        <div className="text-center text-white">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" />
          <p className="text-xl">טוען...</p>
        </div>
      </div>
    );
  }

  // Login/Register Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-purple-800">ניהול תקציב משפחתי</h1>
            <p className="text-gray-500 mt-2">נהלו את הכספים שלכם בקלות</p>
          </div>

          <div className="flex mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-3 text-center font-semibold transition-all ${
                authMode === 'login' 
                  ? 'bg-purple-600 text-white rounded-lg' 
                  : 'text-gray-500 hover:text-purple-600'
              }`}
            >
              התחברות
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-3 text-center font-semibold transition-all ${
                authMode === 'register' 
                  ? 'bg-purple-600 text-white rounded-lg' 
                  : 'text-gray-500 hover:text-purple-600'
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

          <div className="space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="השם שלך"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם החשבון המשפחתי</label>
                  <input
                    type="text"
                    value={authForm.familyName}
                    onChange={(e) => setAuthForm({ ...authForm, familyName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="לדוגמה: משפחת כהן"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              disabled={isSaving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {authMode === 'login' ? 'התחבר' : 'הירשם'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">ניהול תקציב משפחתי</h1>
            <p className="text-purple-200 text-sm">{familyName}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-purple-200">שלום, {currentUser?.name}</span>
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="bg-purple-500 hover:bg-purple-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Share2 size={18} />
                שיתוף
              </button>
              {showShareMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={() => generateInviteLink('invite')}
                    className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    הזמנה לחשבון שלי
                  </button>
                  <button
                    onClick={() => generateInviteLink('app')}
                    className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    שיתוף האפליקציה
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {shareType === 'invite' ? 'הזמנה לחשבון' : 'שיתוף האפליקציה'}
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              {shareType === 'invite' 
                ? 'שלח את הקישור הזה למי שתרצה להזמין לחשבון המשפחתי שלך:'
                : 'שתף את הקישור הזה כדי להמליץ על האפליקציה:'
              }
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 border rounded-lg p-3 bg-gray-50 text-sm"
              />
              <button
                onClick={copyInviteLink}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  linkCopied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                {linkCopied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto">
            {[
              { id: 'dashboard', label: 'דשבורד', icon: TrendingUp },
              { id: 'transactions', label: 'הוצאות והכנסות', icon: List },
              { id: 'categories', label: 'קטגוריות', icon: Tag },
              { id: 'sources', label: 'מקורות כספיים', icon: Wallet },
              { id: 'members', label: 'משתמשים', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'sources' && renderSources()}
        {activeTab === 'members' && renderMembers()}
      </main>
    </div>
  );

  // ========================================
  // RENDER FUNCTIONS
  // ========================================

  function renderDashboard() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">הכנסות</p>
                <p className="text-3xl font-bold text-green-700">₪{summary.income.toLocaleString()}</p>
              </div>
              <TrendingUp className="text-green-500" size={40} />
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">הוצאות</p>
                <p className="text-3xl font-bold text-red-700">₪{summary.expense.toLocaleString()}</p>
              </div>
              <TrendingDown className="text-red-500" size={40} />
            </div>
          </div>
          <div className={`border-2 rounded-xl p-6 ${summary.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>סיכום חודשי</p>
                <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>₪{summary.balance.toLocaleString()}</p>
              </div>
              <Wallet className={summary.balance >= 0 ? 'text-blue-500' : 'text-orange-500'} size={40} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-700 mb-3">סינון תצוגה</h3>
          <div className="flex flex-wrap gap-3">
            <select value={filterOptions.period} onChange={(e) => setFilterOptions({ ...filterOptions, period: e.target.value })} className="border rounded-lg p-2">
              <option value="monthly">חודשי</option>
              <option value="yearly">שנתי</option>
              <option value="custom">מותאם אישית</option>
            </select>
            {filterOptions.period === 'custom' && (
              <>
                <input type="date" value={filterOptions.startDate} onChange={(e) => setFilterOptions({ ...filterOptions, startDate: e.target.value })} className="border rounded-lg p-2" />
                <input type="date" value={filterOptions.endDate} onChange={(e) => setFilterOptions({ ...filterOptions, endDate: e.target.value })} className="border rounded-lg p-2" />
              </>
            )}
            <select value={filterOptions.user} onChange={(e) => setFilterOptions({ ...filterOptions, user: e.target.value })} className="border rounded-lg p-2">
              <option value="all">כולם</option>
              {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
        </div>

        {Object.keys(expensesByCategory).length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-bold text-gray-700 mb-4">התפלגות הוצאות לפי קטגוריות</h3>
            <div className="space-y-3">
              {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => {
                const percentage = (amount / summary.expense) * 100;
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{category}</span>
                      <span>₪{amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-red-400 to-red-600 h-3 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-700 mb-4">הוספה מהירה</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={newTransaction.type} onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value, category: '' })} className="border rounded-lg p-2">
              <option value="expense">הוצאה</option>
              <option value="income">הכנסה</option>
            </select>
            <input type="number" placeholder="סכום" value={newTransaction.amount} onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })} className="border rounded-lg p-2" />
            <select value={newTransaction.category} onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })} className="border rounded-lg p-2">
              <option value="">בחר קטגוריה</option>
              {categories[newTransaction.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="date" value={newTransaction.date} onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })} className="border rounded-lg p-2" />
            <select value={newTransaction.user} onChange={(e) => setNewTransaction({ ...newTransaction, user: e.target.value, account: '' })} className="border rounded-lg p-2">
              <option value="">בחר משתמש</option>
              {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
            <select value={newTransaction.account} onChange={(e) => setNewTransaction({ ...newTransaction, account: e.target.value })} className="border rounded-lg p-2">
              <option value="">בחר מקור</option>
              {accounts.filter(a => a.user === newTransaction.user).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <input type="text" placeholder="הערה (אופציונלי)" value={newTransaction.note} onChange={(e) => setNewTransaction({ ...newTransaction, note: e.target.value })} className="border rounded-lg p-2" />
            <button onClick={addTransaction} disabled={isSaving} className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
              הוסף
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderTransactions() {
    const sortedExpenses = sortTransactions(summary.filtered.filter(t => t.type === 'expense'), sortConfig);
    const sortedIncomes = sortTransactions(summary.filtered.filter(t => t.type === 'income'), sortConfig);

    const renderTable = (items, type) => (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className={`font-bold text-lg ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
            {type === 'expense' ? 'הוצאות' : 'הכנסות'}
          </h3>
          <button onClick={() => startInlineAdd(type)} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-white text-sm ${type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            <PlusCircle size={16} /> הוסף
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => requestSort('date')}>תאריך</th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => requestSort('category')}>קטגוריה</th>
                <th className="p-3 text-right">סכום</th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => requestSort('user')}>משתמש</th>
                <th className="p-3 text-right">מקור</th>
                <th className="p-3 text-right">הערה</th>
                <th className="p-3 text-right">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {isAddingInline === type && (
                <tr className="bg-yellow-50">
                  <td className="p-2"><input type="date" value={inlineTransaction.date} onChange={(e) => setInlineTransaction({...inlineTransaction, date: e.target.value})} className="border rounded p-1 w-full" /></td>
                  <td className="p-2">
                    <select value={inlineTransaction.category} onChange={(e) => setInlineTransaction({...inlineTransaction, category: e.target.value})} className="border rounded p-1 w-full">
                      <option value="">בחר</option>
                      {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="number" value={inlineTransaction.amount} onChange={(e) => setInlineTransaction({...inlineTransaction, amount: e.target.value})} className="border rounded p-1 w-full" placeholder="סכום" /></td>
                  <td className="p-2">
                    <select value={inlineTransaction.user} onChange={(e) => setInlineTransaction({...inlineTransaction, user: e.target.value, account: ''})} className="border rounded p-1 w-full">
                      <option value="">בחר</option>
                      {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select value={inlineTransaction.account} onChange={(e) => setInlineTransaction({...inlineTransaction, account: e.target.value})} className="border rounded p-1 w-full">
                      <option value="">בחר</option>
                      {accounts.filter(a => a.user === inlineTransaction.user).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="text" value={inlineTransaction.note} onChange={(e) => setInlineTransaction({...inlineTransaction, note: e.target.value})} className="border rounded p-1 w-full" /></td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button onClick={saveInlineTransaction} disabled={isSaving} className="text-green-600 hover:text-green-800"><Check size={18} /></button>
                      <button onClick={cancelInlineAdd} className="text-red-600 hover:text-red-800"><X size={18} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {items.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  {isEditingTransaction === t.id ? (
                    <>
                      <td className="p-2"><input type="date" value={editingTransaction.date} onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})} className="border rounded p-1 w-full" /></td>
                      <td className="p-2"><select value={editingTransaction.category} onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})} className="border rounded p-1 w-full">{categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></td>
                      <td className="p-2"><input type="number" value={editingTransaction.amount} onChange={(e) => setEditingTransaction({...editingTransaction, amount: e.target.value})} className="border rounded p-1 w-full" /></td>
                      <td className="p-2"><select value={editingTransaction.user} onChange={(e) => setEditingTransaction({...editingTransaction, user: e.target.value})} className="border rounded p-1 w-full">{familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></td>
                      <td className="p-2"><select value={editingTransaction.account} onChange={(e) => setEditingTransaction({...editingTransaction, account: e.target.value})} className="border rounded p-1 w-full">{accounts.filter(a => a.user === editingTransaction.user).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></td>
                      <td className="p-2"><input type="text" value={editingTransaction.note || ''} onChange={(e) => setEditingTransaction({...editingTransaction, note: e.target.value})} className="border rounded p-1 w-full" /></td>
                      <td className="p-2"><div className="flex gap-1"><button onClick={saveEditTransaction} className="text-green-600"><Check size={18} /></button><button onClick={cancelEditTransaction} className="text-red-600"><X size={18} /></button></div></td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{t.date}</td>
                      <td className="p-3">{t.category}</td>
                      <td className={`p-3 font-bold ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>₪{t.amount.toLocaleString()}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-white text-xs ${getUserColor(t.user)}`}>{t.user}</span></td>
                      <td className="p-3">{accounts.find(a => a.id === t.account)?.name || '-'}</td>
                      <td className="p-3 text-gray-500">{t.note || '-'}</td>
                      <td className="p-3"><div className="flex gap-1"><button onClick={() => startEditTransaction(t)} className="text-blue-600"><Edit2 size={18} /></button><button onClick={() => deleteTransaction(t.id)} className="text-red-600"><Trash2 size={18} /></button></div></td>
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && !isAddingInline && <tr><td colSpan="7" className="p-4 text-center text-gray-500">אין נתונים</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="font-bold text-gray-700 mb-3">סינון</h3>
          <div className="flex flex-wrap gap-3">
            <select value={filterOptions.period} onChange={(e) => setFilterOptions({...filterOptions, period: e.target.value})} className="border rounded-lg p-2">
              <option value="monthly">חודשי</option>
              <option value="yearly">שנתי</option>
              <option value="custom">מותאם אישית</option>
            </select>
            {filterOptions.period === 'custom' && (
              <>
                <input type="date" value={filterOptions.startDate} onChange={(e) => setFilterOptions({...filterOptions, startDate: e.target.value})} className="border rounded-lg p-2" />
                <input type="date" value={filterOptions.endDate} onChange={(e) => setFilterOptions({...filterOptions, endDate: e.target.value})} className="border rounded-lg p-2" />
              </>
            )}
            <select value={filterOptions.user} onChange={(e) => setFilterOptions({...filterOptions, user: e.target.value})} className="border rounded-lg p-2">
              <option value="all">כולם</option>
              {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
        </div>
        {renderTable(sortedExpenses, 'expense')}
        {renderTable(sortedIncomes, 'income')}
      </div>
    );
  }

  function renderCategories() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['expense', 'income'].map(type => (
          <div key={type} className="bg-white rounded-xl shadow-md p-4">
            <h3 className={`font-bold text-lg mb-4 ${type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
              {type === 'expense' ? 'קטגוריות הוצאות' : 'קטגוריות הכנסות'}
            </h3>
            <div className="space-y-2">
              {categories[type].map((cat, idx) => (
                <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {editingCategory?.type === type && editingCategory?.name === cat ? (
                    <div className="flex gap-2 flex-1">
                      <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 border rounded p-1" />
                      <button onClick={saveEditCategory} className="text-green-600"><Check size={18} /></button>
                      <button onClick={() => { setEditingCategory(null); setNewCategoryName(''); }} className="text-red-600"><X size={18} /></button>
                    </div>
                  ) : (
                    <>
                      <span>{cat}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveCategory(type, cat, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                        <button onClick={() => moveCategory(type, cat, 'down')} disabled={idx === categories[type].length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                        <button onClick={() => startEditCategory(type, cat)} className="text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => deleteCategory(type, cat)} className="text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input type="text" placeholder="קטגוריה חדשה" value={newCategoryType === type ? newCategoryName : ''} onChange={(e) => { setNewCategoryName(e.target.value); setNewCategoryType(type); }} onFocus={() => setNewCategoryType(type)} className="flex-1 border rounded-lg p-2" />
              <button onClick={() => { setNewCategoryType(type); addCategory(); }} className={`px-4 py-2 rounded-lg text-white ${type === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                <PlusCircle size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSources() {
    return (
      <div className="space-y-6">
        {familyMembers.map(member => (
          <div key={member.id} className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getUserColor(member.name)}`}>{member.name.charAt(0)}</span>
              <h3 className="font-bold text-lg">{member.name}</h3>
            </div>
            <div className="space-y-2">
              {getSortedAccountsForUser(member.name).map((acc) => (
                <div key={acc.id} className={`flex items-center justify-between p-3 rounded-lg ${acc.parentAccount ? 'bg-gray-100 mr-4' : 'bg-gray-50'}`}>
                  {editingAccount?.id === acc.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={editingAccount.name} onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})} className="flex-1 border rounded p-1" />
                        <input type="number" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} className="w-32 border rounded p-1" />
                      </div>
                      <div className="flex gap-2">
                        <select value={editingAccount.parentAccount || ''} onChange={(e) => setEditingAccount({...editingAccount, parentAccount: e.target.value ? e.target.value : null})} className="flex-1 border rounded p-1">
                          <option value="">ללא חשבון אב</option>
                          {getParentAccounts(member.name).filter(a => a.id !== acc.id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select value={editingAccount.billingDay === null ? '' : editingAccount.billingDay} onChange={(e) => setEditingAccount({...editingAccount, billingDay: e.target.value === '' ? null : e.target.value})} className="flex-1 border rounded p-1">
                          <option value="">ללא תאריך חיוב</option>
                          <option value="0">דיירקט</option>
                          {[...Array(28)].map((_, i) => <option key={i+1} value={i+1}>חיוב ב-{i+1} לחודש</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={updateAccountInitialBalance} className="text-green-600"><Check size={18} /></button>
                        <button onClick={() => setEditingAccount(null)} className="text-red-600"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">{acc.name}</span>
                        {acc.billingDay !== null && <span className="text-xs text-gray-500 mr-2">({getBillingDayText(acc.billingDay)})</span>}
                        <p className={`text-lg font-bold ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>₪{acc.balance.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {!acc.parentAccount && (
                          <>
                            <button onClick={() => moveAccount(member.name, acc.id, 'up')} className="text-gray-400 hover:text-gray-600"><ArrowUp size={16} /></button>
                            <button onClick={() => moveAccount(member.name, acc.id, 'down')} className="text-gray-400 hover:text-gray-600"><ArrowDown size={16} /></button>
                          </>
                        )}
                        <button onClick={() => { setEditingAccount(acc); setNewAccountBalance(acc.balance); }} className="text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => deleteAccount(acc.id)} className="text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {isAddingAccount && newAccount.user === member.name ? (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg space-y-2">
                <input type="text" value={newAccount.name} onChange={(e) => setNewAccount({...newAccount, name: e.target.value})} className="w-full border rounded p-2" placeholder="שם המקור" />
                <div className="flex gap-2">
                  <input type="number" value={newAccount.balance} onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})} className="flex-1 border rounded p-2" placeholder="יתרה" />
                  <select value={newAccount.parentAccount || ''} onChange={(e) => setNewAccount({...newAccount, parentAccount: e.target.value ? e.target.value : null})} className="flex-1 border rounded p-2">
                    <option value="">ללא חשבון אב</option>
                    {getParentAccounts(member.name).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <select value={newAccount.billingDay === null ? '' : newAccount.billingDay} onChange={(e) => setNewAccount({...newAccount, billingDay: e.target.value === '' ? null : e.target.value})} className="w-full border rounded p-2">
                  <option value="">ללא תאריך חיוב</option>
                  <option value="0">דיירקט</option>
                  {[...Array(28)].map((_, i) => <option key={i+1} value={i+1}>כרטיס אשראי - חיוב ב-{i+1}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={addNewAccount} disabled={isSaving} className="flex-1 bg-green-500 text-white rounded p-2 hover:bg-green-600 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'הוסף'}</button>
                  <button onClick={() => setIsAddingAccount(false)} className="flex-1 bg-gray-300 rounded p-2 hover:bg-gray-400">ביטול</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setIsAddingAccount(true); setNewAccount({...newAccount, user: member.name}); }} className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-purple-400 hover:text-purple-600 flex items-center justify-center gap-2">
                <PlusCircle size={20} /> הוסף מקור כספי
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderMembers() {
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-bold text-lg mb-4">משתמשים</h3>
        <div className="space-y-3">
          {familyMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              {editingMember === member.id ? (
                <div className="flex gap-2 flex-1">
                  <input type="text" value={editingMemberName} onChange={(e) => setEditingMemberName(e.target.value)} className="flex-1 border rounded p-2" />
                  <button onClick={() => updateMemberName(member.id, editingMemberName)} className="text-green-600"><Check size={20} /></button>
                  <button onClick={() => { setEditingMember(null); setEditingMemberName(''); }} className="text-red-600"><X size={20} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getUserColor(member.name)}`}>{member.name.charAt(0)}</span>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.role === 'admin' ? 'מנהל' : 'חבר'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMember(member.id); setEditingMemberName(member.name); }} className="text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={() => deleteFamilyMember(member.id)} className="text-red-600"><Trash2 size={18} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {isAddingMember ? (
          <div className="mt-4 flex gap-2">
            <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="flex-1 border rounded-lg p-2" placeholder="שם המשתמש החדש" />
            <button onClick={addFamilyMember} disabled={isSaving} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}</button>
            <button onClick={() => { setIsAddingMember(false); setNewMemberName(''); }} className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"><X size={20} /></button>
          </div>
        ) : (
          <button onClick={() => setIsAddingMember(true)} className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-500 hover:border-purple-400 hover:text-purple-600 flex items-center justify-center gap-2">
            <UserPlus size={20} /> הוסף משתמש
          </button>
        )}
      </div>
    );
  }
};

export default BudgetApp;