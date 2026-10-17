import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatKRW,
  parseAmount,
  filterTransactionsByPeriod,
  calculatePeriodSummary,
  calculateMonthlyTrends,
} from './finance.ts';
import type { Transaction, CategoryItem } from '../types/index.ts';

test('formatKRW properly formats numbers to Korean Won with commas', () => {
  assert.equal(formatKRW(2038735), '2,038,735원');
  assert.equal(formatKRW(0), '0원');
  assert.equal(formatKRW(-50000), '-50,000원');
  assert.equal(formatKRW(15000, false), '15,000');
});

test('parseAmount parses string and number values cleanly', () => {
  assert.equal(parseAmount('2,038,735원'), 2038735);
  assert.equal(parseAmount('49,620'), 49620);
  assert.equal(parseAmount(120000), 120000);
  assert.equal(parseAmount(''), 0);
});

test('filterTransactionsByPeriod filters correctly by year, half, or month', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      date: '2026-03-15',
      type: '수입',
      category: '급여',
      description: '3월 급여',
      amount: 3000000,
      paymentMethod: '계좌이체',
      memo: '',
      createdAt: 1,
    },
    {
      id: '2',
      date: '2026-07-28',
      type: '지출',
      category: '공과금',
      description: '재산세',
      amount: 49620,
      paymentMethod: '신용카드',
      memo: '네이버페이결제',
      createdAt: 2,
    },
    {
      id: '3',
      date: '2025-07-28',
      type: '지출',
      category: '식비',
      description: '외식',
      amount: 50000,
      paymentMethod: '신용카드',
      memo: '',
      createdAt: 3,
    },
  ];

  // Year 2026 all
  const y2026 = filterTransactionsByPeriod(transactions, 2026, 'all');
  assert.equal(y2026.length, 2);

  // Year 2026 first half (H1)
  const h1_2026 = filterTransactionsByPeriod(transactions, 2026, 'h1');
  assert.equal(h1_2026.length, 1);
  assert.equal(h1_2026[0].id, '1');

  // Year 2026 second half (H2)
  const h2_2026 = filterTransactionsByPeriod(transactions, 2026, 'h2');
  assert.equal(h2_2026.length, 1);
  assert.equal(h2_2026[0].id, '2');

  // Year 2026 Month 7
  const m7_2026 = filterTransactionsByPeriod(transactions, 2026, 7);
  assert.equal(m7_2026.length, 1);
  assert.equal(m7_2026[0].id, '2');

  // Year 2026 Month 8
  const m8_2026 = filterTransactionsByPeriod(transactions, 2026, 8);
  assert.equal(m8_2026.length, 0);
});

test('calculatePeriodSummary calculates totals and category breakdowns accurately', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      date: '2026-07-01',
      type: '수입',
      category: '중개수수료',
      description: '오피스텔 중개',
      amount: 1500000,
      paymentMethod: '계좌이체',
      memo: '',
      createdAt: 1,
    },
    {
      id: '2',
      date: '2026-07-10',
      type: '지출',
      category: '사무실비용',
      description: '사무실 월세',
      amount: 500000,
      paymentMethod: '계좌이체',
      memo: '',
      createdAt: 2,
    },
    {
      id: '3',
      date: '2026-07-15',
      type: '지출',
      category: '사무실비용',
      description: '복사용지 및 토너',
      amount: 80000,
      paymentMethod: '신용카드',
      memo: '',
      createdAt: 3,
    },
  ];

  const categories: CategoryItem[] = [
    { id: 'c1', name: '중개수수료', type: '수입' },
    { id: 'c2', name: '사무실비용', type: '지출' },
  ];

  const summary = calculatePeriodSummary(transactions, categories);

  assert.equal(summary.totalIncome, 1500000);
  assert.equal(summary.totalExpense, 580000);
  assert.equal(summary.netBalance, 920000);

  const officeExp = summary.expenseCategories.find(c => c.category === '사무실비용');
  assert.ok(officeExp);
  assert.equal(officeExp.amount, 580000);
  assert.equal(officeExp.count, 2);
  assert.equal(officeExp.percentage, 100);
});

test('calculateMonthlyTrends returns 12 months array for the year', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      date: '2026-01-10',
      type: '수입',
      category: '급여',
      description: '1월 급여',
      amount: 2000000,
      paymentMethod: '계좌이체',
      memo: '',
      createdAt: 1,
    },
    {
      id: '2',
      date: '2026-01-20',
      type: '지출',
      category: '식비',
      description: '장보기',
      amount: 300000,
      paymentMethod: '신용카드',
      memo: '',
      createdAt: 2,
    },
  ];

  const trends = calculateMonthlyTrends(transactions, 2026);
  assert.equal(trends.length, 12);
  assert.equal(trends[0].income, 2000000);
  assert.equal(trends[0].expense, 300000);
  assert.equal(trends[0].balance, 1700000);
  assert.equal(trends[1].income, 0);
});
