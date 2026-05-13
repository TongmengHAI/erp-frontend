import { describe, expect, it } from 'vitest';

import FormActions from '@/shared/components/form/FormActions.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

function buttonByText(w: Awaited<ReturnType<typeof mountWithGlobals>>, text: string) {
    return w.findAll('button').find((b) => b.text().includes(text));
}

describe('FormActions', () => {
    it('renders default Save / Cancel labels from i18n', async () => {
        const w = await mountWithGlobals(FormActions);
        expect(buttonByText(w, 'Save')).toBeTruthy();
        expect(buttonByText(w, 'Cancel')).toBeTruthy();
    });

    it('emits submit when the save button is clicked', async () => {
        const w = await mountWithGlobals(FormActions);
        await buttonByText(w, 'Save')!.trigger('click');
        expect(w.emitted('submit')).toHaveLength(1);
    });

    it('emits cancel when the cancel button is clicked', async () => {
        const w = await mountWithGlobals(FormActions);
        await buttonByText(w, 'Cancel')!.trigger('click');
        expect(w.emitted('cancel')).toHaveLength(1);
    });

    it('loading=true disables both buttons', async () => {
        const w = await mountWithGlobals(FormActions, {
            props: { loading: true },
        });
        const save = buttonByText(w, 'Save')!;
        const cancel = buttonByText(w, 'Cancel')!;
        expect((save.element as HTMLButtonElement).disabled).toBe(true);
        expect((cancel.element as HTMLButtonElement).disabled).toBe(true);
    });
});
