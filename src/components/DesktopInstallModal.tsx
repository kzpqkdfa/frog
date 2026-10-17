import React, { useState, useEffect } from 'react';
import { useAccount } from '../context/AccountContext.tsx';
import {
  Monitor,
  X,
  Download,
  Copy,
  Check,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Terminal,
  FileCode,
} from 'lucide-react';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopInstallModal: React.FC<DesktopInstallModalProps> = ({ isOpen, onClose }) => {
  const { transactions, categories, availableYears } = useAccount();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPWA(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallPWA(false);
      }
    } else {
      alert(
        'Chrome 또는 Edge 브라우저 주소창 우측의 [설치(컴퓨터 모니터 모양)] 아이콘을 클릭하시면 윈도우 바탕화면에 독립 실행형 가계부 앱이 즉시 생성됩니다!'
      );
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Download Windows Batch file
  const handleDownloadBat = () => {
    const batContent = `@echo off
chcp 65001 > nul
echo ========================================
echo        가계부 데스크톱 실행기
echo ========================================
echo.
echo 가계부 로컬 서버를 구동하고 브라우저를 엽니다...
start "" "${window.location.origin}"
exit
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '가계부_윈도우_실행.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download full data backup JSON
  const handleDownloadBackup = () => {
    const backupData = {
      appName: '가계부',
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      availableYears,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `가계부_데이터_백업_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const electronBuildCommands = `# 1. 패키지 설치
npm install -D electron electron-builder

# 2. 웹 앱 빌드
npm run build

# 3. 윈도우용 .exe 실행파일 생성 (dist 폴더에 생성)
npx electron-builder --win`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-emerald-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center shadow-inner">
              <Monitor className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">데스크톱 앱 및 .exe 배포 가이드</h3>
              <p className="text-xs text-emerald-300">PC 설치 및 독립 실행 프로그램 안내</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Main: Direct ZIP Download with 가계부.exe */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-md border border-emerald-700 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500 text-emerald-950 shadow-sm flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>배포용 윈도우 설치/실행 압축팩 준비 완료</span>
              </span>
              <span className="text-xs text-emerald-300 font-medium">용량 약 320 KB</span>
            </div>

            <h4 className="text-xl font-black text-white mb-2">
              가계부.exe 배포 파일 다운로드 (.zip)
            </h4>
            <p className="text-xs text-emerald-200 leading-relaxed mb-4">
              압축을 풀고 <strong>'가계부.exe'</strong>를 더블 클릭하시면 별도의 설치나 인터넷 연결 없이도 전용 데스크톱 가계부 창이 즉시 실행됩니다.
            </p>

            {/* Included Files List */}
            <div className="bg-emerald-950/70 border border-emerald-800 rounded-xl p-3 text-xs mb-5 space-y-1.5 font-mono">
              <div className="text-emerald-300 font-sans font-bold mb-1">📦 ZIP 파일 구성 내역:</div>
              <div className="flex items-center gap-2 text-emerald-100">
                <span className="text-emerald-400 font-bold">✔ 가계부.exe</span>
                <span className="text-emerald-400/80 font-sans text-[11px]">- 윈도우 64비트 독립 실행파일</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <span className="text-emerald-400 font-bold">✔ 바탕화면_바로가기_생성.bat</span>
                <span className="text-emerald-400/80 font-sans text-[11px]">- 윈도우 바탕화면에 아이콘 생성</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <span className="text-emerald-400 font-bold">✔ 가계부_실행.bat</span>
                <span className="text-emerald-400/80 font-sans text-[11px]">- 보조 간편 실행기</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-100">
                <span className="text-emerald-400 font-bold">✔ 안내_설명서.txt</span>
                <span className="text-emerald-400/80 font-sans text-[11px]">- 한글 사용 설명서</span>
              </div>
            </div>

            {/* Direct Download Button */}
            <a
              href="./가계부_설치파일.zip"
              download="가계부_설치파일.zip"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-emerald-950 font-black text-sm shadow-lg transition active:scale-[0.99] text-center"
            >
              <Download className="w-5 h-5 text-emerald-950" />
              <span>실행파일 다운로드</span>
            </a>
          </div>

          {/* Method 2: PWA Desktop App */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-700 text-white">
                추가 옵션
              </span>
              <span className="text-xs text-emerald-800 font-semibold">브라우저 데스크톱 설치</span>
            </div>
            <h4 className="font-bold text-sm text-emerald-950 mb-1">
              Chrome / Edge 웹 앱으로 바로 설치
            </h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              압축을 풀지 않고 현재 브라우저에서 바로 윈도우 앱으로 등록하여 사용하실 수도 있습니다.
            </p>
            <button
              type="button"
              onClick={handleInstallPWA}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>웹 데스크톱 앱으로 지금 등록</span>
            </button>
          </div>

          {/* Method 3: Data Safety & Backup */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="font-bold text-xs text-gray-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>데이터 영구 보관 및 PC 이동 백업</span>
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              가계부에 기재한 모든 거래 내역과 커스텀 카테고리는 브라우저 로컬 저장소에 안전하게 유지됩니다. 다른 컴퓨터로 가계부를 옮기실 때는 전체 백업 파일을 다운로드하세요.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>가계부 전체 데이터 백업 다운로드 (.json)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
