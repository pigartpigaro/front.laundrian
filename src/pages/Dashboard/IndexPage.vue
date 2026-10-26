<script setup>
import { computed, inject } from 'vue'

const {
  dateLabel,
  data,
  money,
  countStatus,
  setPage,
  printReceipt,
  paymentStatus,
  statusFilter,
  serviceFilter,
  paymentFilter,
  search,
} = inject('laundrian')

const revenueRecorded = computed(() => Number(data.value.transactions.reduce((sum, transaction) =>
  sum + (transaction.status === 'BATAL' ? 0 : transaction.total), 0,
)))
const receivableTransactions = computed(() => data.value.transactions.filter(transaction =>
  transaction.transactionStatus !== 'BATAL' && transaction.status !== 'BATAL' && transaction.paid < transaction.total,
))
const receivablesTotal = computed(() => receivableTransactions.value.reduce((sum, transaction) => sum + transaction.total - transaction.paid, 0))
const workStages = [
  { status: 'MASUK', detail: 'Pesanan baru' },
  { status: 'PROSES', detail: 'Sedang dikerjakan' },
  { status: 'SELESAI', detail: 'Siap diserahkan' },
]

function openProcess(status = 'Semua') {
  statusFilter.value = status
  serviceFilter.value = ''
  paymentFilter.value = ''
  search.value = ''
  setPage('process')
}

function openReceivables() {
  openProcess()
  paymentFilter.value = 'BELUM BAYAR'
}
</script>

<template>
  <section class="dashboard-view">
    <header class="dashboard-heading">
      <div>
        <h1>Ringkasan</h1>
        <p>Pantau nilai pesanan, antrean cucian, dan tagihan terbuka.</p>
      </div>
      <div class="dashboard-heading-actions">
        <span class="dashboard-date">{{ dateLabel }}</span>
        <button class="button primary" @click="setPage('new-transaction')">Transaksi baru</button>
      </div>
    </header>

    <section class="dashboard-metrics" aria-label="Ringkasan angka">
      <article class="dashboard-metric">
        <span>Nilai pesanan</span>
        <strong>{{ money(revenueRecorded) }}</strong>
        <small>Total transaksi aktif</small>
      </article>
      <article class="dashboard-metric">
        <span>Pesanan tercatat</span>
        <strong>{{ data.transactions.length }}</strong>
        <small>Di semua tahap laundry</small>
      </article>
      <article class="dashboard-metric dashboard-metric-due">
        <span>Tagihan berjalan</span>
        <strong>{{ money(receivablesTotal) }}</strong>
        <small>{{ receivableTransactions.length }} pesanan belum lunas</small>
      </article>
    </section>

    <section class="dashboard-work" aria-labelledby="work-heading">
      <div class="dashboard-section-heading">
        <div>
          <h2 id="work-heading">Antrean laundry</h2>
          <p>Pilih tahap untuk membuka daftar pesanan.</p>
        </div>
        <button class="dashboard-text-button" @click="openProcess()">Semua pesanan</button>
      </div>
      <div class="dashboard-stage-list">
        <button v-for="stage in workStages" :key="stage.status" class="dashboard-stage" @click="openProcess(stage.status)">
          <span class="status-dot" :class="stage.status.toLowerCase()"></span>
          <span class="dashboard-stage-copy"><b>{{ stage.status }}</b><small>{{ stage.detail }}</small></span>
          <strong>{{ countStatus(stage.status) }}</strong>
        </button>
      </div>
    </section>

    <div class="dashboard-detail-grid">
      <section class="dashboard-list-panel" aria-labelledby="recent-heading">
        <div class="dashboard-section-heading">
          <div>
            <h2 id="recent-heading">Pesanan terbaru</h2>
            <p>Empat pesanan terakhir yang tercatat.</p>
          </div>
          <button class="dashboard-text-button" @click="openProcess()">Lihat semua</button>
        </div>

        <div v-if="data.transactions.length" class="dashboard-recent-table">
          <div class="dashboard-table-head"><span>Pelanggan</span><span>Layanan</span><span>Total</span><span>Status</span></div>
          <div v-for="transaction in data.transactions.slice(0, 4)" :key="transaction.id" class="dashboard-recent-row">
            <div class="dashboard-customer">
              <span class="mini-avatar mint">{{ transaction.customer.split(' ').map(word => word[0]).slice(0, 2).join('') }}</span>
              <span><b>{{ transaction.customer }}</b><small>{{ transaction.id }}</small></span>
            </div>
            <span class="dashboard-service">{{ transaction.service }}<small>{{ transaction.qty }} {{ transaction.unit }}</small></span>
            <span class="dashboard-total">{{ money(transaction.total) }}<small>{{ paymentStatus(transaction) }}</small></span>
            <span class="pill" :class="transaction.status.toLowerCase()">{{ transaction.status }}</span>
          </div>
        </div>
        <div v-else class="dashboard-empty">
          <b>Belum ada pesanan</b>
          <span>Pesanan yang dibuat akan muncul di sini.</span>
          <button class="dashboard-text-button" @click="setPage('new-transaction')">Buat pesanan</button>
        </div>

        <div class="dashboard-recent-mobile">
          <article v-for="transaction in data.transactions.slice(0, 4)" :key="transaction.id" class="dashboard-mobile-order">
            <div class="dashboard-mobile-order-head">
              <span class="mini-avatar mint">{{ transaction.customer.split(' ').map(word => word[0]).slice(0, 2).join('') }}</span>
              <span class="dashboard-mobile-customer"><b>{{ transaction.customer }}</b><small>{{ transaction.id }}</small></span>
              <span class="pill" :class="transaction.status.toLowerCase()">{{ transaction.status }}</span>
            </div>
            <div class="dashboard-mobile-order-detail">
              <span>{{ transaction.service }} · {{ transaction.qty }} {{ transaction.unit }}</span>
              <b>{{ money(transaction.total) }}</b>
            </div>
            <button class="dashboard-mobile-print" @click="printReceipt(transaction)">Cetak nota</button>
          </article>
          <div v-if="!data.transactions.length" class="dashboard-empty">
            <b>Belum ada pesanan</b>
            <span>Pesanan yang dibuat akan muncul di sini.</span>
          </div>
        </div>
      </section>

      <section class="dashboard-due-panel" aria-labelledby="due-heading">
        <div class="dashboard-section-heading">
          <div>
            <h2 id="due-heading">Perlu ditindaklanjuti</h2>
            <p>Pesanan aktif yang belum lunas.</p>
          </div>
          <span class="dashboard-due-count">{{ receivableTransactions.length }}</span>
        </div>

        <div v-if="receivableTransactions.length" class="dashboard-due-list">
          <div v-for="transaction in receivableTransactions.slice(0, 3)" :key="transaction.id" class="dashboard-due-row">
            <div class="dashboard-due-info">
              <b>{{ transaction.customer }}</b>
              <small>{{ transaction.id }} · {{ paymentStatus(transaction) }}</small>
            </div>
            <strong>{{ money(transaction.total - transaction.paid) }}</strong>
          </div>
          <button class="dashboard-text-button" @click="openReceivables">Lihat tagihan</button>
        </div>
        <div v-else class="dashboard-empty dashboard-empty-due">
          <b>Tidak ada tagihan terbuka</b>
          <span>Pesanan yang perlu dibayar akan tampil di sini.</span>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  gap: 24px;
  color: var(--color-text);
}

.dashboard-heading,
.dashboard-heading-actions,
.dashboard-section-heading,
.dashboard-customer,
.dashboard-mobile-order-head,
.dashboard-mobile-order-detail,
.dashboard-due-row {
  display: flex;
  align-items: center;
}

.dashboard-heading,
.dashboard-section-heading {
  justify-content: space-between;
  gap: 16px;
}

.dashboard-heading h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--color-navy);
}

.dashboard-heading p,
.dashboard-section-heading p {
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: 12px;
}

.dashboard-heading-actions {
  gap: 16px;
}

.dashboard-date {
  color: var(--color-muted);
  font-size: 11px;
  white-space: nowrap;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 17px 0;
  border-top: 1px solid var(--color-ice);
  border-bottom: 1px solid var(--color-ice);
}

.dashboard-metric {
  min-width: 0;
  display: grid;
  gap: 5px;
  padding: 0 22px;
  border-right: 1px solid var(--color-ice);
}

.dashboard-metric:first-child { padding-left: 18px; }
.dashboard-metric:last-child { padding-right: 18px; border-right: 0; }

.dashboard-metric > span {
  color: var(--color-muted);
  font-size: 11px;
  font-weight: 600;
}

.dashboard-metric strong {
  color: var(--color-navy);
  font-size: 23px;
  line-height: 1.2;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dashboard-metric small {
  color: var(--color-muted);
  font-size: 10px;
}

.dashboard-metric-due strong { color: var(--color-royal); }

.dashboard-section-heading h2 {
  margin: 0;
  color: var(--color-navy);
  font-size: 14px;
  line-height: 1.3;
  font-weight: 700;
}

.dashboard-text-button {
  flex: none;
  border: 0;
  padding: 4px 0;
  background: none;
  color: var(--color-royal);
  font-size: 11px;
  font-weight: 700;
}

.dashboard-text-button:hover { color: var(--color-navy); text-decoration: underline; text-underline-offset: 3px; }
.dashboard-text-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; border-radius: 2px; }

.dashboard-work { display: grid; gap: 12px; }

.dashboard-stage-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--color-ice);
  border-bottom: 1px solid var(--color-ice);
}

.dashboard-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 66px;
  padding: 10px 18px;
  border: 0;
  border-right: 1px solid var(--color-ice);
  background: transparent;
  text-align: left;
  color: var(--color-text);
  transition: background-color 150ms ease;
}

.dashboard-stage:first-child { padding-left: 18px; }
.dashboard-stage:last-child { padding-right: 18px; border-right: 0; }
.dashboard-stage:hover { background: var(--color-primary-soft); }
.dashboard-stage:focus-visible { position: relative; outline: 2px solid var(--color-primary); outline-offset: -2px; }

.dashboard-stage-copy { display: grid; gap: 3px; flex: 1; min-width: 0; }
.dashboard-stage-copy b { font-size: 11px; letter-spacing: 0.04em; }
.dashboard-stage-copy small { color: var(--color-muted); font-size: 10px; }
.dashboard-stage > strong { color: var(--color-navy); font-size: 20px; font-variant-numeric: tabular-nums; }

.dashboard-detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.dashboard-list-panel,
.dashboard-due-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-ice);
  border-radius: 12px;
  background: var(--color-background);
}

.dashboard-section-heading { margin-bottom: 14px; }

.dashboard-recent-table { display: grid; }
.dashboard-table-head,
.dashboard-recent-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.35fr) minmax(100px, 1fr) minmax(90px, 0.8fr) auto;
  align-items: center;
  gap: 12px;
}

.dashboard-table-head {
  padding: 0 0 8px;
  color: var(--color-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.dashboard-recent-row {
  min-height: 58px;
  border-top: 1px solid var(--color-ice);
  color: var(--color-text);
  font-size: 10px;
}

.dashboard-customer { gap: 8px; min-width: 0; }
.dashboard-customer > span:last-child,
.dashboard-service,
.dashboard-total { display: grid; gap: 3px; min-width: 0; }
.dashboard-customer b { overflow: hidden; color: var(--color-text); text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.dashboard-customer small,
.dashboard-service small,
.dashboard-total small { color: var(--color-muted); font-size: 9px; }
.dashboard-service { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-total { color: var(--color-text); font-weight: 700; font-variant-numeric: tabular-nums; }

.dashboard-recent-mobile { display: none; }

.dashboard-due-count {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-royal);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dashboard-due-list { display: grid; }
.dashboard-due-row { justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--color-ice); }
.dashboard-due-info { display: grid; gap: 4px; min-width: 0; }
.dashboard-due-info b { overflow: hidden; color: var(--color-text); text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.dashboard-due-info small { color: var(--color-muted); font-size: 9px; }
.dashboard-due-row > strong { flex: none; color: var(--color-royal); font-size: 11px; font-variant-numeric: tabular-nums; }
.dashboard-due-list > .dashboard-text-button { justify-self: start; margin-top: 4px; }

.dashboard-empty {
  display: grid;
  justify-items: start;
  gap: 6px;
  padding: 18px 0 4px;
  color: var(--color-muted);
  font-size: 10px;
}

.dashboard-empty b { color: var(--color-text); font-size: 11px; }
.dashboard-empty-due { min-height: 105px; align-content: center; }

@media (max-width: 900px) {
  .dashboard-detail-grid { grid-template-columns: minmax(0, 1fr); }
  .dashboard-due-panel { max-width: none; }
}

@media (max-width: 700px) {
  .dashboard-view { gap: 19px; }
  .dashboard-heading { align-items: flex-start; }
  .dashboard-heading h1 { font-size: 21px; }
  .dashboard-heading p { max-width: 33ch; line-height: 1.5; }
  .dashboard-heading-actions { align-items: flex-end; flex-direction: column-reverse; gap: 7px; }
  .dashboard-date { font-size: 9px; text-align: right; }
  .dashboard-heading-actions .button { width: auto; min-width: 112px; height: 34px; justify-content: center; padding: 0 9px; font-size: 9px; }
  .dashboard-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; padding: 13px 0; }
  .dashboard-metric { padding: 8px 12px; border-right: 0; }
  .dashboard-metric:first-child { padding-left: 12px; }
  .dashboard-metric:nth-child(odd) { border-right: 1px solid var(--color-ice); }
  .dashboard-metric:last-child { grid-column: 1 / -1; border-top: 1px solid var(--color-ice); margin-top: 7px; padding-top: 13px; }
  .dashboard-metric strong { font-size: 20px; }
  .dashboard-stage-list { grid-template-columns: 1fr; }
  .dashboard-stage,
  .dashboard-stage:first-child,
  .dashboard-stage:last-child { min-height: 54px; padding: 8px 14px; border-right: 0; }
  .dashboard-stage + .dashboard-stage { border-top: 1px solid var(--color-ice); }
  .dashboard-stage > strong { font-size: 18px; }
  .dashboard-list-panel,
  .dashboard-due-panel { padding: 13px; }
  .dashboard-section-heading h2 { font-size: 13px; }
  .dashboard-section-heading p { font-size: 9px; }
  .dashboard-recent-table { display: none; }
  .dashboard-recent-mobile { display: grid; gap: 8px; }
  .dashboard-mobile-order { padding: 11px; border: 1px solid var(--color-ice); border-radius: 9px; background: var(--color-background); }
  .dashboard-mobile-order-head { gap: 8px; min-width: 0; }
  .dashboard-mobile-customer { display: grid; flex: 1; min-width: 0; gap: 3px; }
  .dashboard-mobile-customer b { overflow: hidden; color: var(--color-text); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .dashboard-mobile-customer small { color: var(--color-muted); font-size: 9px; }
  .dashboard-mobile-order-detail { justify-content: space-between; gap: 10px; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--color-ice); color: var(--color-muted); font-size: 9px; }
  .dashboard-mobile-order-detail b { flex: none; color: var(--color-text); font-size: 10px; }
  .dashboard-mobile-print { width: 100%; margin-top: 9px; padding: 7px; border: 1px solid var(--color-ice); border-radius: 6px; background: var(--color-primary-soft); color: var(--color-royal); font-size: 9px; font-weight: 700; }
  .dashboard-due-row { padding: 10px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-stage { transition: none; }
}
</style>
