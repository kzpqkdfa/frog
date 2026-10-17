#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <shlwapi.h>
#include <shlobj.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "shlwapi.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "uuid.lib")

static WCHAR g_baseDir[MAX_PATH];
static int g_port = 0;
static volatile BOOL g_running = TRUE;
static volatile DWORD g_lastActivity = 0;

// Get MIME type by file extension
static const char* get_mime_type(const WCHAR* path) {
    const WCHAR* ext = PathFindExtensionW(path);
    if (!ext) return "application/octet-stream";
    if (_wcsicmp(ext, L".html") == 0 || _wcsicmp(ext, L".htm") == 0) return "text/html; charset=utf-8";
    if (_wcsicmp(ext, L".js") == 0 || _wcsicmp(ext, L".mjs") == 0) return "application/javascript; charset=utf-8";
    if (_wcsicmp(ext, L".css") == 0) return "text/css; charset=utf-8";
    if (_wcsicmp(ext, L".json") == 0) return "application/json; charset=utf-8";
    if (_wcsicmp(ext, L".png") == 0) return "image/png";
    if (_wcsicmp(ext, L".jpg") == 0 || _wcsicmp(ext, L".jpeg") == 0) return "image/jpeg";
    if (_wcsicmp(ext, L".svg") == 0) return "image/svg+xml";
    if (_wcsicmp(ext, L".ico") == 0) return "image/x-icon";
    if (_wcsicmp(ext, L".woff2") == 0) return "font/woff2";
    if (_wcsicmp(ext, L".woff") == 0) return "font/woff";
    if (_wcsicmp(ext, L".ttf") == 0) return "font/ttf";
    if (_wcsicmp(ext, L".zip") == 0) return "application/zip";
    return "application/octet-stream";
}

// URL decode helper
static void url_decode(char *dst, const char *src) {
    char a, b;
    while (*src) {
        if ((*src == '%') &&
            ((a = src[1]) && (b = src[2])) &&
            (isxdigit(a) && isxdigit(b))) {
            if (a >= 'a') a -= 'a'-'A';
            if (a >= 'A') a -= ('A' - 10);
            else a -= '0';
            if (b >= 'a') b -= 'a'-'A';
            if (b >= 'A') b -= ('A' - 10);
            else b -= '0';
            *dst++ = 16 * a + b;
            src += 3;
        } else if (*src == '+') {
            *dst++ = ' ';
            src++;
        } else {
            *dst++ = *src++;
        }
    }
    *dst++ = '\0';
}

// Handle an HTTP client connection
static void handle_client(SOCKET client) {
    char req[4096];
    int recvd = recv(client, req, sizeof(req) - 1, 0);
    if (recvd <= 0) {
        closesocket(client);
        return;
    }
    req[recvd] = '\0';

    // Record activity timestamp
    g_lastActivity = GetTickCount();

    char method[16], url[1024];
    if (sscanf(req, "%15s %1023s", method, url) < 2) {
        closesocket(client);
        return;
    }

    char *query = strchr(url, '?');
    if (query) *query = '\0';

    char decodedUrl[1024];
    url_decode(decodedUrl, url);

    // Heartbeat ping handler
    if (strstr(decodedUrl, "/api/ping") != NULL) {
        const char *pong = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 4\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\npong";
        send(client, pong, (int)strlen(pong), 0);
        closesocket(client);
        return;
    }

    if (strcmp(decodedUrl, "/") == 0) {
        strcpy(decodedUrl, "/index.html");
    }

    for (int i = 0; decodedUrl[i]; i++) {
        if (decodedUrl[i] == '/') decodedUrl[i] = '\\';
    }

    WCHAR relPath[1024];
    MultiByteToWideChar(CP_UTF8, 0, decodedUrl, -1, relPath, 1024);

    WCHAR fullPath[MAX_PATH];
    wnsprintfW(fullPath, MAX_PATH, L"%s%s", g_baseDir, relPath);

    HANDLE hFile = CreateFileW(fullPath, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hFile == INVALID_HANDLE_VALUE) {
        wnsprintfW(fullPath, MAX_PATH, L"%s\\index.html", g_baseDir);
        hFile = CreateFileW(fullPath, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    }

    if (hFile == INVALID_HANDLE_VALUE) {
        const char *notFound = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
        send(client, notFound, (int)strlen(notFound), 0);
        closesocket(client);
        return;
    }

    DWORD fileSize = GetFileSize(hFile, NULL);
    const char *mime = get_mime_type(fullPath);

    char header[512];
    int headerLen = sprintf(header,
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %lu\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n\r\n",
        mime, fileSize);

    send(client, header, headerLen, 0);

    char buf[8192];
    DWORD bytesRead;
    while (ReadFile(hFile, buf, sizeof(buf), &bytesRead, NULL) && bytesRead > 0) {
        send(client, buf, bytesRead, 0);
    }

    CloseHandle(hFile);
    closesocket(client);
}

// Client worker thread for concurrency
static DWORD WINAPI client_thread(LPVOID param) {
    SOCKET client = (SOCKET)param;
    handle_client(client);
    return 0;
}

// Server worker thread
static DWORD WINAPI server_thread(LPVOID param) {
    SOCKET server_sock = (SOCKET)param;
    while (g_running) {
        SOCKET client = accept(server_sock, NULL, NULL);
        if (client == INVALID_SOCKET) {
            if (!g_running) break;
            Sleep(10);
            continue;
        }
        HANDLE hCl = CreateThread(NULL, 0, client_thread, (LPVOID)client, 0, NULL);
        if (hCl) {
            CloseHandle(hCl);
        } else {
            handle_client(client);
        }
    }
    return 0;
}

// Find Microsoft Edge executable path
static BOOL find_edge(WCHAR *outPath, DWORD maxLen) {
    WCHAR path[MAX_PATH];
    
    ExpandEnvironmentStringsW(L"%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe", path, MAX_PATH);
    if (GetFileAttributesW(path) != INVALID_FILE_ATTRIBUTES) {
        wcsncpy(outPath, path, maxLen);
        return TRUE;
    }

    ExpandEnvironmentStringsW(L"%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe", path, MAX_PATH);
    if (GetFileAttributesW(path) != INVALID_FILE_ATTRIBUTES) {
        wcsncpy(outPath, path, maxLen);
        return TRUE;
    }

    ExpandEnvironmentStringsW(L"%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe", path, MAX_PATH);
    if (GetFileAttributesW(path) != INVALID_FILE_ATTRIBUTES) {
        wcsncpy(outPath, path, maxLen);
        return TRUE;
    }

    return FALSE;
}

// Prompt and create desktop shortcut
static void check_and_create_desktop_shortcut(const WCHAR* exePath) {
    WCHAR desktopDir[MAX_PATH];
    if (FAILED(SHGetFolderPathW(NULL, CSIDL_DESKTOPDIRECTORY, NULL, 0, desktopDir))) {
        return;
    }

    WCHAR desktopLnk[MAX_PATH];
    wnsprintfW(desktopLnk, MAX_PATH, L"%s\\가계부.lnk", desktopDir);

    if (GetFileAttributesW(desktopLnk) != INVALID_FILE_ATTRIBUTES) {
        return; // Already exists
    }

    int res = MessageBoxW(
        NULL,
        L"바탕화면에 '가계부' 바로가기 아이콘을 생성하시겠습니까?",
        L"가계부 안내",
        MB_YESNO | MB_ICONQUESTION
    );

    if (res == IDYES) {
        HRESULT hr = CoInitialize(NULL);
        if (SUCCEEDED(hr)) {
            IShellLinkW* psl = NULL;
            hr = CoCreateInstance(&CLSID_ShellLink, NULL, CLSCTX_INPROC_SERVER, &IID_IShellLinkW, (LPVOID*)&psl);
            if (SUCCEEDED(hr)) {
                WCHAR dirPath[MAX_PATH];
                wcsncpy(dirPath, exePath, MAX_PATH);
                PathRemoveFileSpecW(dirPath);

                psl->lpVtbl->SetPath(psl, exePath);
                psl->lpVtbl->SetWorkingDirectory(psl, dirPath);
                psl->lpVtbl->SetDescription(psl, L"가계부 - 부동산 & 자산관리");
                psl->lpVtbl->SetIconLocation(psl, exePath, 0);

                IPersistFile* ppf = NULL;
                hr = psl->lpVtbl->QueryInterface(psl, &IID_IPersistFile, (LPVOID*)&ppf);
                if (SUCCEEDED(hr)) {
                    ppf->lpVtbl->Save(ppf, desktopLnk, TRUE);
                    ppf->lpVtbl->Release(ppf);

                    MessageBoxW(NULL, L"바탕화면에 '가계부' 바로가기 아이콘이 성공적으로 생성되었습니다!", L"가계부 안내", MB_OK | MB_ICONINFORMATION);
                }
                psl->lpVtbl->Release(psl);
            }
            CoUninitialize();
        }
    }
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // 1. Determine base directory for static assets
    WCHAR exePath[MAX_PATH];
    GetModuleFileNameW(NULL, exePath, MAX_PATH);

    // Prompt user to create desktop shortcut if not already created
    check_and_create_desktop_shortcut(exePath);

    PathRemoveFileSpecW(exePath);

    wnsprintfW(g_baseDir, MAX_PATH, L"%s\\app", exePath);
    WCHAR checkIndex[MAX_PATH];
    wnsprintfW(checkIndex, MAX_PATH, L"%s\\index.html", g_baseDir);
    if (GetFileAttributesW(checkIndex) == INVALID_FILE_ATTRIBUTES) {
        wcsncpy(g_baseDir, exePath, MAX_PATH);
    }

    // 2. Initialize Winsock
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        MessageBoxW(NULL, L"네트워크 소켓 초기화에 실패했습니다.", L"가계부 오류", MB_ICONERROR);
        return 1;
    }

    SOCKET server_sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server_sock == INVALID_SOCKET) {
        WSACleanup();
        return 1;
    }

    int reuse = 1;
    setsockopt(server_sock, SOL_SOCKET, SO_REUSEADDR, (const char*)&reuse, sizeof(reuse));

    struct sockaddr_in sin;
    memset(&sin, 0, sizeof(sin));
    sin.sin_family = AF_INET;
    sin.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // 127.0.0.1

    // Try a series of dedicated local ports first, then fall back to dynamic port 0
    int bound = 0;
    int testPorts[] = { 39428, 39429, 39430, 39431, 39432, 0 };
    for (int i = 0; i < (int)(sizeof(testPorts)/sizeof(testPorts[0])); i++) {
        sin.sin_port = htons(testPorts[i]);
        if (bind(server_sock, (struct sockaddr*)&sin, sizeof(sin)) == 0) {
            bound = 1;
            break;
        }
    }

    if (!bound) {
        MessageBoxW(NULL, L"로컬 포트 바인딩에 실패했습니다.", L"가계부 오류", MB_ICONERROR);
        closesocket(server_sock);
        WSACleanup();
        return 1;
    }

    int sin_len = sizeof(sin);
    getsockname(server_sock, (struct sockaddr*)&sin, &sin_len);
    g_port = ntohs(sin.sin_port);

    if (listen(server_sock, 32) != 0) {
        closesocket(server_sock);
        WSACleanup();
        return 1;
    }

    DWORD startTime = GetTickCount();
    g_lastActivity = startTime;

    HANDLE hServerThread = CreateThread(NULL, 0, server_thread, (LPVOID)server_sock, 0, NULL);

    // 3. Launch App in Microsoft Edge or Default Browser
    WCHAR appUrl[128];
    wnsprintfW(appUrl, 128, L"http://127.0.0.1:%d", g_port);

    WCHAR edgePath[MAX_PATH];
    BOOL hasEdge = find_edge(edgePath, MAX_PATH);
    PROCESS_INFORMATION pi;
    memset(&pi, 0, sizeof(pi));
    BOOL processCreated = FALSE;

    if (hasEdge) {
        WCHAR cmdLine[MAX_PATH * 3];
        wnsprintfW(cmdLine, sizeof(cmdLine) / sizeof(WCHAR),
            L"\"%s\" --app=\"%s\" --no-first-run --no-default-browser-check",
            edgePath, appUrl);

        STARTUPINFOW si;
        memset(&si, 0, sizeof(si));
        si.cb = sizeof(si);

        processCreated = CreateProcessW(NULL, cmdLine, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi);
    }

    if (!processCreated) {
        ShellExecuteW(NULL, L"open", appUrl, NULL, NULL, SW_SHOWNORMAL);
    }

    // 4. Server Lifetime Management:
    // Keep alive as long as:
    // a) Within initial 60-second launch grace period, OR
    // b) Edge process is actively running, OR
    // c) Web heartbeat/ping was received within the last 25 seconds.
    while (g_running) {
        Sleep(1000);
        DWORD now = GetTickCount();

        // If Edge process was created and is still running
        if (processCreated && pi.hProcess) {
            DWORD exitCode = 0;
            if (GetExitCodeProcess(pi.hProcess, &exitCode) && exitCode == STILL_ACTIVE) {
                g_lastActivity = now;
                continue;
            }
        }

        // Initial 60-second grace period for browser to launch on slower or protected machines
        if (now - startTime < 60000) {
            continue;
        }

        // If no request received for 25 seconds after grace period, the user has closed the app
        if (now - g_lastActivity > 25000) {
            break;
        }
    }

    // Cleanup
    g_running = FALSE;
    closesocket(server_sock);

    if (processCreated) {
        if (pi.hProcess) CloseHandle(pi.hProcess);
        if (pi.hThread) CloseHandle(pi.hThread);
    }

    if (hServerThread) {
        WaitForSingleObject(hServerThread, 1000);
        CloseHandle(hServerThread);
    }
    WSACleanup();

    return 0;
}
