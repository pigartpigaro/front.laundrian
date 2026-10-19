<script setup>
import { computed, nextTick, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({ modelValue: { type: [Number, String], default: 0 } })
const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()
const editing = ref(false)
const rawValue = ref('')

function parseAmount(value) {
  let normalized = String(value ?? '').replace(/\s|Rp/gi, '').replace(/[^\d.,-]/g, '')
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) normalized = normalized.replace(/\./g, '')
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function formatEditingAmount(value) {
  let text = String(value ?? '').replace(/[^\d,.]/g, '')
  if (!text) return ''
  const commaIndex = text.indexOf(',')
  const hasDecimal = commaIndex >= 0
  const integerDigits = (hasDecimal ? text.slice(0, commaIndex) : text).replace(/[.,]/g, '').replace(/^0+(?=\d)/, '')
  const fractionDigits = hasDecimal ? text.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2) : ''
  const integer = (integerDigits || (hasDecimal ? '0' : '')).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${integer}${hasDecimal ? `,${fractionDigits}` : ''}`
}

function formatAmount(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

const displayValue = computed(() => {
  if (editing.value) return rawValue.value
  const amount = Number(props.modelValue) || 0
  return amount > 0 ? formatAmount(amount) : ''
})

function startEditing() {
  editing.value = true
  const amount = Number(props.modelValue) || 0
  const localized = amount > 0 ? new Intl.NumberFormat('id-ID', { useGrouping: false, maximumFractionDigits: 2 }).format(amount) : ''
  rawValue.value = formatEditingAmount(localized)
}

function updateValue(event) {
  const input = event.target
  const value = input.value
  const cursor = input.selectionStart ?? value.length
  const decimalIndex = value.indexOf(',')
  const beforeCursor = value.slice(0, cursor)
  const inFraction = decimalIndex >= 0 && cursor > decimalIndex
  const integerPartBeforeCursor = decimalIndex >= 0 ? beforeCursor.slice(0, Math.min(beforeCursor.length, decimalIndex)) : beforeCursor
  const integerDigitsBefore = (integerPartBeforeCursor.match(/\d/g) || []).length
  const fractionDigitsBefore = inFraction ? (beforeCursor.slice(decimalIndex + 1).match(/\d/g) || []).length : 0
  rawValue.value = formatEditingAmount(value)
  emit('update:modelValue', parseAmount(rawValue.value))
  nextTick(() => {
    let nextCursor = rawValue.value.length
    if (inFraction) {
      const nextDecimalIndex = rawValue.value.indexOf(',')
      if (nextDecimalIndex >= 0) nextCursor = Math.min(rawValue.value.length, nextDecimalIndex + 1 + fractionDigitsBefore)
    } else if (integerDigitsBefore === 0) {
      nextCursor = 0
    } else {
      let digitCount = 0
      for (let index = 0; index < rawValue.value.length; index++) {
        if (/\d/.test(rawValue.value[index])) digitCount++
        if (digitCount === integerDigitsBefore) { nextCursor = index + 1; break }
      }
    }
    input.setSelectionRange(nextCursor, nextCursor)
  })
}

function finishEditing() {
  emit('update:modelValue', parseAmount(rawValue.value))
  editing.value = false
}
</script>

<template>
  <input v-bind="attrs" type="text" inputmode="decimal" :value="displayValue" @focus="startEditing" @input="updateValue" @blur="finishEditing" />
</template>
