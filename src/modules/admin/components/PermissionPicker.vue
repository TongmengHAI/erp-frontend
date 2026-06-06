<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

import { usePermissionDescriptionsQuery } from '@/modules/admin/composables/useAdminRoles';

// ─────────────────────────────────────────────────────────────────────────────
// PermissionPicker — INTERACTIVE permission editor with tristate domains.
//
// SEPARATE component from PermissionList (Session 3) per the locked
// decision — different UX intent (interactive vs informational). They
// share the data-shape contract via useGroupedPermissions; the visual
// + interaction layers stay distinct.
//
// v-model contract:
//   modelValue = readonly number[] (selected permission IDs, in any order)
//   emit('update:modelValue', number[])
//
// Tristate logic (the six transitions pinned by tests):
//   1. Parent checked        → all children become checked  (cascade down)
//   2. Parent unchecked      → all children become unchecked (cascade down)
//   3. Child checked when ALL siblings checked     → parent checked
//   4. Child checked when SOME siblings unchecked  → parent INDETERMINATE
//   5. Child unchecked when ALL siblings unchecked → parent unchecked
//   6. Child unchecked when SOME siblings checked  → parent INDETERMINATE
//
// Parent state is COMPUTED from children. There is no separate parent
// boolean to keep in sync — the cascade-up cases are emergent properties
// of the read predicate, not stored state. The cascade-down cases mutate
// the children set; the next render recomputes the parent.
//
// We never store an "indeterminate" boolean in modelValue. Indeterminate
// is a DOM-only property set via a ref + watchEffect on the underlying
// <input> element. The wire shape stays clean (just the selected ID array).
//
// Plain HTML <input type="checkbox"> — not PrimeVue Checkbox — for two
// reasons: (a) the indeterminate ref binding is straightforward against
// the DOM element; (b) tests can dispatch native change events without
// fighting PV's internal state.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    modelValue: readonly number[];
    /**
     * When true, render every input + parent checkbox as disabled.
     * Doesn't change the visual layout — same as enabled mode but
     * non-interactive. Used by RoleFormPage during submit-in-flight
     * to prevent accidental changes mid-save.
     */
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });

const emit = defineEmits<{
    'update:modelValue': [value: number[]];
}>();

const { t } = useI18n();

// ─── Catalog source ─────────────────────────────────────────────────────────
// PermissionPicker fetches its own descriptions query. The query is
// staleTime: Infinity (per useAdminRoles' usePermissionDescriptionsQuery),
// so multiple picker instances in the same session reuse the same
// in-memory cache. No prop drilling required.
const { data: descriptionsData, isLoading: isCatalogLoading } =
    usePermissionDescriptionsQuery();

interface CatalogEntry {
    id: number;
    name: string;
    label: string;
    domain: string;
}

const catalog = computed<CatalogEntry[]>(() => {
    const d = descriptionsData.value?.data;
    if (!d) return [];
    const out: CatalogEntry[] = [];
    for (const [name, id] of Object.entries(d.permission_ids)) {
        out.push({
            id,
            name,
            label: d.permissions[name] ?? name,
            domain: name.split('.')[0] ?? name,
        });
    }
    // Stable ordering: domain first, then name. Same shape as the
    // backend's role permissions array order.
    out.sort((a, b) => {
        if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
        return a.name.localeCompare(b.name);
    });
    return out;
});

interface PickerGroup {
    domain: string;
    domainLabel: string;
    children: CatalogEntry[];
}

const groups = computed<PickerGroup[]>(() => {
    const d = descriptionsData.value?.data;
    const domains = d?.domains ?? {};
    const byDomain = new Map<string, CatalogEntry[]>();
    for (const entry of catalog.value) {
        const bucket = byDomain.get(entry.domain);
        if (bucket) bucket.push(entry);
        else byDomain.set(entry.domain, [entry]);
    }
    return Array.from(byDomain.entries()).map(([domain, children]) => ({
        domain,
        domainLabel: domains[domain] ?? domain,
        children,
    }));
});

// ─── Selection state ────────────────────────────────────────────────────────
// Internal Set<number> mirror of modelValue. Sync from prop on every change
// (controlled-component shape). Mutations build a new Set + emit the new
// array; the parent decides whether to accept the change.
const selectedSet = computed<Set<number>>(() => new Set(props.modelValue));

function isSelected(id: number): boolean {
    return selectedSet.value.has(id);
}

function emitSelection(next: Set<number>): void {
    emit('update:modelValue', Array.from(next));
}

// ─── Tristate predicates ───────────────────────────────────────────────────
// Parent state is DERIVED from children. Three buckets:
//   - all children selected         → 'all'      (checked, not indeterminate)
//   - no children selected          → 'none'     (unchecked, not indeterminate)
//   - some selected, some not       → 'some'    (indeterminate)
type ParentState = 'all' | 'none' | 'some';

function parentState(group: PickerGroup): ParentState {
    const ids = group.children.map((c) => c.id);
    let selected = 0;
    for (const id of ids) {
        if (selectedSet.value.has(id)) selected++;
    }
    if (selected === 0) return 'none';
    if (selected === ids.length) return 'all';
    return 'some';
}

// ─── Mutation paths ────────────────────────────────────────────────────────
// Two entry points: child toggle + parent toggle. Both produce a new Set
// + emit. No intermediate state.

function onChildChange(id: number, checked: boolean): void {
    if (props.disabled) return;
    const next = new Set(selectedSet.value);
    if (checked) next.add(id);
    else next.delete(id);
    emitSelection(next);
}

function onParentChange(group: PickerGroup, checked: boolean): void {
    if (props.disabled) return;
    const next = new Set(selectedSet.value);
    for (const c of group.children) {
        if (checked) next.add(c.id);
        else next.delete(c.id);
    }
    emitSelection(next);
}

// ─── DOM indeterminate sync ────────────────────────────────────────────────
// HTML's `indeterminate` is a DOM-only property, not an attribute, not
// reflected in v-bind. The watchEffect below imperatively assigns it on
// each render. Refs are templated as a Map<domain, HTMLInputElement>.
const parentInputRefs = ref(new Map<string, HTMLInputElement | null>());

function setParentRef(domain: string, el: Element | null): void {
    if (el instanceof HTMLInputElement) {
        parentInputRefs.value.set(domain, el);
    } else {
        parentInputRefs.value.set(domain, null);
    }
}

watchEffect(() => {
    for (const group of groups.value) {
        const el = parentInputRefs.value.get(group.domain);
        if (!el) continue;
        const state = parentState(group);
        el.indeterminate = state === 'some';
    }
});
</script>

<template>
    <div data-testid="permission-picker">
        <p
            v-if="isCatalogLoading && catalog.length === 0"
            class="text-sm text-text-tertiary"
            data-testid="permission-picker-loading"
        >
            {{ t('admin.roles.permissions.loading') }}
        </p>

        <div
            v-else
            class="space-y-4"
        >
            <section
                v-for="group in groups"
                :key="group.domain"
                :data-testid="`permission-picker-group-${group.domain}`"
                class="border border-border-subtle rounded-md p-3"
            >
                <label class="flex items-center gap-2 cursor-pointer">
                    <input
                        :ref="(el) => setParentRef(group.domain, el as Element | null)"
                        type="checkbox"
                        :checked="parentState(group) === 'all'"
                        :disabled="disabled"
                        :data-testid="`permission-picker-parent-${group.domain}`"
                        :data-parent-state="parentState(group)"
                        class="h-4 w-4 cursor-pointer"
                        @change="(e) => onParentChange(group, (e.target as HTMLInputElement).checked)"
                    >
                    <span class="text-sm font-semibold text-text-primary">
                        {{ group.domainLabel }}
                    </span>
                </label>

                <ul class="mt-2 ml-6 space-y-1">
                    <li
                        v-for="child in group.children"
                        :key="child.id"
                        class="flex items-baseline gap-2"
                    >
                        <input
                            :id="`permission-picker-child-${child.id}`"
                            type="checkbox"
                            :checked="isSelected(child.id)"
                            :disabled="disabled"
                            :data-testid="`permission-picker-child-${child.id}`"
                            class="h-4 w-4 cursor-pointer mt-0.5"
                            @change="(e) => onChildChange(child.id, (e.target as HTMLInputElement).checked)"
                        >
                        <label
                            :for="`permission-picker-child-${child.id}`"
                            class="text-sm text-text-secondary cursor-pointer"
                        >
                            {{ child.label }}
                        </label>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>
