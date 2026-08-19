# X-Porta WebApp

Web dashboard untuk pengelolaan laporan **Finished Goods QC** (PDQC-020).

## Fitur

- **Dashboard** — Pencarian, filter lanjutan (OQC type, shift, line, tahun, status), paginasi, ekspor CSV
- **Form Laporan** — 3 tahap (Informasi → Fisik/Kriteria Reject → Analisa) dengan workflow step locking
- **Detail Laporan** — Tampilan lengkap hasil reject criteria, total reject, status A/R, dan hasil analisa organoleptik/kimia
- **Export PDF** — Generate laporan PDF format PDQC-020
- **Sinkronisasi** — Upload/download data ke Google Sheets/Drive via Google Apps Script
- **Autentikasi** — Login dengan NIK dan password

## Tech Stack

- React 19 + TypeScript
- Vite 8
- React Router DOM 7
- Lucide React (icons)
- date-fns

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output build tersedia di folder `dist/`.

## Backend

Menggunakan Google Apps Script sebagai backend API untuk sinkronisasi data laporan dan autentikasi user.
v2
