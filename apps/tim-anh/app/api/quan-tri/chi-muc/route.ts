/**
 * API route tạm thời để chạy job chỉ mục ảnh khuôn mặt trực tiếp từ web app.
 * POST /api/quan-tri/chi-muc → chạy job, trả về { daXong, loi, soMat, conLai }
 * Auth: chỉ cookie phiên quản trị. Chỉ mục tự động theo lịch do apps/worker đảm nhiệm.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { danhGiaChatLuongAnh } from "@anh/core";
import {
  capNhatCacAlbum,
  danhDauLoiChiMuc,
  duongDanChuyenDoi,
  duongDanThumb,
  laTepHeic,
  luuKetQuaChiMuc,
  nhanAnhChoChiMuc,
  prisma,
  thuMucChuyenDoi,
  thuMucThumb,
  traLaiAnhKet,
  type MatChiMuc,
} from "@anh/db";
import { coPhienQuanTri, laAdminPhien } from "@/lib/quan-tri-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DICH_VU_URL = process.env.DICH_VU_KHUON_MAT_URL ?? "http://127.0.0.1:8100";
const RONG_THUMB = 520;
const SO_ANH_MOI_LUOT = 50;

interface KetQuaVector {
  rongPx: number;
  caoPx: number;
  doNet: number;
  doSang: number;
  mats: MatChiMuc[];
  clip?: number[];
}

async function goiDichVu(duong: string, buf: Buffer, tenTep: string): Promise<Response> {
  const form = new FormData();
  form.append("anh", new Blob([new Uint8Array(buf)]), tenTep);
  const res = await fetch(`${DICH_VU_URL}${duong}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`DICH_VU_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function tinhDHash(buf: Buffer): Promise<string> {
  const { data } = await sharp(buf).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let hash = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      hash = (hash << 1n) | (data[y * 9 + x]! > data[y * 9 + x + 1]! ? 1n : 0n);
    }
  }
  return hash.toString(16).padStart(16, "0");
}

export async function POST(_req: NextRequest) {
  try {
  if (!(await coPhienQuanTri())) {
    return NextResponse.json({ loi: "CHUA_DANG_NHAP" }, { status: 401 });
  }
  if (!(await laAdminPhien())) {
    return NextResponse.json({ loi: "KHONG_DU_QUYEN" }, { status: 403 });
  }

  const song = await fetch(`${DICH_VU_URL}/suc-khoe`).then((r) => r.ok).catch(() => false);
  if (!song) {
    return NextResponse.json({ loi: `Dịch vụ khuôn mặt không phản hồi tại ${DICH_VU_URL}` }, { status: 503 });
  }

  await traLaiAnhKet(prisma);
  await mkdir(thuMucThumb(), { recursive: true });
  await mkdir(thuMucChuyenDoi(), { recursive: true });

  let daXong = 0;
  let loi = 0;
  let soMat = 0;
  const suKienCoAnhMoi = new Set<number>();

  outer: for (;;) {
    const lo = await nhanAnhChoChiMuc(prisma, 8);
    if (lo.length === 0) break;

    for (const anh of lo) {
      try {
        let buf = await readFile(anh.duongDan);
        if (laTepHeic(anh.tenTep)) {
          const jpeg = Buffer.from(await (await goiDichVu("/jpeg", buf, anh.tenTep)).arrayBuffer());
          await writeFile(duongDanChuyenDoi(anh.id), new Uint8Array(jpeg));
          buf = jpeg;
        }
        const kq = (await (await goiDichVu("/vector", buf, anh.tenTep)).json()) as KetQuaVector;
        const chatLuong = danhGiaChatLuongAnh(kq.doNet, kq.doSang);
        await luuKetQuaChiMuc(prisma, anh.id, {
          ...kq,
          canhBaoChatLuong: chatLuong.canhBao,
          dHash: await tinhDHash(buf),
        });
        await sharp(buf)
          .rotate()
          .resize({ width: RONG_THUMB, withoutEnlargement: true })
          .jpeg({ quality: 78 })
          .toFile(duongDanThumb(anh.id));
        daXong++;
        soMat += kq.mats.length;
        suKienCoAnhMoi.add(anh.suKienId);
      } catch (e) {
        loi++;
        await danhDauLoiChiMuc(prisma, anh.id, e instanceof Error ? e.message : String(e)).catch(() => {});
      }

      if (daXong + loi >= SO_ANH_MOI_LUOT) break outer;
    }
  }

  for (const suKienId of suKienCoAnhMoi) {
    await capNhatCacAlbum(prisma, suKienId).catch(() => {});
  }

  const conLai = await prisma.anhSuKien.count({ where: { trangThai: "cho_chi_muc" } });

  return NextResponse.json({ daXong, loi, soMat, conLai });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ loi: `Lỗi server: ${msg}` }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    if (!(await coPhienQuanTri())) {
      return NextResponse.json({ loi: "CHUA_DANG_NHAP" }, { status: 401 });
    }
    const conLai = await prisma.anhSuKien.count({ where: { trangThai: "cho_chi_muc" } });
    const dangXu = await prisma.anhSuKien.count({ where: { trangThai: "dang_chi_muc" } });
    const song = await fetch(`${DICH_VU_URL}/suc-khoe`).then((r) => r.ok).catch(() => false);
    return NextResponse.json({ conLai, dangXu, dichVuSong: song });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ loi: `Lỗi server: ${msg}` }, { status: 500 });
  }
}
