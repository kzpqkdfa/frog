import React, { useState } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
} from 'lucide-react';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../data/defaultData.ts';

export const CategoryManager: React.FC = () => {
  const {
    categories,
    incomeCategories,
    expenseCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    transactions,
  } = useAccount();

  // Add inputs
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Count usage of categories in transactions
  const getCategoryUsageCount = (catName: string, type: '수입' | '지출') => {
    return transactions.filter(t => t.type === type && t.category === catName).length;
  };

  // Handle Add Income
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncomeName.trim()) return;
    const ok = addCategory(newIncomeName.trim(), '수입');
    if (ok) {
      setNewIncomeName('');
    } else {
      alert('이미 존재하는 수입 카테고리이거나 이름이 유효하지 않습니다.');
    }
  };

  // Handle Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim()) return;
    const ok = addCategory(newExpenseName.trim(), '지출');
    if (ok) {
      setNewExpenseName('');
    } else {
      alert('이미 존재하는 지출 카테고리이거나 이름이 유효하지 않습니다.');
    }
  };

  // Start edit
  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  // Save edit
  const saveEditing = (id: string) => {
    if (!editingName.trim()) return;
    const ok = updateCategory(id, editingName.trim());
    if (ok) {
      setEditingId(null);
      setEditingName('');
    } else {
      alert('카테고리 수정에 실패했습니다.');
    }
  };

  // Cancel edit
  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Delete category
  const handleDelete = (id: string, name: string, type: '수입' | '지출') => {
    const count = getCategoryUsageCount(name, type);
    let msg = `'${name}' 카테고리를 삭제하시겠습니까?`;
    if (count > 0) {
      msg = `'${name}' 카테고리는 현재 ${count}건의 거래 내역에 연결되어 있습니다. 삭제하시겠습니까?`;
    }
    if (window.confirm(msg)) {
      deleteCategory(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-emerald-700" />
              <span>카테고리 설정 및 관리</span>
            </h2>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns (수입 카테고리 / 지출 카테고리) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. 수입 카테고리 관리 */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm tracking-wide">
                수입 카테고리 ({incomeCategories.length}개)
              </h3>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Add Form */}
            <form onSubmit={handleAddIncome} className="flex gap-2">
              <input
                type="text"
                placeholder="새 수입 카테고리 이름 입력..."
                value={newIncomeName}
                onChange={e => setNewIncomeName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </form>

            {/* Category List */}
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-[420px] overflow-y-auto">
              {incomeCategories.map(cat => {
                const isEditing = editingId === cat.id;
                const usage = getCategoryUsageCount(cat.name, '수입');

                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between hover:bg-emerald-50/50 transition text-sm group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-emerald-500 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditing(cat.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(cat.id)}
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          title="저장"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                          title="취소"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="font-semibold text-gray-800">{cat.name}</span>
                          {usage > 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                              {usage}건 사용 중
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => startEditing(cat.id, cat.name)}
                            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name, '수입')}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. 지출 카테고리 관리 */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-sm tracking-wide">
                지출 카테고리 ({expenseCategories.length}개)
              </h3>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Add Form */}
            <form onSubmit={handleAddExpense} className="flex gap-2">
              <input
                type="text"
                placeholder="새 지출 카테고리 이름 입력..."
                value={newExpenseName}
                onChange={e => setNewExpenseName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1 shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </form>

            {/* Category List */}
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-[420px] overflow-y-auto">
              {expenseCategories.map(cat => {
                const isEditing = editingId === cat.id;
                const usage = getCategoryUsageCount(cat.name, '지출');

                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between hover:bg-emerald-50/50 transition text-sm group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-emerald-500 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditing(cat.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(cat.id)}
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          title="저장"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="p-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                          title="취소"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0"></span>
                          <span className="font-semibold text-gray-800">{cat.name}</span>
                          {usage > 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                              {usage}건 사용 중
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => startEditing(cat.id, cat.name)}
                            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name, '지출')}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
