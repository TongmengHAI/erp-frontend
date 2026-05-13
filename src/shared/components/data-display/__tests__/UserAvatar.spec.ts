import { describe, expect, it } from 'vitest';

import UserAvatar from '@/shared/components/data-display/UserAvatar.vue';
import { mountWithGlobals } from '@/shared/components/__tests__/test-helpers';

describe('UserAvatar', () => {
    it('photo mode renders the image', async () => {
        const w = await mountWithGlobals(UserAvatar, {
            props: {
                name: 'Jane Bookkeeper',
                photoUrl: 'https://example.test/jane.jpg',
            },
        });
        const img = w.find('img');
        expect(img.exists()).toBe(true);
        expect(img.attributes('src')).toBe('https://example.test/jane.jpg');
    });

    it('initials mode renders 2 letters from first + last name', async () => {
        const w = await mountWithGlobals(UserAvatar, {
            props: { name: 'Jane Bookkeeper', email: 'jane@acme.example' },
        });
        expect(w.text()).toBe('JB');
    });

    it('color hash is deterministic — same email → same background', async () => {
        const w1 = await mountWithGlobals(UserAvatar, {
            props: { name: 'Jane', email: 'jane@acme.example' },
        });
        const w2 = await mountWithGlobals(UserAvatar, {
            props: { name: 'Different Name', email: 'jane@acme.example' },
        });
        // Both should hash by email, get the same background color.
        const bg1 = (w1.find('[role="img"]').element as HTMLElement).style.backgroundColor;
        const bg2 = (w2.find('[role="img"]').element as HTMLElement).style.backgroundColor;
        expect(bg1).toBe(bg2);
        expect(bg1).not.toBe('');
    });

    it('size prop drives the wrapper dimensions', async () => {
        const sm = await mountWithGlobals(UserAvatar, {
            props: { name: 'X', size: 'sm' },
        });
        const lg = await mountWithGlobals(UserAvatar, {
            props: { name: 'X', size: 'lg' },
        });
        const smStyle = (sm.find('[role="img"]').element as HTMLElement).style;
        const lgStyle = (lg.find('[role="img"]').element as HTMLElement).style;
        expect(smStyle.width).toBe('24px');
        expect(lgStyle.width).toBe('40px');
    });
});
