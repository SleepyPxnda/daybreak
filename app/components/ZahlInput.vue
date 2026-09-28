<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'

// Zahlenfeld im Theme-Stil (shadcn NumberField, deutsches Zahlenformat) statt nativer Spinner.
// Leer = null (für optionale Felder).
const wert = defineModel<number | null | undefined>()

withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  id?: string
  placeholder?: string
  ariaLabel?: string
  class?: HTMLAttributes['class']
}>(), {
  min: undefined,
  max: undefined,
  step: 1,
  id: undefined,
  placeholder: undefined,
  ariaLabel: undefined,
  class: undefined,
})
</script>

<template>
  <NumberField
    :id="id"
    :model-value="wert ?? null"
    :min="min"
    :max="max"
    :step="step"
    :step-snapping="false"
    locale="de-DE"
    :format-options="{ maximumFractionDigits: 2, useGrouping: false }"
    :class="$props.class"
    @update:model-value="wert = Number.isNaN($event) ? null : $event"
  >
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput :placeholder="placeholder" :aria-label="ariaLabel" class="tabular-nums" />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
