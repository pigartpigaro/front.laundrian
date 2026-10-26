<script setup>
import { computed } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useBleThermalPrinter } from '../../services/useBleThermalPrinter.js'

const {
  canConnect,
  connectPrinter,
  delayMs,
  disconnectPrinter,
  hasBluetoothApi,
  hasSelectedDevice,
  isConnected,
  isSecureContext,
  status,
  statusMessage,
  testPrint,
} = useBleThermalPrinter()

const statusLabel = computed(() => ({
  connecting: 'Menghubungkan', connected: 'Terhubung', disconnected: 'Belum terhubung',
  printing: 'Mengirim ke printer', error: 'Koneksi bermasalah',
}[status.value] || 'Belum terhubung'))
</script>

<template>
  <section class="printer-settings-card" aria-labelledby="printer-settings-title">
    <header class="printer-settings-heading">
      <span class="printer-settings-icon"><AppIcon name="receipt" /></span>
      <div>
        <h3 id="printer-settings-title">Printer struk BLE</h3>
        <p>Hubungkan printer thermal agar tombol Cetak nota mengirim struk secara nirkabel.</p>
      </div>
    </header>

    <p v-if="!hasBluetoothApi" class="printer-browser-note" role="status">Web Bluetooth tidak tersedia di browser ini. Gunakan Chrome yang mendukung Bluetooth.</p>
    <p v-else-if="!isSecureContext" class="printer-browser-note" role="status">Koneksi Bluetooth memerlukan HTTPS atau localhost. Alamat aplikasi saat ini belum aman.</p>

    <div class="printer-status" :class="`is-${status}`" role="status" aria-live="polite">
      <span class="printer-status-dot" aria-hidden="true"></span>
      <div><b>{{ statusLabel }}</b><p>{{ statusMessage }}</p></div>
    </div>

    <div class="printer-actions">
      <button v-if="!isConnected" class="button primary" type="button" :disabled="!canConnect || status === 'connecting' || status === 'printing'" @click="connectPrinter">
        {{ status === 'connecting' ? 'Menghubungkan…' : hasSelectedDevice ? 'Sambungkan ulang' : 'Hubungkan printer' }}
      </button>
      <button v-else class="button secondary" type="button" :disabled="status === 'printing'" @click="disconnectPrinter">Putuskan koneksi</button>
      <button class="button secondary" type="button" :disabled="!isConnected || status === 'printing'" @click="testPrint">{{ status === 'printing' ? 'Mengirim…' : 'Tes cetak' }}</button>
      <label class="printer-delay">Jeda kirim (ms)<input v-model.number="delayMs" type="number" min="0" max="1000" step="10" :disabled="status === 'printing'" /></label>
    </div>
    <p class="printer-settings-footnote">Ukuran kertas dan catatan kaki diatur pada bagian Format nota di menu ini.</p>
  </section>
</template>

<style scoped>
.printer-settings-card { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--color-border); border-radius: 12px; background: #fff; }
.printer-settings-heading { display: flex; align-items: flex-start; gap: 12px; }
.printer-settings-icon { display: grid; width: 38px; height: 38px; flex: none; place-items: center; border-radius: 10px; color: var(--color-royal); background: var(--color-primary-soft); font-size: 20px; }
.printer-settings-heading h3 { margin: 0; color: var(--color-navy); font-size: 16px; }
.printer-settings-heading p, .printer-settings-footnote { margin: 4px 0 0; color: var(--color-muted); font-size: 13px; line-height: 1.5; }
.printer-browser-note { margin: 0; padding: 11px 13px; border: 1px solid #e7c98a; border-radius: 8px; color: #694b08; background: #fff9e9; font-size: 13px; line-height: 1.5; }
.printer-status { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface); }
.printer-status-dot { width: 9px; height: 9px; flex: none; margin-top: 5px; border-radius: 50%; background: #8290a3; }
.printer-status.is-connected .printer-status-dot { background: #328451; }
.printer-status.is-connecting .printer-status-dot, .printer-status.is-printing .printer-status-dot { background: var(--color-primary); animation: printer-pulse 1s ease-in-out infinite alternate; }
.printer-status.is-error .printer-status-dot { background: #c44848; }
.printer-status b { color: var(--color-ink); font-size: 14px; }
.printer-status p { margin: 3px 0 0; color: var(--color-muted); font-size: 13px; line-height: 1.45; overflow-wrap: anywhere; }
.printer-actions { display: flex; align-items: end; flex-wrap: wrap; gap: 10px; }
.printer-delay { display: grid; gap: 5px; color: var(--color-muted); font-size: 12px; }
.printer-delay input { width: 130px; min-height: 40px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-ink); background: var(--color-surface); }
@keyframes printer-pulse { to { opacity: .45; } }
@media (max-width: 600px) { .printer-settings-card { padding: 15px; } .printer-actions { display: grid; grid-template-columns: 1fr; align-items: stretch; } .printer-actions .button { justify-content: center; } .printer-delay input { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .printer-status.is-connecting .printer-status-dot, .printer-status.is-printing .printer-status-dot { animation: none; } }
</style>
