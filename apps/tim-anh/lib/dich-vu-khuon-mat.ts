/** Gọi dịch vụ khuôn mặt Python (apps/dich-vu-khuon-mat) — ảnh vào, danh sách mặt + vector ra. */

const DICH_VU_URL = process.env.DICH_VU_KHUON_MAT_URL ?? "http://127.0.0.1:8100";

export interface MatPhatHien {
  bbox: number[]; // [x1, y1, x2, y2]
  diem: number;
  vector: number[]; // 512 chiều chuẩn hóa L2
}

/** selfie=true: phát hiện mặt ở độ phân giải thấp (nhanh hơn nhiều) — chỉ dùng cho ảnh chụp chân dung học viên. */
export async function layVectorAnh(anh: Blob, tenTep: string, tuyChon: { selfie?: boolean } = {}): Promise<MatPhatHien[]> {
  const form = new FormData();
  form.append("anh", anh, tenTep);
  // Timeout để face service treo không kéo web treo theo (selfie CPU ~1–3 giây, lần đầu nạp model ~6 giây)
  const res = await fetch(`${DICH_VU_URL}/vector${tuyChon.selfie ? "?selfie=true" : ""}`, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`DICH_VU_KHUON_MAT_${res.status}`);
  const json = (await res.json()) as { mats: MatPhatHien[] };
  return json.mats;
}

/**
 * Chọn khuôn mặt CHÍNH trong một selfie: mặt to nhất khung hình, đủ điểm phát hiện.
 * Selfie có thể lọt mặt người phía sau — mặt chính là mặt to nhất, không phải mặt rõ nhất.
 */
export function chonMatChinh(mats: MatPhatHien[]): MatPhatHien | null {
  let tot: MatPhatHien | null = null;
  let dienTichTot = 0;
  for (const m of mats) {
    if (m.diem < 0.5) continue;
    const dienTich = Math.max(0, m.bbox[2]! - m.bbox[0]!) * Math.max(0, m.bbox[3]! - m.bbox[1]!);
    if (dienTich > dienTichTot) {
      dienTichTot = dienTich;
      tot = m;
    }
  }
  return tot;
}

/** IP client sau proxy/tunnel — cùng thứ tự ưu tiên với portal (cf-connecting-ip trước). */
export function layIp(headers: Headers): string {
  return (
    (headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "?"
  );
}
