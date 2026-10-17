export type TransactionType = '수입' | '지출';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  memo: string;
  createdAt: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  isCustom?: boolean;
}

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface PeriodSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeCategories: CategorySummary[];
  expenseCategories: CategorySummary[];
  transactionsCount: number;
}

export interface MonthlyTrendItem {
  month: number;
  monthLabel: string;
  income: number;
  expense: number;
  balance: number;
}
