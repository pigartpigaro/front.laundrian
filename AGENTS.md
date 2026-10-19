# Aturan Proyek Londrian

Londrian adalah frontend POS laundry Vue 3 + Vite yang mengikuti blueprint `../laundry-pos-blueprint-v1.md`.

## Implementasi

- Jaga alur transaksi tetap sederhana dan nyaman di layar Android/tablet; hindari scroll horizontal pada halaman.
- Ikuti shell UDev: workspace terang, aksen kuning kunyit, rail desktop yang melebar saat hover/pin, dan drawer navigasi mobile.
- Daftar memanjang mengikuti scroll halaman tanpa pagination bernomor. Gunakan kartu untuk daftar pada layar kecil agar tidak perlu menggeser tabel ke samping.
- Susun halaman di `src/pages/<Menu>/` dan komponen khusus fitur di `components/`; layout bersama berada di `src/layouts/`, daftar menu di `src/navigation/`.
- Status laundry dan pembayaran adalah dua hal terpisah.
- Autentikasi memakai personal access token Sanctum melalui header `Authorization: Bearer`. Simpan token hanya di `sessionStorage`, cabut saat logout, dan jangan menyimpan data bisnis di browser storage. Setiap daftar/detail dan mutasi operasional harus memakai Laravel API.
- Backend menjadi sumber kebenaran untuk nomor transaksi, harga, total, status laundry, dan pembayaran. Frontend hanya menghitung estimasi tampilan sebelum disimpan.
- Jangan mengklaim pencetakan Bluetooth aktif sebelum plugin native Kotlin/Capacitor tersedia. Kegagalan print tidak boleh membatalkan transaksi.
- Jangan menambahkan kredensial atau rahasia ke source code. Konfigurasi lokal menggunakan `.env` yang tidak di-commit.

## Kroscek UI

- Sebelum mengubah atau mengaudit UI, baca skill Impeccable dan Taste yang diminta pengguna; gunakan Impeccable mode Operate untuk halaman aplikasi, dashboard, tabel, dan pengaturan.
- Periksa tampilan serta alur pada desktop dan mobile. Untuk daftar, pastikan nama dan setiap nilai tetap terbaca di layar kecil; jangan mengandalkan build saja sebagai bukti responsivitas.
- Ikuti batas masing-masing skill. Taste `design-taste-frontend` ditujukan untuk halaman publik dan mengecualikan dashboard/app screen; jangan memaksakan workflow landing page pada POS ini. Jika pengguna meminta Taste untuk UI aplikasi, gunakan hanya prinsip yang relevan dan jelaskan batas cakupannya.
- Untuk perbaikan defect, telusuri penyebab dan rangkum solusi sebelum mengubah perilaku. Perubahan aturan ini tidak menggantikan persetujuan pengguna atas implementasi defect.

## Menjalankan

- Prasyarat: Node.js 22 LTS dan npm.
- Dari clone root, masuk ke `front.laundrian/` lalu install dependency: `npm ci`.
- Jalankan frontend: `npm run dev` lalu buka `http://localhost:5174` (port 5174 dipakai agar tidak berbenturan dengan UDev di 5173).
- Build: `npm run build`; preview build: `npm run preview`.
- Hentikan server dengan `Ctrl+C`.
- `.env.example` memakai `VITE_API_BASE_URL=http://localhost:8020/api`; salin ke `.env` lokal bila URL berbeda.
