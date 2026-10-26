Set objShell = CreateObject("WScript.Shell")
objShell.Run "cmd /c ""cd /d D:\sc3\FindFace-AI && pnpm --filter @anh/worker dev""", 1, False
WScript.Echo "Worker started! Keep the CMD window open."
