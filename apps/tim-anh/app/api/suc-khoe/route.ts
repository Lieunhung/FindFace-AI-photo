import { NextResponse } from "next/server";
import { prisma } from "@anh/db";

/**
 * Kiểm tra sức khỏe cho bộ giám sát khởi động và cho khung nội bộ (noibo) hiện đèn xanh/đỏ.
 * CÔNG KHAI nên chỉ trả trạng thái từng phần, không lộ phiên bản, đường dẫn hay số liệu.
 */
export const dynamic = "force-dynamic";

const DICH_VU_URL = process.env.DICH_VU_KHUON_MAT_URL ?? "http://127.0.0.1:8100";

export async function GET() {
  const [csdl, khuonMat] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    fetch(`${DICH_VU_URL}/suc-khoe`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .catch(() => false),
  ]);
  const ok = csdl && khuonMat;
  return NextResponse.json({ ok, web: true, csdl, khuonMat }, { status: ok ? 200 : 503 });
}
