<script setup>
import { computed, inject, reactive, ref, watch } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import CurrencyInput from '../../components/CurrencyInput.vue'
import BlePrinterPanel from './BlePrinterPanel.vue'
import { apiOrigin, requestApi, loadCursorList, logoutApi } from '../../api.js'

const { data, money, settingsTab, menu, addService, notify, session, loadOperationalData, refreshOutletBranding } = inject('laundrian')
const items = menu.find(item => item.id === 'settings').children
const selectedTitle = () => items.find(item => item.id === settingsTab.value)?.label || 'Layanan & harga'
const profile = reactive({ store_name: '', phone: '', address: '', receipt_footer: '', receipt_width: '58mm', outlet_logo_url: '', outlet_logo_path: null, outlet_logo_updated_at: null })
const profileLogoUrl = computed(() => profile.outlet_logo_url ? new URL(profile.outlet_logo_url, apiOrigin()).href : '')
const selectedLogo = ref(null)
const logoPreview = ref('')
const logoInput = ref(null)
const logoError = ref('')
const memberPromo = reactive({ member_promo_active: false, member_promo_required_transactions: 10, member_promo_minimum_subtotal: 75000, member_promo_discount_percent: 20 })
const website = reactive({
  website_active: false, website_headline: '', website_description: '', website_theme: 'saffron-cream', website_hero_layout: 'horizontal', website_primary_color: '#117DEA', website_secondary_color: '#00B1FD',
  website_about_title: '', website_about_text: '', website_services_title: '', website_services_intro: '', website_services: [], website_gallery_title: '',
  website_whatsapp_button_text: '', website_whatsapp_message: '', website_footer_text: 'Website outlet didukung oleh Laundrian', website_footer_tagline: '', website_footer_support_url: '', website_footer_support_title: 'Dukungan', website_footer_logo_mode: 'logo_tagline', website_footer_logo_size: 120, website_footer_show_logo: true, website_footer_show_support: true, website_footer_show_contact: true, website_footer_contact_title: 'Kontak outlet', website_show_services: true, website_show_about: true,
  website_show_gallery: false, website_show_location: true, website_map_url: '', website_instagram_url: '',
  website_facebook_url: '', website_hours_active: false, website_hours: {}, website_seo_title: '', website_seo_description: '', website_search_index: true,
})
const websiteTabs = [
  { id: 'content', label: 'Konten' }, { id: 'appearance', label: 'Tampilan & foto' },
  { id: 'contact', label: 'Kontak & jam' }, { id: 'seo', label: 'SEO' },
]
const activeWebsiteTab = ref('content')
const websiteServiceIcons = [
  { value: 'laundry-kiloan', label: 'Laundry kiloan', image: '/images/Kiloan.png' },
  { value: 'laundry-satuan', label: 'Laundry satuan', image: '/images/Satuan.png' },
  { value: 'bedding', label: 'Perlengkapan tidur', image: '/images/Tidur.png' },
  { value: 'household', label: 'Perlengkapan rumah tangga', image: '/images/Rumahtangga.png' },
  { value: 'shoes', label: 'Laundry sepatu', image: '/images/Sepatu.png' },
]
const normalizeWebsiteServiceIcon = icon => ({
  shirt: 'laundry-kiloan', person: 'laundry-satuan', curtains: 'household', carpet: 'household', bag: 'laundry-kiloan', iron: 'laundry-kiloan',
}[icon] || icon || 'laundry-kiloan')
const websiteHeroImageUrl = ref('')
const websiteHeroImageFile = ref(null)
const websiteHeroImagePreview = ref('')
const websiteClearHeroImage = ref(false)
const websiteFooterLogoUrl = ref('')
const websiteFooterLogoFile = ref(null)
const websiteFooterLogoPreview = ref('')
const websiteClearFooterLogo = ref(false)
const websiteGalleryImages = ref([])
const websiteGalleryFiles = ref([])
const websiteGalleryRemovals = ref([])
const websitePaymentLogos = ref([])
const websitePaymentLogoFiles = ref([])
const websitePaymentLogoRemovals = ref([])
const websiteImageError = ref('')
const employees = ref([])
const loadingSettings = ref(false)
const settingsError = ref('')
const savingProfile = ref(false)
const savingPrinterSettings = ref(false)
const savingMemberPromo = ref(false)
const savingWebsite = ref(false)
const websitePreviewUrl = computed(() => {
  const outletId = session.value?.outlet_id || session.value?.outlet?.id
  return outletId ? `http://localhost:5175/?outlet=${encodeURIComponent(outletId)}` : ''
})
const editingEmployeeId = ref(null)
const savingEmployeeId = ref(null)
const employeeError = ref('')
const employeeForm = reactive({ name: '', username: '', email: '', password: '', password_confirmation: '', is_active: true, role: 'KASIR' })
const creatingEmployee = ref(false)
const creatingEmployeeBusy = ref(false)
const createEmployeeForm = reactive({ name: '', username: '', email: '', password: '', password_confirmation: '' })
const editingService = ref(null)
const savingService = ref(false)
const serviceError = ref('')
const serviceForm = reactive({ name: '', unit: 'KG', price: 0, eta: 72, active: true })
async function loadSettings() {
  settingsError.value = ''; loadingSettings.value = true
  try {
    if (settingsTab.value === 'settings-profile') Object.assign(profile, (await requestApi('/pengaturan')).data)
    if (settingsTab.value === 'settings-printer') Object.assign(profile, (await requestApi('/pengaturan')).data)
    if (settingsTab.value === 'settings-member-promo') Object.assign(memberPromo, (await requestApi('/pengaturan')).data)
    if (settingsTab.value === 'settings-website') {
      const settings = (await requestApi('/pengaturan')).data
      Object.assign(website, settings)
      website.website_services = Array.isArray(settings.website_services)
        ? settings.website_services.map(service => ({ ...service, icon: normalizeWebsiteServiceIcon(service.icon) }))
        : []
      website.website_footer_text = settings.website_footer_text || 'Website outlet didukung oleh Laundrian'
      website.website_footer_contact_title = settings.website_footer_contact_title || 'Kontak outlet'
      website.website_theme = 'saffron-cream'
      const savedPrimaryColor = settings.website_primary_color || settings.website_accent_color
      website.website_primary_color = !savedPrimaryColor || ['#d4a600', '#002170'].includes(savedPrimaryColor.toLowerCase()) ? '#117DEA' : savedPrimaryColor
      website.website_secondary_color = !settings.website_secondary_color || ['#fff0b8', '#ffb900'].includes(settings.website_secondary_color.toLowerCase()) ? '#00B1FD' : settings.website_secondary_color
      Object.assign(profile, settings)
      websiteHeroImageUrl.value = settings.website_hero_image_url || ''
      websiteHeroImageFile.value = null
      websiteHeroImagePreview.value = ''
      websiteClearHeroImage.value = false
      websiteFooterLogoUrl.value = settings.website_footer_logo_url || ''
      websiteFooterLogoFile.value = null
      websiteFooterLogoPreview.value = ''
      websiteClearFooterLogo.value = false
      websiteGalleryImages.value = (settings.website_gallery_urls || []).map((url, index) => ({ url, serverIndex: index }))
      websiteGalleryFiles.value = []
      websiteGalleryRemovals.value = []
      websitePaymentLogos.value = (settings.website_footer_payment_logo_urls || []).map((logo, index) => ({ ...logo, serverIndex: index }))
      websitePaymentLogoFiles.value = []
      websitePaymentLogoRemovals.value = []
      websiteImageError.value = ''
    }
    if (settingsTab.value === 'settings-staff') employees.value = await loadCursorList('/karyawan')
  } catch (error) { settingsError.value = error.message }
  finally { loadingSettings.value = false }
}
async function saveProfile() {
  savingProfile.value = true
  try {
    const payload = new FormData()
    payload.append('_method', 'PUT')
    for (const key of ['store_name', 'phone', 'address']) payload.append(key, profile[key] ?? '')
    if (selectedLogo.value) payload.append('logo', selectedLogo.value)
    Object.assign(profile, (await requestApi('/pengaturan', { method: 'POST', body: payload })).data)
    refreshOutletBranding?.(profile)
    selectedLogo.value = null; logoError.value = ''
    if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
    logoPreview.value = ''
    if (logoInput.value) logoInput.value.value = ''
    notify('Profil outlet berhasil disimpan', 'success')
  }
  catch (error) { settingsError.value = error.message; notify(error.message, 'error') }
  finally { savingProfile.value = false }
}
async function savePrinterSettings() {
  if (savingPrinterSettings.value) return
  savingPrinterSettings.value = true
  try {
    const { data: savedSettings } = await requestApi('/pengaturan', {
      method: 'PUT',
      body: { receipt_width: profile.receipt_width, receipt_footer: profile.receipt_footer },
    })
    Object.assign(profile, savedSettings)
    notify('Pengaturan nota berhasil disimpan.', 'success')
  } catch (error) {
    settingsError.value = error.message
    notify(error.message, 'error')
  } finally { savingPrinterSettings.value = false }
}
function selectLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
    logoError.value = 'Pilih logo JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.'
    event.target.value = ''
    return
  }
  logoError.value = ''
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  selectedLogo.value = file
  logoPreview.value = URL.createObjectURL(file)
}
async function saveMemberPromo() {
  if (savingMemberPromo.value) return
  savingMemberPromo.value = true
  try {
    const payload = {
      member_promo_active: memberPromo.member_promo_active,
      member_promo_required_transactions: Number(memberPromo.member_promo_required_transactions),
      member_promo_minimum_subtotal: Number(memberPromo.member_promo_minimum_subtotal),
      member_promo_discount_percent: Number(memberPromo.member_promo_discount_percent),
    }
    Object.assign(memberPromo, (await requestApi('/pengaturan', { method: 'PUT', body: payload })).data)
    notify('Pengaturan Promo Member berhasil disimpan.', 'success')
  } catch (error) { settingsError.value = error.message; notify(error.message, 'error') }
  finally { savingMemberPromo.value = false }
}
async function saveWebsite() {
  if (savingWebsite.value) return
  savingWebsite.value = true
  try {
    const payload = new FormData()
    payload.append('_method', 'PUT')
    const fields = [
      'website_active', 'website_headline', 'website_description', 'website_theme', 'website_hero_layout', 'website_primary_color', 'website_secondary_color',
      'website_about_title', 'website_about_text', 'website_services_title', 'website_services_intro', 'website_gallery_title',
      'website_whatsapp_button_text', 'website_whatsapp_message', 'website_footer_text', 'website_footer_tagline', 'website_footer_support_url', 'website_footer_support_title', 'website_footer_logo_mode', 'website_footer_logo_size', 'website_footer_show_logo', 'website_footer_show_support', 'website_footer_show_contact', 'website_footer_contact_title', 'website_show_services', 'website_show_about',
      'website_show_gallery', 'website_show_location', 'website_map_url', 'website_instagram_url', 'website_facebook_url',
      'website_hours_active', 'website_seo_title', 'website_seo_description', 'website_search_index',
    ]
    for (const key of fields) payload.append(key, typeof website[key] === 'boolean' ? (website[key] ? '1' : '0') : (website[key] ?? ''))
    payload.append('website_services', JSON.stringify(website.website_services.map(({ name, description, icon }) => ({ name, description, icon }))))
    for (const [day, value] of Object.entries(website.website_hours || {})) {
      payload.append(`website_hours[${day}][closed]`, value.closed ? '1' : '0')
      payload.append(`website_hours[${day}][open]`, value.open || '')
      payload.append(`website_hours[${day}][close]`, value.close || '')
    }
    if (websiteHeroImageFile.value) payload.append('website_hero_image', websiteHeroImageFile.value)
    if (websiteClearHeroImage.value) payload.append('website_clear_hero_image', '1')
    if (websiteFooterLogoFile.value) payload.append('website_footer_logo', websiteFooterLogoFile.value)
    if (websiteClearFooterLogo.value) payload.append('website_clear_footer_logo', '1')
    websiteGalleryRemovals.value.forEach(index => payload.append('website_gallery_remove[]', String(index)))
    websiteGalleryFiles.value.forEach(file => payload.append('website_gallery_images[]', file))
    websitePaymentLogoRemovals.value.forEach(index => payload.append('website_footer_payment_logo_remove[]', String(index)))
    websitePaymentLogoFiles.value.forEach(file => payload.append('website_footer_payment_logos[]', file))
    const result = (await requestApi('/pengaturan', { method: 'POST', body: payload })).data
    Object.assign(website, result)
    websiteHeroImageUrl.value = result.website_hero_image_url || ''
    websiteHeroImageFile.value = null
    websiteClearHeroImage.value = false
    websiteFooterLogoUrl.value = result.website_footer_logo_url || ''
    websiteFooterLogoFile.value = null
    websiteClearFooterLogo.value = false
    if (websiteFooterLogoPreview.value) URL.revokeObjectURL(websiteFooterLogoPreview.value)
    websiteFooterLogoPreview.value = ''
    websiteGalleryImages.value.filter(image => image.file).forEach(image => URL.revokeObjectURL(image.url))
    websiteGalleryImages.value = (result.website_gallery_urls || []).map((url, index) => ({ url, serverIndex: index }))
    websiteGalleryFiles.value = []
    websiteGalleryRemovals.value = []
    websitePaymentLogos.value.filter(logo => logo.file).forEach(logo => URL.revokeObjectURL(logo.url))
    websitePaymentLogos.value = (result.website_footer_payment_logo_urls || []).map((logo, index) => ({ ...logo, serverIndex: index }))
    websitePaymentLogoFiles.value = []
    websitePaymentLogoRemovals.value = []
    websiteImageError.value = ''
    if (websiteHeroImagePreview.value) URL.revokeObjectURL(websiteHeroImagePreview.value)
    websiteHeroImagePreview.value = ''
    notify('Pengaturan website berhasil disimpan.', 'success')
  } catch (error) { notify(error.message, 'error') }
  finally { savingWebsite.value = false }
}
function selectWebsiteHeroImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    websiteImageError.value = 'Pilih JPG, PNG, atau WebP maksimal 5 MB.'; event.target.value = ''; return
  }
  websiteImageError.value = ''
  if (websiteHeroImagePreview.value) URL.revokeObjectURL(websiteHeroImagePreview.value)
  websiteHeroImageFile.value = file
  websiteHeroImagePreview.value = URL.createObjectURL(file)
  websiteClearHeroImage.value = false
}
function clearWebsiteHeroImage() {
  websiteClearHeroImage.value = true
  websiteHeroImageFile.value = null
  if (websiteHeroImagePreview.value) URL.revokeObjectURL(websiteHeroImagePreview.value)
  websiteHeroImagePreview.value = ''
}
function selectWebsiteFooterLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    notify('Pilih logo JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.', 'error')
    event.target.value = ''
    return
  }
  if (websiteFooterLogoPreview.value) URL.revokeObjectURL(websiteFooterLogoPreview.value)
  websiteFooterLogoFile.value = file
  websiteFooterLogoPreview.value = URL.createObjectURL(file)
  websiteClearFooterLogo.value = false
  event.target.value = ''
}
function clearWebsiteFooterLogo() {
  websiteFooterLogoFile.value = null
  if (websiteFooterLogoPreview.value) URL.revokeObjectURL(websiteFooterLogoPreview.value)
  websiteFooterLogoPreview.value = ''
  websiteClearFooterLogo.value = Boolean(websiteFooterLogoUrl.value)
  websiteFooterLogoUrl.value = ''
}
function selectWebsiteGalleryImages(event) {
  const files = [...(event.target.files || [])]
  const accepted = files.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024)
  if (accepted.length !== files.length) websiteImageError.value = 'Sebagian file tidak ditambahkan. Gunakan JPG, PNG, atau WebP maksimal 5 MB per foto.'
  const capacity = 4 - websiteGalleryImages.value.length
  const additions = accepted.slice(0, capacity)
  if (accepted.length > capacity) websiteImageError.value = 'Galeri hanya dapat memuat 4 foto.'
  for (const file of additions) {
    const url = URL.createObjectURL(file)
    websiteGalleryFiles.value.push(file)
    websiteGalleryImages.value.push({ url, file })
  }
  event.target.value = ''
}
function removeWebsiteGalleryImage(image) {
  if (image.file) {
    const index = websiteGalleryFiles.value.indexOf(image.file)
    if (index >= 0) websiteGalleryFiles.value.splice(index, 1)
    URL.revokeObjectURL(image.url)
  } else if (Number.isInteger(image.serverIndex)) websiteGalleryRemovals.value.push(image.serverIndex)
  websiteGalleryImages.value = websiteGalleryImages.value.filter(item => item !== image)
}
function selectWebsitePaymentLogos(event) {
  const files = [...(event.target.files || [])]
  const accepted = files.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 2 * 1024 * 1024)
  if (accepted.length !== files.length) notify('Gunakan logo JPG, PNG, atau WebP maksimal 2 MB per file.', 'error')
  const capacity = 6 - websitePaymentLogos.value.length
  if (accepted.length > capacity) notify('Maksimal 6 logo pembayaran.', 'error')
  for (const file of accepted.slice(0, capacity)) {
    const url = URL.createObjectURL(file)
    websitePaymentLogoFiles.value.push(file)
    websitePaymentLogos.value.push({ url, name: file.name.replace(/\.[^.]+$/, ''), file })
  }
  event.target.value = ''
}
function removeWebsitePaymentLogo(logo) {
  if (logo.file) {
    const index = websitePaymentLogoFiles.value.indexOf(logo.file)
    if (index >= 0) websitePaymentLogoFiles.value.splice(index, 1)
    URL.revokeObjectURL(logo.url)
  } else if (Number.isInteger(logo.serverIndex)) websitePaymentLogoRemovals.value.push(logo.serverIndex)
  websitePaymentLogos.value = websitePaymentLogos.value.filter(item => item !== logo)
}
const weekDays = [
  { id: 'monday', label: 'Senin' }, { id: 'tuesday', label: 'Selasa' }, { id: 'wednesday', label: 'Rabu' },
  { id: 'thursday', label: 'Kamis' }, { id: 'friday', label: 'Jumat' }, { id: 'saturday', label: 'Sabtu' }, { id: 'sunday', label: 'Minggu' },
]
function websiteDayHours(day) {
  if (!website.website_hours[day]) website.website_hours[day] = { closed: false, open: '', close: '' }
  return website.website_hours[day]
}
function toggleWebsiteHours(event) {
  website.website_hours_active = event.target.checked
  if (website.website_hours_active) weekDays.forEach(day => websiteDayHours(day.id))
}
function addWebsiteService() {
  if (website.website_services.length >= 30) return
  website.website_services.push({ name: '', description: '', icon: 'laundry-kiloan' })
}
function removeWebsiteService(index) { website.website_services.splice(index, 1) }
function editEmployee(employee) {
  employeeError.value = ''
  if (editingEmployeeId.value === employee.id) { editingEmployeeId.value = null; return }
  Object.assign(employeeForm, { name: employee.name || '', username: employee.username || '', email: employee.email || '', password: '', password_confirmation: '', is_active: Boolean(employee.is_active), role: employee.role || 'KASIR' })
  editingEmployeeId.value = employee.id
}
async function saveEmployee(employee) {
  if (savingEmployeeId.value !== null) return
  employeeError.value = ''
  savingEmployeeId.value = employee.id
  const password = employeeForm.password.trim()
  const payload = { name: employeeForm.name.trim(), username: employeeForm.username.trim(), email: employeeForm.email.trim() || null, is_active: employeeForm.is_active }
  if (session.value?.role === 'SUPERADMIN') payload.role = employeeForm.role
  if (password) { payload.password = password; payload.password_confirmation = employeeForm.password_confirmation }
  try {
    const updated = (await requestApi(`/karyawan/${employee.id}`, { method: 'PUT', body: payload })).data
    employees.value = employees.value.map(item => item.id === updated.id ? updated : item)
    const editingCurrentUser = Number(session.value?.id) === Number(updated.id)
    if (editingCurrentUser) Object.assign(session.value, { name: updated.name, username: updated.username })
    editingEmployeeId.value = null
    if (editingCurrentUser && password) {
      try { await logoutApi() } catch { /* Password changes revoke the current token on the backend. */ }
      session.value = null
      notify('Kata sandi berubah. Silakan masuk kembali dengan kata sandi baru.', 'success')
    } else notify('Informasi karyawan berhasil diperbarui.', 'success')
  } catch (error) {
    employeeError.value = error.message
    notify(error.message, 'error')
  } finally { savingEmployeeId.value = null }
}
async function createEmployee() {
  if (creatingEmployeeBusy.value) return
  employeeError.value = ''; creatingEmployeeBusy.value = true
  try {
    const created = (await requestApi('/karyawan', { method: 'POST', body: { ...createEmployeeForm, name: createEmployeeForm.name.trim(), username: createEmployeeForm.username.trim().toLowerCase(), email: createEmployeeForm.email.trim() || null } })).data
    employees.value = [...employees.value, created].sort((a, b) => a.name.localeCompare(b.name, 'id'))
    Object.assign(createEmployeeForm, { name: '', username: '', email: '', password: '', password_confirmation: '' })
    creatingEmployee.value = false; notify('Akun kasir berhasil dibuat.', 'success')
  } catch (error) { employeeError.value = error.message; notify(error.message, 'error') }
  finally { creatingEmployeeBusy.value = false }
}
function editService(service) {
  serviceError.value = ''
  editingService.value = editingService.value === service.id ? null : service.id
  Object.assign(serviceForm, { name: service.name, unit: service.unit, price: service.price, eta: service.eta, active: service.active })
}
async function saveService(service) {
  if (savingService.value) return
  savingService.value = true; serviceError.value = ''
  try {
    await requestApi(`/layanan/${service.id}`, { method: 'PUT', body: { nama: serviceForm.name.trim(), jenis_hitung: serviceForm.unit, harga: Number(serviceForm.price), estimasi_jam: Number(serviceForm.eta), aktif: serviceForm.active } })
    editingService.value = null; await loadOperationalData(); notify('Layanan berhasil diperbarui.', 'success')
  } catch (error) { serviceError.value = error.message; notify(error.message, 'error') }
  finally { savingService.value = false }
}
watch(settingsTab, loadSettings, { immediate: true })
</script>

<template>
  <PageHeader title="Pengaturan" description="Kelola layanan, promo, website, karyawan, dan profil outlet." />
  <div class="settings-layout">
    <nav class="settings-tabs" aria-label="Bagian pengaturan">
      <button v-for="item in items" :key="item.id" :class="{ on: settingsTab === item.id }" :aria-current="settingsTab === item.id ? 'page' : undefined" @click="settingsTab = item.id">{{ item.label }}<svg class="settings-tab-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m6 3 5 5-5 5" /></svg></button>
    </nav>
    <section class="panel settings-panel">
      <template v-if="settingsTab === 'settings-services'">
        <div class="panel-heading"><div><h2>Layanan & harga</h2><p>Tarif aktif yang digunakan pada pesanan outlet.</p></div><button class="button primary" @click="addService">+ Tambah layanan</button></div>
        <div v-if="data.services.length" class="table-wrap settings-services-desktop">
          <table><thead><tr><th>NAMA LAYANAN</th><th>JENIS HITUNG</th><th>ESTIMASI</th><th>HARGA</th><th>STATUS</th><th>AKSI</th></tr></thead>
            <tbody><tr v-for="service in data.services" :key="service.id"><td><b>{{ service.name }}</b></td><td><span class="category-tag">{{ service.unit }}</span></td><td>{{ service.eta }} jam</td><td><b>{{ money(service.price) }} / {{ service.unit.toLowerCase() }}</b></td><td><span class="active-label"><i :class="{ inactive: !service.active }"></i> {{ service.active ? 'Aktif' : 'Nonaktif' }}</span></td><td><button class="small-action" type="button" @click="editService(service)">{{ editingService === service.id ? 'Tutup' : 'Edit' }}</button></td></tr></tbody>
          </table>
        </div>
        <div v-if="data.services.length" class="settings-service-cards">
          <article v-for="service in data.services" :key="service.id" class="settings-service-card">
            <div class="settings-service-heading"><h3>{{ service.name }}</h3><span class="active-label"><i :class="{ inactive: !service.active }"></i> {{ service.active ? 'Aktif' : 'Nonaktif' }}</span></div>
            <div class="settings-service-details">
              <div><small>Satuan</small><b>{{ service.unit }}</b></div>
              <div><small>Estimasi</small><b>{{ service.eta }} jam</b></div>
              <div class="settings-service-price"><small>Harga per {{ service.unit.toLowerCase() }}</small><b>{{ money(service.price) }}</b></div>
            </div>
            <button class="small-action service-edit-button" type="button" @click="editService(service)">{{ editingService === service.id ? 'Tutup editor' : 'Edit layanan' }}</button>
          </article>
        </div>
        <form v-if="editingService" class="service-editor" @submit.prevent="saveService(data.services.find(item => item.id === editingService))">
          <div class="staff-editor-fields">
            <label>Nama layanan<input v-model="serviceForm.name" required maxlength="120" /></label>
            <label>Satuan<select v-model="serviceForm.unit"><option>KG</option><option>PCS</option><option>PASANG</option><option>METER</option></select></label>
            <label>Harga<CurrencyInput v-model="serviceForm.price" min="1" required placeholder="Rp 0,00" aria-label="Harga layanan dalam Rupiah" /></label>
            <label>Estimasi (jam)<input v-model.number="serviceForm.eta" type="number" min="72" max="720" step="1" required /><small>Minimal 72 jam (3 hari).</small></label>
          </div>
          <label class="staff-active-toggle"><input v-model="serviceForm.active" type="checkbox" /><span>Layanan aktif untuk transaksi baru</span></label>
          <p v-if="serviceError" class="auth-error" role="alert">{{ serviceError }}</p>
          <div class="staff-editor-actions"><button class="button secondary" type="button" @click="editingService = null">Batal</button><button class="button primary" type="submit" :disabled="savingService">{{ savingService ? 'Menyimpan…' : 'Simpan layanan' }}</button></div>
        </form>
        <div v-if="!data.services.length" class="empty-state"><b>Belum ada layanan</b><span>Tambahkan layanan untuk menggunakannya pada pesanan.</span><button class="button secondary" @click="addService">Tambah layanan</button></div>
      </template>
      <div v-else-if="settingsTab === 'settings-profile'" class="settings-form-wrap">
        <div class="panel-heading"><div><h2>Profil outlet</h2><p>Data ini digunakan pada identitas outlet dan nota.</p></div></div>
        <p v-if="loadingSettings" class="empty-state">Memuat profil…</p><p v-else-if="settingsError" class="auth-error" role="alert">{{ settingsError }}</p>
        <form v-else class="modal-body" @submit.prevent="saveProfile">
          <label>Nama outlet<input v-model="profile.store_name" required maxlength="150" /></label>
          <label>Logo outlet<div class="outlet-logo-control"><div class="outlet-logo-preview"><img :src="logoPreview || profileLogoUrl || '/icon/laundrian_192px.png'" alt="Pratinjau logo outlet" /></div><div class="outlet-logo-upload"><input ref="logoInput" class="outlet-logo-input" type="file" accept="image/png,image/jpeg,image/webp" :disabled="savingProfile" @change="selectLogo" /><small>JPG, PNG, atau WebP · Maksimal 2 MB.</small><small v-if="logoError" class="outlet-logo-error" role="alert">{{ logoError }}</small></div></div></label>
          <label>Nomor telepon<input v-model="profile.phone" type="tel" /></label>
          <label>Alamat<textarea v-model="profile.address" rows="3"></textarea></label>
          <div class="modal-footer"><button class="button primary" :disabled="savingProfile">{{ savingProfile ? 'Menyimpan…' : 'Simpan profil' }}</button></div>
        </form>
      </div>
      <div v-else-if="settingsTab === 'settings-member-promo'" class="settings-form-wrap">
        <div class="panel-heading"><div><h2>Promo Member</h2><p>Atur hadiah loyalitas yang diterapkan otomatis pada transaksi pelanggan.</p></div></div>
        <p v-if="loadingSettings" class="empty-state" role="status">Memuat pengaturan promo…</p>
        <p v-else-if="settingsError" class="auth-error" role="alert">{{ settingsError }}</p>
        <form v-else class="modal-body member-promo-form" @submit.prevent="saveMemberPromo">
          <div class="member-promo-toggle"><button class="member-promo-switch" type="button" role="switch" :aria-checked="memberPromo.member_promo_active" aria-label="Aktifkan Promo Member" @click="memberPromo.member_promo_active = !memberPromo.member_promo_active"></button><span class="member-promo-toggle-label">Aktifkan Promo Member</span></div>
          <p class="muted">Jika aktif, pelanggan mendapat potongan {{ memberPromo.member_promo_discount_percent }}% pada transaksi berikutnya setelah mencapai target.</p>
          <div class="staff-editor-fields">
            <label>Target transaksi<input v-model.number="memberPromo.member_promo_required_transactions" type="number" min="1" max="100" step="1" required :disabled="!memberPromo.member_promo_active" /><small>Transaksi yang memenuhi target harus sudah lunas dan diambil.</small></label>
            <label>Minimal subtotal laundry<CurrencyInput v-model="memberPromo.member_promo_minimum_subtotal" min="1" required placeholder="Rp 75.000,00" aria-label="Minimal subtotal laundry member" :disabled="!memberPromo.member_promo_active" /><small>Nilai layanan sebelum diskon dan ongkir.</small></label>
            <label>Diskon member (%)<input v-model.number="memberPromo.member_promo_discount_percent" type="number" min="1" max="100" step="1" required :disabled="!memberPromo.member_promo_active" /><small>Persentase potongan dari subtotal setelah diskon manual.</small></label>
          </div>
          <p class="member-promo-note">Transaksi yang memakai diskon memulai progres siklus baru bila subtotalnya memenuhi batas.</p>
          <div class="modal-footer"><button class="button primary" type="submit" :disabled="savingMemberPromo">{{ savingMemberPromo ? 'Menyimpan…' : 'Simpan Promo Member' }}</button></div>
        </form>
      </div>
      <div v-else-if="settingsTab === 'settings-website'" class="settings-form-wrap website-settings">
        <div class="panel-heading website-settings-heading">
          <div><h2>Website laundry</h2><p>Kelola isi website, tampilan, kontak, dan pencarian dari satu tempat.</p></div>
          <a v-if="websitePreviewUrl" class="button secondary" :href="websitePreviewUrl" target="_blank" rel="noreferrer">Pratinjau website <span aria-hidden="true">↗</span></a>
        </div>
        <p v-if="loadingSettings" class="empty-state" role="status">Memuat pengaturan website…</p>
        <p v-else-if="settingsError" class="auth-error" role="alert">{{ settingsError }}</p>
        <form v-else class="website-settings-form" @submit.prevent="saveWebsite">
          <nav class="website-settings-tabs" role="tablist" aria-label="Pengaturan website">
            <button v-for="tab in websiteTabs" :key="tab.id" type="button" role="tab" :aria-selected="activeWebsiteTab === tab.id" :class="{ selected: activeWebsiteTab === tab.id }" @click="activeWebsiteTab = tab.id">{{ tab.label }}</button>
          </nav>

          <div v-if="activeWebsiteTab === 'content'" class="website-tab-content">
            <section class="website-setting-section website-publish-section">
              <div class="website-section-copy"><h3>Status publikasi</h3><p>Website hanya dapat dikunjungi pelanggan saat diaktifkan.</p></div>
              <div class="website-publish-control"><span class="website-status-pill" :class="website.website_active ? 'is-live' : 'is-off'">{{ website.website_active ? 'Aktif' : 'Belum tayang' }}</span><button class="member-promo-switch" type="button" role="switch" :aria-checked="website.website_active" :aria-label="website.website_active ? 'Nonaktifkan website outlet' : 'Aktifkan website outlet'" @click="website.website_active = !website.website_active"></button></div>
            </section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Bagian pembuka</h3><p>Bagian pertama yang dilihat calon pelanggan.</p></div><div class="website-fields"><label>Judul utama<input v-model="website.website_headline" maxlength="48" placeholder="Pakaian bersih, hari terasa lebih ringan." /><small>Maksimal 48 karakter.</small></label><label>Deskripsi pembuka<textarea v-model="website.website_description" maxlength="1000" rows="3" placeholder="Jelaskan outlet dan layanan Anda." /><small>Maksimal 1.000 karakter.</small></label><label>Teks tombol WhatsApp<input v-model="website.website_whatsapp_button_text" maxlength="50" placeholder="Tanya lewat WhatsApp" /></label><label>Pesan WhatsApp otomatis<textarea v-model="website.website_whatsapp_message" maxlength="500" rows="2" placeholder="Halo {nama}, saya ingin bertanya tentang layanan laundry." /><small>Gunakan {nama} untuk menyisipkan nama outlet.</small></label></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Bagian website</h3><p>Pilih bagian yang ingin ditampilkan.</p></div><div class="website-section-toggles"><label><input v-model="website.website_show_services" type="checkbox" /><span><b>Layanan outlet</b><small>Tampilkan jenis layanan dan penjelasannya di website.</small></span></label><label><input v-model="website.website_show_about" type="checkbox" /><span><b>Tentang outlet</b><small>Tampilkan cerita dan informasi outlet.</small></span></label><label><input v-model="website.website_show_gallery" type="checkbox" /><span><b>Galeri foto</b><small>Tampilkan foto yang Anda unggah di tab Tampilan & foto.</small></span></label><label><input v-model="website.website_show_location" type="checkbox" /><span><b>Kontak & lokasi</b><small>Tampilkan kontak, alamat, peta, dan jam operasional outlet.</small></span></label></div></section>
<section class="website-setting-section"><div class="website-section-copy"><h3>Layanan outlet</h3><p>Atur kartu informasi untuk pengunjung. Daftar ini berdiri sendiri dan tidak mengubah layanan atau tarif transaksi.</p></div><div class="website-service-editor"><label class="website-service-title">Judul bagian<input v-model="website.website_services_title" maxlength="100" placeholder="Layanan yang tersedia" /></label><label class="website-service-title">Keterangan singkat<input v-model="website.website_services_intro" maxlength="240" placeholder="Ceritakan kebutuhan laundry yang dilayani outlet." /></label><div class="website-marketing-services"><article v-for="(service, index) in website.website_services" :key="index" class="website-marketing-service"><header><b>Layanan {{ index + 1 }}</b><button class="button secondary" type="button" @click="removeWebsiteService(index)">Hapus</button></header><div class="website-marketing-service-fields"><label>Nama layanan<input v-model="service.name" maxlength="80" placeholder="Contoh: Laundry kiloan" /></label><fieldset class="website-icon-picker"><legend>Pilih ikon</legend><button v-for="icon in websiteServiceIcons" :key="icon.value" type="button" :class="{ selected: service.icon === icon.value }" :aria-label="icon.label" :aria-pressed="service.icon === icon.value" :title="icon.label" @click="service.icon = icon.value"><img class="website-icon-choice" :src="icon.image" alt="" /></button></fieldset><label class="website-service-description">Deskripsi<textarea v-model="service.description" maxlength="400" rows="3" placeholder="Jelaskan jenis cucian atau cara layanan ini membantu pelanggan." /></label></div></article><p v-if="!website.website_services.length" class="website-service-empty">Belum ada kartu layanan. Tambahkan layanan yang ingin diperkenalkan kepada pelanggan.</p></div><button class="button secondary" type="button" :disabled="website.website_services.length >= 30" @click="addWebsiteService">+ Tambah layanan <span>{{ website.website_services.length }}/30</span></button></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Judul bagian</h3><p>Sesuaikan judul untuk bagian layanan dan Tentang.</p></div><div class="website-fields website-fields-two"><label>Judul tentang<input v-model="website.website_about_title" maxlength="100" placeholder="Lebih dekat. Lebih mudah." /></label><label>Deskripsi tentang<textarea v-model="website.website_about_text" maxlength="2000" rows="3" placeholder="Ceritakan tentang outlet Anda." /><small>Gunakan isi yang berbeda dari deskripsi pembuka; ceritakan profil atau keunikan outlet.</small></label><label>Judul galeri<input v-model="website.website_gallery_title" maxlength="100" placeholder="Bagian dari keseharian." /></label></div></section><section class="website-setting-section"><div class="website-section-copy"><h3>Footer website</h3><p>Atur tiga kolom: identitas outlet, dukungan Laundrian dan metode pembayaran, lalu kontak outlet.</p></div><div class="website-fields website-fields-two"><div class="website-footer-logo-settings"><b>Identitas kolom outlet</b><div class="website-footer-logo-preview"><img v-if="websiteFooterLogoPreview || (websiteFooterLogoUrl && !websiteClearFooterLogo)" :src="websiteFooterLogoPreview || websiteFooterLogoUrl" :style="{ height: `${website.website_footer_logo_size}px` }" alt="Pratinjau logo footer outlet" /><p v-else>Belum ada logo footer yang diunggah.</p><div><label class="button secondary">{{ websiteFooterLogoUrl || websiteFooterLogoPreview ? 'Ganti logo' : 'Unggah logo' }}<input type="file" accept="image/png,image/jpeg,image/webp" @change="selectWebsiteFooterLogo" /></label><button v-if="websiteFooterLogoUrl || websiteFooterLogoPreview" class="button secondary" type="button" @click="clearWebsiteFooterLogo">Hapus logo</button></div><small>JPG, PNG, atau WebP. Maksimal 2 MB.</small></div></div><label>Susunan identitas<select v-model="website.website_footer_logo_mode"><option value="logo_tagline">Logo dan tagline</option><option value="logo">Logo saja</option><option value="tagline">Tagline saja</option></select></label><label>Ukuran logo (px)<input v-model.number="website.website_footer_logo_size" type="number" min="32" max="240" step="1" required /><small>Tinggi logo pada footer, 32–240 px.</small></label><label>Tagline outlet<input v-model="website.website_footer_tagline" maxlength="160" placeholder="Tagline singkat outlet Anda" /></label><label>Judul kolom dukungan<input v-model="website.website_footer_support_title" maxlength="60" placeholder="Dukungan" /></label><label>Teks dukungan<input v-model="website.website_footer_text" maxlength="160" placeholder="Website outlet didukung oleh Laundrian" /></label><label>Tautan Laundrian App<input v-model="website.website_footer_support_url" type="url" maxlength="500" placeholder="https://alamat-aplikasi-anda" /><small>Kosongkan jika belum memiliki tautan publik.</small></label><label>Judul kolom kontak<input v-model="website.website_footer_contact_title" maxlength="60" placeholder="Kontak outlet" /></label><label class="website-hours-toggle"><input v-model="website.website_footer_show_support" type="checkbox" /><span>Tampilkan dukungan Laundrian</span></label><label class="website-hours-toggle"><input v-model="website.website_footer_show_contact" type="checkbox" /><span>Tampilkan kontak outlet</span></label><div class="website-payment-setting"><b>Logo pembayaran</b><small>Unggah logo metode yang diterima outlet. Nama file dipakai sebagai teks alternatif.</small><div v-if="websitePaymentLogos.length" class="website-payment-editor"><figure v-for="logo in websitePaymentLogos" :key="logo.url"><img :src="logo.url" :alt="logo.name" /><figcaption>{{ logo.name }}</figcaption><button type="button" :aria-label="`Hapus logo ${logo.name}`" @click="removeWebsitePaymentLogo(logo)">Hapus</button></figure></div><label v-if="websitePaymentLogos.length < 6" class="button secondary">Tambah logo pembayaran<input type="file" accept="image/png,image/jpeg,image/webp" multiple @change="selectWebsitePaymentLogos" /></label><small>Maksimal 6 logo, JPG/PNG/WebP, 2 MB per logo.</small></div></div></section>
          </div>

          <div v-else-if="activeWebsiteTab === 'appearance'" class="website-tab-content">
            <section class="website-setting-section"><div class="website-section-copy"><h3>Tata letak foto utama</h3><p>Atur posisi teks dan foto pada bagian pembuka website.</p></div><fieldset class="website-layout-options"><legend class="visually-hidden">Pilih tata letak foto utama</legend><label class="website-layout-option" :class="{ selected: website.website_hero_layout === 'horizontal' }"><input v-model="website.website_hero_layout" type="radio" value="horizontal" /><span class="website-layout-preview layout-preview-horizontal"><i></i><b></b></span><span><b>Horizontal</b><small>Foto memenuhi lebar halaman, teks tampil di atas foto.</small></span></label><label class="website-layout-option" :class="{ selected: website.website_hero_layout === 'vertical' }"><input v-model="website.website_hero_layout" type="radio" value="vertical" /><span class="website-layout-preview layout-preview-vertical"><i></i><b></b></span><span><b>Vertikal</b><small>Teks di samping foto, seperti tampilan sebelumnya.</small></span></label></fieldset></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Tema warna</h3><p>Tema dasar biru elektrik dan terang. Sesuaikan warna primer serta sekundernya.</p></div><div class="website-color-settings"><div class="website-color-preview"><span :style="{ backgroundColor: website.website_primary_color }">Primer</span><span :style="{ backgroundColor: website.website_secondary_color }">Sekunder</span><b>Biru elektrik & cyan</b></div><div class="website-color-controls"><label>Warna primer<input v-model="website.website_primary_color" type="color" aria-label="Pilih warna primer website" /><small>Untuk tombol dan aksen utama.</small></label><label>Warna sekunder<input v-model="website.website_secondary_color" type="color" aria-label="Pilih warna sekunder website" /><small>Untuk ornamen dan aksen pendukung.</small></label></div></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Foto utama</h3><p>Gunakan foto outlet atau hasil laundry untuk area pembuka.</p></div><div class="website-image-editor"><img v-if="websiteHeroImagePreview || (websiteHeroImageUrl && !websiteClearHeroImage)" :src="websiteHeroImagePreview || websiteHeroImageUrl" alt="Pratinjau foto utama website" /><p v-else class="website-image-empty">Belum ada foto utama. Tampilan ilustrasi bawaan akan digunakan.</p><div class="website-image-actions"><label class="button secondary">{{ websiteHeroImageUrl || websiteHeroImagePreview ? 'Ganti foto' : 'Pilih foto' }}<input type="file" accept="image/png,image/jpeg,image/webp" @change="selectWebsiteHeroImage" /></label><button v-if="websiteHeroImageUrl || websiteHeroImagePreview" class="button secondary" type="button" @click="clearWebsiteHeroImage">Hapus foto</button></div><small>JPG, PNG, atau WebP. Maksimal 5 MB.</small></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Galeri foto</h3><p>Unggah sampai 4 foto. Foto hanya tampil jika bagian galeri diaktifkan.</p></div><div class="website-image-editor"><div v-if="websiteGalleryImages.length" class="website-gallery-editor"><figure v-for="image in websiteGalleryImages" :key="image.url"><img :src="image.url" alt="Foto galeri website outlet" /><button type="button" aria-label="Hapus foto dari galeri" @click="removeWebsiteGalleryImage(image)">×</button></figure></div><p v-else class="website-image-empty">Belum ada foto galeri.</p><label v-if="websiteGalleryImages.length < 4" class="button secondary">Tambah foto<input type="file" accept="image/png,image/jpeg,image/webp" multiple @change="selectWebsiteGalleryImages" /></label><small>Maksimal 4 foto, JPG/PNG/WebP, 5 MB per foto.</small></div></section>
            <p v-if="websiteImageError" class="auth-error" role="alert">{{ websiteImageError }}</p>
          </div>

          <div v-else-if="activeWebsiteTab === 'contact'" class="website-tab-content">
            <section class="website-setting-section"><div class="website-section-copy"><h3>Informasi outlet</h3><p>Nama, logo, telepon, dan alamat diambil dari profil outlet.</p></div><div class="website-source-summary"><div class="website-source-identity"><img :src="profileLogoUrl || '/icon/laundrian_192px.png'" alt="" /><div><b>{{ profile.store_name || 'Nama outlet belum diatur' }}</b><small>{{ profile.address || 'Alamat belum diisi' }}</small><small>{{ profile.phone || 'Nomor telepon belum diisi' }}</small></div></div><div class="website-source-links"><button class="button secondary" type="button" @click="settingsTab = 'settings-profile'">Atur profil outlet</button></div></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Kontak online</h3><p>Tambahkan petunjuk arah dan akun media sosial outlet.</p></div><div class="website-fields"><label>Tautan Google Maps<input v-model="website.website_map_url" type="url" maxlength="1000" placeholder="https://maps.google.com/..." /></label><label>Instagram<input v-model="website.website_instagram_url" type="url" maxlength="500" placeholder="https://instagram.com/nama-outlet" /></label><label>Facebook<input v-model="website.website_facebook_url" type="url" maxlength="500" placeholder="https://facebook.com/nama-outlet" /></label></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Jam operasional</h3><p>Jam ini ditampilkan di bagian kontak. Isi sesuai jam buka outlet.</p></div><div><label class="website-hours-toggle"><input :checked="website.website_hours_active" type="checkbox" @change="toggleWebsiteHours" /><span>Tampilkan jam operasional di website</span></label><div v-if="website.website_hours_active" class="website-hours-list"><div v-for="day in weekDays" :key="day.id" class="website-hours-row"><b>{{ day.label }}</b><label class="website-closed-toggle"><input v-model="websiteDayHours(day.id).closed" type="checkbox" /> Tutup</label><template v-if="!websiteDayHours(day.id).closed"><input v-model="websiteDayHours(day.id).open" type="time" required :aria-label="`Jam buka ${day.label}`" /><span>sampai</span><input v-model="websiteDayHours(day.id).close" type="time" required :aria-label="`Jam tutup ${day.label}`" /></template></div></div></div></section>
          </div>

          <div v-else class="website-tab-content">
            <section class="website-setting-section"><div class="website-section-copy"><h3>Judul & deskripsi pencarian</h3><p>Informasi yang digunakan pada judul tab browser dan cuplikan hasil pencarian.</p></div><div class="website-fields"><label>Judul SEO<input v-model="website.website_seo_title" maxlength="70" placeholder="Nama outlet — Laundry dekat Anda" /><small>Maksimal 70 karakter.</small></label><label>Deskripsi SEO<textarea v-model="website.website_seo_description" maxlength="160" rows="3" placeholder="Ringkasan singkat layanan dan lokasi outlet." /><small>Maksimal 160 karakter.</small></label></div></section>
            <section class="website-setting-section"><div class="website-section-copy"><h3>Visibilitas mesin pencari</h3><p>Pengaturan ini mengizinkan crawler membaca halaman. Peringkat Google tetap dipengaruhi domain, konten, dan situs yang sudah online.</p></div><label class="website-hours-toggle"><input v-model="website.website_search_index" type="checkbox" /><span>Izinkan mesin pencari mengindeks website ini</span></label></section>
            <div class="website-seo-note">Website lokal belum dapat diindeks Google. Pengaturan ini mulai berguna setelah website dipasang pada domain publik.</div>
          </div>

          <div class="website-save-bar"><span>Perubahan pada tab ini dan tab lainnya disimpan bersama.</span><button class="button primary" type="submit" :disabled="savingWebsite">{{ savingWebsite ? 'Menyimpan…' : 'Simpan pengaturan website' }}</button></div>
        </form>
      </div>
      <div v-else-if="settingsTab === 'settings-staff'" class="settings-form-wrap">
        <div class="panel-heading"><div><h2>Akun pengguna</h2><p>Daftar owner dan karyawan aktif di outlet.</p></div><button class="button primary" type="button" @click="creatingEmployee = !creatingEmployee; employeeError = ''">{{ creatingEmployee ? 'Tutup form' : '+ Tambah karyawan' }}</button></div>
        <p v-if="loadingSettings" class="empty-state">Memuat akun…</p><p v-else-if="settingsError" class="auth-error" role="alert">{{ settingsError }}</p>
        <form v-if="creatingEmployee" class="staff-editor staff-create" @submit.prevent="createEmployee">
          <p class="staff-create-note">Akun baru dibuat dengan role <b>KASIR</b>. Password minimal 8 karakter.</p>
          <div class="staff-editor-fields">
            <label>Nama lengkap<input v-model="createEmployeeForm.name" required maxlength="120" autocomplete="name" /></label>
            <label>Username<input v-model="createEmployeeForm.username" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]+" autocomplete="username" /></label>
            <label>Email <small>Opsional.</small><input v-model="createEmployeeForm.email" type="email" maxlength="190" autocomplete="email" /></label>
            <label>Kata sandi<input v-model="createEmployeeForm.password" type="password" required minlength="8" autocomplete="new-password" /></label>
            <label>Konfirmasi kata sandi<input v-model="createEmployeeForm.password_confirmation" type="password" required minlength="8" autocomplete="new-password" /></label>
          </div>
          <p v-if="employeeError" class="auth-error" role="alert">{{ employeeError }}</p>
          <div class="staff-editor-actions"><button class="button secondary" type="button" :disabled="creatingEmployeeBusy" @click="creatingEmployee = false">Batal</button><button class="button primary" type="submit" :disabled="creatingEmployeeBusy">{{ creatingEmployeeBusy ? 'Menyimpan…' : 'Buat akun kasir' }}</button></div>
        </form>
        <div v-if="employees.length" class="staff-list">
          <article v-for="employee in employees" :key="employee.id" class="staff-member">
            <div class="staff-member-summary">
              <div class="staff-member-identity"><b>{{ employee.name }}</b><small>@{{ employee.username }}<template v-if="employee.email"> · {{ employee.email }}</template></small></div>
              <div class="staff-member-meta"><span class="category-tag">{{ employee.role }} · {{ employee.is_active ? 'Aktif' : 'Nonaktif' }}</span><button class="small-action" type="button" :aria-expanded="editingEmployeeId === employee.id" @click="editEmployee(employee)">{{ editingEmployeeId === employee.id ? 'Tutup' : 'Edit' }}</button></div>
            </div>
            <form v-if="editingEmployeeId === employee.id" class="staff-editor" @submit.prevent="saveEmployee(employee)">
              <div class="staff-editor-fields">
                <label>Nama lengkap<input v-model="employeeForm.name" required maxlength="120" autocomplete="name" /></label>
                <label>Username<input v-model="employeeForm.username" required minlength="3" maxlength="40" pattern="[A-Za-z0-9_-]+" autocomplete="username" /></label>
                <label>Email<input v-model="employeeForm.email" type="email" maxlength="190" autocomplete="email" /></label>
                <label>Kata sandi baru <small>Opsional; kosongkan jika tidak diubah.</small><input v-model="employeeForm.password" type="password" minlength="8" autocomplete="new-password" /></label>
                <label>Konfirmasi kata sandi<input v-model="employeeForm.password_confirmation" type="password" :required="Boolean(employeeForm.password)" :minlength="employeeForm.password ? 8 : undefined" autocomplete="new-password" /></label>
                <label v-if="session?.role === 'SUPERADMIN'">Role outlet<select v-model="employeeForm.role"><option>OWNER</option><option>KASIR</option></select></label>
              </div>
              <div class="staff-editor-bottom"><label class="staff-active-toggle"><input v-model="employeeForm.is_active" type="checkbox" :disabled="Number(session?.id) === Number(employee.id)" /><span>Akun aktif</span></label><small v-if="Number(session?.id) === Number(employee.id)" class="staff-self-note">Akun Anda sendiri tidak dapat dinonaktifkan.</small></div>
              <p v-if="employeeError" class="auth-error" role="alert">{{ employeeError }}</p>
              <div class="staff-editor-actions"><button class="button secondary" type="button" :disabled="savingEmployeeId !== null" @click="editingEmployeeId = null">Batal</button><button class="button primary" type="submit" :disabled="savingEmployeeId !== null">{{ savingEmployeeId === employee.id ? 'Menyimpan…' : 'Simpan perubahan' }}</button></div>
            </form>
          </article>
        </div>
        <div v-else-if="!creatingEmployee" class="empty-state"><b>Belum ada akun outlet</b><span>Akun owner dan karyawan akan muncul di sini.</span></div>
      </div>
      <div v-else-if="settingsTab === 'settings-printer'" class="printer-settings-wrap">
        <div class="panel-heading"><div><h2>Printer</h2><p>Kelola koneksi printer thermal dan kirim tes cetak dari perangkat ini.</p></div></div>
        <p v-if="loadingSettings" class="empty-state" role="status">Memuat profil cetak…</p>
        <p v-else-if="settingsError" class="auth-error" role="alert">{{ settingsError }}</p>
        <template v-else>
          <BlePrinterPanel />
          <form class="printer-format-settings" @submit.prevent="savePrinterSettings">
            <div><h3>Format nota</h3><p>Pengaturan ini dipakai saat mencetak lewat BLE maupun browser.</p></div>
            <label>Lebar kertas<select v-model="profile.receipt_width"><option value="58mm">58 mm</option><option value="80mm">80 mm</option></select></label>
            <label>Catatan kaki nota<textarea v-model="profile.receipt_footer" maxlength="500" rows="3" placeholder="Terima kasih telah menggunakan layanan kami." /><small>Maksimal 500 karakter.</small></label>
            <div class="printer-format-actions"><button class="button primary" type="submit" :disabled="savingPrinterSettings">{{ savingPrinterSettings ? 'Menyimpan…' : 'Simpan format nota' }}</button></div>
          </form>
        </template>
      </div>
      <div v-else class="settings-placeholder"><span class="settings-placeholder-mark"><span aria-hidden="true">i</span></span><h2>{{ selectedTitle() }}</h2><p>Pengaturan untuk bagian ini belum tersedia.</p></div>
    </section>
  </div>
</template>


