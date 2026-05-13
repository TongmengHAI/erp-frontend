import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
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
});
