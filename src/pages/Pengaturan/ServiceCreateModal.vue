<script setup>
import { inject } from 'vue'
import CurrencyInput from '../../components/CurrencyInput.vue'

const { showServiceForm, serviceForm, saveService, saving } = inject('laundrian')
</script>

<template>
  <div v-if="showServiceForm" class="modal-backdrop" @click.self="showServiceForm = false" @keydown.esc="showServiceForm = false">
    <section class="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title">
      <div class="modal-head">
        <div><p class="eyebrow">PENGATURAN</p><h2 id="service-modal-title">Tambah layanan</h2></div>
        <button class="close-button" aria-label="Tutup formulir layanan" @click="showServiceForm = false">&times;</button>
      </div>
      <form class="modal-body" @submit.prevent="saveService">
        <label>Nama layanan<input v-model="serviceForm.name" required autofocus maxlength="80" placeholder="Contoh: Cuci + Setrika" /></label>
        <div class="form-row">
          <label>Satuan<select v-model="serviceForm.unit"><option>KG</option><option>PCS</option><option>PASANG</option><option>METER</option></select></label>
          <label>Estimasi (jam)<input v-model.number="serviceForm.eta" type="number" min="72" max="720" required /><small>Minimal 72 jam (3 hari).</small></label>
        </div>
        <label>Harga per satuan<CurrencyInput v-model="serviceForm.price" min="1" required placeholder="Rp 0,00" aria-label="Harga layanan dalam Rupiah" /></label>
        <p class="service-form-note">Layanan baru disimpan ke data outlet dan langsung tersedia untuk transaksi.</p>
        <div class="modal-footer">
          <button type="button" class="button secondary" @click="showServiceForm = false">Batal</button>
          <button type="submit" class="button primary" :disabled="saving.service">{{ saving.service ? 'Menyimpan…' : 'Simpan layanan' }}</button>
        </div>
      </form>
    </section>
  </div>
</template>
