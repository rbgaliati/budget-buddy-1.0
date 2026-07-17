@echo off
set ROOT=%~dp0
set JAVA_HOME=C:\Users\rbgal\AppData\Local\jdks\jdk-25.0.2
set MVN=C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd
set FRONTEND=%ROOT%budget-buddy\budget-buddy-main

echo.
echo ========================================
echo   Budget Buddy - Ambiente de Desenvolv.
echo ========================================
echo.
echo Backend  -^> http://localhost:8081
echo Frontend -^> porta exibida pelo Vite
echo.

:: Libera porta 8081 caso já esteja em uso
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    echo Encerrando processo anterior na porta 8081 ^(PID %%a^)...
    taskkill /PID %%a /F >nul 2>&1
)

start "Backend - Spring Boot" cmd /k "cd /d %ROOT% && echo [BACKEND] Iniciando Spring Boot... && %MVN% spring-boot:run"

start "Frontend - Vite" cmd /k "cd /d %FRONTEND% && echo [FRONTEND] Iniciando Vite dev server... && npm run dev"
