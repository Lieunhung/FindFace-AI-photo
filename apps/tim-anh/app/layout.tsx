import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rowena Global — Ảnh khóa học · tìm ảnh của bạn bằng một tấm selfie",
  description: "Rowena Global · Học viên chụp một tấm selfie để tìm toàn bộ ảnh có mặt mình trong kho ảnh sự kiện",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="thanh-tren">
          <a className="nhan-hieu" href="/">
            <span className="cham" aria-hidden />
            Rowena Global <span>· Ảnh khóa học</span>
          </a>
          <div className="gian" />
        </header>
        <main>{children}</main>
        <footer className="chan-trang">
          © {new Date().getFullYear()} <strong>Rowena Global</strong> · FindFace AI — tìm ảnh bằng khuôn mặt
        </footer>
      </body>
    </html>
  );
}
