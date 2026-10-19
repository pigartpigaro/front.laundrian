<script setup>
import { inject } from 'vue'
import CurrencyInput from '../../../components/CurrencyInput.vue'

const { showExpenseForm, expenseForm, saveExpense, saving } = inject('laundrian')
</script>

<template>
  <div v-if="showExpenseForm" class="modal-backdrop" @click.self="showExpenseForm = false">
    <section class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
      <div class="modal-head"><div><p class="eyebrow">PENGELUARAN</p><h2 id="expense-modal-title">Catat pengeluaran</h2></div><button class="close-button" aria-label="Tutup formulir pengeluaran" @click="showExpenseForm = false">×</button></div>
      <div class="modal-body">
        <label>Kategori<select v-model="expenseForm.category"><option value="DETERJEN">Detergen</option><option value="PEWANGI">Pewangi</option><option value="PLASTIK">Plastik</option><option value="LISTRIK">Listrik</option><option value="AIR">Air</option><option value="TRANSPORT">Transport</option><option value="PERAWATAN">Perawatan</option><option value="GAJI">Gaji</option><option value="LAINNYA">Lainnya</option></select></label>
        <label>Keterangan<input v-model="expenseForm.description" required placeholder="Contoh: Belanja stok mingguan" /></label>
        <label>Nominal<CurrencyInput v-model="expenseForm.amount" min="1" required placeholder="Rp 0,00" aria-label="Nominal pengeluaran dalam Rupiah" /></label>
      </div>
      <div class="modal-footer"><button class="button secondary" :disabled="saving.expense" @click="showExpenseForm = false">Batal</button><button class="button primary" :disabled="saving.expense" @click="saveExpense">{{ saving.expense ? 'Menyimpan…' : 'Simpan pengeluaran' }}</button></div>
    </section>
  </div>
</template>
