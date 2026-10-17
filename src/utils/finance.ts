import type { Transaction, PeriodSummary, CategorySummary, MonthlyTrendItem, CategoryItem } from '../types/index.ts';

/**
 * Format number into Korean Won currency string (e.g. 1,000,000원)
 */
export function formatKRW(amount: number, withSuffix: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return withSuffix ? '0원' : '0';
  }
  const formatted = Math.round(amount).toLocaleString('ko-KR');
  return withSuffix ? `${formatted}원` : formatted;
}

/**
 * Parse currency or numeric string into integer
 */
export function parseAmount(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const clean = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Robustly parses year, month, and formatted date from various date string formats
 * Handles: '2026-10-17', '2026.10.17', '2026/10/17', '2026. 10. 17', '20261017', Excel serials, etc.
 */
export function parseDateParts(dateStr: string | undefined | null): {
  year: number | null;
  month: number | null;
  day: number | null;
  formatted: string;
} {
  if (!dateStr) return { year: null, month: null, day: null, formatted: '' };

  const str = String(dateStr).trim();

  // Excel serial number (e.g. 45000)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return {
        year: y,
        month: m,
        day,
        formatted: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      };
    }
  }

  // Matches YYYY[delim]MM[delim]DD
  const match = str.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }

  // Matches YYYYMMDD
  const matchCompact = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (matchCompact) {
    const y = parseInt(matchCompact[1], 10);
    const m = parseInt(matchCompact[2], 10);
    const d = parseInt(matchCompact[3], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }

  // Fallback: extract 4-digit year and first 1-2 digit month after it
  const yMatch = str.match(/(\d{4})/);
  const mMatch = str.match(/\d{4}[^\d]?(\d{1,2})/);
  const y = yMatch ? parseInt(yMatch[1], 10) : null;
  const m = mMatch ? parseInt(mMatch[1], 10) : null;

  return {
    year: y,
    month: m,
    day: null,
    formatted: str,
  };
}

/**
 * Filter transactions by year and optional month or half-year
 * monthFilter:
 * - 'all': all months in year
 * - 'h1': 1st half (months 1-6)
 * - 'h2': 2nd half (months 7-12)
 * - 1..12: specific month
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  year: number,
  periodFilter: 'all' | 'h1' | 'h2' | number
): Transaction[] {
  return transactions.filter(t => {
    if (!t.date) return false;
    const { year: tYear, month: tMonth } = parseDateParts(t.date);

    if (tYear !== year) return false;

    if (periodFilter === 'all') return true;
    if (periodFilter === 'h1') return tMonth !== null && tMonth >= 1 && tMonth <= 6;
    if (periodFilter === 'h2') return tMonth !== null && tMonth >= 7 && tMonth <= 12;
    if (typeof periodFilter === 'number') return tMonth === periodFilter;

    return true;
  });
}

/**
 * Calculate comprehensive period summary
 */
export function calculatePeriodSummary(
  filteredTransactions: Transaction[],
  availableCategories: CategoryItem[]
): PeriodSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  const incomeMap: Record<string, { amount: number; count: number }> = {};
  const expenseMap: Record<string, { amount: number; count: number }> = {};

  // Initialize with known categories to ensure consistent order
  availableCategories.forEach(cat => {
    if (cat.type === '수입') {
      incomeMap[cat.name] = { amount: 0, count: 0 };
    } else {
      expenseMap[cat.name] = { amount: 0, count: 0 };
    }
  });

  filteredTransactions.forEach(t => {
    const amt = t.amount || 0;
    if (t.type === '수입') {
      totalIncome += amt;
      if (!incomeMap[t.category]) {
        incomeMap[t.category] = { amount: 0, count: 0 };
      }
      incomeMap[t.category].amount += amt;
      incomeMap[t.category].count += 1;
    } else if (t.type === '지출') {
      totalExpense += amt;
      if (!expenseMap[t.category]) {
        expenseMap[t.category] = { amount: 0, count: 0 };
      }
      expenseMap[t.category].amount += amt;
      expenseMap[t.category].count += 1;
    }
  });

  const incomeCategories: CategorySummary[] = Object.entries(incomeMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
    }))
    // Keep order according to availableCategories if defined, or descending amount
    .sort((a, b) => b.amount - a.amount);

  const expenseCategories: CategorySummary[] = Object.entries(expenseMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    incomeCategories,
    expenseCategories,
    transactionsCount: filteredTransactions.length,
  };
}

/**
 * Calculate 12-month trends for a given year
 */
export function calculateMonthlyTrends(
  transactions: Transaction[],
  year: number
): MonthlyTrendItem[] {
  const months: MonthlyTrendItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthTx = transactions.filter(t => {
      const { year: tYear, month: tMonth } = parseDateParts(t.date);
      return tYear === year && tMonth === m;
    });

    let inc = 0;
    let exp = 0;
    monthTx.forEach(t => {
      if (t.type === '수입') inc += t.amount;
      else if (t.type === '지출') exp += t.amount;
    });

    months.push({
      month: m,
      monthLabel: `${m}월`,
      income: inc,
      expense: exp,
      balance: inc - exp,
    });
  }

  return months;
}
