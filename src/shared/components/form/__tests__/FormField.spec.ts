/* eslint-disable vue/one-component-per-file */
// Spec file. Multiple inline test-host components (makeHost factory +
// value-capture Host) are intentional — each fixture isolates a different
// FormField scenario. The "one component per file" rule is appropriate for
// production code organization but not for spec fixtures.

import { flushPromises } from '@vue/test-utils';
import InputText from 'primevue/inputtext';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

import FormField from '@/shared/components/form/FormField.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

// Tiny test host that establishes a VeeValidate form context with a Zod
// schema. `setError(field, msg)` exposes the form's setFieldError so tests
// can force an error to render in FormField without needing real user input.
function makeHost(fieldName: string, hostExtras?: { required?: boolean; help?: string }) {
    return defineComponent({
        name: 'FormFieldHost',
        setup(_, { expose }) {
            const schema = toTypedSchema(z.object({ [fieldName]: z.string().min(1, 'Required') }));
            const { setFieldError } = useForm({ validationSchema: schema });
            expose({ setError: setFieldError });
            return () =>
                h(
                    FormField,
                    { name: fieldName, label: 'Test field', ...hostExtras },
                    () =>
                        h('input', {
                            name: fieldName,
                            type: 'text',
                        }),
                );
        },
    });
}

describe('FormField', () => {
    it('renders the label', async () => {
        const w = await mountWithGlobals(makeHost('email'));
        expect(w.find('label').text()).toContain('Test field');
    });

    it('shows the required asterisk when required=true', async () => {
        const w = await mountWithGlobals(makeHost('email', { required: true }));
        expect(w.find('label').text()).toContain('*');
    });

    it('omits the required asterisk by default', async () => {
        const w = await mountWithGlobals(makeHost('email'));
        expect(w.find('label').text()).not.toContain('*');
    });

    it('renders help text when no error is present', async () => {
        const w = await mountWithGlobals(makeHost('email', { help: 'Use your work address' }));
        expect(w.text()).toContain('Use your work address');
    });

    it('renders the error message instead of help when VeeValidate sets one', async () => {
        const w = await mountWithGlobals(makeHost('email', { help: 'Use your work address' }));
        // Force an error via the exposed setError.
        (w.vm as unknown as { setError: (f: string, m: string) => void }).setError(
            'email',
            'Email is required',
        );
        await w.vm.$nextTick();
        expect(w.find('[role="alert"]').text()).toBe('Email is required');
        expect(w.text()).not.toContain('Use your work address');
    });

    it('scoped slot `field` captures input value into VeeValidate form state on submit', async () => {
        // ─────────────────────────────────────────────────────────────────────
        // REGRESSION GUARD — value-binding bug that shipped silently in F2b.
        //
        // F2b's playground form demo only incremented a counter on submit, so
        // the gap (FormField rendered errors but never bound values) didn't
        // surface until F3's LoginPage tried to read submitted values. F3
        // worked around it with a duplicated useField() call in the page
        // setup. F5 fixes FormField properly via the `field` scoped slot.
        //
        // This test exercises the canonical pattern end-to-end: typing into
        // an input rendered with v-bind="field" must update the form's
        // captured values such that handleSubmit() receives the typed text.
        // ─────────────────────────────────────────────────────────────────────
        const submitted = ref<Record<string, unknown> | null>(null);

        const Host = defineComponent({
            name: 'FormFieldValueHost',
            setup(_, { expose }) {
                const schema = toTypedSchema(
                    z.object({ employeeName: z.string().min(1, 'Required') }),
                );
                const { handleSubmit } = useForm({
                    validationSchema: schema,
                    initialValues: { employeeName: '' },
                });
                const submit = handleSubmit((values) => {
                    submitted.value = values;
                });
                expose({ submit });

                return () =>
                    h(
                        FormField,
                        { name: 'employeeName', label: 'Employee name' },
                        {
                            // Scoped slot: spread `field` onto a Vue
                            // component that consumes v-model
                            // (modelValue + update:modelValue). Matches
                            // the production LoginPage pattern with PV
                            // InputText. Native <input> elements use a
                            // different binding shape (value + input
                            // event) and are not the canonical consumer.
                            default: (slotProps: {
                                field: Record<string, unknown>;
                            }) =>
                                h(InputText, {
                                    ...slotProps.field,
                                }),
                        },
                    );
            },
        });

        const w = await mountWithGlobals(Host);
        const input = w.find('input[name="employeeName"]');
        expect(input.exists()).toBe(true);

        await input.setValue('Jane Bookkeeper');
        await flushPromises();

        await (w.vm as unknown as { submit: () => Promise<void> }).submit();
        await flushPromises();

        expect(submitted.value).toEqual({ employeeName: 'Jane Bookkeeper' });
    });
});
