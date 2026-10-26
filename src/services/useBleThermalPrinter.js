import { computed, ref, shallowRef } from 'vue'
import {
  buildPrinterTestBytes,
  CANDIDATE_PRINTER_SERVICE_UUID,
  formatBleError,
  getCharacteristicProperties,
  PRINTER_WRITE_CHUNK_SIZE,
} from './ble-thermal-printer.js'

const CONNECT_TIMEOUT_MS = 30000
const DISCOVERY_TIMEOUT_MS = 10000
const WRITE_TIMEOUT_MS = 8000
const status = ref('disconnected')
const statusMessage = ref('Printer belum terhubung.')
const errorMessage = ref('')
const device = shallowRef(null)
const selectedCharacteristic = shallowRef(null)
const delayMs = ref(40)
const hasBluetoothApi = computed(() => typeof navigator !== 'undefined' && Boolean(navigator.bluetooth))
const isSecureContext = computed(() => typeof window !== 'undefined' && window.isSecureContext)
const canConnect = computed(() => hasBluetoothApi.value && isSecureContext.value)
const isConnected = computed(() => status.value === 'connected' && Boolean(selectedCharacteristic.value))
const hasSelectedDevice = computed(() => Boolean(device.value))

export function useBleThermalPrinter() {
  async function connectPrinter() {
    if (!hasBluetoothApi.value) return setError('Browser ini belum mendukung Web Bluetooth. Gunakan Chrome di Android atau desktop yang kompatibel.')
    if (!isSecureContext.value) return setError('Koneksi printer memerlukan HTTPS atau localhost.')
    if (status.value === 'connecting' || status.value === 'printing') return false

    status.value = 'connecting'
    errorMessage.value = ''
    statusMessage.value = 'Memilih dan menghubungkan printer…'
    try {
      const target = device.value || await navigator.bluetooth.requestDevice({
        filters: [{ name: 'RPP02N' }],
        optionalServices: [CANDIDATE_PRINTER_SERVICE_UUID],
      })
      await connectDevice(target)
      return true
    } catch (error) {
      selectedCharacteristic.value = null
      setError(formatBleError(error))
      return false
    }
  }

  async function reconnectRememberedPrinter() {
    if (!canConnect.value || ['connecting', 'connected', 'printing'].includes(status.value)) return false
    if (typeof navigator.bluetooth.getDevices !== 'function') {
      statusMessage.value = 'Penyambungan otomatis tidak tersedia. Tekan Hubungkan printer.'
      return false
    }
    status.value = 'connecting'
    statusMessage.value = 'Mencari printer yang pernah diizinkan…'
    try {
      const devices = await withTimeout(navigator.bluetooth.getDevices(), DISCOVERY_TIMEOUT_MS, 'Waktu pencarian perangkat tersimpan habis.')
      const remembered = devices.find(candidate => normalizeDeviceName(candidate.name) === 'RPP02N')
      if (!remembered) {
        device.value = null
        selectedCharacteristic.value = null
        status.value = 'disconnected'
        statusMessage.value = 'Pilih Hubungkan printer untuk memasangkan printer.'
        return false
      }
      await connectDevice(remembered)
      return true
    } catch (error) {
      selectedCharacteristic.value = null
      setError(`Sambung ulang otomatis gagal: ${formatBleError(error)}`)
      return false
    }
  }

  async function connectDevice(targetDevice) {
    device.value = targetDevice
    targetDevice.removeEventListener?.('gattserverdisconnected', handleDisconnect)
    targetDevice.addEventListener('gattserverdisconnected', handleDisconnect)
    status.value = 'connecting'
    statusMessage.value = `Menghubungkan ke ${targetDevice.name || 'printer'}…`
    const server = await withTimeout(targetDevice.gatt.connect(), CONNECT_TIMEOUT_MS, 'Waktu koneksi GATT habis. Pastikan printer menyala dan tidak tersambung ke perangkat lain.')
    const services = await withTimeout(server.getPrimaryServices(), DISCOVERY_TIMEOUT_MS, 'Waktu pencarian service GATT habis.')
    const characteristics = []
    for (const service of services) {
      const available = await withTimeout(service.getCharacteristics(), DISCOVERY_TIMEOUT_MS, 'Waktu pencarian characteristic GATT habis.')
      for (const characteristic of available) {
        characteristics.push({ characteristic, properties: getCharacteristicProperties(characteristic.properties) })
      }
    }
    const writable = characteristics.find(entry => entry.properties.includes('writeWithoutResponse'))
      || characteristics.find(entry => entry.properties.includes('write'))
    if (!writable) throw new Error(services.length
      ? 'Printer tidak menyediakan characteristic BLE yang bisa ditulis.'
      : `Tidak ada service GATT. UUID ${CANDIDATE_PRINTER_SERVICE_UUID} belum terverifikasi untuk printer ini.`)
    selectedCharacteristic.value = writable.characteristic
    status.value = 'connected'
    statusMessage.value = `Terhubung ke ${targetDevice.name || 'printer'}.`
  }

  function handleDisconnect() {
    selectedCharacteristic.value = null
    status.value = 'disconnected'
    statusMessage.value = 'Printer terputus. Tekan Sambungkan ulang untuk mencoba kembali.'
  }

  function disconnectPrinter() {
    if (device.value?.gatt?.connected) device.value.gatt.disconnect()
    selectedCharacteristic.value = null
    status.value = 'disconnected'
    statusMessage.value = 'Printer terputus.'
  }

  async function testPrint() {
    return sendBytes(buildPrinterTestBytes(), 'Tes dikirim ke printer. Periksa hasil cetaknya.', 'Tes printer gagal dikirim.')
  }

  async function sendBytes(bytes, successMessage = 'Struk sudah dikirim ke printer.', failureMessage = 'Pengiriman struk gagal.') {
    const characteristic = selectedCharacteristic.value
    if (!characteristic || status.value !== 'connected') {
      errorMessage.value = 'Hubungkan printer dari menu Pengaturan sebelum mencetak secara nirkabel.'
      return false
    }
    status.value = 'printing'
    errorMessage.value = ''
    statusMessage.value = 'Mengirim data ke printer…'
    try {
      for (let offset = 0; offset < bytes.length; offset += PRINTER_WRITE_CHUNK_SIZE) {
        await withTimeout(writeChunk(characteristic, bytes.slice(offset, offset + PRINTER_WRITE_CHUNK_SIZE)), WRITE_TIMEOUT_MS, 'Waktu pengiriman data ke printer habis.')
        if (delayMs.value > 0 && offset + PRINTER_WRITE_CHUNK_SIZE < bytes.length) await wait(delayMs.value)
      }
      status.value = 'connected'
      statusMessage.value = successMessage
      return true
    } catch (error) {
      selectedCharacteristic.value = null
      setError(`${failureMessage} ${formatBleError(error)}`)
      if (!device.value?.gatt?.connected) handleDisconnect()
      return false
    }
  }

  function setError(message) {
    status.value = 'error'
    statusMessage.value = message
    errorMessage.value = message
    return false
  }

  return {
    canConnect, connectPrinter, delayMs, disconnectPrinter, errorMessage,
    hasBluetoothApi, hasSelectedDevice, isConnected, isSecureContext,
    reconnectRememberedPrinter, sendBytes, status, statusMessage, testPrint,
  }
}

async function writeChunk(characteristic, chunk) {
  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) return characteristic.writeValueWithoutResponse(chunk)
  if (characteristic.properties.write && characteristic.writeValueWithResponse) return characteristic.writeValueWithResponse(chunk)
  if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) return characteristic.writeValue(chunk)
  throw new Error('Characteristic printer tidak menyediakan metode tulis yang didukung browser.')
}

function normalizeDeviceName(value) { return String(value || '').trim().toUpperCase() }
function wait(milliseconds) { return new Promise(resolve => window.setTimeout(resolve, milliseconds)) }
function withTimeout(promise, milliseconds, message) {
  let timeoutId
  return Promise.race([
    promise,
    new Promise((_, reject) => { timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds) }),
  ]).finally(() => window.clearTimeout(timeoutId))
}
