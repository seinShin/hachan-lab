@echo off
chcp 65001 >nul
rem 배터리 친구 빌드: 윈도우 기본 C# 컴파일러(csc.exe)로 dist\BatteryBuddy.exe 를 만든다.
rem 1) 아이콘 없이 한 번 빌드 - 2) 그 exe로 프로그램 아이콘(.ico) 생성 - 3) 아이콘 넣어서 다시 빌드
setlocal
cd /d "%~dp0"
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
set OPTS=/nologo /codepage:65001 /target:winexe /optimize+ /out:dist\BatteryBuddy.exe
if not exist dist mkdir dist

"%CSC%" %OPTS% BatteryBuddy.cs || exit /b 1
start /wait "" dist\BatteryBuddy.exe --make-ico dist\app.ico || exit /b 1
"%CSC%" %OPTS% /win32icon:dist\app.ico BatteryBuddy.cs || exit /b 1
echo 완료: dist\BatteryBuddy.exe
