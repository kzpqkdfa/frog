import os
import shutil
import subprocess
import zipfile

def build_windows_exe(root_dir):
    launcher_dir = os.path.join(root_dir, 'windows_launcher')
    public_dir = os.path.join(root_dir, 'public')

    # Ensure icons in windows_launcher are exact copies of public icons
    if os.path.exists(os.path.join(public_dir, 'favicon.ico')):
        shutil.copy2(os.path.join(public_dir, 'favicon.ico'), os.path.join(launcher_dir, 'app.ico'))
    if os.path.exists(os.path.join(public_dir, 'icon.png')):
        shutil.copy2(os.path.join(public_dir, 'icon.png'), os.path.join(launcher_dir, 'icon.png'))

    # Check if compiler is available
    windres_path = shutil.which('x86_64-w64-mingw32-windres')
    gcc_path = shutil.which('x86_64-w64-mingw32-gcc')

    if windres_path and gcc_path:
        print("Compiling Windows icon resource...")
        subprocess.run([
            windres_path,
            'app.rc',
            '-O', 'coff',
            '-o', 'app.res'
        ], cwd=launcher_dir, check=True)

        print("Compiling 가계부.exe with embedded icon...")
        subprocess.run([
            gcc_path,
            '-mwindows',
            '-O2',
            '-s',
            'main.c',
            'app.res',
            '-o', '가계부.exe',
            '-lws2_32',
            '-lshlwapi',
            '-lole32',
            '-luuid'
        ], cwd=launcher_dir, check=True)
        print("가계부.exe compiled successfully.")
    else:
        print("Notice: mingw-w64 compiler not found, using existing 가계부.exe if available.")

def package_app():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    stage_dir = os.path.join(root_dir, 'dist_package', '가계부')
    public_dir = os.path.join(root_dir, 'public')
    dist_dir = os.path.join(root_dir, 'dist')

    build_windows_exe(root_dir)

    os.makedirs(public_dir, exist_ok=True)
    if os.path.exists(stage_dir):
        shutil.rmtree(stage_dir)
    os.makedirs(stage_dir, exist_ok=True)

    # 1. Copy 가계부.exe
    exe_src = os.path.join(root_dir, 'windows_launcher', '가계부.exe')
    if os.path.exists(exe_src):
        shutil.copy2(exe_src, os.path.join(stage_dir, '가계부.exe'))
    else:
        print("Error: 가계부.exe not found!")

    # 2. Copy compiled web assets to app/ (excluding any existing zip files)
    app_target = os.path.join(stage_dir, 'app')
    shutil.copytree(dist_dir, app_target, ignore=shutil.ignore_patterns('*.zip'), dirs_exist_ok=True)
    
    # Also place index.html in root of package
    shutil.copy2(os.path.join(dist_dir, 'index.html'), os.path.join(stage_dir, 'index.html'))

    # 3. Copy user's provided icon assets
    if os.path.exists(os.path.join(public_dir, 'icon.png')):
        shutil.copy2(os.path.join(public_dir, 'icon.png'), os.path.join(stage_dir, 'icon.png'))
    if os.path.exists(os.path.join(public_dir, 'favicon.ico')):
        shutil.copy2(os.path.join(public_dir, 'favicon.ico'), os.path.join(stage_dir, 'favicon.ico'))

    # 4. Create 가계부_실행.bat helper
    bat_content = """@echo off
chcp 65001 >nul
title 가계부 실행기
cd /d "%~dp0"
start "" "가계부.exe"
exit
"""
    with open(os.path.join(stage_dir, '가계부_실행.bat'), 'w', encoding='utf-8') as f:
        f.write(bat_content)

    # 5. Create 안내_설명서.txt
    readme_content = """[ 가계부 (부동산 & 자산관리) 윈도우 설치 및 실행 안내 ]

1. 실행 방법:
   - 압축을 푼 폴더에서 '가계부.exe'를 더블 클릭하시면 별도의 인터넷 연결 없이 즉시 실행됩니다.
   - 혹시 보안 프로그램 등으로 직접 실행이 지연되는 경우 '가계부_실행.bat'을 실행하셔도 동일하게 작동합니다.
   - 첫 실행 시 "바탕화면에 '가계부' 바로가기 아이콘을 생성하시겠습니까?" 안내창이 표시되며, [예]를 누르시면 바탕화면에 가계부 바로가기 아이콘이 자동 생성됩니다.

2. 다른 컴퓨터 배포 안내:
   - 본 ZIP 파일의 압축을 완전히 해제한 후 폴더 전체를 복사하여 어떤 윈도우 PC(Windows 10/11)에서든 실행하실 수 있습니다.
   - 반드시 ZIP 파일 안에서 바로 실행하지 마시고, '압축 풀기'를 완료한 후 폴더 내의 '가계부.exe'를 실행해주세요.

3. 데이터 안전 보관:
   - 입력하신 모든 가계부 거래 내역과 카테고리는 컴퓨터의 로컬 브라우저 저장소에 안전하게 자동 저장됩니다.
   - 상단 메뉴의 'Excel 내보내기'를 통해 언제든지 엑셀 파일(.xlsx)로 백업하고 'Excel 불러오기'로 복원할 수 있습니다.

감사합니다.
"""
    with open(os.path.join(stage_dir, '안내_설명서.txt'), 'w', encoding='utf-8') as f:
        f.write(readme_content)

    # 6. Create ZIP archive
    zip_public_path = os.path.join(public_dir, '가계부_설치파일.zip')
    zip_dist_path = os.path.join(dist_dir, '가계부_설치파일.zip')

    with zipfile.ZipFile(zip_public_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(stage_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, os.path.dirname(stage_dir))
                zipf.write(file_path, arcname)

    # Also copy to dist so both dev server and production can serve it
    shutil.copy2(zip_public_path, zip_dist_path)
    print(f"Zip created successfully at: {zip_public_path} ({os.path.getsize(zip_public_path)} bytes)")

if __name__ == '__main__':
    package_app()
