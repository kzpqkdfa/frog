import * as XLSX from 'xlsx';
import { Transaction } from '../types/index.ts';

/**
 * Export transactions to real Excel (.xlsx) file
 */
export function exportToExcel(transactions: Transaction[], filename: string = '가계부_거래내역.xlsx') {
  const data = transactions.map((t, idx) => ({
    번호: idx + 1,
    날짜: t.date,
    구분: t.type,
    카테고리: t.category,
    내역: t.description,
    금액: t.amount,
    결제수단: t.paymentMethod || '',
    '비고/메모': t.memo || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '거래내역');

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },  // 번호
    { wch: 14 }, // 날짜
    { wch: 8 },  // 구분
    { wch: 14 }, // 카테고리
    { wch: 26 }, // 내역
    { wch: 14 }, // 금액
    { wch: 12 }, // 결제수단
    { wch: 30 }, // 메모
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export Period Summary Report to Excel
 */
export function exportSummaryToExcel(
  year: number,
  periodName: string,
  totalIncome: number,
  totalExpense: number,
  incomeCategories: { category: string; amount: number }[],
  expenseCategories: { category: string; amount: number }[],
  filename: string = `가계부_요약_${year}.xlsx`
) {
  const summaryRows = [
    { 항목: '연도', 내용: `${year}년` },
    { 항목: '기간', 내용: periodName },
    { 항목: '총 수입', 내용: totalIncome },
    { 항목: '총 지출', 내용: totalExpense },
    { 항목: '당월 잔액', 내용: totalIncome - totalExpense },
    { 항목: '', 내용: '' },
    { 항목: '=== 수입 카테고리 합계 ===', 내용: '' },
    ...incomeCategories.map(c => ({ 항목: c.category, 내용: c.amount })),
    { 항목: '=== 지출 카테고리 합계 ===', 내용: '' },
    ...expenseCategories.map(c => ({ 항목: c.category, 내용: c.amount })),
  ];

  const worksheet = XLSX.utils.json_to_sheet(summaryRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '종합요약');
  XLSX.writeFile(workbook, filename);
}

/**
 * Parse uploaded Excel or CSV file
 */
export async function parseExcelFile(file: File): Promise<Omit<Transaction, 'id' | 'createdAt'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet);

        const parsed: Omit<Transaction, 'id' | 'createdAt'>[] = [];

        rawJson.forEach(row => {
          // Attempt flexible column naming
          const date =
            row['날짜'] || row['Date'] || row['일자'] || new Date().toISOString().split('T')[0];
          const rawType = row['구분'] || row['Type'] || '지출';
          const type: '수입' | '지출' =
            rawType.toString().includes('수입') || rawType === 'Income' ? '수입' : '지출';
          const category = row['카테고리'] || row['Category'] || '기타';
          const description = row['내역'] || row['적요'] || row['Description'] || '';
          const rawAmount = row['금액'] || row['Amount'] || 0;
          const amount =
            typeof rawAmount === 'number'
              ? rawAmount
              : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0;
          const paymentMethod = row['결제수단'] || row['수단'] || '신용카드';
          const memo = row['비고'] || row['메모'] || row['비고/메모'] || row['Notes'] || '';

          if (amount > 0 || description) {
            parsed.push({
              date: String(date).trim(),
              type,
              category: String(category).trim(),
              description: String(description).trim(),
              amount: Math.abs(amount),
              paymentMethod: String(paymentMethod).trim(),
              memo: String(memo).trim(),
            });
          }
        });

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsBinaryString(file);
  });
}
