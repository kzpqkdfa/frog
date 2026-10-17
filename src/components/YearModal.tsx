import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import { X, CalendarPlus, Check } from 'lucide-react';

interface YearModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YearModal: React.FC<YearModalProps> = ({ isOpen, onClose }) => {
  const { availableYears, addYear, selectedYear, setSelectedYear } = useAccount();
  const [newYearInput, setNewYearInput] = useState<string>(
    String(new Date().getFullYear() + 1)
  );
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(newYearInput.trim(), 10);
    if (isNaN(parsed) || parsed < 1980 || parsed > 2150) {
      setErrorMsg('올바른 4자리 연도(예: 2027)를 입력해주세요.');
      return;
    }
    const success = addYear(parsed);
    if (!success) {
      setErrorMsg('연도를 추가할 수 없습니다.');
      return;
    }
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-4 flex items-center justify-between text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-emerald-400" />
            <span>새 가계부 연도 추가</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            새로운 연도를 추가하여 연도별로 가계부와 거래 내역을 독립적으로 관리할 수 있습니다.
          </p>

          <form onSubmit={handleAddYear} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                추가할 연도 입력 (4자리)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1980"
                  max="2150"
                  required
                  placeholder="예: 2027"
                  value={newYearInput}
                  onChange={e => {
                    setNewYearInput(e.target.value);
                    setErrorMsg('');
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm font-semibold"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>추가</span>
                </button>
              </div>
              {errorMsg && <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>}
            </div>
          </form>

          {/* Existing Years */}
          <div className="pt-3 border-t border-gray-200">
            <span className="block text-xs font-semibold text-gray-600 mb-2">
              등록된 연도 목록 (클릭하여 전환)
            </span>
            <div className="flex flex-wrap gap-2">
              {availableYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedYear(yr);
                    onClose();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    selectedYear === yr
                      ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {yr}년 {selectedYear === yr && '✓'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
