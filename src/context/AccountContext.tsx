import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, CategoryItem } from '../types/index.ts';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_YEARS,
  SAMPLE_REFERENCE_TRANSACTIONS,
} from '../data/defaultData.ts';
import { parseDateParts } from '../utils/finance.ts';

const STORAGE_KEY_TX = 'real_estate_account_tx_v2';
const STORAGE_KEY_CAT = 'real_estate_account_cat_v2';
const STORAGE_KEY_YEARS = 'real_estate_account_years_v2';
const STORAGE_KEY_PM = 'real_estate_account_pm_v2';

interface AccountContextType {
  transactions: Transaction[];
  categories: CategoryItem[];
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  paymentMethods: string[];
  availableYears: number[];
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedPeriod: 'all' | 'h1' | 'h2' | number;
  setSelectedPeriod: (p: 'all' | 'h1' | 'h2' | number) => void;
  activeTab: 'summary' | 'ledger' | 'categories';
  setActiveTab: (t: 'summary' | 'ledger' | 'categories') => void;
  // Transactions CRUD
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteMultipleTransactions: (ids: string[]) => void;
  // Categories CRUD
  addCategory: (name: string, type: '수입' | '지출', color?: string) => boolean;
  updateCategory: (id: string, newName: string, color?: string) => boolean;
  deleteCategory: (id: string) => boolean;
  // Year management
  addYear: (year: number) => boolean;
  // Payment methods
  addPaymentMethod: (method: string) => void;
  deletePaymentMethod: (method: string) => void;
  // Data management
  loadSampleData: () => void;
  clearAllTransactions: () => void;
  importTransactions: (imported: Transaction[]) => void;
}

const AccountContext = createContext<AccountContextType | null>(null);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Transactions - default to EMPTY array as requested by user
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load transactions from localStorage', e);
    }
    return [];
  });

  // 2. Categories
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
    return [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];
  });

  // 3. Years
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_YEARS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load years', e);
    }
    return DEFAULT_YEARS;
  });

  // 4. Payment methods
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PM);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load payment methods', e);
    }
    return DEFAULT_PAYMENT_METHODS;
  });

  // View state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX);
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list) && list.length > 0) {
          const firstDate = list[0]?.date;
          const parsed = parseDateParts(firstDate);
          if (parsed.year) return parsed.year;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 2026;
  });

  // Period: 'all' | 'h1' | 'h2' | 1..12
  // Default to 7 (July) or current month
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'h1' | 'h2' | number>(7);

  // Tab: 'summary' | 'ledger' | 'categories'
  const [activeTab, setActiveTab] = useState<'summary' | 'ledger' | 'categories'>('summary');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch (e) {
      console.error('Save tx failed', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAT, JSON.stringify(categories));
    } catch (e) {
      console.error('Save cat failed', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_YEARS, JSON.stringify(availableYears));
    } catch (e) {
      console.error('Save years failed', e);
    }
  }, [availableYears]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PM, JSON.stringify(paymentMethods));
    } catch (e) {
      console.error('Save pm failed', e);
    }
  }, [paymentMethods]);

  // Derived category lists
  const incomeCategories = useMemo(
    () => categories.filter(c => c.type === '수입'),
    [categories]
  );
  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === '지출'),
    [categories]
  );

  // Auto-register years from transactions
  useEffect(() => {
    const txYears = transactions
      .map(t => parseInt(t.date?.split('-')[0], 10))
      .filter(y => !isNaN(y) && y > 1900 && y < 2200);

    const merged = Array.from(new Set([...availableYears, ...txYears])).sort((a, b) => b - a);
    if (merged.length !== availableYears.length) {
      setAvailableYears(merged);
    }
  }, [transactions, availableYears]);

  // Transaction CRUD
  const addTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>): Transaction => {
    const parsed = parseDateParts(data.date);
    const normalizedDate = parsed.formatted || data.date;
    const newTx: Transaction = {
      ...data,
      date: normalizedDate,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
    };
    setTransactions(prev => [newTx, ...prev]);

    // Ensure the transaction year is in availableYears and auto-focus it
    if (parsed.year) {
      if (!availableYears.includes(parsed.year)) {
        addYear(parsed.year);
      }
      setSelectedYear(parsed.year);
    }

    return newTx;
  };

  const updateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, ...updatedFields };
          return updated;
        }
        return t;
      })
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const deleteMultipleTransactions = (ids: string[]) => {
    const idSet = new Set(ids);
    setTransactions(prev => prev.filter(t => !idSet.has(t.id)));
  };

  // Category CRUD
  const addCategory = (name: string, type: '수입' | '지출', color?: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Check duplicate
    if (categories.some(c => c.type === type && c.name.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    const newCat: CategoryItem = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: trimmed,
      type,
      color: color || (type === '수입' ? '#10B981' : '#059669'),
      isCustom: true,
    };
    setCategories(prev => [...prev, newCat]);
    return true;
  };

  const updateCategory = (id: string, newName: string, color?: string): boolean => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const target = categories.find(c => c.id === id);
    if (!target) return false;

    const oldName = target.name;
    // Update category
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, name: trimmed, color: color || c.color } : c))
    );

    // Also update transactions that used the old name
    if (oldName !== trimmed) {
      setTransactions(prev =>
        prev.map(t => {
          if (t.type === target.type && t.category === oldName) {
            return { ...t, category: trimmed };
          }
          return t;
        })
      );
    }
    return true;
  };

  const deleteCategory = (id: string): boolean => {
    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  };

  // Year management
  const addYear = (year: number): boolean => {
    if (isNaN(year) || year < 1970 || year > 2100) return false;
    if (availableYears.includes(year)) {
      setSelectedYear(year);
      return true;
    }
    const updated = Array.from(new Set([...availableYears, year])).sort((a, b) => b - a);
    setAvailableYears(updated);
    setSelectedYear(year);
    return true;
  };

  // Payment methods
  const addPaymentMethod = (method: string) => {
    const trimmed = method.trim();
    if (!trimmed || paymentMethods.includes(trimmed)) return;
    setPaymentMethods(prev => [...prev, trimmed]);
  };

  const deletePaymentMethod = (method: string) => {
    setPaymentMethods(prev => prev.filter(m => m !== method));
  };

  // Sample data & reset
  const loadSampleData = () => {
    setTransactions(SAMPLE_REFERENCE_TRANSACTIONS);
    setSelectedYear(2026);
    setSelectedPeriod(7);
  };

  const clearAllTransactions = () => {
    setTransactions([]);
  };

  const importTransactions = (imported: Transaction[]) => {
    if (!Array.isArray(imported)) return;
    setTransactions(prev => {
      // Merge by ID or append
      const existingIds = new Set(prev.map(t => t.id));
      const newItems = imported.filter(t => !existingIds.has(t.id));
      return [...newItems, ...prev];
    });
  };

  return (
    <AccountContext.Provider
      value={{
        transactions,
        categories,
        incomeCategories,
        expenseCategories,
        paymentMethods,
        availableYears,
        selectedYear,
        setSelectedYear,
        selectedPeriod,
        setSelectedPeriod,
        activeTab,
        setActiveTab,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        addYear,
        addPaymentMethod,
        deletePaymentMethod,
        loadSampleData,
        clearAllTransactions,
        importTransactions,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
