@echo off
REM Bat FindFace-AI chay ngam (face service + web + worker + tunnel), tu khoi dong lai khi chet, sao luu CSDL moi ngay.
REM Xem trang thai: TRANG-THAI-FINDFACE.bat   Dung: DUNG-FINDFACE.bat
"C:\Program Files\nodejs\node.exe" "D:\sc3\FindFace-AI\ff-giam-sat.mjs"
echo FindFace-AI dang khoi dong ngam. Doi ~60 giay roi mo http://localhost:3002
ping -n 4 127.0.0.1 >nul
