<script setup>
defineProps({
  storeName: { type: String, default: 'Laundry' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  title: { type: String, required: true },
  period: { type: String, required: true },
  printedAt: { type: String, required: true },
})
</script>

<template>
  <header
    style="box-sizing:border-box;width:182mm;min-height:25mm;display:flex;align-items:center;justify-content:space-between;gap:7mm;padding:0 0 3mm;border-bottom:0.6mm solid #117dea;background:#fff;color:#002170;font-family:Poppins,Arial,sans-serif;line-height:1.35"
  >
    <div style="min-width:0;display:flex;align-items:center;gap:4mm;flex:1">
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt="Logo outlet"
        crossorigin="anonymous"
        style="width:18mm;height:18mm;object-fit:contain;flex:none"
      />
      <div style="min-width:0">
        <div style="font-size:20px;font-weight:700;line-height:1.2;overflow-wrap:anywhere">{{ storeName }}</div>
        <div v-if="address" style="margin-top:1mm;font-size:12px;color:#53627a;white-space:pre-line;overflow-wrap:anywhere">{{ address }}</div>
        <div v-if="phone" style="font-size:12px;color:#53627a;overflow-wrap:anywhere">{{ phone }}</div>
      </div>
    </div>
    <div style="flex:none;max-width:45%;text-align:right">
      <div style="font-size:16px;font-weight:700;line-height:1.2">{{ title }}</div>
      <div style="margin-top:2mm;font-size:12px;color:#53627a">{{ period }}</div>
      <div style="margin-top:1mm;font-size:12px;color:#53627a">Dicetak {{ printedAt }}</div>
    </div>
  </header>
</template>
