@echo off
echo Activating virtual environment and starting FastAPI backend...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found at backend\venv
)

SET BACKEND_PORT=6803
FOR /F "tokens=1,2 delims==" %%G IN (.env) DO (
    IF "%%G"=="BACKEND_PORT" SET BACKEND_PORT=%%H
)
if "%BACKEND_PORT%"=="" SET BACKEND_PORT=6803

python -m uvicorn app.main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload
pause
