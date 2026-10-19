<script setup>
import { computed, inject, reactive, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { requestApi } from '../../api.js'

const { data, money, search, notify, loadOperationalData } = inject('laundrian')
const formOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const error = ref('')
const form = reactive({ name: '', phone: '', note: '' })
const customers = computed(() => data.value.customers
  .filter(customer => `${customer.name} ${customer.phone}`.toLowerCase().includes(search.value.toLowerCase()))
  .map(customer => {
    const transactions = data.value.transactions.filter(transaction => transaction.customer === customer.name && transaction.status !== 'BATAL')
    return {
      ...customer,
      transactionCount: transactions.length,
      totalSpent: transactions.reduce((sum, transaction) => sum + transaction.total, 0),
    }
  }))
function openCreate() { editingId.value = null; Object.assign(form, { name: '', phone: '', note: '' }); error.value = ''; formOpen.value = true }
function openEdit(customer) { editingId.value = customer.id; Object.assign(form, { name: customer.name, phone: customer.phone === '-' ? '' : customer.phone, note: customer.note }); error.value = ''; formOpen.value = true }
async function saveCustomer() {
  if (saving.value) return
  saving.value = true; error.value = ''
  const body = { nama: form.name.trim(), no_hp: form.phone.trim() || null, catatan: form.note.trim() || null }
  try {
    await requestApi(editingId.value ? `/pelanggan/${editingId.value}` : '/pelanggan', { method: editingId.value ? 'PUT' : 'POST', body })
    await loadOperationalData(); formOpen.value = false; notify(editingId.value ? 'Pelanggan berhasil diperbarui.' : 'Pelanggan berhasil ditambahkan.', 'success')
  } catch (e) { error.value = e.message; notify(e.message, 'error') }
  finally { saving.value = false }
}
</script>

<template>
  <PageHeader title="Pelanggan" description="Kelola kontak dan pantau aktivitas pelanggan outlet.">
    <template #actions><button class="button primary" type="button" @click="openCreate">+ Tambah pelanggan</button></template>
  </PageHeader>

  <section v-if="formOpen" class="panel customer-editor" aria-label="Form pelanggan">
    <div class="panel-heading"><div><h2>{{ editingId ? 'Edit pelanggan' : 'Pelanggan baru' }}</h2><p>Nama pelanggan wajib diisi. Nomor telepon dan catatan bersifat opsional.</p></div></div>
    <form class="staff-editor" @submit.prevent="saveCustomer">
      <div class="staff-editor-fields"><label>Nama pelanggan<input v-model="form.name" required maxlength="150" autocomplete="name" /></label><label>Nomor telepon<input v-model="form.phone" type="tel" maxlength="32" autocomplete="tel" /></label><label class="customer-note-field">Catatan<textarea v-model="form.note" maxlength="2000" rows="2"></textarea></label></div>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <div class="staff-editor-actions"><button class="button secondary" type="button" :disabled="saving" @click="formOpen = false">Batal</button><button class="button primary" type="submit" :disabled="saving">{{ saving ? 'Menyimpan…' : 'Simpan pelanggan' }}</button></div>
    </form>
  </section>

  <section class="panel customer-panel customers-list-panel" aria-label="Daftar pelanggan">
    <div class="filter-row"><span class="muted">{{ customers.length }} pelanggan ditemukan</span></div>
    <div v-if="customers.length" class="table-wrap">
      <table>
        <thead><tr><th>NAMA PELANGGAN</th><th>NO. TELEPON</th><th>TRANSAKSI</th><th>TOTAL BELANJA</th><th>CATATAN</th><th>AKSI</th></tr></thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id">
            <td><div class="customer-cell"><div class="mini-avatar saffron">{{ customer.name.split(' ').map(word => word[0]).slice(0, 2).join('') }}</div><b>{{ customer.name }}</b></div></td>
            <td>{{ customer.phone }}</td><td>{{ customer.transactionCount }} kali</td>
            <td><b>{{ money(customer.totalSpent) }}</b></td><td>{{ customer.note || '—' }}</td><td><button class="small-action" type="button" @click="openEdit(customer)">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="customers.length" class="customer-cards">
      <article v-for="customer in customers" :key="customer.name" class="customer-card">
        <div class="card-identity"><span class="mini-avatar saffron">{{ customer.name.split(' ').map(word => word[0]).slice(0, 2).join('') }}</span><div><b>{{ customer.name }}</b><small>{{ customer.phone }}</small></div></div>
        <div class="mobile-card-details"><span>{{ customer.transactionCount }} transaksi</span><b>{{ money(customer.totalSpent) }}</b></div>
        <small>{{ customer.note || 'Belum ada catatan' }}</small>
        <button class="small-action" type="button" @click="openEdit(customer)">Edit pelanggan</button>
      </article>
    </div>
    <div v-else class="empty-state"><b>{{ search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan' }}</b><span>{{ search ? 'Coba nama atau nomor telepon lain.' : 'Pelanggan akan muncul setelah tercatat pada transaksi.' }}</span></div>
  </section>
</template>
