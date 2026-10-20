@echo off
title OBS Gallery Remote

REM Ir automaticamente a la carpeta donde esta este .bat
cd /d "%~dp0"

echo ========================================
echo       OBS Gallery Remote
echo ========================================
echo.

REM =========================================
REM 1. Configurar Tailscale Serve
REM =========================================

echo [1/3] Configurando Tailscale Serve...
tailscale serve --bg 3000

if errorlevel 1 (
    echo.
    echo ERROR: No se pudo configurar Tailscale Serve.
    echo.
    pause
    exit /b 1
)

echo.

REM =========================================
REM 2. Mostrar estado de Tailscale
REM =========================================

echo [2/3] Estado de Tailscale:
echo.

tailscale serve status

echo.

REM =========================================
REM 3. Iniciar Node
REM =========================================

echo [3/3] Iniciando servidor Node...
echo.
echo Presiona CTRL+C para detener el servidor.
echo ========================================
echo.

REM Forzamos CMD para evitar script-shell=bash
call npm --script-shell="%ComSpec%" start

REM =========================================
REM Si Node termina, mantener ventana abierta
REM =========================================

set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo ========================================
echo El servidor Node se ha detenido.
echo Codigo de salida: %EXIT_CODE%
echo Tailscale Serve permanece configurado.
echo ========================================
echo.

pause

exit /b %EXIT_CODE%