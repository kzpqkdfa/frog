import React, { useState, useEffect } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import { Transaction, TransactionType } from '../types/index.ts';
import { X, Check, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatKRW } from '../utils/finance.ts';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editTransaction,
}) => {
  const {
    addTransaction,
    updateTransaction,
    incomeCategories,
    expenseCategories,
    paymentMethods,
    selectedYear,
  } = useAccount();

  const [type, setType] = useState<TransactionType>('지출');
  const [date, setDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('신용카드');
  const [memo, setMemo] = useState<string>('');

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setDate(editTransaction.date);
      setCategory(editTransaction.category);
      setDescription(editTransaction.description);
      setAmountStr(String(editTransaction.amount));
      setPaymentMethod(editTransaction.paymentMethod || '신용카드');
      setMemo(editTransaction.memo || '');
    } else {
      // Default date: today, but aligned to selectedYear
      const today = new Date();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setDate(`${selectedYear}-${m}-${d}`);
      setType('지출');
      setDescription('');
      setAmountStr('');
      setMemo('');
      setPaymentMethod('신용카드');
    }
  }, [editTransaction, isOpen, selectedYear]);

  // Update default category when type changes or categories update
  useEffect(() => {
    const list = type === '수입' ? incomeCategories : expenseCategories;
    if (list.length > 0 && (!category || !list.some(c => c.name === category))) {
      setCategory(list[0].name);
    }
  }, [type, incomeCategories, expenseCategories]);

  if (!isOpen) return null;

  const currentCategories = type === '수입' ? incomeCategories : expenseCategories;
  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;

  const handleQuickAddAmount = (addValue: number) => {
    const current = numericAmount;
    setAmountStr(String(current + addValue));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('내역을 입력해주세요.');
      return;
    }
    if (numericAmount <= 0) {
      alert('금액을 1원 이상 입력해주세요.');
      return;
    }

    if (editTransaction) {
      updateTransaction(editTransaction.id, {
        date,
        type,
        category: category || (currentCategories[0]?.name ?? '기타'),
        description: description.trim(),
        amount: numericAmount,
        paymentMethod,
        memo: memo.trim(),
      });
    } else {
      addTransaction({
        date,
        type,
        category: category || (currentCategories[0]?.name ?? '기타'),
        description: description.trim(),
        amount: numericAmount,
        paymentMethod,
        memo: memo.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 flex items-center justify-between text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {editTransaction ? '거래 내역 수정' : '새 거래 내역 입력'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700/60 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 수입 / 지출 구분 탭 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">구분</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setType('지출')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md font-semibold text-sm transition ${
                  type === '지출'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>지출</span>
              </button>
              <button
                type="button"
                onClick={() => setType('수입')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-md font-semibold text-sm transition ${
                  type === '수입'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>수입</span>
              </button>
            </div>
          </div>

          {/* 날짜 & 카테고리 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                날짜 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                카테고리 <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm bg-white"
              >
                {currentCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 내역 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              내역 (적요) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
            />
          </div>

          {/* 금액 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                금액 <span className="text-rose-500">*</span>
              </label>
              {numericAmount > 0 && (
                <span className="text-xs font-bold text-emerald-700">
                  {formatKRW(numericAmount)}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="0"
                value={amountStr ? Number(numericAmount).toLocaleString('ko-KR') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setAmountStr(raw);
                }}
                className="w-full px-3 py-2.5 text-right font-bold text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-10"
              />
              <span className="absolute right-3.5 top-3 text-sm text-gray-500 font-medium">원</span>
            </div>

            {/* Quick Amount Helper Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[10000, 50000, 100000, 500000, 1000000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 transition"
                >
                  +{val >= 10000 ? `${val / 10000}만` : `${val}원`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition"
              >
                초기화
              </button>
            </div>
          </div>

          {/* 결제수단 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">결제수단</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {paymentMethods.map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-1.5 px-2 text-xs rounded-md border font-medium transition ${
                    paymentMethod === pm
                      ? 'bg-emerald-100 border-emerald-600 text-emerald-900 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* 비고 / 메모 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">비고 / 메모</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold shadow transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editTransaction ? '수정 완료' : '등록하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
