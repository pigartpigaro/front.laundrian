<script setup>
import { computed, inject, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'

const { data, money, openExpenseForm } = inject('laundrian')
const today = new Date()
const dateValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const from = ref(dateValue(new Date(today.getFullYear(), today.getMonth(), 1)))
const to = ref(dateValue(today))
const visibleExpenses = computed(() => data.value.expenses.filter(expense => (!from.value || expense.date >= from.value) && (!to.value || expense.date <= to.value)))
const total = computed(() => visibleExpenses.value.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))
const topCategory = computed(() => {
  const counts = visibleExpenses.value.reduce((map, expense) => map.set(expense.category, (map.get(expense.category) || 0) + 1), new Map())
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
})
</script>

<template>
  <PageHeader title="Pengeluaran" description="Catat biaya operasional untuk membantu memantau arus kas.">
    <template #actions><button class="button primary" @click="openExpenseForm">+ Catat pengeluaran</button></template>
  </PageHeader>

  <div class="stats-grid compact expense-summary">
    <article class="stat-card"><div class="stat-top"><span>Total pengeluaran tercatat</span></div><strong>{{ money(total) }}</strong><div class="stat-foot">{{ visibleExpenses.length }} catatan pada rentang ini</div></article>
    <article class="stat-card"><div class="stat-top"><span>Kategori paling sering</span></div><strong>{{ topCategory }}</strong><div class="stat-foot">Berdasarkan jumlah catatan</div></article>
  </div>

  <section class="panel customer-panel expense-panel" aria-labelledby="expense-history-heading">
    <div class="panel-heading"><div><h2 id="expense-history-heading">Catatan pengeluaran</h2><p>Urutan terbaru lebih dulu</p></div></div>
    <div class="expense-date-filters"><label>Dari tanggal<input v-model="from" type="date" /></label><label>Sampai tanggal<input v-model="to" type="date" :min="from" /></label></div>
    <div v-if="visibleExpenses.length" class="table-wrap">
      <table><thead><tr><th>TANGGAL</th><th>KATEGORI</th><th>KETERANGAN</th><th>NOMINAL</th></tr></thead>
        <tbody><tr v-for="expense in visibleExpenses" :key="expense.id"><td>{{ expense.date }}</td><td><span class="category-tag">{{ expense.category }}</span></td><td>{{ expense.description }}</td><td><b>{{ money(expense.amount) }}</b></td></tr></tbody>
      </table>
    </div>
    <div v-else class="empty-state"><b>{{ data.expenses.length ? 'Tidak ada pengeluaran pada rentang ini' : 'Belum ada pengeluaran' }}</b><span>{{ data.expenses.length ? 'Pilih rentang tanggal lain untuk melihat catatan.' : 'Catat biaya operasional untuk mulai membuat daftar.' }}</span><button v-if="!data.expenses.length" class="button secondary" @click="openExpenseForm">Catat pengeluaran</button></div>
  </section>
</template>
