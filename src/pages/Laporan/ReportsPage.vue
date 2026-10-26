<script setup>
import { computed, inject, ref, watch } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import ReportLetterhead from './components/ReportLetterhead.vue'
import { apiOrigin, requestApi } from '../../api.js'

const { money, reportType, notify } = inject('laundrian')
const report = ref(null)
const letterhead = ref(null)
const outletProfile = ref({ store_name: 'Laundry', address: '', phone: '', outlet_logo_url: null })
const loading = ref(false)
const exportingPdf = ref(false)
const error = ref('')
const today = new Date()
const dateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
function formatDate(value) {
  if (!value) return '—'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
const from = ref(dateValue(today))
const to = ref(dateValue(today))
const titleMap = { 'report-sales':'Penjualan', 'report-payments':'Pembayaran', 'report-receivables':'Piutang', 'report-expenses':'Pengeluaran', 'report-profit':'Laba rugi', 'report-services':'Layanan terlaris' }
const title = computed(() => titleMap[reportType.value] || 'Penjualan')
const endpoint = computed(() => ({ 'report-sales':'penjualan', 'report-payments':'pembayaran', 'report-receivables':'piutang', 'report-expenses':'pengeluaran', 'report-profit':'laba-rugi', 'report-services':'layanan-terlaris' }[reportType.value] || 'penjualan'))
async function load() {
  loading.value = true; error.value = ''
  try {
    const query = reportType.value === 'report-receivables' ? '' : `?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`
    const [reportResult, profileResult] = await Promise.allSettled([
      requestApi(`/laporan/${endpoint.value}${query}`),
      requestApi('/pengaturan'),
    ])
    if (reportResult.status === 'rejected') throw reportResult.reason
    report.value = reportResult.value
    if (profileResult.status === 'fulfilled') outletProfile.value = { ...outletProfile.value, ...(profileResult.value.data || {}) }
    if (reportType.value === 'report-receivables') {
      const transactions = [...(report.value.transaksi?.data || [])]
      let cursor = report.value.transaksi?.next_cursor || ''
      while (cursor) {
        const params = new URLSearchParams({ per_page: '100', cursor })
        const page = await requestApi(`/laporan/piutang?${params}`)
        transactions.push(...(page.transaksi?.data || []))
        cursor = page.transaksi?.next_cursor || ''
      }
      report.value.transaksi.data = transactions
    }
  }
  catch (err) { error.value = err.message; report.value = null }
  finally { loading.value = false }
}
watch(endpoint, load, { immediate: true })
const payload = computed(() => report.value?.data)
const hasReport = computed(() => Boolean(report.value && (reportType.value === 'report-receivables' ? report.value.transaksi : payload.value)))
const rows = computed(() => {
  if (reportType.value === 'report-receivables') return (report.value?.transaksi?.data || []).map(r => ({ key: r.id, date: formatDate(r.tanggal), name: r.notrans, detail: `${r.nama_pelanggan} · ${r.status_bayar}`, amount: Number(r.sisa) }))
  const source = payload.value
  if (!source) return []
  if (reportType.value === 'report-services') return source.map((r, i) => ({ key: i, name: r.nama_layanan, detail: `${r.total_qty} ${r.satuan} · ${r.jumlah_transaksi} transaksi`, amount: Number(r.total_penjualan || 0) }))
  if (reportType.value === 'report-sales') return (source.per_transaksi || []).map(r => ({ key: r.id, date: formatDate(r.tanggal), name: r.notrans, detail: `${r.nama_pelanggan || 'Pelanggan umum'} · ${r.status_laundry} · ${r.status_bayar}`, amount: Number(r.total || 0) }))
  if (reportType.value === 'report-expenses') return (source.items || []).map(r => ({ key: r.id, date: formatDate(r.tanggal), name: r.keterangan, detail: r.kategori, amount: Number(r.nominal) }))
  if (reportType.value === 'report-profit') return [
    ...(source.transaksi || []).map(r => ({ key: `income-${r.id}`, date: formatDate(r.tanggal), name: r.notrans, detail: `Pendapatan · ${r.nama_pelanggan || 'Pelanggan umum'}`, amount: Number(r.total || 0) })),
    ...(source.items_pengeluaran || []).map(r => ({ key: `expense-${r.id}`, date: formatDate(r.tanggal), name: r.keterangan, detail: `Pengeluaran · ${r.kategori}`, amount: -Number(r.nominal || 0) })),
  ]
  if (reportType.value === 'report-payments') return (source.items || []).map(r => ({ key: r.id, date: formatDate(r.tanggal), name: r.transaction?.notrans || `Pembayaran #${r.id}`, detail: `${r.transaction?.nama_pelanggan || 'Pelanggan umum'} · ${r.metode}${r.keterangan ? ` · ${r.keterangan}` : ''}`, amount: Number(r.nominal || 0) }))
  return (source.per_hari || []).map(r => ({ key: r.tanggal, date: formatDate(r.tanggal), name: `${r.jumlah ?? ''} transaksi`, detail: '', amount: Number(r.total) }))
})
const primary = computed(() => {
  if (reportType.value === 'report-services') return money(rows.value.reduce((sum, row) => sum + row.amount, 0))
  if (reportType.value === 'report-receivables') return money(report.value?.total_piutang || 0)
  if (reportType.value === 'report-profit') return money(payload.value?.laba_bersih || 0)
  return money(payload.value?.total || 0)
})
const periodLabel = computed(() => reportType.value === 'report-receivables' ? 'Semua tagihan yang belum lunas' : `${formatDate(from.value)} sampai ${formatDate(to.value)}`)
const summaryLabel = computed(() => reportType.value === 'report-profit' ? 'Laba bersih' : reportType.value === 'report-receivables' ? 'Total piutang' : reportType.value === 'report-services' ? 'Total penjualan layanan' : `Total ${title.value.toLowerCase()}`)
const outletLogoUrl = computed(() => outletProfile.value.outlet_logo_url ? new URL(outletProfile.value.outlet_logo_url, apiOrigin()).href : '')
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}
function reportFilename() {
  const slug = title.value.toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, '-')
  return reportType.value === 'report-receivables' ? `laporan-${slug}-${dateValue(new Date())}` : `laporan-${slug}-${from.value}-${to.value}`
}
function printReport() {
  if (!hasReport.value) return
  const printWindow = window.open('', '_blank', 'popup,width=900,height=720')
  if (!printWindow) { notify('Izinkan pop-up untuk mencetak laporan.', 'error'); return }
  const tableRows = rows.value.map((row, index) => {
    const heading = row.date ? `${row.date} - ${row.name}` : row.name
    const detail = row.detail || ''
    return `<tr><td>${index + 1}</td><td><b>${escapeHtml(heading)}</b>${detail ? `<small class="detail">${escapeHtml(detail)}</small>` : ''}</td><td class="amount">${escapeHtml(money(row.amount))}</td></tr>`
  }).join('')
  printWindow.document.open()
  const headerMarkup = letterhead.value?.$el.outerHTML || ''
  printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(`Laporan ${title.value}`)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');*{box-sizing:border-box}body{margin:0;padding:14mm;color:#002170;font:10.67px/1.5 Poppins,Arial,sans-serif}.summary{width:182mm;height:18mm;margin:4mm 0 5mm;padding:2.5mm 4mm;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#e7f1ff;border:1px solid #a7c1da;border-radius:2mm}.summary-copy{display:flex;flex-direction:column;gap:1mm}.summary-copy b{font-size:12pt;line-height:1.15;color:#002170}.summary small{color:#53627a;font-size:8pt}table{width:182mm;border-collapse:collapse;table-layout:fixed}th{height:8mm;padding:0 2mm;background:#e8e7ef;text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase;color:#002170}td{padding:2.7mm 2mm;line-height:1.25;border-bottom:1px solid #dbe4f0;vertical-align:top;overflow-wrap:anywhere;font-size:8pt}th:first-child,td:first-child{width:11mm;color:#142b50}td:last-child,th:last-child{text-align:right;white-space:nowrap;width:40mm}.amount{font-weight:700}.detail{display:block;margin-top:1mm;color:#53627a;font-size:8pt;line-height:1.25}@media print{thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body>${headerMarkup}<section class="summary"><div class="summary-copy"><span>${escapeHtml(summaryLabel.value)}</span><b>${escapeHtml(primary.value)}</b></div><small>${rows.value.length} baris</small></section><table><thead><tr><th>No.</th><th>Rincian</th><th>Nominal</th></tr></thead><tbody>${tableRows || '<tr><td colspan="3">Tidak ada data pada laporan ini.</td></tr>'}</tbody></table></body></html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 250)
}
async function downloadPdf() {
  if (!hasReport.value || exportingPdf.value) return
  exportingPdf.value = true
  try {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const left = 14
    const right = pageWidth - 14
    const safeText = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/[·•]/g, '/').replace(/[–—]/g, '-')
    const drawTableHeading = y => {
      pdf.setFillColor(247, 237, 198)
      pdf.rect(left, y, right - left, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(58, 52, 35)
      pdf.text('NO.', left + 2, y + 5.3)
      pdf.text('RINCIAN', left + 12, y + 5.3)
      pdf.text('NOMINAL', right - 2, y + 5.3, { align: 'right' })
      return y + 8
    }
    const logoImage = letterhead.value?.$el.querySelector('img')
    if (logoImage) await logoImage.decode().catch(() => {})
    const headerCanvas = await html2canvas(letterhead.value.$el, { backgroundColor: '#fff', scale: 3, useCORS: true })
    const headerWidth = pageWidth - left * 2
    const headerHeight = headerWidth * headerCanvas.height / headerCanvas.width
    pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', left, 14, headerWidth, headerHeight)
    const summaryY = 14 + headerHeight + 4
    pdf.setFillColor(255, 249, 229); pdf.setDrawColor(235, 222, 179)
    pdf.roundedRect(left, summaryY, right - left, 18, 2, 2, 'FD')
    pdf.setFontSize(8); pdf.text(safeText(summaryLabel.value), left + 4, summaryY + 6)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(62, 52, 20)
    pdf.text(safeText(primary.value), left + 4, summaryY + 13)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(99, 93, 79)
    pdf.text(`${rows.value.length} baris`, right - 4, summaryY + 11, { align: 'right' })
    let y = drawTableHeading(summaryY + 23)
    rows.value.forEach((row, index) => {
      const nameLines = pdf.splitTextToSize(safeText(row.date ? `${row.date} - ${row.name}` : row.name), 132)
      const detail = row.detail || ''
      const detailLines = detail ? pdf.splitTextToSize(safeText(detail), 132) : []
      const height = Math.max(9, (nameLines.length + detailLines.length) * 4 + 4)
      if (y + height > pageHeight - 16) {
        pdf.addPage()
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(48, 47, 38)
        pdf.text(`Laporan ${safeText(title.value)} (lanjutan)`, left, 15)
        y = drawTableHeading(20)
      }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(82, 77, 66)
      pdf.text(String(index + 1), left + 2, y + 5)
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(48, 47, 38)
      pdf.text(nameLines, left + 12, y + 4.2)
      if (detailLines.length) {
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(99, 93, 79)
        pdf.text(detailLines, left + 12, y + 4.2 + nameLines.length * 4)
      }
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(48, 47, 38)
      pdf.text(safeText(money(row.amount)), right - 2, y + 5, { align: 'right' })
      pdf.setDrawColor(232, 227, 215); pdf.line(left, y + height, right, y + height)
      y += height
    })
    const pageCount = pdf.getNumberOfPages()
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120, 114, 99)
      pdf.text(`Halaman ${page} dari ${pageCount}`, right, pageHeight - 7, { align: 'right' })
    }
    pdf.save(`${reportFilename()}.pdf`)
  } catch (err) {
    notify('PDF gagal dibuat. Coba muat ulang laporan lalu ulangi.', 'error')
  } finally { exportingPdf.value = false }
}
</script>

<template>
  <div aria-hidden="true" style="position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none">
    <ReportLetterhead
      ref="letterhead"
      :store-name="outletProfile.store_name || 'Laundry'"
      :address="outletProfile.address || ''"
      :phone="outletProfile.phone || ''"
      :logo-url="outletLogoUrl"
      :title="`Laporan ${title}`"
      :period="periodLabel"
      :printed-at="formatDate(new Date())"
    />
  </div>
  <PageHeader :title="`Laporan ${title}`" description="Ringkasan dan rincian diambil langsung dari data server."><template #actions><button class="button secondary" :disabled="loading || !hasReport" @click="printReport">Cetak</button><button class="button primary" :disabled="loading || !hasReport || exportingPdf" @click="downloadPdf">{{ exportingPdf ? 'Menyiapkan PDF…' : 'Unduh PDF' }}</button></template></PageHeader>
  <div class="stats-grid report-summary"><article class="stat-card"><div class="stat-top"><span>{{ title }}</span></div><strong>{{ primary }}</strong><div class="stat-foot">{{ rows.length }} baris pada periode berjalan</div></article></div>
  <section class="panel report-data-panel" aria-labelledby="report-detail-heading">
    <div class="panel-heading"><div><h2 id="report-detail-heading">Rincian {{ title.toLowerCase() }}</h2><p v-if="reportType === 'report-receivables'">Semua transaksi dengan sisa tagihan.</p><p v-else>{{ from }} sampai {{ to }}</p></div><button class="button secondary" :disabled="loading" @click="load">Muat ulang</button></div>
    <div v-if="reportType !== 'report-receivables'" class="report-date-filters"><label>Dari tanggal<input v-model="from" type="date" /></label><label>Sampai tanggal<input v-model="to" type="date" :min="from" /></label><button class="button primary" :disabled="loading || !from || !to || to < from" @click="load">Terapkan periode</button></div>
    <div v-if="loading" class="empty-state"><span>Memuat laporan…</span></div>
    <div v-else-if="error" class="empty-state" role="alert"><b>Laporan belum dapat dimuat</b><span>{{ error }}</span><button class="button secondary" @click="load">Coba lagi</button></div>
    <div v-else-if="rows.length" class="report-rows"><article v-for="row in rows" :key="row.key" class="report-row"><div><b>{{ row.date ? `${row.date} - ${row.name}` : row.name }}</b><small>{{ row.detail }}</small></div><strong>{{ money(row.amount) }}</strong></article></div>
    <div v-else class="empty-state"><b>Belum ada data {{ title.toLowerCase() }}</b><span>Data akan muncul setelah ada catatan pada server.</span></div>
  </section>
</template>
