<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useField } from 'vee-validate';

/**
 * FormField — label + slot input + error + help-text wrapper.
 *
 * Two legitimate use modes — pick the one that matches the input's role:
 *
 *   1) VEEVALIDATE FORM (scoped slot, recommended for real forms):
 *      Inside a `useForm()` context, spread the `field` slot prop onto the
 *      input. Value capture, error state, and blur tracking are all wired
 *      through VeeValidate's form state automatically.
 *
 *        <FormField name="email" label="Email" required v-slot="{ field }">
 *          <InputText v-bind="field" type="email" autocomplete="username" />
 *        </FormField>
 *
 *   2) STANDALONE CHROME (plain default slot):
 *      When you just want a label + input + error layout around an input
 *      that's already bound to a local `ref` (no VeeValidate form context,
 *      or the input simply isn't a form field), use the plain default slot.
 *
 *        <FormField name="user-name" label="User name">
 *          <InputText v-model="myLocalRef" name="user-name" />
 *        </FormField>
 *
 *      Error state and validation still flow through VeeValidate's
 *      `useField(name)` — error rendering works the same either way — but
 *      the consumer owns value binding.
 *
 * `field` slot prop shape:
 *   { modelValue, 'onUpdate:modelValue', onBlur, name }
 * Spread onto a real input element (PV InputText, native input, etc.).
 * Don't spread onto a wrapper component that doesn't forward attributes —
 * the `name` attribute would land on the wrong DOM node.
 *
 * Dev-mode runtime check: after mount, if the rendered slot contains no
 * form control with a `name` attribute, fires a single console.warn. This
 * catches the case where a scoped-slot consumer forgot `v-bind="field"`
 * (so the input ends up nameless and validation can't bind), or a
 * standalone-chrome consumer omitted `name` on the input. The warning
 * runs in development only.
 */
interface Props {
    name: string;
    label: string;
    required?: boolean;
    help?: string;
}

const props = withDefaults(defineProps<Props>(), {
    required: false,
    help: undefined,
});

/**
 * `field` modelValue is typed `string | undefined` — matches PV InputText
 * / Password / Textarea (all of which expect `Nullable<string>`) and every
 * current consumer. When non-string inputs land (InputNumber for financial
 * amounts, Calendar for dates), this widens to a discriminated union and
 * the slot signature follows. Generic-on-script-setup + defineSlots
 * combine poorly under vue-tsc, so we use a concrete type rather than `T`.
 */
type FieldModelValue = string | undefined;

defineSlots<{
    /**
     * Default slot. Receives:
     *   - field: spread onto the actual input element (v-bind="field")
     *   - errorMessage: same value rendered below the input by default;
     *     exposed for consumers who want custom error placement
     *   - value: the raw current value (for character counters, etc.)
     */
    default: (slotProps: {
        field: {
            modelValue: FieldModelValue;
            'onUpdate:modelValue': (value: FieldModelValue) => void;
            onBlur: () => void;
            name: string;
        };
        errorMessage: string | undefined;
        value: FieldModelValue;
    }) => unknown;
}>();

const { value, errorMessage, handleChange, handleBlur } = useField<FieldModelValue>(
    () => props.name,
);

// Scoped slot binding. Shaped for `v-bind="field"` on a v-modeled input —
// modelValue + onUpdate:modelValue is what `v-model` expands to. onBlur
// triggers VeeValidate's blur-side validation. Including `name` here means
// consumers don't write it twice (once on FormField, once on the input).
const field = computed(() => ({
    modelValue: value.value,
    'onUpdate:modelValue': (v: FieldModelValue) => handleChange(v),
    onBlur: () => handleBlur(),
    name: props.name,
}));

const root = ref<HTMLElement | null>(null);

onMounted(() => {
    if (!import.meta.env.DEV) return;
    if (!root.value) return;
    // Post-F5: with the canonical scoped-slot pattern, `v-bind="field"`
    // spreads the `name` attribute onto the input automatically — name
    // mismatch can't happen for correct usage. The warning's real job now
    // is to catch a forgotten `v-bind="field"` (input rendered with no
    // name attribute, value binding silently missing) or a standalone-
    // chrome consumer who forgot to pass `name` on the plain input.
    const input = root.value.querySelector(
        '.form-field__slot input, .form-field__slot select, .form-field__slot textarea, .form-field__slot [name]',
    );
    if (!input) {
        console.warn(
            `[FormField "${props.name}"]: rendered slot contains no form control with a name attribute. ` +
                `For VeeValidate-bound inputs, add v-slot="{ field }" on FormField and v-bind="field" on the input. ` +
                `For standalone label/error chrome, pass name="${props.name}" on the input.`,
        );
    }
});
</script>

<template>
    <div ref="root" class="form-field flex flex-col gap-1.5">
        <label :for="name" class="text-sm font-medium text-text-primary">
            {{ label }}
            <span v-if="required" class="text-danger" aria-hidden="true">*</span>
        </label>
        <div class="form-field__slot">
            <slot :field="field" :error-message="errorMessage" :value="value" />
        </div>
        <p v-if="errorMessage" class="text-xs text-danger-text" role="alert">
            {{ errorMessage }}
        </p>
        <p v-else-if="help" class="text-xs text-text-tertiary">{{ help }}</p>
    </div>
</template>
