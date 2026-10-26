"""
Dịch vụ khuôn mặt — nhận ảnh, trả danh sách khuôn mặt (bbox + vector 512 chiều chuẩn hóa L2).

Model: InsightFace buffalo_l (SCRFD phát hiện + ArcFace đặc trưng), chạy ONNX trên CPU.
Dịch vụ THUẦN model: không chạm CSDL, không ghi file — selfie/ảnh chỉ xử lý trong RAM.

Endpoint:
  GET  /suc-khoe     — trạng thái + năng lực (clip/heic có bật không)
  POST /vector       — ảnh → mặt (bbox, vector) + chất lượng ảnh (doNet, doSang) + clip (nếu bật)
  POST /jpeg         — đổi ảnh bất kỳ (kể cả HEIC nếu có pillow-heif) sang JPEG
  POST /song         — kiểm tra "người thật": 3+ khung hình, cùng người + đầu quay trái-phải
  POST /clip-van-ban — câu mô tả → vector CLIP 512 chiều (bật env CLIP=1)

Chạy:  .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8100
"""

import io
import os
import threading

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image, ImageOps

try:  # HEIC/HEIF (ảnh iPhone) — có pillow-heif thì PIL đọc được luôn
    import pillow_heif

    pillow_heif.register_heif_opener()
    CO_HEIC = True
except ImportError:
    CO_HEIC = False

# det_size lớn (1280) để bắt được mặt nhỏ trong ảnh toàn cảnh hội trường — đổi qua env khi cần
DET_SIZE = int(os.environ.get("DET_SIZE", "1280"))
# Selfie: mặt chiếm gần hết khung nên phát hiện ở 640 là đủ và nhanh hơn nhiều so với 1280 của ảnh toàn cảnh
DET_SIZE_SELFIE = int(os.environ.get("DET_SIZE_SELFIE", "640"))
BAT_CLIP = os.environ.get("CLIP", "") == "1"
ANH_TOI_DA_BYTE = 40 * 1024 * 1024

app = FastAPI(title="dich-vu-khuon-mat")


@app.on_event("startup")
def nap_san_model():
    """Nạp model ngay khi khởi động: học viên đầu tiên sau khi khởi động lại không phải chờ ~6 giây."""
    # Windows: tiến trình chạy nền/Task Scheduler dễ bị tranh CPU với trình duyệt và ứng dụng khác, làm suy luận
    # chậm gấp ~3 lần (đo thực tế 7s → 2.7s). Nâng lên Above Normal; lỗi (không phải Windows) thì bỏ qua.
    try:
        import ctypes
        from ctypes import wintypes

        k32 = ctypes.WinDLL("kernel32", use_last_error=True)
        k32.GetCurrentProcess.restype = wintypes.HANDLE
        k32.SetPriorityClass.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        k32.SetPriorityClass.restype = wintypes.BOOL
        k32.SetPriorityClass(k32.GetCurrentProcess(), 0x00008000)  # ABOVE_NORMAL_PRIORITY_CLASS
    except Exception:
        pass
    threading.Thread(target=lay_model, daemon=True).start()

_model = None
_clip_anh = None
_clip_van_ban = None
_khoa = threading.Lock()


def lay_model():
    global _model
    if _model is None:
        with _khoa:
            if _model is None:
                from insightface.app import FaceAnalysis

                m = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
                m.prepare(ctx_id=0, det_size=(DET_SIZE, DET_SIZE))
                _model = m
    return _model


def lay_clip():
    global _clip_anh, _clip_van_ban
    if not BAT_CLIP:
        return None, None
    if _clip_anh is None:
        with _khoa:
            if _clip_anh is None:
                from sentence_transformers import SentenceTransformer

                _clip_anh = SentenceTransformer("clip-ViT-B-32")
                # bản đa ngữ để gõ tiếng Việt: "trao chứng chỉ", "cắt bánh"…
                _clip_van_ban = SentenceTransformer("sentence-transformers/clip-ViT-B-32-multilingual-v1")
    return _clip_anh, _clip_van_ban


def doc_anh(du_lieu: bytes) -> Image.Image:
    try:
        pil = Image.open(io.BytesIO(du_lieu))
        # Ảnh điện thoại thường xoay bằng cờ EXIF — phải xoay thật trước khi phát hiện mặt
        return ImageOps.exif_transpose(pil).convert("RGB")
    except Exception:
        raise HTTPException(status_code=422, detail="KHONG_DOC_DUOC_ANH")


def tim_mat(bgr, det_size=None):
    det_size = det_size or DET_SIZE
    cao, rong = bgr.shape[:2]
    # Ảnh NHỎ hơn det_size: đệm vào góc canvas đen thay vì để SCRFD phóng to — phóng to làm
    # khuôn mặt vượt thang anchor và trượt phát hiện (selfie/ảnh cắt gần mặt hay dính lỗi này).
    dau_vao = bgr
    if max(cao, rong) < det_size:
        canvas = np.zeros((det_size, det_size, 3), dtype=np.uint8)
        canvas[:cao, :rong] = bgr
        dau_vao = canvas
    m = lay_model()
    # Các endpoint async chạy tuần tự trên một event loop nên đổi kích thước phát hiện theo từng lời gọi là an toàn
    m.det_model.input_size = (det_size, det_size)
    return m.get(dau_vao)


@app.get("/suc-khoe")
def suc_khoe():
    return {
        "ok": True,
        "model": "buffalo_l",
        "detSize": DET_SIZE,
        "daNapModel": _model is not None,
        "heic": CO_HEIC,
        "clip": BAT_CLIP,
    }


@app.post("/vector")
async def vector(anh: UploadFile = File(...), selfie: bool = False):
    du_lieu = await anh.read()
    if len(du_lieu) > ANH_TOI_DA_BYTE:
        raise HTTPException(status_code=413, detail="ANH_QUA_LON")
    pil = doc_anh(du_lieu)
    bgr = cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)
    cao, rong = bgr.shape[:2]
    mats = tim_mat(bgr, DET_SIZE_SELFIE if selfie else DET_SIZE)

    # Chất lượng ảnh cho bộ lọc "ảnh hỏng": đo trên bản thu nhỏ 640 cho nhanh + ổn định
    nho = cv2.resize(bgr, (640, max(1, int(640 * cao / rong)))) if rong > 640 else bgr
    xam = cv2.cvtColor(nho, cv2.COLOR_BGR2GRAY)
    do_net = float(cv2.Laplacian(xam, cv2.CV_64F).var())
    do_sang = float(xam.mean())

    kq = {
        "rongPx": rong,
        "caoPx": cao,
        "doNet": round(do_net, 2),
        "doSang": round(do_sang, 2),
        "mats": [
            {
                "bbox": [round(float(x), 1) for x in m.bbox],
                "diem": round(float(m.det_score), 4),
                "vector": m.normed_embedding.astype(float).tolist(),
            }
            for m in mats
        ],
    }
    if BAT_CLIP:
        clip_anh, _ = lay_clip()
        v = clip_anh.encode([pil], normalize_embeddings=True)[0]
        kq["clip"] = [round(float(x), 6) for x in v]
    return kq


@app.post("/jpeg")
async def jpeg(anh: UploadFile = File(...)):
    """Đổi mọi định dạng PIL đọc được (kể cả HEIC) sang JPEG chất lượng cao — dùng cho
    ảnh iPhone: lưu bản JPEG để trình duyệt hiển thị + sharp làm thumbnail được."""
    du_lieu = await anh.read()
    if len(du_lieu) > ANH_TOI_DA_BYTE:
        raise HTTPException(status_code=413, detail="ANH_QUA_LON")
    pil = doc_anh(du_lieu)
    ra = io.BytesIO()
    pil.save(ra, format="JPEG", quality=90)
    return Response(content=ra.getvalue(), media_type="image/jpeg")


@app.post("/clip-van-ban")
async def clip_van_ban(cau: str = Form(...)):
    if not BAT_CLIP:
        raise HTTPException(status_code=501, detail="CLIP_CHUA_BAT")
    _, clip_vb = lay_clip()
    v = clip_vb.encode([cau.strip()], normalize_embeddings=True)[0]
    return {"vector": [round(float(x), 6) for x in v]}


@app.post("/song")
async def song(khung: list[UploadFile] = File(...)):
    """Kiểm tra người thật (liveness nhẹ): nhận 3–8 khung hình chụp liên tiếp trong lúc
    học viên quay nhẹ đầu trái–phải. Đạt khi (1) mọi khung đều CÙNG một người
    (cosine ≥ 0.5 so khung đầu) và (2) biên độ yaw ≥ 12° — ảnh tĩnh giơ trước camera
    cho yaw gần như không đổi."""
    if not 3 <= len(khung) <= 8:
        raise HTTPException(status_code=422, detail="CAN_3_DEN_8_KHUNG")
    goc_yaw: list[float] = []
    emb_dau = None
    for k in khung:
        pil = doc_anh(await k.read())
        bgr = cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR)
        mats = tim_mat(bgr)
        if not mats:
            return {"song": False, "lyDo": "THIEU_MAT_TRONG_KHUNG"}
        # mặt to nhất khung
        m = max(mats, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        if emb_dau is None:
            emb_dau = m.normed_embedding
        elif float(np.dot(emb_dau, m.normed_embedding)) < 0.5:
            return {"song": False, "lyDo": "KHAC_NGUOI_GIUA_CAC_KHUNG"}
        # pose = (pitch, yaw, roll) độ — từ landmark 3D của buffalo_l
        goc_yaw.append(float(m.pose[1]) if m.pose is not None else 0.0)
    bien_do = max(goc_yaw) - min(goc_yaw)
    return {"song": bien_do >= 12.0, "bienDoYaw": round(bien_do, 1)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("CONG", "8100")))
