<script setup>
import { computed, inject, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { requestApi } from '../../api.js'
import CurrencyInput from '../../components/CurrencyInput.vue'

const props = defineProps({ processMode: { type: Boolean, default: false } })
const { data, money, paymentStatus, statusFilter, serviceFilter, paymentFilter, transactionFrom, transactionTo, filteredTransactions, countStatus, nextStatus, printReceipt, setPage, notify, saving, recordPayment: savePayment, session, loadOperationalData } = inject('laundrian')
const paymentTarget = ref(null)
const paymentAmount = ref(0)
const paymentMethod = ref('TUNAI')
const actionTarget = ref(null)
const actionKind = ref('cancel')
const actionReason = ref('')
const correctedStatus = ref('PROSES')
const savingAction = ref(false)
const detailTarget = ref(null)
const loadingDetailIds = ref(new Set())
const isOwner = computed(() => ['OWNER', 'SUPERADMIN'].includes(session.value?.role))
const remainingAmount = computed(() => paymentTarget.value ? Math.max(0, Number(paymentTarget.value.total) - Number(paymentTarget.value.paid)) : 0)
const appliedAmount = computed(() => Math.min(Math.max(0, Number(paymentAmount.value) || 0), remainingAmount.value))
const changeAmount = computed(() => paymentMethod.value === 'TUNAI' ? Math.max(0, Number(paymentAmount.value || 0) - remainingAmount.value) : 0)

function openPayment(transaction) {
  paymentTarget.value = transaction
  paymentAmount.value = Math.max(0, transaction.total - transaction.paid)
  paymentMethod.value = 'TUNAI'
}

function recordPayment() {
  const transaction = paymentTarget.value
  const amount = Number(paymentAmount.value)
  const remaining = remainingAmount.value
  if (!amount || amount <= 0 || (paymentMethod.value !== 'TUNAI' && amount > remaining)) {
    notify(paymentMethod.value === 'TUNAI' ? 'Uang diterima harus lebih dari Rp 0,00' : `Nominal pembayaran harus lebih dari Rp 0,00 dan maksimal ${money(remaining)}`)
    return
  }

  const paidAmount = Math.min(amount, remaining)
  const change = Math.max(0, amount - remaining)
  const note = change > 0 ? `Uang diterima ${money(amount)}; kembalian ${money(change)}.` : null
  savePayment(transaction, paidAmount, paymentMethod.value, note).then(ok => {
    if (ok) { paymentTarget.value = null; notify(`Pembayaran ${money(paidAmount)} untuk ${transaction.id} berhasil disimpan${change > 0 ? ` · kembalian ${money(change)}` : ''}`, 'success') }
  })
}

function changePaymentMethod(event) {
  paymentMethod.value = event.target.value
  if (paymentMethod.value !== 'TUNAI' && Number(paymentAmount.value) > remainingAmount.value) paymentAmount.value = remainingAmount.value
}
function openAction(transaction, kind, payment = null) {
  actionTarget.value = { transaction, payment }
  actionKind.value = kind
  actionReason.value = ''
  correctedStatus.value = transaction.status === 'MASUK' ? 'PROSES' : transaction.status
}
async function submitAction() {
  if (!actionTarget.value || savingAction.value || actionReason.value.trim().length < 5) return
  savingAction.value = true
  const { transaction, payment } = actionTarget.value
  const path = actionKind.value === 'void' ? `/pembayaran/${payment.id}/void` : `/transaksi/${transaction.backendId}/${actionKind.value === 'cancel' ? 'batal' : 'koreksi-status'}`
  const body = actionKind.value === 'void' ? { alasan_void: actionReason.value.trim() } : actionKind.value === 'cancel' ? { alasan: actionReason.value.trim() } : { status_laundry: correctedStatus.value, alasan: actionReason.value.trim() }
  try {
    await requestApi(path, { method: 'POST', body })
    actionTarget.value = null; await loadOperationalData({ quiet: true })
    notify(actionKind.value === 'cancel' ? 'Transaksi berhasil dibatalkan.' : actionKind.value === 'void' ? 'Pembayaran berhasil di-void.' : 'Status transaksi berhasil dikoreksi.', 'success')
  } catch (error) { notify(error.message, 'error') }
  finally { savingAction.value = false }
}
async function showTransactionDetail(transaction) {
  const pending = new Set(loadingDetailIds.value)
  if (pending.has(transaction.backendId)) return
  pending.add(transaction.backendId); loadingDetailIds.value = pending
  try { detailTarget.value = (await requestApi(`/transaksi/${transaction.backendId}`)).data }
  catch (error) { notify(error.message, 'error') }
  finally { const updated = new Set(loadingDetailIds.value); updated.delete(transaction.backendId); loadingDetailIds.value = updated }
}
function isLoadingDetail(transaction) { return loadingDetailIds.value.has(transaction.backendId) }

function transactionDate(id) {
  const match = id.match(/^LDY-(\d{2})(\d{2})(\d{2})-/)
  if (!match) return '-'
  const [, year, month, day] = match
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(2000 + Number(year), Number(month) - 1, Number(day)))
}
</script>

<template>
  <PageHeader title="Proses laundry" description="Pantau pengerjaan, pembayaran, dan nota seluruh pesanan.">
    <template #actions><button class="button primary" @click="setPage('new-transaction')">+ Transaksi baru</button></template>
  </PageHeader>

  <div v-if="props.processMode" class="process-summary">
    <button v-for="s in ['Semua','MASUK','PROSES','SELESAI','DIAMBIL','BATAL']" :key="s" :class="{chosen:statusFilter===s}" @click="statusFilter=s">
      <i v-if="s!=='Semua'" class="status-dot" :class="s.toLowerCase()"></i><b>{{ s==='Semua' ? data.transactions.length : countStatus(s) }}</b><span>{{ s }}</span>
    </button>
  </div>

  <div v-if="paymentTarget" class="modal-backdrop" @click.self="paymentTarget=null">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div class="modal-head">
        <div><p class="eyebrow">PEMBAYARAN</p><h2 id="payment-title">{{ paymentTarget.id }}</h2></div>
        <button class="close-button" aria-label="Tutup" @click="paymentTarget=null">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-total"><span>Sisa tagihan</span><b>{{ money(remainingAmount) }}</b></div>
        <label>{{ paymentMethod === 'TUNAI' ? 'Uang diterima' : 'Nominal pembayaran' }}<CurrencyInput v-model="paymentAmount" min="1" :max="paymentMethod === 'TUNAI' ? undefined : remainingAmount" autocomplete="off" :aria-label="paymentMethod === 'TUNAI' ? 'Uang diterima dalam Rupiah' : 'Nominal pembayaran dalam Rupiah'" /></label>
        <label>Metode pembayaran<select :value="paymentMethod" @change="changePaymentMethod"><option>TUNAI</option><option>TRANSFER</option><option>QRIS</option></select></label>
        <div class="payment-breakdown"><div><span>Dibukukan</span><b>{{ money(appliedAmount) }}</b></div><div v-if="changeAmount > 0"><span>Kembalian</span><b>{{ money(changeAmount) }}</b></div></div>
      </div>
      <div class="modal-footer">
        <button class="button secondary" @click="paymentTarget=null">Batal</button>
        <button class="button primary" :disabled="saving.payment" @click="recordPayment">{{ saving.payment ? 'Menyimpan…' : 'Simpan pembayaran' }}</button>
      </div>
    </section>
  </div>

  <div v-if="actionTarget" class="modal-backdrop" @click.self="actionTarget=null">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-action-title">
      <div class="modal-head"><div><p class="eyebrow">TINDAKAN TRANSAKSI</p><h2 id="transaction-action-title">{{ actionKind === 'cancel' ? 'Batalkan transaksi' : actionKind === 'void' ? 'Void pembayaran' : 'Koreksi status' }}</h2></div><button class="close-button" type="button" aria-label="Tutup" @click="actionTarget=null">&times;</button></div>
      <div class="modal-body"><p>{{ actionTarget.transaction.id }}<template v-if="actionTarget.payment"> · {{ money(actionTarget.payment.amount) }} ({{ actionTarget.payment.method }})</template></p>
        <label v-if="actionKind === 'correct'">Status laundry<select v-model="correctedStatus"><option v-for="status in ['MASUK','PROSES','SELESAI','DIAMBIL']" :key="status">{{ status }}</option></select></label>
        <label>Alasan (minimal 5 karakter)<textarea v-model="actionReason" rows="3" minlength="5" maxlength="1000" required placeholder="Tuliskan alasan agar tercatat di riwayat audit"></textarea></label>
      </div>
      <div class="modal-footer"><button class="button secondary" type="button" :disabled="savingAction" @click="actionTarget=null">Batal</button><button class="button primary" type="button" :disabled="savingAction || actionReason.trim().length < 5" @click="submitAction">{{ savingAction ? 'Menyimpan…' : 'Konfirmasi tindakan' }}</button></div>
    </section>
  </div>

  <div v-if="detailTarget" class="modal-backdrop" @click.self="detailTarget=null">
    <section class="modal transaction-detail-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title">
      <div class="modal-head"><div><p class="eyebrow">RINCIAN TRANSAKSI</p><h2 id="transaction-detail-title">{{ detailTarget.notrans }}</h2></div><button class="close-button" type="button" aria-label="Tutup" @click="detailTarget=null">&times;</button></div>
      <div class="modal-body transaction-detail-body">
        <div class="transaction-detail-summary"><b>{{ detailTarget.nama_pelanggan }}</b><span>{{ detailTarget.no_hp || 'Tanpa nomor telepon' }}</span><span>Status: {{ detailTarget.status_transaksi === 'BATAL' ? 'BATAL' : detailTarget.status_laundry }}</span><span>Total: {{ money(detailTarget.total) }} · Dibayar: {{ money(detailTarget.dibayar) }}</span></div>
        <section><h3>Rincian layanan</h3><div v-for="line in (detailTarget.details || [])" :key="line.id" class="transaction-detail-line"><span>{{ line.service?.nama || line.nama_layanan }} · {{ line.qty }} {{ line.service?.jenis_hitung || line.satuan }}</span><b>{{ money(line.subtotal) }}</b></div></section>
        <section><h3>Pembayaran</h3><div v-for="payment in (detailTarget.payments || [])" :key="payment.id" class="transaction-detail-line"><span>{{ money(payment.nominal) }} · {{ payment.metode }}<small>{{ payment.void_at ? `Di-void: ${payment.alasan_void}` : payment.keterangan || 'Tercatat' }}</small></span><b>{{ payment.void_at ? 'VOID' : 'AKTIF' }}</b></div><p v-if="!detailTarget.payments?.length" class="muted">Belum ada pembayaran.</p></section>
        <section><h3>Riwayat status</h3><div v-for="history in (detailTarget.status_history || detailTarget.statusHistory || [])" :key="history.id" class="transaction-detail-line"><span>{{ history.status_dari || 'BARU' }} → {{ history.status_ke }}<small>{{ history.alasan || history.jenis }} · {{ history.user?.name || 'Sistem' }}</small></span><small>{{ history.created_at ? new Date(history.created_at).toLocaleString('id-ID') : '' }}</small></div><p v-if="!detailTarget.status_history?.length && !detailTarget.statusHistory?.length" class="muted">Belum ada perubahan status.</p></section>
      </div>
    </section>
  </div>

  <section class="panel transaction-panel">
    <div class="filter-row">
      <div class="filters">
        <select v-model="serviceFilter"><option value="">Semua layanan</option><option value="Campur">Campur</option><option v-for="s in data.services" :key="s.id" :value="s.name">{{s.name}}</option></select>
        <select v-model="paymentFilter" class="payment-filter"><option value="">Semua pembayaran</option><option>LUNAS</option><option>DP</option><option>BELUM BAYAR</option></select>
      </div>
    </div>
    <div class="transaction-date-filters"><label>Dari tanggal<input v-model="transactionFrom" type="date" /></label><label>Sampai tanggal<input v-model="transactionTo" type="date" :min="transactionFrom || undefined" /></label></div>

    <div class="table-wrap">
      <table>
        <thead><tr><th>NO. NOTA / PELANGGAN</th><th>LAYANAN</th><th>TANGGAL MASUK</th><th>ESTIMASI</th><th>TOTAL / BAYAR</th><th>STATUS</th><th>AKSI</th></tr></thead>
        <tbody>
          <tr v-for="t in filteredTransactions" :key="t.id">
            <td><b class="receipt-id">{{t.id}}</b><div class="table-customer">{{t.customer}} <span>&middot; {{t.phone}}</span></div></td>
            <td>{{t.service}}<small class="table-sub">{{t.qty}} {{t.unit}}</small></td>
            <td>{{ transactionDate(t.id) }}<small class="table-sub">{{t.time}}</small></td>
            <td>{{t.due}}</td>
            <td><b>{{money(t.total)}}</b><small class="table-sub">{{money(t.paid)}} &middot; {{paymentStatus(t)}}</small></td>
            <td><span class="pill" :class="t.status.toLowerCase()">{{t.status}}</span></td>
            <td><div class="transaction-actions">
              <button v-if="t.status==='SELESAI' && t.paid<t.total" class="small-action" @click="openPayment(t)">Catat pembayaran</button>
              <button v-if="t.status!=='DIAMBIL' && t.status!=='BATAL'" class="small-action status-action" :disabled="saving.status.has(t.backendId)" @click="nextStatus(t)">{{saving.status.has(t.backendId)?'Menyimpan…':t.status==='MASUK'?'Mulai proses':t.status==='PROSES'?'Selesaikan':'Sudah diambil'}} &rarr;</button>
              <button class="small-action" @click="printReceipt(t)">Cetak nota</button>
              <button class="small-action" type="button" :disabled="isLoadingDetail(t)" @click="showTransactionDetail(t)">{{ isLoadingDetail(t) ? 'Memuat…' : 'Detail' }}</button>
              <button v-if="isOwner && t.status!=='BATAL'" class="small-action" type="button" @click="openAction(t, 'correct')">Koreksi status</button>
              <button v-if="isOwner && t.status!=='DIAMBIL' && t.status!=='BATAL'" class="small-action danger-action" type="button" @click="openAction(t, 'cancel')">Batalkan</button>
              <button v-for="payment in (isOwner ? t.payments.filter(item => !item.voidAt) : [])" :key="payment.id" class="small-action danger-action" type="button" @click="openAction(t, 'void', payment)">Void {{ money(payment.amount) }}</button>
            </div></td>
          </tr>
          <tr v-if="!filteredTransactions.length"><td colspan="7" class="empty">Tidak ada transaksi yang cocok dengan pencarianmu.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="transaction-cards">
      <article v-for="t in filteredTransactions" :key="t.id" class="transaction-card">
        <div class="card-identity"><span class="mini-avatar mint">{{t.customer.split(' ').map(w=>w[0]).slice(0,2).join('')}}</span><div><b>{{t.customer}}</b><small>{{t.id}} &middot; {{t.time}}</small></div><span class="pill" :class="t.status.toLowerCase()">{{t.status}}</span></div>
        <div class="mobile-card-details"><span>{{t.service}} &middot; {{t.qty}} {{t.unit}}</span><b>{{money(t.total)}}</b></div>
        <div class="mobile-card-details secondary-detail"><span>{{t.due}} &middot; {{paymentStatus(t)}}</span><span>Bayar {{money(t.paid)}}</span></div>
        <button v-if="t.status==='SELESAI' && t.paid<t.total" class="small-action" @click="openPayment(t)">Catat pembayaran</button>
        <button v-if="t.status!=='DIAMBIL' && t.status!=='BATAL'" class="small-action status-action" :disabled="saving.status.has(t.backendId)" @click="nextStatus(t)">{{saving.status.has(t.backendId)?'Menyimpan…':t.status==='MASUK'?'Mulai proses':t.status==='PROSES'?'Selesaikan':'Sudah diambil'}} &rarr;</button>
        <button class="small-action" @click="printReceipt(t)">Cetak nota</button>
        <button class="small-action" type="button" :disabled="isLoadingDetail(t)" @click="showTransactionDetail(t)">{{ isLoadingDetail(t) ? 'Memuat…' : 'Detail transaksi' }}</button>
        <button v-if="isOwner && t.status!=='BATAL'" class="small-action" type="button" @click="openAction(t, 'correct')">Koreksi status</button>
        <button v-if="isOwner && t.status!=='DIAMBIL' && t.status!=='BATAL'" class="small-action danger-action" type="button" @click="openAction(t, 'cancel')">Batalkan transaksi</button>
        <button v-for="payment in (isOwner ? t.payments.filter(item => !item.voidAt) : [])" :key="payment.id" class="small-action danger-action" type="button" @click="openAction(t, 'void', payment)">Void pembayaran {{ money(payment.amount) }}</button>
      </article>
      <div v-if="!filteredTransactions.length" class="empty mobile-empty">Tidak ada transaksi yang cocok dengan pencarianmu.</div>
    </div>
  </section>
</template>
