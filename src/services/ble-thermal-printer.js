export const CANDIDATE_PRINTER_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb'
export const PRINTER_WRITE_CHUNK_SIZE = 20

const encoder = new TextEncoder()
const encoderFallbacks = new Map([
  ['×', 'x'], ['·', '-'], ['—', '-'], ['–', '-'], ['…', '...'], ['’', "'"], ['“', '"'], ['”', '"'], ['\u00a0', ' '], ['\u202f', ' '],
])

export function buildPrinterTestBytes() {
  return concatBytes(
    Uint8Array.from([0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x4d, 0x00, 0x1d, 0x21, 0x00, 0x1b, 0x61, 0x01]),
    encodeText('LAUNDRIAN BLE TEST\n'),
    Uint8Array.from([0x1b, 0x61, 0x00]),
    encodeText('Printer siap menerima struk.\n--------------------------------\nTes koneksi berhasil.\n\n\n'),
  )
}

export function buildLaundryReceiptBytes({ transaction, profile, member, money, columns, cashierName = '' }) {
  const width = columns === 48 ? 48 : 32
  const lines = []
  const center = (value, emphasis = false) => wrapText(value, width).forEach(text => lines.push({ text, align: 'center', emphasis }))
  const add = (value, emphasis = false) => wrapText(value, width).forEach(text => lines.push({ text, emphasis }))
  const pair = (label, value, emphasis = false) => {
    const left = printerText(label)
    const right = printerText(value)
    if (left.length + right.length + 1 <= width) {
      lines.push({ text: `${left}${' '.repeat(width - left.length - right.length)}${right}`, emphasis })
    } else {
      add(left, emphasis)
      add(right, emphasis)
    }
  }
  const divider = () => lines.push({ text: '-'.repeat(width) })
  const date = transaction.createdAt
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(transaction.createdAt))
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date())

  center(profile.store_name || profile.nama || 'Laundry', true)
  if (profile.address) center(profile.address)
  if (profile.phone) center(profile.phone)
  divider()
  pair('No. nota', transaction.id)
  pair('Tanggal', date)
  pair('Pelanggan', transaction.customer)
  if (transaction.phone && transaction.phone !== '-') pair('Telepon', transaction.phone)
  if (cashierName) pair('Kasir', cashierName)
  divider()

  const details = transaction.details?.length ? transaction.details : [{ nama_layanan: transaction.service, qty: transaction.qty, satuan: transaction.unit, harga: transaction.total, subtotal: transaction.total }]
  for (const item of details) {
    add(item.service?.nama || item.nama_layanan || transaction.service || 'Layanan')
    const qty = formatQuantity(item.qty)
    const unit = item.service?.jenis_hitung || item.satuan || item.jenis_hitung || ''
    pair(`${qty} ${unit} x ${money(item.harga || 0)}`, money(item.subtotal ?? Number(item.harga || 0) * Number(item.qty || 0)))
  }

  divider()
  pair('Subtotal', money(transaction.subtotal ?? transaction.total))
  if (transaction.discount) pair('Diskon', `-${money(transaction.discount)}`)
  if (transaction.memberDiscount) pair(`Diskon member ${transaction.memberDiscountPercent || 20}%`, `-${money(transaction.memberDiscount)}`)
  if (transaction.shipping) pair('Ongkir', money(transaction.shipping))
  pair('TOTAL', money(transaction.total), true)
  pair('Dibayar', money(transaction.paid))
  pair('Sisa tagihan', money(Math.max(0, transaction.total - transaction.paid)))
  pair('Status bayar', transaction.paymentStatus || 'BELUM BAYAR')

  if (member?.memberPromoActive) {
    divider()
    const target = Number(member.memberPromoRequiredTransactions || 10)
    const minimum = Number(member.memberPromoMinimumSubtotal || 75000)
    const percent = Number(member.memberPromoDiscountPercent || 20)
    const counted = transaction.status === 'DIAMBIL' && transaction.paymentStatus === 'LUNAS'
    const progress = Math.min(target, Number(member.eligibleTransactionCount || 0) + (transaction.memberPromoEligible && !counted ? 1 : 0))
    center(`PROGRES MEMBER ${progress}/${target}`, true)
    center(progress >= target
      ? `Diskon ${percent}% untuk transaksi berikutnya.`
      : `Kurang ${target - progress} transaksi, minimal ${money(minimum)} per transaksi, untuk diskon ${percent}%.`)
    if (transaction.memberPromoEligible && !counted) center('Progres dihitung setelah lunas dan diambil.')
  }

  if (transaction.note) {
    divider()
    add(`Catatan: ${transaction.note}`)
  }
  divider()
  center(profile.receipt_footer || 'Terima kasih telah menggunakan layanan kami.')
  center('Powered by Udumbara Informatika')
  lines.push({ text: '' }, { text: '' }, { text: '' })
  return buildEscPosReceiptBytes(lines)
}

export function buildEscPosReceiptBytes(lines) {
  const parts = [Uint8Array.from([
    0x1b, 0x40, // ESC @ initialize printer
    0x1b, 0x74, 0x00, // ESC t 0: default printer code page
    0x1b, 0x4d, 0x00, // ESC M 0: Font A
    0x1d, 0x21, 0x00, // GS ! 0: normal text size
    0x1b, 0x61, 0x00, // ESC a 0: left alignment
    0x1b, 0x45, 0x00, // ESC E 0: emphasis off
  ])]
  let alignment = 'left'
  let emphasis = false
  for (const line of lines) {
    const nextAlignment = line.align === 'center' ? 'center' : 'left'
    const nextEmphasis = Boolean(line.emphasis)
    if (nextAlignment !== alignment) {
      parts.push(Uint8Array.from([0x1b, 0x61, nextAlignment === 'center' ? 1 : 0]))
      alignment = nextAlignment
    }
    if (nextEmphasis !== emphasis) {
      parts.push(Uint8Array.from([0x1b, 0x45, nextEmphasis ? 1 : 0]))
      emphasis = nextEmphasis
    }
    parts.push(encodeText(`${line.text ?? ''}\n`))
  }
  parts.push(Uint8Array.from([0x1b, 0x45, 0x00, 0x1b, 0x61, 0x00, 0x0a, 0x0a]))
  return concatBytes(...parts)
}

export function encodeText(value) {
  const text = printerText(value)
  return encoder.encode(text)
}

export function getCharacteristicProperties(properties) {
  return ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate']
    .filter(property => Boolean(properties?.[property]))
}

export function formatBleError(error) {
  if (error?.name === 'NotFoundError' || error?.name === 'AbortError') return 'Pemilihan printer dibatalkan atau tidak ada perangkat yang dipilih.'
  if (error?.name === 'SecurityError') return 'Browser menolak akses Bluetooth. Buka aplikasi melalui HTTPS dan izinkan akses Bluetooth.'
  if (error?.name === 'NetworkError') return 'Koneksi BLE terputus atau printer menolak koneksi. Pastikan printer menyala dan tidak tersambung ke perangkat lain.'
  return error?.message || 'Terjadi kesalahan saat mengakses printer BLE.'
}

export function concatBytes(...parts) {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function printerText(value) {
  return Array.from(String(value ?? '').normalize('NFD'))
    .filter(character => !/\p{Diacritic}/u.test(character))
    .map(character => encoderFallbacks.get(character) ?? character)
    .join('')
    .replace(/[^\x20-\x7E\n]/g, '?')
}

function wrapText(value, width) {
  const words = printerText(value).split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines = []
  let current = ''
  for (const word of words) {
    if (word.length > width) {
      if (current) lines.push(current)
      current = ''
      for (let index = 0; index < word.length; index += width) lines.push(word.slice(index, index + width))
      continue
    }
    if (current && current.length + word.length + 1 > width) {
      lines.push(current)
      current = word
    } else current = current ? `${current} ${word}` : word
  }
  if (current) lines.push(current)
  return lines
}

function formatQuantity(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value || 0))
}
