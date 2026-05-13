<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useField } from 'vee-validate';

/**
 * FormField — label + slot input + error + help-text wrapper.
 *
 * Consumes VeeValidate ambient form state via `useField(name)`. The slot
 * input handles its own value binding (per F2 master plan decision #16:
 * ambient, no slot props). Consumer pattern:
 *
 *   <Form :validation-schema="schema">
 *     <FormField name="email" label="Email" required>
 *       <InputText name="email" />
 *     </FormField>
 *   </Form>
 *
 * GOTCHA: the `name` prop on FormField and on the slot input MUST match —
 * VeeValidate binds by name. This component runs a dev-mode runtime check
 * (F2b plan decision F revised) that fires `console.warn` once on mount if
 * the slot's input is missing a `name` attribute or carries a mismatched
 * one. Catches the mistake at developer time instead of at "validation
 * fails mysteriously" time.
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

const { errorMessage } = useField<unknown>(() => props.name);

const root = ref<HTMLElement | null>(null);

onMounted(() => {
    if (!import.meta.env.DEV) return;
    if (!root.value) return;
    // Look for the first form control descendant inside the slot wrapper.
    const input = root.value.querySelector(
        '.form-field__slot input, .form-field__slot select, .form-field__slot textarea, .form-field__slot [name]',
    );
    if (!input) {
        console.warn(
            `[FormField "${props.name}"]: slot contains no form control with a name attribute. ` +
                `Validation will not bind correctly. Pass a name="${props.name}" attribute on the input.`,
        );
        return;
    }
    const inputName = input.getAttribute('name');
    if (inputName !== props.name) {
        console.warn(
            `[FormField "${props.name}"]: slot input has name="${inputName ?? '(none)'}". ` +
                `FormField and slot input names must match — VeeValidate binds by name.`,
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
            <slot />
        </div>
        <p v-if="errorMessage" class="text-xs text-danger-text" role="alert">
            {{ errorMessage }}
        </p>
        <p v-else-if="help" class="text-xs text-text-tertiary">{{ help }}</p>
    </div>
</template>
