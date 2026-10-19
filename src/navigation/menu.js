export const menu = [
  { label: 'Ringkasan', icon: 'home', id: 'dashboard', section: 'WORKSPACE' },
  { label: 'Transaksi', icon: 'receipt', id: 'transactions', section: 'OPERASIONAL' },
  { label: 'Proses laundry', icon: 'laundry', id: 'process' },
  { label: 'Pelanggan', icon: 'customers', id: 'customers' },
  { label: 'Pengeluaran', icon: 'expenses', id: 'expenses' },
  { label: 'Laporan', icon: 'reports', id: 'reports', section: 'ANALISIS', children: [{ label: 'Penjualan', id: 'report-sales' }, { label: 'Pembayaran', id: 'report-payments' }, { label: 'Piutang', id: 'report-receivables' }, { label: 'Pengeluaran', id: 'report-expenses' }, { label: 'Laba rugi', id: 'report-profit' }, { label: 'Layanan terlaris', id: 'report-services' }] },
  { label: 'Pengaturan', icon: 'settings', id: 'settings', section: 'LAINNYA', children: [{ label: 'Layanan & harga', id: 'settings-services' }, { label: 'Promo Member', id: 'settings-member-promo' }, { label: 'Website laundry', id: 'settings-website' }, { label: 'Printer', id: 'settings-printer' }, { label: 'Karyawan', id: 'settings-staff' }, { label: 'Profil laundry', id: 'settings-profile' }] },
]
