<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'

// Number field in theme style (shadcn NumberField, German number format) instead of native spinners.
// Empty = null (for optional fields).
const value = defineModel<number | null | undefined>()

withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  id?: string
  placeholder?: string
  ariaLabel?: string
  ariaInvalid?: boolean
  class?: HTMLAttributes['class']
}>(), {
  min: undefined,
  max: undefined,
  step: 1,
  id: undefined,
  placeholder: undefined,
  ariaLabel: undefined,
  ariaInvalid: undefined,
  class: undefined,
})
</script>

<template>
  <NumberField
    :id="id"
    :model-value="value ?? null"
    :min="min"
    :max="max"
    :step="step"
    :step-snapping="false"
    locale="de-DE"
    :format-options="{ maximumFractionDigits: 2, useGrouping: false }"
    :class="$props.class"
    @update:model-value="value = Number.isNaN($event) ? null : $event"
  >
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput :placeholder="placeholder" :aria-label="ariaLabel" :aria-invalid="ariaInvalid || undefined" class="h-9 rounded-md font-mono" />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
