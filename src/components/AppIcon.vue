<script setup>
defineProps({ name: { type: String, required: true } })

const shapes = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5v10h13v-10', 'M9.5 19.5v-6h5v6'],
  receipt: ['M6 3.5h12v17l-2.5-1.7-3.5 1.7-3.5-1.7L6 20.5z', 'M9 8h6', 'M9 12h6', 'M9 16h3'],
  laundry: ['M4 4h16v16H4z', 'M4 8h16', 'M7 6h.01', 'M10 6h.01', 'M12 12.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  customers: ['M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20', 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M16 4.3a3.5 3.5 0 0 1 0 6.8', 'M17 15h.5a3.5 3.5 0 0 1 3.5 3.5V20'],
  expenses: ['M4 18 18 4', 'M10 4h8v8'],
  reports: ['M4 19.5h16', 'M6 16V10', 'M12 16V5', 'M18 16v-8'],
  settings: ['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z', 'm19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3z'],
  store: ['M3.5 9 5 4h14l1.5 5', 'M4.5 9v10.5h15V9', 'M3.5 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0', 'M9 19.5v-5h6v5'],
  search: ['m20 20-4.5-4.5', 'M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  bell: ['M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6'],
  eye: ['M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  'eye-off': ['m3 3 18 18', 'M10.6 10.6a2 2 0 0 0 2.8 2.8', 'M9.9 5.2A10.9 10.9 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-3.1 3.8', 'M6.6 6.6C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7c1.1 0 2.1-.2 3-.6'],
}
</script>

<template>
  <svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path v-for="shape in shapes[name] || []" :key="shape" :d="shape" />
  </svg>
</template>

<style scoped>
.app-icon { display: block; width: 1em; height: 1em; flex: none; }
</style>
