import React, { useMemo } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import {
  filterTransactionsByPeriod,
  calculatePeriodSummary,
  formatKRW,
} from '../utils/finance.ts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Filter,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { exportSummaryToExcel } from '../utils/excelHelper.ts';

export const MonthlySummary: React.FC = () => {
  const {
    transactions,
    categories,
    selectedYear,
    selectedPeriod,
    setSelectedPeriod,
    setActiveTab,
  } = useAccount();

  // Filter transactions for currently selected period
  const periodTransactions = useMemo(() => {
    return filterTransactionsByPeriod(transactions, selectedYear, selectedPeriod);
  }, [transactions, selectedYear, selectedPeriod]);

  // Compute summaries
  const summary = useMemo(() => {
    return calculatePeriodSummary(periodTransactions, categories);
  }, [periodTransactions, categories]);

  // Period title label for header
  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'all') return `${selectedYear}년도 연간 전체 종합 요약`;
    if (selectedPeriod === 'h1') return `${selectedYear}년도 상반기 가계부 종합 요약`;
    if (selectedPeriod === 'h2') return `${selectedYear}년도 하반기 가계부 종합 요약`;
    return `${selectedYear}년도 ${selectedPeriod}월 가계부 종합 요약`;
  }, [selectedYear, selectedPeriod]);

  // Sub-header badge
  const subPeriodLabel = useMemo(() => {
    if (selectedPeriod === 'all') return `${selectedYear}년 연간`;
    if (selectedPeriod === 'h1') return `${selectedYear}년도 상반기 (1~6월)`;
    if (selectedPeriod === 'h2') return `${selectedYear}년도 하반기 (7~12월)`;
    return `${selectedYear}년도 ${selectedPeriod}월`;
  }, [selectedYear, selectedPeriod]);

  // Handle export summary to excel
  const handleExportSummary = () => {
    exportSummaryToExcel(
      selectedYear,
      periodLabel,
      summary.totalIncome,
      summary.totalExpense,
      summary.incomeCategories,
      summary.expenseCategories,
      `${selectedYear}년_${subPeriodLabel.replace(/[\s\(\)~]/g, '_')}_요약.xlsx`
    );
  };

  // Max expense amount for bar chart scaling
  const maxExpenseAmount = useMemo(() => {
    const maxVal = Math.max(...summary.expenseCategories.map(c => c.amount), 100000);
    // Round up to nice threshold
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / magnitude) * magnitude;
  }, [summary.expenseCategories]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Period Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold tracking-wider uppercase mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>종합 재정 보고서</span>
            </div>
            {/* Title formatted like user's reference: [ 2026년도 하반기 가계부 종합 요약 ] */}
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
              <span>[ {periodLabel} ]</span>
            </h2>
          </div>

          {/* Quick Excel Export & Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSummary}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>요약 엑셀 다운로드</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <span>상세 거래 내역 보기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Period Selector Tabs (Months 1~12 + Half years) */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Half year and Whole Year toggles */}
          <div className="flex items-center space-x-1.5 bg-emerald-50/70 p-1 rounded-lg border border-emerald-100">
            <button
              type="button"
              onClick={() => setSelectedPeriod('h1')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                selectedPeriod === 'h1'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              상반기 (1~6월)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('h2')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                selectedPeriod === 'h2'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              하반기 (7~12월)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                selectedPeriod === 'all'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-900 hover:bg-emerald-100'
              }`}
            >
              연간 전체
            </button>
          </div>

          {/* Month buttons (1월 ~ 12월) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedPeriod(m)}
                className={`min-w-[38px] px-2.5 py-1 text-xs font-semibold rounded-md transition text-center ${
                  selectedPeriod === m
                    ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600'
                    : 'bg-white hover:bg-emerald-50 text-gray-700 border border-gray-200'
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards (총 수입, 총 지출, 당월 잔액 - matching rows 3-4 in Image 1) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 총 수입 */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              총 수입
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {formatKRW(summary.totalIncome)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {subPeriodLabel} 입금 합계
            </p>
          </div>
        </div>

        {/* 총 지출 */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-900/5 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              총 지출
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {formatKRW(summary.totalExpense)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {subPeriodLabel} 지출 합계
            </p>
          </div>
        </div>

        {/* 당월 잔액 */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5 relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-50 ${
              summary.netBalance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'
            }`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              당월 잔액 (수지 차액)
            </span>
            <div
              className={`p-2 rounded-lg ${
                summary.netBalance >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold ${
                summary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatKRW(summary.netBalance)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {summary.netBalance >= 0 ? '순흑자 유지 중' : '지출 초과 상태'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Tables (Income/Expense) and Right Charts (Bar Chart & Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Category Breakdown Tables (matching Excel Left Tables) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 수입 카테고리 테이블 */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                수입 카테고리
              </span>
              <span className="font-bold text-sm">합계 금액</span>
            </div>
            <div className="divide-y divide-gray-100 text-sm">
              {summary.incomeCategories.map(item => (
                <div
                  key={item.category}
                  className="px-4 py-2 flex items-center justify-between hover:bg-emerald-50/50 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 font-medium group-hover:text-emerald-900">
                      {item.category}
                    </span>
                    {item.count > 0 && (
                      <span className="text-[11px] text-gray-400">({item.count}건)</span>
                    )}
                  </div>
                  <span
                    className={`font-semibold tabular-nums ${
                      item.amount > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'
                    }`}
                  >
                    {formatKRW(item.amount)}
                  </span>
                </div>
              ))}
            </div>
            {/* 수입 합계 row */}
            <div className="bg-emerald-100/70 border-t-2 border-emerald-300 px-4 py-2.5 flex items-center justify-between font-bold text-sm text-emerald-950">
              <span>수입 합계</span>
              <span className="tabular-nums text-emerald-900 text-base">
                {formatKRW(summary.totalIncome)}
              </span>
            </div>
          </div>

          {/* 지출 카테고리 테이블 (matching Excel Left Table) */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-sm tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                지출 카테고리
              </span>
              <span className="font-bold text-sm">합계 금액</span>
            </div>
            <div className="divide-y divide-gray-100 text-sm max-h-[480px] overflow-y-auto">
              {summary.expenseCategories.map(item => (
                <div
                  key={item.category}
                  className="px-4 py-2 flex items-center justify-between hover:bg-emerald-50/50 transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 font-medium group-hover:text-emerald-900">
                      {item.category}
                    </span>
                    {item.count > 0 && (
                      <span className="text-[11px] text-gray-400">({item.count}건)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.percentage > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                        {item.percentage.toFixed(1)}%
                      </span>
                    )}
                    <span
                      className={`font-semibold tabular-nums ${
                        item.amount > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'
                      }`}
                    >
                      {formatKRW(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* 지출 합계 row */}
            <div className="bg-emerald-100/70 border-t-2 border-emerald-300 px-4 py-2.5 flex items-center justify-between font-bold text-sm text-emerald-950">
              <span>지출 합계</span>
              <span className="tabular-nums text-emerald-950 text-base">
                {formatKRW(summary.totalExpense)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Charts and Visual Breakdown (matching Excel Right Chart) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. 카테고리별 지출 현황 (Bar Chart exactly reflecting Image 1) */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-700" />
                  <span>카테고리별 지출 현황</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {subPeriodLabel} 항목별 지출 규모 비교
                </p>
              </div>
              <span className="text-xs text-gray-500 font-medium">단위: 원</span>
            </div>

            {summary.expenseCategories.filter(c => c.amount > 0).length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-emerald-200" />
                <p className="text-sm font-medium">해당 기간에 등록된 지출 내역이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">
                  상단의 '+ 거래 입력' 버튼을 눌러 지출 내역을 추가해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual Bar Columns matching Excel Image 1 */}
                <div className="relative pt-6 pb-2">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-gray-400 w-full" />
                    <div className="border-b border-gray-400 w-full" />
                    <div className="border-b border-gray-400 w-full" />
                    <div className="border-b border-gray-400 w-full" />
                  </div>

                  {/* Horizontal Bar rows with high readability */}
                  <div className="space-y-3 relative z-10">
                    {summary.expenseCategories
                      .filter(c => c.amount > 0)
                      .slice(0, 10)
                      .map((cat, idx) => {
                        const ratio = maxExpenseAmount > 0 ? (cat.amount / maxExpenseAmount) * 100 : 0;
                        return (
                          <div key={cat.category} className="group">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                {cat.category}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-700 font-bold tabular-nums">
                                  {formatKRW(cat.amount)}
                                </span>
                                <span className="text-gray-400 text-[11px] w-12 text-right">
                                  {cat.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                                style={{ width: `${Math.max(ratio, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Top spending insight */}
                {summary.expenseCategories.length > 0 && summary.expenseCategories[0].amount > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900">
                    <PieIcon className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">주요 지출 분석:</span> 이번 기간 가장 큰 지출 항목은{' '}
                      <span className="font-bold underline decoration-emerald-600">
                        {summary.expenseCategories[0].category}
                      </span>
                      ({formatKRW(summary.expenseCategories[0].amount)}, 전체의{' '}
                      {summary.expenseCategories[0].percentage.toFixed(1)}%) 입니다.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Monthly Trend Preview (연간 1월~12월 흐름 미리보기) */}
          <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-5">
            <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-1.5">
              <span>{selectedYear}년 월별 지출 현황 요약</span>
            </h4>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 text-center">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const mFilterTx = filterTransactionsByPeriod(transactions, selectedYear, m);
                const mSummary = calculatePeriodSummary(mFilterTx, categories);
                const isSelected = selectedPeriod === m;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedPeriod(m)}
                    className={`p-1.5 rounded-lg border transition flex flex-col items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-800 border-emerald-800 text-white shadow-sm'
                        : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-100/70 text-gray-700'
                    }`}
                  >
                    <span className="font-bold text-[11px] mb-1">{m}월</span>
                    <span
                      className={`text-[10px] truncate max-w-full font-medium ${
                        isSelected
                          ? 'text-emerald-200'
                          : mSummary.totalExpense > 0
                          ? 'text-emerald-900 font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {mSummary.totalExpense > 0
                        ? `${Math.round(mSummary.totalExpense / 10000)}만`
                        : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
