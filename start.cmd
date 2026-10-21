@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE="
where node >nul 2>nul && set "NODE_EXE=node"

if not defined NODE_EXE (
  if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" (
    set "NODE_EXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
  )
)

if not defined NODE_EXE (
  echo.
  echo Node.js nao encontrado.
  echo Instale o Node.js 20 ou superior e tente novamente.
  echo.
  pause
  exit /b 1
)

echo.
echo Iniciando Prato Amarrado em http://127.0.0.1:4173
echo Pressione Ctrl+C para encerrar.
echo.
"%NODE_EXE%" server.js
pause
