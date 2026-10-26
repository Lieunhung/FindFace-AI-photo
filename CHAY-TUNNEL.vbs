Set oShell = WScript.CreateObject("WScript.Shell")
oShell.Run "cmd.exe /k D:\sc3\FindFace-AI\cloudflared.exe tunnel --config D:\sc3\FindFace-AI\tunnel-config.yml run", 1, False
WScript.Echo "Tunnel da duoc mo! Giu cua so CMD de hoc vien vao duoc link."
