<script setup>
import { computed, inject } from 'vue'
import CurrencyInput from '../../../components/CurrencyInput.vue'

const { showForm, form, data, selectedService, lineTotal, subtotal, total, money, addTransactionItem, removeTransactionItem, createTransaction, saving } = inject('laundrian')
const customerSuggestions = computed(() => {
  const query = form.value.customer.trim().toLocaleLowerCase('id-ID')
  if (query.length < 2 || form.value.customerId) return []
  return data.value.customers.filter(customer => `${customer.name} ${customer.phone === '-' ? '' : customer.phone}`.toLocaleLowerCase('id-ID').includes(query)).slice(0, 6)
})
function selectCustomer(customer) {
  form.value.customerId = customer.id
  form.value.customer = customer.name
  form.value.phone = customer.phone === '-' ? '' : customer.phone
}
function typeCustomer() { form.value.customerId = null }
</script>

<template>
  <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
      <div class="modal-head">
        <div><p class="eyebrow">TRANSAKSI BARU</p><h2 id="transaction-modal-title">Buat pesanan laundry</h2></div>
        <button class="close-button" aria-label="Tutup formulir transaksi" @click="showForm = false">×</button>
      </div>
      <div class="modal-body">
        <label>Nama pelanggan<div class="customer-picker"><input v-model="form.customer" required autocomplete="name" placeholder="Cari nama pelanggan tersimpan…" @input="typeCustomer" /><div v-if="customerSuggestions.length" class="customer-suggestions" role="listbox" aria-label="Pelanggan tersimpan"><button v-for="customer in customerSuggestions" :key="customer.id" type="button" role="option" @click="selectCustomer(customer)"><span><b>{{ customer.name }}</b><small>{{ customer.phone === '-' ? 'Tanpa nomor telepon' : customer.phone }}</small></span><span class="customer-saved-badge">Tersimpan</span></button></div></div><small v-if="form.customerId" class="selected-customer-note">Pelanggan tersimpan dipilih · transaksi ini memakai data yang sama.</small><small v-else class="customer-hint">Pilih dari saran jika pelanggan sudah ada.</small></label>
        <label>Nomor telepon <span class="optional">Opsional</span><input v-model="form.phone" type="tel" autocomplete="tel" placeholder="08xx xxxx xxxx" /></label>
        <section class="transaction-items" aria-labelledby="transaction-items-title">
          <div class="transaction-items-heading"><div><h3 id="transaction-items-title">Rincian layanan</h3><small>Pilih satu atau beberapa layanan untuk pesanan ini.</small></div></div>
          <div v-for="(item, index) in form.items" :key="item.key" class="transaction-item-row">
            <label class="transaction-item-service">Layanan<select v-model.number="item.serviceId" required><option :value="null" disabled>Pilih layanan</option><option v-for="service in data.services" :key="service.id" :value="service.id">{{ service.name }} · {{ money(service.price) }}/{{ service.unit.toLowerCase() }}</option></select></label>
            <label class="transaction-item-qty">Jumlah ({{ selectedService(item).unit }})<input v-model.number="item.qty" type="number" min="0.1" step="0.1" required /></label>
            <div class="transaction-item-total"><small>Subtotal</small><b>{{ money(lineTotal(item)) }}</b></div>
            <button v-if="form.items.length > 1" class="remove-transaction-item" type="button" :aria-label="`Hapus rincian layanan ${index + 1}`" @click="removeTransactionItem(index)">Hapus</button>
          </div>
          <button class="button secondary add-transaction-item" type="button" :disabled="form.items.length >= 30 || !data.services.length" @click="addTransactionItem">＋ Tambah layanan</button>
          <p v-if="form.items.length >= 30" class="transaction-items-limit">Maksimal 30 rincian dalam satu transaksi.</p>
          <div class="transaction-subtotal"><span>Subtotal layanan</span><b>{{ money(subtotal) }}</b></div>
        </section>
        <div class="form-row">
          <label>Diskon<CurrencyInput v-model="form.discount" min="0" placeholder="Rp 0,00" aria-label="Diskon dalam Rupiah" /></label>
          <label>Ongkir<CurrencyInput v-model="form.shipping" min="0" placeholder="Rp 0,00" aria-label="Ongkir dalam Rupiah" /></label>
        </div>
        <label>Catatan <span class="optional">Opsional</span><textarea v-model="form.note" placeholder="Catatan khusus untuk pesanan ini"></textarea></label>
        <div class="modal-total"><span>Total transaksi</span><b>{{ money(total) }}</b></div>
        <p class="payment-hint">Pembayaran dicatat setelah proses laundry selesai.</p>
      </div>
      <div class="modal-footer"><button class="button secondary" :disabled="saving.transaction" @click="showForm = false">Batal</button><button class="button primary" :disabled="saving.transaction" @click="createTransaction">{{ saving.transaction ? 'Menyimpan…' : 'Simpan transaksi' }}</button></div>
    </section>
  </div>
</template>
