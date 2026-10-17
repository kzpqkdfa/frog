import React, { useState } from 'react';
import { AccountProvider, useAccount } from './context/AccountContext.tsx';
import { Header } from './components/Header.tsx';
import { MonthlySummary } from './components/MonthlySummary.tsx';
import { TransactionLedger } from './components/TransactionLedger.tsx';
import { CategoryManager } from './components/CategoryManager.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { YearModal } from './components/YearModal.tsx';
import { DesktopInstallModal } from './components/DesktopInstallModal.tsx';
import { Transaction } from './types/index.ts';
import { Download } from 'lucide-react';

function MainApp() {
  const { activeTab, selectedYear, transactions } = useAccount();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top Header */}
      <Header
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setIsAddModalOpen(true);
        }}
        onOpenYearModal={() => setIsYearModalOpen(true)}
        onOpenDesktopModal={() => setIsDesktopModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'summary' && <MonthlySummary />}
        {activeTab === 'ledger' && (
          <TransactionLedger
            onOpenAddModal={() => {
              setEditingTransaction(null);
              setIsAddModalOpen(true);
            }}
            onEditTransaction={handleOpenEdit}
          />
        )}
        {activeTab === 'categories' && <CategoryManager />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <a
            href="./가계부_설치파일.zip"
            download="가계부_설치파일.zip"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-950 font-bold transition shadow-xs text-xs"
            title="가계부.exe가 포함된 배포용 압축파일 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-800" />
            <span>실행파일 다운로드</span>
          </a>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        editTransaction={editingTransaction}
      />

      <YearModal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
      />

      <DesktopInstallModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AccountProvider>
      <MainApp />
    </AccountProvider>
  );
}
