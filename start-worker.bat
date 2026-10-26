@echo off
echo === KHỞI ĐỘNG WORKER FindFace-AI ===
echo Job chi-muc-anh chạy mỗi phút — giữ cửa sổ này mở!
echo.
cd /d D:\sc3\FindFace-AI
pnpm --filter @anh/worker dev
pause
