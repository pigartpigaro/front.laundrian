export function normalizeService(service) {
  return { id: service.id, name: service.nama, unit: service.jenis_hitung, price: Number(service.harga), eta: Number(service.estimasi_jam), active: Boolean(service.aktif) }
}

export function normalizeCustomer(customer) {
  return { id: customer.id, name: customer.nama, phone: customer.no_hp || '-', note: customer.catatan || '', transactionCount: Number(customer.jumlah_transaksi || 0), eligibleTransactionCount: Number(customer.member_eligible_count || 0), memberPromoActive: Boolean(customer.member_promo_active), memberPromoRequiredTransactions: Number(customer.member_promo_required_transactions || 10), memberPromoMinimumSubtotal: Number(customer.member_promo_minimum_subtotal || 75000), memberPromoDiscountPercent: Number(customer.member_promo_discount_percent || 20), totalSpent: Number(customer.total_belanja || 0) }
}

export function normalizeTransaction(transaction) {
  const details = transaction.details || transaction.rincian || []
  const names = details.map(item => item.service?.nama || item.nama_layanan).filter(Boolean)
  const quantities = details.map(item => Number(item.qty || 0))
  const units = details.map(item => item.service?.jenis_hitung || item.satuan || item.jenis_hitung).filter(Boolean)
  const created = transaction.created_at ? new Date(transaction.created_at) : null
  const due = transaction.estimasi_selesai ? new Date(transaction.estimasi_selesai) : null
  return {
    id: transaction.notrans, backendId: transaction.id, customerId: transaction.pelanggan_id || transaction.customer?.id || null, customer: transaction.nama_pelanggan, phone: transaction.no_hp || '-',
    service: names.length > 1 ? 'Campur' : names[0] || '—', qty: quantities.reduce((sum, value) => sum + value, 0), unit: units.length === 1 ? units[0] : units.length ? 'CAMPUR' : '',
    subtotal: Number(transaction.subtotal || 0), discount: Number(transaction.diskon || 0), memberDiscount: Number(transaction.diskon_member || 0), memberDiscountPercent: Number(transaction.diskon_member_persen || 0), memberPromoEligible: Boolean(transaction.member_promo_eligible), shipping: Number(transaction.ongkir || 0),
    total: Number(transaction.total || 0), paid: Number(transaction.dibayar || 0), status: transaction.status_transaksi === 'BATAL' ? 'BATAL' : transaction.status_laundry,
    transactionStatus: transaction.status_transaksi, time: created ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(created) : '',
    createdAt: transaction.created_at, date: transaction.tanggal, due: due ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(due) : '—',
    note: transaction.catatan || '', details, paymentStatus: transaction.status_bayar,
    payments: (transaction.payments || []).map(payment => ({ id: payment.id, amount: Number(payment.nominal || 0), method: payment.metode, voidAt: payment.void_at, voidReason: payment.alasan_void })),
  }
}

export function normalizeExpense(expense) {
  return { id: expense.id, category: expense.kategori, description: expense.keterangan, amount: Number(expense.nominal || 0), date: expense.tanggal }
}

export function unwrapList(result) { return Array.isArray(result?.data) ? result.data : [] }
