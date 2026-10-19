<script setup>
import { computed, onMounted, onUnmounted, provide, reactive, ref } from 'vue'
import { apiOrigin, requestApi, loadCursorList, loginApi, logoutApi, registerApi, setOutletContext } from '../api.js'
import { normalizeCustomer, normalizeExpense, normalizeService, normalizeTransaction } from '../normalizers.js'
import { menu } from '../navigation/menu.js'
import AppIcon from '../components/AppIcon.vue'
import DashboardPage from '../pages/Dashboard/IndexPage.vue'
import CustomersPage from '../pages/Pelanggan/CustomersPage.vue'
import ExpensesPage from '../pages/Pengeluaran/ExpensesPage.vue'
import ExpenseCreateModal from '../pages/Pengeluaran/components/ExpenseCreateModal.vue'
import ServiceCreateModal from '../pages/Pengaturan/ServiceCreateModal.vue'
import ProcessPage from '../pages/ProsesLaundry/ProcessPage.vue'
import ReportsPage from '../pages/Laporan/ReportsPage.vue'
import SettingsPage from '../pages/Pengaturan/SettingsPage.vue'
import TransactionCreateModal from '../pages/Transaksi/components/TransactionCreateModal.vue'

const today = new Date()
const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today)
const stored = ref({ services: [], customers: [], transactions: [], expenses: [] })
const session = ref(null)
const authChecking = ref(true)
const busy = ref(false)
const pageError = ref('')
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ outlet_name: '', name: '', username: '', password: '', password_confirmation: '' })
const authMode = ref('login')
const showLoginPassword = ref(false)
const showRegistrationPassword = ref(false)
const adminOutlets = ref([])
const adminOutletSearch = ref('')
const activeOutlet = ref(null)
const outletLogoUrl = computed(() => {
  const outlet = activeOutlet.value || session.value?.outlet
  return outlet?.logo_path && outlet?.id
    ? `${apiOrigin()}/api/public/outlets/${outlet.id}/logo?v=${encodeURIComponent(outlet.updated_at || '')}`
    : ''
})
const adminBusyOutlet = ref(null)
const dashboard = ref(null)
const page = ref('dashboard')
const mobileSidebarOpen = ref(false)
const sidebarPinned = ref(false)
const mobileDockItems = [
  { id: 'dashboard', label: 'Ringkas', icon: 'home' },
  { id: 'process', label: 'Laundry', icon: 'laundry' },
  { id: 'customers', label: 'Pelanggan', icon: 'customers' },
  { id: 'expenses', label: 'Biaya', icon: 'expenses' },
  { id: 'menu', label: 'Menu', icon: 'menu' },
]
const mobileDockActiveIndex = computed(() => {
  if (mobileSidebarOpen.value || ['reports', 'settings'].includes(page.value)) return 4
  if (page.value === 'process' || showForm.value) return 1
  return ({ dashboard: 0, customers: 2, expenses: 3 })[page.value] ?? 4
})
const userMenuOpen = ref(false)
const expandedMenus = ref(['transactions'])
const reportType = ref('report-sales')
const settingsTab = ref('settings-services')
const toast = ref({ message: '', type: 'info' })
const saving = reactive({ transaction: false, expense: false, service: false, payment: false, status: new Set() })
let toastTimeout
const showForm = ref(false)
const search = ref('')
const statusFilter = ref('Semua')
const serviceFilter = ref('')
const paymentFilter = ref('')
const transactionFrom = ref('')
const transactionTo = ref('')
const form = ref({ customer: '', customerId: null, phone: '', items: [{ key: 1, serviceId: null, qty: 1 }], discount: 0, shipping: 0, note: '' })
const nextTransactionLineKey = ref(2)
const expenseForm = ref({ category: 'DETERJEN', description: '', amount: 0 })
const showExpenseForm = ref(false)
const showServiceForm = ref(false)
const serviceForm = ref({ name: '', unit: 'KG', price: 5000, eta: 72 })
const data = computed(() => stored.value)
const visibleMenu = computed(() => menu.filter(item => ['OWNER', 'SUPERADMIN'].includes(session.value?.role) || !['reports', 'settings'].includes(item.id)))
const filteredAdminOutlets = computed(() => {
  const term = adminOutletSearch.value.trim().toLocaleLowerCase('id-ID')
  if (!term) return adminOutlets.value
  return adminOutlets.value.filter(outlet => `${outlet.nama} ${outlet.status} ${outlet.id} ${outlet.users_count}`.toLocaleLowerCase('id-ID').includes(term))
})
const countStatus = status => data.value.transactions.filter(t => t.status === status).length
const revenueToday = computed(() => Number(dashboard.value?.ringkasan?.omzet_hari_ini || 0))
const outstanding = computed(() => data.value.transactions.reduce((sum, t) => sum + Math.max(0, t.total - t.paid), 0))
const selectedService = item => data.value.services.find(service => Number(service.id) === Number(item.serviceId)) || { id: null, name: '', unit: '', price: 0, eta: 72 }
const lineTotal = item => Number(item.qty || 0) * Number(selectedService(item).price || 0)
const subtotal = computed(() => form.value.items.reduce((sum, item) => sum + lineTotal(item), 0))
const total = computed(() => Math.max(0, subtotal.value - Number(form.value.discount || 0) + Number(form.value.shipping || 0)))
function addTransactionItem() {
  if (form.value.items.length >= 30) { notify('Maksimal 30 rincian layanan per transaksi.'); return }
  form.value.items.push({ key: nextTransactionLineKey.value++, serviceId: null, qty: 1 })
}
function removeTransactionItem(index) {
  if (form.value.items.length > 1) form.value.items.splice(index, 1)
}
const filteredTransactions = computed(() => data.value.transactions.filter(t => {
  const term = search.value.toLowerCase()
  const transactionDate = String(t.date || '').slice(0, 10)
  const selectedService = serviceFilter.value
  const matchesService = !selectedService || (selectedService === 'Campur'
    ? /campur|cuci\s*\+\s*setrika/i.test(t.service)
    : t.service === selectedService)
  return (!term || `${t.id} ${t.customer} ${t.phone}`.toLowerCase().includes(term)) && (statusFilter.value === 'Semua' || t.status === statusFilter.value) && matchesService && (!paymentFilter.value || paymentStatus(t) === paymentFilter.value) && (!transactionFrom.value || transactionDate >= transactionFrom.value) && (!transactionTo.value || transactionDate <= transactionTo.value)
}))
function paymentStatus(t) { return t.paymentStatus || (t.paid >= t.total ? 'LUNAS' : t.paid > 0 ? 'DP' : 'BELUM BAYAR') }
function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0) }
function setPage(id) {
  showServiceForm.value = false
  if (id === 'new-transaction') {
    showForm.value = true
    mobileSidebarOpen.value = false
    sidebarPinned.value = false
    return
  }
  showForm.value = false
  if (id.startsWith('report-')) { page.value = 'reports'; reportType.value = id }
  else if (id.startsWith('settings-')) { page.value = 'settings'; settingsTab.value = id }
  else page.value = id
  search.value = ''
  mobileSidebarOpen.value = false
  sidebarPinned.value = false
}
function selectMobileDockItem(item) {
  if (item.id === 'menu') { mobileSidebarOpen.value = true; return }
  setPage(item.id)
}
function toggleMenu(id) { showForm.value = false; showServiceForm.value = false; expandedMenus.value = expandedMenus.value.includes(id) ? expandedMenus.value.filter(item => item !== id) : [...expandedMenus.value, id] }
function isPageActive(id) { return (id === 'transactions' && showForm.value) || page.value === id || (id === 'reports' && page.value === 'reports') || (id === 'settings' && page.value === 'settings') }
function toggleSidebar() {
  if (window.matchMedia('(max-width: 600px)').matches) mobileSidebarOpen.value = !mobileSidebarOpen.value
  else sidebarPinned.value = !sidebarPinned.value
}
function closeSidebarOnOutsideClick(event) {
  if (!event.target.closest('.user-menu')) userMenuOpen.value = false
  if (event.target.closest('.mobile-nav')) return
  if (event.target.closest('.sidebar-toggle')) return
  if (!event.target.closest('.sidebar')) { sidebarPinned.value = false; mobileSidebarOpen.value = false }
}
function notify(message, type = 'error') {
  toast.value = { message, type }
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => toast.value = { message: '', type: 'info' }, 3200)
}
async function loadOperationalData({ quiet = false } = {}) {
  if (!quiet) busy.value = true
  pageError.value = ''
  try {
    const [serviceResult, customers, transactions, expenses, dashboardResult] = await Promise.all([
      requestApi('/layanan'), loadCursorList('/pelanggan'), loadCursorList('/transaksi', { status_transaksi: 'SEMUA' }), loadCursorList('/pengeluaran'), requestApi('/dashboard'),
    ])
    stored.value = { services: (serviceResult.data || []).map(normalizeService), customers: customers.map(normalizeCustomer), transactions: transactions.map(normalizeTransaction), expenses: expenses.map(normalizeExpense) }
    dashboard.value = dashboardResult.data
  } catch (error) { pageError.value = error.message; if (error.status === 401) session.value = null }
  finally { if (!quiet) busy.value = false }
}
async function submitLogin() {
  busy.value = true; pageError.value = ''
  try {
    await loginApi(loginForm.value)
    const result = await requestApi('/me')
    session.value = result.data.user
    if (session.value.role === 'SUPERADMIN') adminOutlets.value = (await requestApi('/superadmin/outlets')).data || []
    else await loadOperationalData()
  }
  catch (error) { pageError.value = error.message; notify(error.message, 'error') }
  finally { busy.value = false }
}
async function submitRegistration() {
  busy.value = true; pageError.value = ''
  try {
    await registerApi(registerForm.value)
    const result = await requestApi('/me')
    session.value = result.data.user
    await loadOperationalData()
  } catch (error) { pageError.value = error.message; notify(error.message, 'error') }
  finally { busy.value = false }
}
async function chooseOutlet(outlet) {
  activeOutlet.value = outlet
  setOutletContext(outlet.id)
  pageError.value = ''
  await loadOperationalData()
}
function refreshOutletBranding(profile) {
  const outlet = activeOutlet.value || session.value?.outlet
  if (!outlet) return
  outlet.logo_path = profile.outlet_logo_path || null
  outlet.updated_at = profile.outlet_logo_updated_at || outlet.updated_at
}
function outletAccessSummary(outlet) {
  if (outlet.status === 'AKTIF') return 'Akses aktif'
  if (outlet.status === 'NONAKTIF') return 'Akses nonaktif'
  if (!outlet.demo_selesai) return 'Batas demo belum diatur'
  const expiry = new Date(outlet.demo_selesai)
  const formatted = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(expiry)
  return expiry.getTime() <= Date.now() ? `Demo berakhir ${formatted}` : `Demo sampai ${formatted}`
}
async function toggleOutletAccess(outlet) {
  if (adminBusyOutlet.value !== null) return
  const status = outlet.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF'
  adminBusyOutlet.value = outlet.id
  try {
    await requestApi(`/superadmin/outlets/${outlet.id}`, { method: 'PUT', body: { status } })
    adminOutlets.value = (await requestApi('/superadmin/outlets')).data || []
    notify(`Akses ${outlet.nama} berhasil ${status === 'AKTIF' ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success')
  } catch (error) { notify(error.message) }
  finally { adminBusyOutlet.value = null }
}
function changeOutlet() {
  activeOutlet.value = null
  setOutletContext(null)
  stored.value = { services: [], customers: [], transactions: [], expenses: [] }
}
async function logout() {
  try { await logoutApi() } catch { /* Clear local UI even if the session already expired. */ }
  session.value = null; stored.value = { services: [], customers: [], transactions: [], expenses: [] }; dashboard.value = null
  activeOutlet.value = null; adminOutlets.value = []; setOutletContext(null)
}
function openExpenseForm() { showExpenseForm.value = true }
async function nextStatus(t) {
  if (saving.status.has(t.backendId)) return
  const next = { MASUK: 'PROSES', PROSES: 'SELESAI', SELESAI: 'DIAMBIL' }[t.status]
  if (!next) return
  if (next === 'DIAMBIL' && t.paid < t.total) { notify(`Pembayaran kurang dari total. Silakan lakukan pembayaran ${money(t.total - t.paid)} terlebih dahulu`); return }
  const endpoint = { PROSES: 'proses', SELESAI: 'selesai', DIAMBIL: 'diambil' }[next]
  saving.status = new Set(saving.status).add(t.backendId)
  try { await requestApi(`/transaksi/${t.backendId}/${endpoint}`, { method: 'POST', body: {} }); await loadOperationalData({ quiet: true }); notify(`Status ${t.id} diperbarui ke ${next}`, 'success') }
  catch (error) { notify(error.message) }
  finally { const pending = new Set(saving.status); pending.delete(t.backendId); saving.status = pending }
}
async function createTransaction() {
  if (saving.transaction) return
  if (!data.value.services.length) { notify('Tambahkan layanan aktif terlebih dahulu'); return }
  if (!form.value.customer.trim()) { notify('Nama pelanggan perlu diisi'); return }
  if (!form.value.items.length || form.value.items.some(item => !item.serviceId || !Number(item.qty) || Number(item.qty) <= 0)) { notify('Lengkapi layanan dan jumlah pada setiap rincian.'); return }
  const exactNameMatches = data.value.customers.filter(customer => customer.name.trim().toLocaleLowerCase('id-ID') === form.value.customer.trim().toLocaleLowerCase('id-ID'))
  const existingByPhone = form.value.phone.trim() ? exactNameMatches.find(customer => customer.phone === form.value.phone.trim()) : null
  if (!form.value.customerId && exactNameMatches.length > 1 && !existingByPhone) { notify('Ada beberapa pelanggan dengan nama ini. Pilih pelanggan yang benar dari daftar saran.'); return }
  const existingCustomer = form.value.customerId
    ? data.value.customers.find(customer => Number(customer.id) === Number(form.value.customerId))
    : existingByPhone || (exactNameMatches.length === 1 ? exactNameMatches[0] : null)
  saving.transaction = true
  try {
    const payload = { no_hp: form.value.phone || null, rincian: form.value.items.map(item => ({ layanan_id: Number(item.serviceId), qty: Number(item.qty) })), diskon: Number(form.value.discount || 0), ongkir: Number(form.value.shipping || 0), catatan: form.value.note || '' }
    if (existingCustomer) {
      payload.pelanggan_id = Number(existingCustomer.id)
      payload.no_hp = existingCustomer.phone === '-' ? null : existingCustomer.phone
    }
    else payload.nama_pelanggan = form.value.customer.trim()
    await requestApi('/transaksi', { method: 'POST', body: payload })
    showForm.value = false; form.value = { customer: '', customerId: null, phone: '', items: [{ key: nextTransactionLineKey.value++, serviceId: null, qty: 1 }], discount: 0, shipping: 0, note: '' }; statusFilter.value = 'MASUK'; await loadOperationalData(); setPage('process'); notify('Transaksi berhasil disimpan', 'success')
  } catch (error) { notify(error.message) }
  finally { saving.transaction = false }
}
async function saveExpense() {
  if (saving.expense) return
  if (!expenseForm.value.description.trim() || expenseForm.value.amount <= 0) { notify('Lengkapi keterangan dan nominal'); return }
  saving.expense = true
  try { await requestApi('/pengeluaran', { method: 'POST', body: { kategori: expenseForm.value.category.toUpperCase().replaceAll(' ', '_'), keterangan: expenseForm.value.description, nominal: Number(expenseForm.value.amount) } }); showExpenseForm.value = false; expenseForm.value = { category: 'DETERJEN', description: '', amount: 0 }; await loadOperationalData(); notify('Pengeluaran dicatat', 'success') }
  catch (error) { notify(error.message) }
  finally { saving.expense = false }
}
function addService() { serviceForm.value = { name: '', unit: 'KG', price: 5000, eta: 72 }; showServiceForm.value = true }
async function saveService() {
  if (saving.service) return
  const name = serviceForm.value.name.trim()
  const price = Number(serviceForm.value.price)
  const eta = Number(serviceForm.value.eta)
  if (!name || !price || price < 1 || !eta || eta < 1) { notify('Lengkapi nama, harga, dan estimasi layanan'); return }
  saving.service = true
  try { await requestApi('/layanan', { method: 'POST', body: { nama: name, jenis_hitung: serviceForm.value.unit, harga: price, estimasi_jam: eta } }); showServiceForm.value = false; await loadOperationalData(); notify('Layanan berhasil ditambahkan', 'success') }
  catch (error) { notify(error.message) }
  finally { saving.service = false }
}
function escapeReceiptText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}
async function printReceipt(t) {
  const printWindow = window.open('', '_blank', 'popup,width=420,height=720')
  if (!printWindow) { notify('Izinkan pop-up untuk mencetak nota', 'error'); return }

  let profile = { store_name: activeOutlet.value?.nama || session.value?.outlet?.nama || 'Londriap App', phone: '', address: '', receipt_footer: 'Terima kasih telah menggunakan layanan kami.', receipt_width: '58mm' }
  try { profile = { ...profile, ...(await requestApi('/pengaturan')).data } } catch { /* Nota tetap bisa dicetak dengan identitas outlet dasar. */ }

  const details = (t.details || []).map(item => {
    const name = escapeReceiptText(item.service?.nama || item.nama_layanan || t.service || 'Layanan')
    const qty = Number(item.qty || 0)
    const unit = escapeReceiptText(item.service?.jenis_hitung || item.satuan || item.jenis_hitung || '')
    const price = Number(item.harga || 0)
    const subtotal = Number(item.subtotal ?? price * qty)
    return `<tr><td>${name}<small>${qty} ${unit} × ${escapeReceiptText(money(price))}</small></td><td>${escapeReceiptText(money(subtotal))}</td></tr>`
  }).join('') || `<tr><td>${escapeReceiptText(t.service)}<small>${Number(t.qty || 0)} ${escapeReceiptText(t.unit || '')}</small></td><td>${escapeReceiptText(money(t.total))}</td></tr>`
  const date = t.createdAt ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t.createdAt)) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date())
  const width = profile.receipt_width === '80mm' ? '80mm' : '58mm'
  const member = data.value.customers.find(customer => Number(customer.id) === Number(t.customerId))
  const qualifiesForMember = t.transactionStatus !== 'BATAL' && Number(t.subtotal) >= 75000
  const alreadyCounted = t.status === 'DIAMBIL' && t.paymentStatus === 'LUNAS'
  const memberTarget = Number(member?.memberPromoRequiredTransactions || 10)
  const memberMinimum = Number(member?.memberPromoMinimumSubtotal || 75000)
  const memberPercent = Number(member?.memberPromoDiscountPercent || 20)
  const memberCount = Math.min(memberTarget, Number(member?.eligibleTransactionCount || 0) + (t.memberPromoEligible && !alreadyCounted ? 1 : 0))
  const memberInfo = member?.memberPromoActive
    ? `<section class="member"><b>PROGRES MEMBER ${memberCount}/${memberTarget}</b><span>${memberCount >= memberTarget ? `Potongan ${memberPercent}% siap untuk transaksi berikutnya.` : `Kurang ${memberTarget - memberCount} transaksi lagi dengan minimal ${escapeReceiptText(money(memberMinimum))} untuk mendapat potongan ${memberPercent}%.`}</span>${t.memberPromoEligible && !alreadyCounted ? '<small>Progres dihitung setelah transaksi lunas dan diambil.</small>' : ''}</section>`
    : ''
  const breakdown = `${t.discount ? `<div><span>Diskon</span><span>− ${escapeReceiptText(money(t.discount))}</span></div>` : ''}${t.memberDiscount ? `<div><span>Diskon member ${t.memberDiscountPercent || 20}%</span><span>− ${escapeReceiptText(money(t.memberDiscount))}</span></div>` : ''}${t.shipping ? `<div><span>Ongkir</span><span>${escapeReceiptText(money(t.shipping))}</span></div>` : ''}`
  printWindow.document.open()
  printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nota ${escapeReceiptText(t.id)}</title><style>
    *{box-sizing:border-box}body,body *{color:#000!important}body{width:${width};margin:0 auto;padding:5mm 3mm;color:#222;font:8px/1.45 Arial,sans-serif}h1{margin:0;text-align:center;font-size:10px}header{text-align:center;padding-bottom:10px;border-bottom:1px dashed #777}header p{margin:3px 0;font-size:8px}.meta{padding:9px 0;border-bottom:1px dashed #777}.meta div,.totals div{display:flex;justify-content:space-between;gap:8px}.meta span:first-child{color:#555}table{width:100%;border-collapse:collapse;padding:6px 0}td{padding:7px 0;vertical-align:top}td:first-child{padding-right:8px}td:last-child{text-align:right;white-space:nowrap}td small{display:block;color:#555;font-size:8px}.totals{padding:8px 0;border-top:1px dashed #777}.totals div{margin:3px 0}.totals .grand{padding-top:6px;border-top:1px solid #999;font-size:10px;font-weight:700}.totals .paid{margin-top:6px}.member{margin:8px 0;padding:7px 0;border-top:1px dashed #777;border-bottom:1px dashed #777}.member b,.member span,.member small{display:block}.member b{font-size:8px}.member span{margin-top:3px}.member small{margin-top:3px;font-size:8px;color:#555}.footer{padding-top:10px;border-top:1px dashed #777;text-align:center;white-space:pre-line;font-size:8px}.no-print{display:block;margin:12px auto 0;padding:8px 14px;border:0;border-radius:5px;background:#edc83e;font-weight:700}@media print{body{width:${width};padding:0}.no-print{display:none}}
    </style></head><body><header><h1>${escapeReceiptText(profile.store_name || profile.nama || 'Londriap App')}</h1>${profile.address ? `<p>${escapeReceiptText(profile.address)}</p>` : ''}${profile.phone ? `<p>${escapeReceiptText(profile.phone)}</p>` : ''}</header><section class="meta"><div><span>No. nota</span><b>${escapeReceiptText(t.id)}</b></div><div><span>Pelanggan</span><b>${escapeReceiptText(t.customer)}</b></div>${t.phone && t.phone !== '-' ? `<div><span>Telepon</span><span>${escapeReceiptText(t.phone)}</span></div>` : ''}<div><span>Tanggal</span><span>${escapeReceiptText(date)}</span></div></section><table><tbody>${details}</tbody></table><section class="totals">${t.subtotal && t.subtotal !== t.total ? `<div><span>Subtotal</span><span>${escapeReceiptText(money(t.subtotal))}</span></div>` : ''}${breakdown}<div class="grand"><span>Total</span><span>${escapeReceiptText(money(t.total))}</span></div><div class="paid"><span>Sudah dibayar</span><span>${escapeReceiptText(money(t.paid))}</span></div><div><span>Sisa tagihan</span><span>${escapeReceiptText(money(Math.max(0, t.total - t.paid)))}</span></div></section>${memberInfo}${t.note ? `<p><b>Catatan:</b> ${escapeReceiptText(t.note)}</p>` : ''}<footer class="footer">${escapeReceiptText(profile.receipt_footer || 'Terima kasih telah menggunakan layanan kami.')}</footer><button class="no-print" onclick="window.print()">Cetak nota</button><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))<\/script></body></html>`)
  printWindow.document.close()
  printWindow.focus()
}
async function recordPayment(transaction, amount, method, note = null) {
  if (saving.payment) return false
  saving.payment = true
  try { await requestApi(`/transaksi/${transaction.backendId}/pembayaran`, { method: 'POST', body: { nominal: Number(amount), metode: method, keterangan: note } }); await loadOperationalData({ quiet: true }); return true }
  catch (error) { notify(error.message); return false }
  finally { saving.payment = false }
}
  provide('laundrian', { dateLabel, data, dashboard, money, revenueToday, outstanding, countStatus, setPage, printReceipt, paymentStatus, statusFilter, serviceFilter, paymentFilter, transactionFrom, transactionTo, filteredTransactions, nextStatus, search, notify, saving, openExpenseForm, showForm, form, selectedService, lineTotal, subtotal, total, addTransactionItem, removeTransactionItem, createTransaction, showExpenseForm, expenseForm, saveExpense, showServiceForm, serviceForm, addService, saveService, settingsTab, reportType, menu, recordPayment, session, busy, pageError, loadOperationalData, refreshOutletBranding })
onMounted(async () => {
  document.addEventListener('click', closeSidebarOnOutsideClick)
  try {
    const result = await requestApi('/me'); session.value = result.data.user
    if (session.value.role === 'SUPERADMIN') adminOutlets.value = (await requestApi('/superadmin/outlets')).data || []
    else await loadOperationalData()
  } catch (error) { if (error.status !== 401) pageError.value = error.message }
  finally { authChecking.value = false }
})
onUnmounted(() => document.removeEventListener('click', closeSidebarOnOutsideClick))
</script>

<template>
  <main v-if="authChecking" class="auth-screen"><div class="page-loader" role="status"><img src="/icon/laundrian_circle_192px.png" alt="" /><span>Memeriksa sesi…</span></div></main>
  <main v-else-if="!session" class="auth-screen">
    <form v-if="authMode === 'login'" class="auth-card" @submit.prevent="submitLogin">
      <img class="laundrian-logo auth-logo" src="/icon/laundrian_192px.png" alt="Laundrian — Alur Rapi, Laundry Beres" /><h1>Masuk ke Laundrian</h1><p>Kelola outlet dan transaksi laundry dengan rapi.</p>
      <label>Username<input v-model="loginForm.username" autocomplete="username" required /></label>
      <label>Password<div class="password-input-wrap"><input v-model="loginForm.password" :type="showLoginPassword ? 'text' : 'password'" autocomplete="current-password" required minlength="8" /><button type="button" :aria-label="showLoginPassword ? 'Sembunyikan password' : 'Lihat password'" :aria-pressed="showLoginPassword" @click="showLoginPassword = !showLoginPassword"><AppIcon :name="showLoginPassword ? 'eye-off' : 'eye'" /></button></div></label>
      <button class="button primary" type="submit" :disabled="busy">{{ busy ? 'Menghubungkan…' : 'Masuk' }}</button>
      <p class="auth-switch">Belum punya akun? <button type="button" @click="authMode='register';pageError=''">Daftarkan outletmu!</button></p>
    </form>
    <form v-else class="auth-card auth-register-card" @submit.prevent="submitRegistration">
      <img class="laundrian-logo auth-logo" src="/icon/laundrian_192px.png" alt="Laundrian — Alur Rapi, Laundry Beres" /><p class="auth-eyebrow">MULAI GRATIS</p><h1>Daftarkan outlet</h1><p>Akun demo langsung aktif dengan data outlet terpisah.</p>
      <label>Nama outlet<input v-model="registerForm.outlet_name" required maxlength="150" autocomplete="organization" /></label>
      <label>Nama pemilik<input v-model="registerForm.name" required maxlength="120" autocomplete="name" /></label>
      <label>Username<input v-model="registerForm.username" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]+" autocomplete="username" /></label>
      <label>Password<div class="password-input-wrap"><input v-model="registerForm.password" :type="showRegistrationPassword ? 'text' : 'password'" required minlength="8" autocomplete="new-password" /><button type="button" :aria-label="showRegistrationPassword ? 'Sembunyikan password' : 'Lihat password'" :aria-pressed="showRegistrationPassword" @click="showRegistrationPassword = !showRegistrationPassword"><AppIcon :name="showRegistrationPassword ? 'eye-off' : 'eye'" /></button></div><small>Minimal 8 karakter.</small></label>
      <label>Ulangi password<div class="password-input-wrap"><input v-model="registerForm.password_confirmation" :type="showRegistrationPassword ? 'text' : 'password'" required minlength="8" autocomplete="new-password" /></div></label>
      <button class="button primary" type="submit" :disabled="busy">{{ busy ? 'Membuat akun…' : 'Buat akun demo' }}</button>
      <p class="auth-switch">Sudah punya akun? <button type="button" @click="authMode='login';pageError=''">Masuk</button></p>
    </form>
  </main>
  <main v-else-if="session.role === 'SUPERADMIN' && !activeOutlet" class="auth-screen admin-outlet-screen">
    <section class="auth-card admin-outlet-card"><img class="laundrian-logo auth-logo" src="/icon/laundrian_192px.png" alt="Laundrian — Alur Rapi, Laundry Beres" /><p class="auth-eyebrow">SUPERADMIN</p><h1>Kelola akses outlet</h1><p>Demo berlaku 2 hari. Setelahnya, aktifkan akses dari sini setelah pembayaran dikonfirmasi.</p><p v-if="pageError" class="auth-error" role="alert">{{ pageError }}</p>
      <template v-if="adminOutlets.length">
        <label class="admin-outlet-search"><AppIcon name="search" /><input v-model="adminOutletSearch" type="search" placeholder="Cari nama atau status outlet…" aria-label="Cari outlet berdasarkan nama atau status" /><button v-if="adminOutletSearch" type="button" aria-label="Hapus pencarian" @click="adminOutletSearch = ''">×</button></label>
        <p class="admin-outlet-count" aria-live="polite">{{ filteredAdminOutlets.length }} dari {{ adminOutlets.length }} outlet</p>
        <div v-if="filteredAdminOutlets.length" class="admin-outlet-list"><article v-for="outlet in filteredAdminOutlets" :key="outlet.id" class="admin-outlet-option"><button class="admin-outlet-select" @click="chooseOutlet(outlet)"><span><b>{{ outlet.nama }}</b><small>{{ outlet.users_count }} pengguna</small><small>{{ outletAccessSummary(outlet) }}</small></span><i>›</i></button><button class="button" :class="outlet.status === 'AKTIF' ? 'secondary' : 'primary'" :disabled="adminBusyOutlet !== null" @click="toggleOutletAccess(outlet)">{{ adminBusyOutlet === outlet.id ? 'Menyimpan…' : outlet.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan' }}</button></article></div>
        <div v-else class="admin-outlet-empty"><b>Outlet tidak ditemukan</b><span>Coba nama outlet atau status “aktif” / “nonaktif”.</span><button type="button" @click="adminOutletSearch = ''">Hapus pencarian</button></div>
      </template>
      <div v-else class="empty-state"><b>Belum ada outlet</b><span>Outlet yang mendaftar akan tampil di sini.</span></div>
      <button class="button secondary" @click="logout">Keluar</button>
    </section>
  </main>
  <div v-else class="app-shell">
    <button v-if="mobileSidebarOpen" class="sidebar-backdrop" aria-label="Tutup menu" @click="mobileSidebarOpen=false"></button>
    <aside class="sidebar" :class="{ 'sidebar-pinned': sidebarPinned, 'sidebar-mobile-open': mobileSidebarOpen }">
      <nav aria-label="Navigasi utama">
        <template v-for="item in visibleMenu" :key="item.id">
          <p v-if="item.section" class="nav-section">{{ item.section }}</p>
          <button class="nav-item" :class="{ active: isPageActive(item.id) }" :aria-expanded="item.children ? expandedMenus.includes(item.id) : undefined" @click="item.children ? toggleMenu(item.id) : setPage(item.id === 'transactions' ? 'new-transaction' : item.id)"><span class="nav-icon"><AppIcon :name="item.icon" /></span><span>{{ item.label }}</span><span v-if="item.children" class="menu-chevron" :class="{ opened: expandedMenus.includes(item.id) }">⌄</span></button>
          <div v-if="item.children && expandedMenus.includes(item.id)" class="nav-submenu"><button v-for="child in item.children" :key="child.id" class="nav-child" :class="{ active: (child.id === 'transactions' && page === 'transactions') || (child.id.startsWith('report-') && page === 'reports' && reportType === child.id) || (child.id.startsWith('settings-') && page === 'settings' && settingsTab === child.id) }" @click="setPage(child.id)"><i></i>{{ child.label }}</button></div>
        </template>
      </nav>
      <div class="sidebar-bottom"><button v-if="session.role === 'SUPERADMIN'" class="shop-switch shop-switch-button" type="button" :title="`Ganti outlet · ${activeOutlet?.nama || 'Outlet'}`" :aria-label="`Ganti outlet aktif: ${activeOutlet?.nama || 'Outlet'}`" @click="changeOutlet"><div class="shop-icon" aria-hidden="true"><img v-if="outletLogoUrl" :src="outletLogoUrl" alt="" class="shop-logo" /><AppIcon v-else name="store" /></div><div class="shop-name"><b>{{ activeOutlet?.nama || session.outlet?.nama || 'Outlet' }}</b><small>{{ activeOutlet?.status || session.outlet?.status || 'Outlet aktif' }}</small></div><span class="shop-switch-action" aria-hidden="true">⌄</span></button><div v-else class="shop-switch" :title="activeOutlet?.nama || session.outlet?.nama || 'Outlet'"><div class="shop-icon" aria-hidden="true"><img v-if="outletLogoUrl" :src="outletLogoUrl" alt="" class="shop-logo" /><AppIcon v-else name="store" /></div><div class="shop-name"><b>{{ activeOutlet?.nama || session.outlet?.nama || 'Outlet' }}</b><small>{{ activeOutlet?.status || session.outlet?.status || 'Outlet aktif' }}</small></div></div></div>
    </aside>
    <header class="topbar"><div class="topbar-start"><button class="sidebar-toggle" aria-label="Buka menu" :aria-expanded="mobileSidebarOpen || sidebarPinned" @click="toggleSidebar"><AppIcon name="menu" /></button><div class="topbar-brand"><img class="laundrian-logo navbar-logo" src="/icon/laundrian_192px.png" alt="Laundrian" /></div><div class="breadcrumb"></div></div><label v-if="page === 'process' || page === 'customers'" class="top-search"><AppIcon name="search" /><input v-model="search" :aria-label="page === 'process' ? 'Cari transaksi' : 'Cari pelanggan'" :placeholder="page==='process'?'Cari transaksi...':'Cari pelanggan...'" /></label><div class="top-actions"><div class="live-status"><i></i> {{ activeOutlet?.nama || 'Terhubung ke server' }}</div><div class="user-menu" @keydown.esc="userMenuOpen = false"><button class="user-menu-trigger" type="button" aria-label="Menu pengguna" aria-haspopup="menu" :aria-expanded="userMenuOpen" @click="userMenuOpen = !userMenuOpen"><span class="top-avatar" aria-hidden="true">{{ session.name.split(' ').map(w=>w[0]).slice(0,2).join('') }}</span><span class="user-menu-chevron" aria-hidden="true">⌄</span></button><div v-if="userMenuOpen" class="user-menu-popover" role="menu"><div class="user-menu-identity"><b>{{ session.name }}</b><small>{{ session.username || session.role }}</small><small v-if="session.username">{{ session.role }}</small></div><button class="user-menu-logout" type="button" role="menuitem" @click="userMenuOpen = false; logout()"><AppIcon name="logout" />Keluar</button></div></div></div></header>
    <main class="main-area">
      <div class="content">
        <div v-if="pageError" class="demo-banner" role="alert"><span aria-hidden="true">!</span><div><b>Data belum termuat</b><small>{{ pageError }}</small></div><button class="button secondary" @click="loadOperationalData">Coba lagi</button></div>
        <div v-if="busy" class="loading-banner" role="status"><img src="/icon/laundrian_circle_192px.png" alt="" />Menyinkronkan data…</div>
        <DashboardPage v-if="page === 'dashboard'" />
        <ProcessPage v-else-if="page === 'process'" />
        <CustomersPage v-else-if="page === 'customers'" />
        <ExpensesPage v-else-if="page === 'expenses'" />
        <ReportsPage v-else-if="page === 'reports'" />
        <SettingsPage v-else-if="page === 'settings'" />
      </div>
    </main>
    <TransactionCreateModal />
    <ExpenseCreateModal />
    <ServiceCreateModal />
    <nav class="mobile-nav" aria-label="Navigasi cepat" :data-active="mobileDockActiveIndex">
      <button v-for="(item, index) in mobileDockItems" :key="item.id" type="button" :class="{ active: mobileDockActiveIndex === index }" :aria-label="item.id === 'menu' ? 'Buka menu lengkap' : item.label" :aria-current="mobileDockActiveIndex === index ? 'page' : undefined" @click="selectMobileDockItem(item)">
        <span class="mobile-dock-icon"><AppIcon :name="item.icon" /></span>
        <small>{{ item.label }}</small>
      </button>
    </nav>
  </div>
  <Transition><div v-if="toast.message" class="toast" :class="`toast-${toast.type}`" :role="toast.type === 'error' ? 'alert' : 'status'" aria-live="polite" aria-atomic="true"><span class="toast-mark" aria-hidden="true">{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i' }}</span><span>{{ toast.message }}</span></div></Transition>
</template>

