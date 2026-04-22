@echo off
echo ================================================
echo  HUMANITY-PROTOCOL Authentication Server
echo ================================================
echo.
echo Starting Flask server on http://localhost:5000
echo.
cd /d "%~dp0backend"
python app.py
pause
