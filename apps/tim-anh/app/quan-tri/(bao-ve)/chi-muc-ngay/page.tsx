"use client";

import { useEffect, useRef, useState } from "react";

interface KetQua {
  daXong: number;
  loi: number;
  soMat: number;
  conLai: number;
}

export default function ChiMucNgayPage() {
  const [log, setLog] = useState<string[]>(["⏳ Đang bắt đầu…"]);
  const [xong, setXong] = useState(false);
  const [tongDaXong, setTongDaXong] = useState(0);
  const [tongLoi, setTongLoi] = useState(0);
  const [tongMat, setTongMat] = useState(0);
  const dangChay = useRef(false);

  const them = (msg: string) => setLog((l) => [...l, msg]);

  useEffect(() => {
    if (dangChay.current) return;
    dangChay.current = true;

    async function chay() {
      try {
        const r = await fetch("/api/quan-tri/chi-muc");
        const d = (await r.json()) as { conLai: number; dangXu: number; dichVuSong: boolean };
        if (!d.dichVuSong) {
          them("❌ Dịch vụ khuôn mặt (port 8100) không phản hồi!");
          setXong(true);
          return;
        }
        them(`✅ Dịch vụ khuôn mặt OK · ${d.conLai} ảnh chờ · ${d.dangXu} đang xử lý`);
        if (d.conLai === 0 && d.dangXu === 0) {
          them("🎉 Không còn ảnh nào chờ chỉ mục!");
          setXong(true);
          return;
        }
      } catch (e) {
        them(`❌ Lỗi: ${e}`);
        setXong(true);
        return;
      }

      let luot = 0;
      for (;;) {
        luot++;
        them(`🔄 Lượt ${luot}…`);
        try {
          const res = await fetch("/api/quan-tri/chi-muc", { method: "POST" });
          if (!res.ok) {
            them(`❌ HTTP ${res.status}: ${await res.text()}`);
            setXong(true);
            return;
          }
          const kq = (await res.json()) as KetQua;
          setTongDaXong((n) => n + kq.daXong);
          setTongLoi((n) => n + kq.loi);
          setTongMat((n) => n + kq.soMat);
          them(`  ✓ +${kq.daXong} ảnh · +${kq.soMat} mặt · ${kq.loi} lỗi · còn: ${kq.conLai}`);
          if (kq.conLai === 0) {
            them("🎉 XONG! Tất cả ảnh đã được chỉ mục.");
            setXong(true);
            return;
          }
          if (kq.daXong === 0 && kq.loi === 0) {
            them("⚠️ Không xử lý được ảnh nào — dừng.");
            setXong(true);
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
        } catch (e) {
          them(`❌ Lỗi mạng: ${e}`);
          setXong(true);
          return;
        }
      }
    }

    chay();
  }, []);

  return (
    <div style={{ padding: "24px", fontFamily: "monospace", maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>🔧 Chỉ mục ảnh tự động</h1>
      {!xong && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef3c7", borderRadius: 6 }}>
          ⚠️ Đang chạy — <strong>đừng đóng tab này!</strong>
        </div>
      )}
      {xong && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#d1fae5", borderRadius: 6 }}>
          ✅ Tổng: <strong>{tongDaXong} ảnh</strong> · {tongMat} mặt · {tongLoi} lỗi
        </div>
      )}
      <div style={{ background: "#111", color: "#4ade80", padding: 16, borderRadius: 8, height: 400, overflowY: "auto", fontSize: 13, lineHeight: 1.6 }}>
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
