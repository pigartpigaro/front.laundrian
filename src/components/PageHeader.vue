<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <header class="page-header">
    <div class="page-header-copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions || $slots.meta" class="page-header-aside">
      <div v-if="$slots.meta" class="page-header-meta"><slot name="meta" /></div>
      <div v-if="$slots.actions" class="page-header-actions"><slot name="actions" /></div>
    </div>
  </header>
</template>

<style scoped>
.page-header,
.page-header-aside,
.page-header-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.page-header-copy { min-width: 0; }

.page-header h1 {
  margin: 0;
  color: #302f26;
  font-size: 23px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.page-header p {
  margin: 6px 0 0;
  color: #706a59;
  font-size: 12px;
  line-height: 1.45;
}

.page-header-aside { flex: none; gap: 14px; }
.page-header-meta { color: #706a59; font-size: 11px; }
.page-header-actions { gap: 8px; }

@media (max-width: 700px) {
  .page-header { align-items: flex-start; gap: 9px; margin-bottom: 18px; }
  .page-header h1 { font-size: 20px; }
  .page-header p { max-width: 38ch; font-size: 10px; }
  .page-header-aside { align-items: flex-end; flex-direction: column; gap: 5px; }
  .page-header-meta { font-size: 9px; text-align: right; }
  .page-header-actions { flex-wrap: wrap; justify-content: flex-end; }
  .page-header-actions :deep(.button) { min-height: 34px; padding: 0 9px; font-size: 9px; }
}
</style>
