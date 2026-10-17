import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import {
  Calendar,
  PlusCircle,
  FileSpreadsheet,
  FolderKanban,
  Receipt,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { exportToExcel } from '../utils/excelHelper.ts';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenYearModal: () => void;
  onOpenDesktopModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenYearModal,
  onOpenDesktopModal,
}) => {
  const {
    selectedYear,
    setSelectedYear,
    availableYears,
    activeTab,
    setActiveTab,
    transactions,
  } = useAccount();

  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const handleExportExcel = () => {
    exportToExcel(transactions, `${selectedYear}년_가계부_거래내역.xlsx`);
  };

  return (
    <header className="sticky top-0 z-30 bg-emerald-950 text-white shadow-md border-b border-emerald-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: App Title and Year Selector */}
          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-inner shrink-0">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
                  가계부
                </h1>
                <span className="hidden lg:inline-block text-[11px] px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 border border-emerald-700 font-normal">
                  부동산 & 자산관리
                </span>
              </div>
            </div>

            {/* Year Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowYearDropdown(prev => !prev)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700 text-xs sm:text-sm font-semibold transition whitespace-nowrap"
                aria-label="연도 선택"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{selectedYear}년</span>
                <ChevronDown className="w-3 h-3 text-emerald-400" />
              </button>

              {showYearDropdown && (
                <div
                  className="absolute left-0 mt-2 w-44 rounded-lg bg-emerald-900 border border-emerald-700 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowYearDropdown(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-medium text-emerald-300 border-b border-emerald-800">
                    연도 변경
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition ${
                          selectedYear === year
                            ? 'bg-emerald-700 text-white font-bold'
                            : 'text-emerald-100 hover:bg-emerald-800/80'
                        }`}
                      >
                        <span>{year}년</span>
                        {selectedYear === year && (
                          <span className="text-xs text-emerald-300">선택됨</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-emerald-800 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowYearDropdown(false);
                        onOpenYearModal();
                      }}
                      className="w-full text-center px-2 py-1.5 text-xs font-semibold rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-200 transition flex items-center justify-center gap-1"
                    >
                      <span>+ 새 연도 추가</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Main Navigation Tabs - spacious, clean, and centered */}
          <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2 bg-emerald-900/60 p-1.5 rounded-xl border border-emerald-800/60">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-300" />
              <span>월별 요약</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-300" />
              <span>거래 내역 상세</span>
              {transactions.length > 0 && (
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-bold">
                  {transactions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center space-x-2 px-3.5 lg:px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <FolderKanban className="w-4 h-4 text-emerald-300" />
              <span>카테고리 관리</span>
            </button>
          </nav>

          {/* Right: Actions (Clean & Minimal) */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Add Button */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow transition active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ 거래 입력</span>
            </button>

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="엑셀 다운로드 (.xlsx)"
              className="flex items-center space-x-1 px-2.5 sm:px-3 py-2 rounded-lg bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 hover:text-white text-xs sm:text-sm font-medium transition whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline">Excel 내보내기</span>
              <span className="xl:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-t border-emerald-800 py-2 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition ${
              activeTab === 'summary' ? 'bg-emerald-700 text-white' : 'text-emerald-300'
            }`}
          >
            월별 요약
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition ${
              activeTab === 'ledger' ? 'bg-emerald-700 text-white' : 'text-emerald-300'
            }`}
          >
            거래 내역 ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition ${
              activeTab === 'categories' ? 'bg-emerald-700 text-white' : 'text-emerald-300'
            }`}
          >
            카테고리 관리
          </button>
        </div>
      </div>
    </header>
  );
};
