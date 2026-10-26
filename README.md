# Laundrian Frontend

Frontend POS laundry dengan Vue 3 dan Vite. Aplikasi menggunakan Laravel REST API di `../api.laundrian/` sebagai sumber data dan autentikasi; tidak menyimpan transaksi operasional ke `localStorage`.

## Menjalankan dari clone Git bersih

Prasyarat: Node.js 22 LTS, npm, dan backend Londrian yang sudah dikonfigurasi serta berjalan.

```powershell
cd Laundrian/front.laundrian
npm ci
Copy-Item .env.example .env
npm run dev
```

Frontend tersedia di `http://localhost:5174`, API default di `http://localhost:8020/api`. Untuk membuka dari HP pada Wi-Fi yang sama, atur `VITE_API_BASE_URL` di `.env.local` ke `http://<IP-komputer>:8020/api`, jalankan Vite dengan host `0.0.0.0` (sudah diatur pada script `dev`), dan izinkan origin frontend HP itu pada `FRONTEND_URL` backend. Contoh lokal: `http://192.168.1.40:5174` dan `http://192.168.1.40:8020/api`. Alamat IP bergantung jaringan komputer.

## Environment publik

Lokal dan publik memakai API yang berbeda melalui file environment Vite:

- `npm run dev` memakai `.env.local`: `http://localhost:8020/api`.
- Build publik memakai `VITE_API_BASE_URL=https://api.londrian.my.id/api`.

Untuk Cloudflare Workers, isi **Build variable** `VITE_API_BASE_URL` dengan URL API production lalu deploy ulang Worker. File `.env.production` hanya untuk build lokal dan diabaikan Git; script `npm run release` mengambil variabel dari environment atau file lokal tersebut. `.env.production.example` adalah template yang dilacak Git, sedangkan `.env.local` tetap khusus mesin lokal.

Londrian memakai Sanctum personal access token melalui header Bearer. Jangan mengaktifkan `withCredentials`, `withXSRFToken`, atau konfigurasi Sanctum SPA berbasis cookie hanya untuk frontend ini.

Login memakai username dan password minimal 8 karakter. Frontend memakai token Bearer Sanctum yang disimpan selama tab aktif dan mengirimkannya dengan Axios; logout mencabut token dari backend. Halaman login juga menerima pendaftaran outlet demo; akun owner langsung masuk setelah pendaftaran. Superadmin login dengan akun yang dibuat dari backend, lalu memilih outlet untuk membuka modul operasionalnya. Jalankan backend dan migrasi mengikuti [panduan API](../api.laundrian/README.md). Pemeriksaan API: `http://localhost:8020/up`.

Build produksi dan preview:

```powershell
npm run build
npm run preview
```

Hentikan Vite dengan `Ctrl+C`. Perubahan transaksi, status, pembayaran, layanan, dan pengeluaran dikirim ke API. Daftar memakai cursor pagination internal yang dimuat berurutan; pengguna menggulir halaman tanpa kontrol halaman bernomor.

## Fitur yang terhubung

- Autentikasi Bearer token Sanctum melalui Axios; akses menu laporan/pengaturan mengikuti role owner.
- Ringkasan dan data transaksi, pelanggan, layanan, serta pengeluaran dari Laravel.
- Pembuatan transaksi dan perpindahan status di server; backend menetapkan nomor nota, harga, dan nilai final.
- Pembayaran dicatat hanya setelah status laundry `SELESAI`, melalui endpoint pembayaran.
- Pengaturan menyediakan Promo Member per outlet: aktif/nonaktif, target transaksi, minimal subtotal, dan persentase diskon (bawaan 20%). Saat aktif, diskon otomatis diterapkan backend pada transaksi setelah target terpenuhi.
- Pencatatan pengeluaran dan laporan penjualan, pembayaran, piutang, pengeluaran, laba rugi, serta layanan terlaris.
- Cetak nota masih berupa aksi pratinjau; perangkat/printer Bluetooth belum terhubung.

## Struktur source

```text
src/
├── api.js                 # Axios, Bearer token, dan cursor loader
├── normalizers.js         # Adaptasi respons API ke model tampilan
├── layouts/MainLayout.vue # Sesi, state halaman, dan operasi bersama
├── navigation/menu.js
└── pages/                 # Dashboard dan halaman per menu
```

Kontrak endpoint/payload ada di [API docs](../api.laundrian/docs/api.md). Jangan mengubah kontrak frontend/backend tanpa memperbarui dokumentasi tersebut.

## Git dan release

Kerja harian di `develop`. Setelah commit dan push perubahan ke origin, promosikan dengan satu perintah:

```powershell
git switch develop
git add .
git commit -m "jelaskan perubahan"
git push origin develop
npm run release
```

`npm run release` (alias `npm run deploy`) memastikan working tree bersih dan sinkronisasi `develop`, membuat worktree sementara dari `origin/main`, memastikan fast-forward, lalu menjalankan `npm ci` dan build production. Jika lolos, script mendorong hasilnya ke `main`; branch aktif tetap `develop`. `npm run release -- --dry-run` memvalidasi tanpa push. `npm run build` hanya membangun frontend. Push manual ke `main`/`master` ditolak hook lokal.
