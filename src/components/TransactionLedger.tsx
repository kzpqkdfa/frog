import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import { Transaction, TransactionType } from '../types/index.ts';
import { formatKRW, parseDateParts } from '../utils/finance.ts';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { exportToExcel, parseExcelFile } from '../utils/excelHelper.ts';

interface TransactionLedgerProps {
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  onOpenAddModal,
  onEditTransaction,
}) => {
  const {
    transactions,
    selectedYear,
    setSelectedYear,
    availableYears,
    addTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    incomeCategories,
    expenseCategories,
    paymentMethods,
    importTransactions,
  } = useAccount();

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>(() => {
    return selectedYear ? String(selectedYear) : 'all';
  });
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Keep filterYear and inlineDate in sync with selectedYear
  useEffect(() => {
    if (selectedYear) {
      setFilterYear(String(selectedYear));
      const today = new Date();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setInlineDate(`${selectedYear}-${m}-${d}`);
    }
  }, [selectedYear]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Inline Quick Add state
  const [inlineDate, setInlineDate] = useState(() => {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  });
  const [inlineType, setInlineType] = useState<TransactionType>('지출');
  const [inlineCategory, setInlineCategory] = useState<string>('식비');
  const [inlineDescription, setInlineDescription] = useState<string>('');
  const [inlineAmount, setInlineAmount] = useState<string>('');
  const [inlinePayment, setInlinePayment] = useState<string>('신용카드');
  const [inlineMemo, setInlineMemo] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available categories for inline form
  const inlineCategoryOptions = inlineType === '수입' ? incomeCategories : expenseCategories;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const { year: tYear, month: tMonth } = parseDateParts(t.date);

      // 1. Year match
      if (filterYear !== 'all') {
        if (tYear !== parseInt(filterYear, 10)) return false;
      }

      // 2. Month match
      if (filterMonth !== 'all') {
        if (tMonth !== parseInt(filterMonth, 10)) return false;
      }

      // 3. Type match
      if (filterType !== 'all' && t.type !== filterType) return false;

      // 4. Category match
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      // 5. Payment match
      if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;

      // 6. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(term);
        const matchMemo = t.memo?.toLowerCase().includes(term);
        const matchCat = t.category?.toLowerCase().includes(term);
        if (!matchDesc && !matchMemo && !matchCat) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by date descending
      return (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt;
    });
  }, [
    transactions,
    filterYear,
    filterMonth,
    filterType,
    filterCategory,
    filterPayment,
    searchTerm,
  ]);

  // Aggregate stats for filtered transactions
  const filteredSummary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach(t => {
      if (t.type === '수입') inc += t.amount;
      else if (t.type === '지출') exp += t.amount;
    });
    return {
      totalCount: filteredTransactions.length,
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp,
    };
  }, [filteredTransactions]);

  // Handle Quick Inline Submit
  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(inlineAmount.replace(/[^0-9]/g, ''), 10) || 0;
    if (!inlineDescription.trim()) {
      alert('내역을 입력해주세요.');
      return;
    }
    if (amountNum <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    addTransaction({
      date: inlineDate,
      type: inlineType,
      category: inlineCategory || inlineCategoryOptions[0]?.name || '기타',
      description: inlineDescription.trim(),
      amount: amountNum,
      paymentMethod: inlinePayment,
      memo: inlineMemo.trim(),
    });

    // Reset some fields for smooth continuous entry
    setInlineDescription('');
    setInlineAmount('');
    setInlineMemo('');
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`선택한 ${selectedIds.length}개의 거래 내역을 삭제하시겠습니까?`)) {
      deleteMultipleTransactions(selectedIds);
      setSelectedIds([]);
    }
  };

  // Excel upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length > 0) {
        const withIds = parsed.map((item, idx) => ({
          ...item,
          id: `imp_${Date.now()}_${idx}`,
          createdAt: Date.now() + idx,
        }));
        importTransactions(withIds as Transaction[]);
        alert(`성공적으로 ${parsed.length}개의 거래 내역을 불러왔습니다.`);
      } else {
        alert('가져올 거래 내역을 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('엑셀 파일을 읽는 도중 오류가 발생했습니다.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner matching Image 2: [ 2026년 가계부 거래 내역 ] */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
              <span>[ {filterYear === 'all' ? '전체' : `${filterYear}년`} 가계부 거래 내역 ]</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              상세 거래 내역을 등록, 수정 및 엑셀과 연동하여 관리하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>상세 거래 등록</span>
            </button>

            <button
              type="button"
              onClick={() => exportToExcel(filteredTransactions, `${selectedYear}년_거래내역.xlsx`)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
              <span>Excel 내보내기</span>
            </button>

            <label className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              <span>Excel 불러오기</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* 2. Fast Inline Quick-Add Bar */}
        <div className="mt-5 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
          <div className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>빠른 거래 한줄 입력</span>
          </div>

          <form onSubmit={handleInlineSubmit} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {/* 날짜 */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">날짜</label>
              <input
                type="date"
                required
                value={inlineDate}
                onChange={e => setInlineDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 구분 */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">구분</label>
              <select
                value={inlineType}
                onChange={e => {
                  const newType = e.target.value as TransactionType;
                  setInlineType(newType);
                  const newCats = newType === '수입' ? incomeCategories : expenseCategories;
                  if (newCats.length > 0) setInlineCategory(newCats[0].name);
                }}
                className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-bold focus:ring-1 focus:ring-emerald-600 focus:outline-none ${
                  inlineType === '지출' ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                }`}
              >
                <option value="지출">지출</option>
                <option value="수입">수입</option>
              </select>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">카테고리</label>
              <select
                value={inlineCategory}
                onChange={e => setInlineCategory(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              >
                {inlineCategoryOptions.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 내역 */}
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">내역 (적요)</label>
              <input
                type="text"
                required
                value={inlineDescription}
                onChange={e => setInlineDescription(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 금액 */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">금액 (원)</label>
              <input
                type="text"
                required
                placeholder="0"
                value={inlineAmount ? Number(inlineAmount.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : ''}
                onChange={e => setInlineAmount(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-right font-bold bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 결제수단 */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">결제수단</label>
              <select
                value={inlinePayment}
                onChange={e => setInlinePayment(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              >
                {paymentMethods.map(pm => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            {/* 등록 버튼 */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold shadow-sm transition active:scale-95"
              >
                + 등록
              </button>
            </div>
          </form>
        </div>

        {/* 3. Filters and Search Row */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="내역, 카테고리, 메모 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
              />
            </div>

            {/* Year filter */}
            <select
              value={filterYear}
              onChange={e => {
                const val = e.target.value;
                setFilterYear(val);
                if (val !== 'all') {
                  setSelectedYear(parseInt(val, 10));
                }
              }}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold text-emerald-950"
            >
              <option value="all">전체 연도</option>
              {availableYears.map(y => (
                <option key={y} value={String(y)}>
                  {y}년
                </option>
              ))}
            </select>

            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">전체 월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>
                  {m}월
                </option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">전체 구분</option>
              <option value="지출">지출만</option>
              <option value="수입">수입만</option>
            </select>

            {/* Reset filters */}
            {(searchTerm || filterMonth !== 'all' || filterType !== 'all' || filterYear !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterYear('all');
                  setFilterMonth('all');
                  setFilterType('all');
                }}
                className="text-gray-500 hover:text-gray-800 underline px-1 text-xs"
              >
                필터 초기화
              </button>
            )}
          </div>

          {/* Batch Delete */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택 삭제 ({selectedIds.length}개)</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Filtered Summary Bar */}
      <div className="bg-emerald-950 text-white rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300 font-medium">조회 결과:</span>
          <span className="font-bold text-white text-base">{filteredSummary.totalCount}건</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-300">총 수입:</span>
            <span className="font-bold text-emerald-400 tabular-nums">
              {formatKRW(filteredSummary.totalIncome)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-300">총 지출:</span>
            <span className="font-bold text-rose-300 tabular-nums">
              {formatKRW(filteredSummary.totalExpense)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-emerald-800">
            <span className="text-emerald-300">수지 잔액:</span>
            <span
              className={`font-bold tabular-nums text-base ${
                filteredSummary.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {formatKRW(filteredSummary.netBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Transactions Table matching Excel Image 2 exactly */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            {/* Table Header matching Excel dark teal header */}
            <thead>
              <tr className="bg-emerald-900 text-white border-b border-emerald-800 font-semibold tracking-wide">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredTransactions.length > 0 &&
                      selectedIds.length === filteredTransactions.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    aria-label="전체 선택"
                  />
                </th>
                <th className="py-3 px-3 w-28">날짜</th>
                <th className="py-3 px-3 w-16 text-center">구분</th>
                <th className="py-3 px-3 w-28">카테고리</th>
                <th className="py-3 px-3 min-w-[160px]">내역</th>
                <th className="py-3 px-3 w-32 text-right">금액</th>
                <th className="py-3 px-3 w-24 text-center">결제수단</th>
                <th className="py-3 px-3 min-w-[140px]">비고</th>
                <th className="py-3 px-3 w-20 text-center">관리</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <AlertCircle className="w-9 h-9 mx-auto mb-2 text-emerald-600/70" />
                    {transactions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-bold text-gray-800 text-sm">
                          {filterYear !== 'all' ? `${filterYear}년에는 조회되는 거래 내역이 없습니다.` : '현재 필터 조건에 맞는 거래 내역이 없습니다.'}
                        </p>
                        <p className="text-xs text-gray-500">
                          (전체 등록된 거래 내역: 총 {transactions.length}건)
                        </p>
                        <div className="pt-2 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterYear('all');
                              setFilterMonth('all');
                              setFilterType('all');
                              setSearchTerm('');
                            }}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            전체 연도 거래 내역 보기 ({transactions.length}건)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-gray-600">등록된 거래 내역이 없습니다.</p>
                        <p className="text-xs text-gray-400 mt-1">
                          상단의 한 줄 입력기 또는 '상세 거래 등록' 버튼으로 거래를 추가해보세요.
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isChecked = selectedIds.includes(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-emerald-50/60 transition ${
                        idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                      } ${isChecked ? 'bg-emerald-50/90' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(tx.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* 날짜 */}
                      <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* 구분 */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            tx.type === '수입'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* 카테고리 */}
                      <td className="py-2.5 px-3 font-semibold text-emerald-950 whitespace-nowrap">
                        {tx.category}
                      </td>

                      {/* 내역 */}
                      <td className="py-2.5 px-3 text-gray-900 font-medium">
                        {tx.description}
                      </td>

                      {/* 금액 */}
                      <td className="py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap text-gray-900">
                        <span
                          className={tx.type === '수입' ? 'text-emerald-700' : 'text-gray-900'}
                        >
                          {formatKRW(tx.amount)}
                        </span>
                      </td>

                      {/* 결제수단 */}
                      <td className="py-2.5 px-3 text-center text-xs text-gray-600 whitespace-nowrap">
                        {tx.paymentMethod ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                            {tx.paymentMethod}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* 비고 */}
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {tx.memo || '-'}
                      </td>

                      {/* 관리 (수정, 삭제) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            title="수정"
                            className="p-1 rounded text-gray-500 hover:text-emerald-700 hover:bg-emerald-100/60 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`'${tx.description}' 내역을 삭제하시겠습니까?`)) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            title="삭제"
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
