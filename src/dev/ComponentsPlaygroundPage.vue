<script setup lang="ts">
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { toTypedSchema } from '@vee-validate/zod';

import DateDisplay from '@/shared/components/data-display/DateDisplay.vue';
import MoneyDisplay from '@/shared/components/data-display/MoneyDisplay.vue';
import StatusBadge from '@/shared/components/data-display/StatusBadge.vue';
import UserAvatar from '@/shared/components/data-display/UserAvatar.vue';
import FormActions from '@/shared/components/form/FormActions.vue';
import FormField from '@/shared/components/form/FormField.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import FilterBar from '@/shared/components/layout/FilterBar.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import PageLayout from '@/shared/components/layout/PageLayout.vue';
import Tab from '@/shared/components/layout/Tab.vue';
import TabGroup from '@/shared/components/layout/TabGroup.vue';
import AppSidebar from '@/shared/components/navigation/AppSidebar.vue';
import AppTopBar from '@/shared/components/navigation/AppTopBar.vue';
import Breadcrumbs from '@/shared/components/navigation/Breadcrumbs.vue';
import EmptyState from '@/shared/components/state/EmptyState.vue';
import ErrorState from '@/shared/components/state/ErrorState.vue';
import LoadingState from '@/shared/components/state/LoadingState.vue';
import NotFoundPage from '@/shared/components/state/NotFoundPage.vue';
import PermissionDeniedPage from '@/shared/components/state/PermissionDeniedPage.vue';
import { useAppConfirm } from '@/shared/composables/useAppConfirm';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { useTenantStore } from '@/shared/stores/useTenantStore';
import { useUiStore } from '@/shared/stores/useUiStore';

// ─────────────────────────────────────────────────────────────────────────────
// Components playground — dev-only. Renders every F2a shared component in
// every documented state for visual review.
//
// NOT a production route. Registered behind `import.meta.env.DEV` in
// src/router/index.ts and tree-shaken from production builds.
// ─────────────────────────────────────────────────────────────────────────────

const sections = [
    { id: 'page-layout', label: '1. PageLayout' },
    { id: 'card-section', label: '2. CardSection' },
    { id: 'filter-bar', label: '3. FilterBar' },
    { id: 'loading-state', label: '4. LoadingState' },
    { id: 'empty-state', label: '5. EmptyState' },
    { id: 'error-state', label: '6. ErrorState' },
    { id: 'page-header', label: '7. PageHeader' },
    { id: 'tab-group', label: '8. TabGroup' },
    { id: 'permission-denied', label: '9. PermissionDeniedPage' },
    { id: 'not-found', label: '10. NotFoundPage' },
    { id: 'status-badge', label: '11. StatusBadge' },
    { id: 'money-display', label: '12. MoneyDisplay' },
    { id: 'date-display', label: '13. DateDisplay' },
    { id: 'user-avatar', label: '14. UserAvatar' },
    { id: 'form-field', label: '15. FormField + FormActions' },
    { id: 'confirm-dialog', label: '16. ConfirmDialog' },
    { id: 'app-sidebar', label: '17. AppSidebar' },
    { id: 'app-topbar', label: '18. AppTopBar' },
    { id: 'breadcrumbs', label: '19. Breadcrumbs' },
];

// FilterBar demo state
const filterSearch = ref('');
const filterStatus = ref<string | null>(null);
const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Posted', value: 'posted' },
    { label: 'Reversed', value: 'reversed' },
];

// ErrorState retry log
const retryLog = ref(0);

// TabGroup demo state
const activeTab = ref<string>('overview');
const mountedPanels = ref<Set<string>>(new Set());
function recordMount(name: string) {
    mountedPanels.value.add(name);
    return true;
}

// PageHeader breadcrumbs demo
const sampleBreadcrumbs = [
    { label: 'Home', to: { name: 'dev-components' } },
    { label: 'Accounting', to: { name: 'dev-components' } },
    { label: 'Journal Entries' },
];

// ─── F2b demo state ─────────────────────────────────────────────────────────

// 12. MoneyDisplay demo amounts
const moneyAmounts = [
    { amount: '1234.5600', currency: 'USD', label: 'standard' },
    { amount: '0.0000', currency: 'USD', label: 'zero' },
    { amount: '99999999.9999', currency: 'USD', label: 'large USD' },
    { amount: '50000.0000', currency: 'KHR', label: 'KHR' },
    { amount: '1234567.89', currency: 'EUR', label: 'EUR (en-US locale)' },
    { amount: '123456789012.4567', currency: 'USD', label: '15+ significant figures' },
];

// 13. DateDisplay demo dates
const sampleDate = '2026-05-12T08:00:00';

// 14. UserAvatar demo people
const samplePeople = [
    { name: 'Jane Bookkeeper', email: 'jane@acme.example' },
    { name: 'Bob Smith', email: 'bob@acme.example' },
    { name: 'Amy Tran', email: 'amy@acme.example' },
    { name: 'Kai Nguyen', email: 'kai@acme.example' },
    { name: 'Madonna', email: 'madonna@acme.example' },
    { name: 'Priya Sharma', email: 'priya@acme.example' },
];

// 15. FormField + FormActions demo
const formSchema = toTypedSchema(
    z.object({
        employeeName: z.string().min(1, 'Required'),
        salary: z.string().regex(/^\d+\.\d{2,4}$/, 'Must be BCMath scale 2–4'),
        hireDate: z.string().min(1, 'Required'),
    }),
);

const { handleSubmit, setFieldValue, setFieldError } = useForm({
    validationSchema: formSchema,
    initialValues: {
        employeeName: '',
        salary: '',
        hireDate: '',
    },
});

const formSubmitting = ref(false);
const formSubmitCount = ref(0);

const onSubmit = handleSubmit(async () => {
    formSubmitting.value = true;
    await new Promise((r) => setTimeout(r, 800));
    formSubmitting.value = false;
    formSubmitCount.value += 1;
});

function onCancel() {
    setFieldValue('employeeName', '');
    setFieldValue('salary', '');
    setFieldValue('hireDate', '');
}

function triggerValidationError() {
    setFieldError('salary', 'Server says: salary exceeds tenant cap');
}

// 16. Confirm dialog demo
const { confirmDelete, confirmAction } = useAppConfirm();
const confirmAcceptCount = ref(0);
const confirmRejectCount = ref(0);

function demoDelete() {
    confirmDelete({
        message: 'Delete this employee?',
        detail: 'This action soft-deletes the employee. They can be restored from the audit log.',
        onAccept: () => {
            confirmAcceptCount.value += 1;
        },
        onReject: () => {
            confirmRejectCount.value += 1;
        },
    });
}

function demoReverse() {
    confirmAction({
        message: 'Reverse this journal entry?',
        detail: 'A reversing entry will be posted to the current period.',
        severity: 'warning',
        acceptLabel: 'Reverse Entry',
        onAccept: () => {
            confirmAcceptCount.value += 1;
        },
        onReject: () => {
            confirmRejectCount.value += 1;
        },
    });
}

// ─── F2c demo state ─────────────────────────────────────────────────────────
//
// Master decision 17: drive the real stores via $patch (no separate mock
// layer). $reset() on unmount keeps demo state from bleeding into other
// pages once AppShell mounts these stores globally in F4.

const auth = useAuthStore();
const tenant = useTenantStore();
const ui = useUiStore();

const DEMO_USER = {
    id: 'u_demo',
    name: 'Jane Bookkeeper',
    email: 'jane@acme.example',
    permissions: [
        'hrm.access',
        'accounting.access',
        'inventory.access',
        'procurement.access',
        'sales.access',
    ],
};

const DEMO_TENANT = { id: 't_demo', name: 'Acme Trading Co.' };

function restoreDemo() {
    auth.$patch({ user: { ...DEMO_USER } });
    tenant.$patch({ current: { ...DEMO_TENANT } });
}

onMounted(() => {
    restoreDemo();
});

onBeforeUnmount(() => {
    auth.$reset();
    tenant.$reset();
    ui.$reset();
});

// 17. AppSidebar permission toggles
const MODULE_PERMISSIONS = [
    { key: 'hrm.access', label: 'HRM' },
    { key: 'accounting.access', label: 'Accounting' },
    { key: 'inventory.access', label: 'Inventory' },
    { key: 'procurement.access', label: 'Procurement' },
    { key: 'sales.access', label: 'Sales' },
] as const;

const permissionToggles = computed({
    get: () => auth.user?.permissions ?? [],
    set: (perms: string[]) => {
        if (!auth.user) return;
        auth.$patch({ user: { ...auth.user, permissions: perms } });
    },
});

// 18. AppTopBar live-editable mock state
const topbarUserName = computed({
    get: () => auth.user?.name ?? '',
    set: (v: string) => {
        if (!auth.user) return;
        auth.$patch({ user: { ...auth.user, name: v } });
    },
});
const topbarUserEmail = computed({
    get: () => auth.user?.email ?? '',
    set: (v: string) => {
        if (!auth.user) return;
        auth.$patch({ user: { ...auth.user, email: v } });
    },
});
const topbarTenantName = computed({
    get: () => tenant.current?.name ?? '',
    set: (v: string) => {
        if (!tenant.current) {
            tenant.$patch({ current: { id: 't_demo', name: v } });
            return;
        }
        tenant.$patch({ current: { ...tenant.current, name: v } });
    },
});

// 19. Breadcrumbs editable items
const crumb1 = ref('Home');
const crumb2 = ref('Accounting');
const crumb3 = ref('Journal Entries');
const editableCrumbs = computed(() => [
    { label: crumb1.value, to: { name: 'dev-components' } },
    { label: crumb2.value, to: { name: 'dev-components' } },
    { label: crumb3.value },
]);
</script>

<template>
    <div class="min-h-screen bg-surface-sunken">
        <!-- Cross-playground nav banner -->
        <div
            class="border-b border-border-default bg-surface px-6 py-2 text-sm text-text-secondary"
        >
            <span class="mr-3 font-medium text-text-primary">Dev playgrounds:</span>
            <RouterLink to="/__dev/tokens" class="mr-3 text-brand hover:underline">
                Tokens
            </RouterLink>
            <span class="font-medium text-text-primary">Components</span>
        </div>

        <!-- Sticky section nav -->
        <nav
            class="sticky top-0 z-20 flex flex-wrap gap-3 border-b border-border-default bg-surface px-6 py-3 text-sm"
        >
            <a
                v-for="s in sections"
                :key="s.id"
                :href="`#${s.id}`"
                class="text-text-secondary hover:text-brand"
            >
                {{ s.label }}
            </a>
        </nav>

        <div class="mx-auto max-w-[1440px] px-8 py-10">
            <h1 class="mb-2 text-3xl font-semibold text-text-primary">
                Shared Components — Playground
            </h1>
            <p class="mb-10 text-base text-text-secondary">
                F2a slice. Every shared component in every documented state.
            </p>

            <div class="flex flex-col gap-16">
                <!-- ─── 1. PageLayout ─────────────────────────────────────── -->
                <section id="page-layout">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">1. PageLayout</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Top-level page container. Renders as <code>&lt;main&gt;</code>.
                        Two widths: <code>standard</code> (1440px max) and
                        <code>narrow</code> (960px max for forms). Below: each rendered
                        in a bounded preview frame.
                    </p>
                    <div class="space-y-4">
                        <div>
                            <h3 class="mb-2 text-sm font-medium text-text-secondary">
                                standard (default)
                            </h3>
                            <div class="overflow-hidden rounded-md border border-border-default">
                                <PageLayout class="!min-h-0 !py-4">
                                    <div class="rounded-md border border-border-default bg-surface p-4 text-sm">
                                        Page content area, max-w-[1440px].
                                    </div>
                                </PageLayout>
                            </div>
                        </div>
                        <div>
                            <h3 class="mb-2 text-sm font-medium text-text-secondary">narrow</h3>
                            <div class="overflow-hidden rounded-md border border-border-default">
                                <PageLayout width="narrow" class="!min-h-0 !py-4">
                                    <div class="rounded-md border border-border-default bg-surface p-4 text-sm">
                                        Form-heavy content area, max-w-[960px].
                                    </div>
                                </PageLayout>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ─── 2. CardSection ────────────────────────────────────── -->
                <section id="card-section">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">2. CardSection</h2>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <CardSection title="With title prop">
                            <p class="text-sm text-text-secondary">
                                Default padded body. 1px border, rounded-md.
                            </p>
                        </CardSection>
                        <CardSection>
                            <template #header>
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-star text-brand"></i>
                                    <span class="text-lg font-semibold">Custom header slot</span>
                                </div>
                            </template>
                            <p class="text-sm text-text-secondary">
                                The <code>header</code> slot overrides the title prop.
                            </p>
                        </CardSection>
                        <CardSection title="Padded (default)">
                            <p class="text-sm text-text-secondary">
                                Body has 24px padding.
                            </p>
                        </CardSection>
                        <CardSection title="Unpadded" :padded="false">
                            <div class="border-b border-border-default px-6 py-3 text-sm">
                                Row 1 — body handles its own padding
                            </div>
                            <div class="px-6 py-3 text-sm">Row 2</div>
                        </CardSection>
                    </div>
                </section>

                <!-- ─── 3. FilterBar ──────────────────────────────────────── -->
                <section id="filter-bar">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">3. FilterBar</h2>
                    <h3 class="mb-2 text-sm font-medium text-text-secondary">Default</h3>
                    <FilterBar class="mb-6 rounded-md border border-border-default">
                        <InputText v-model="filterSearch" placeholder="Search..." />
                        <Select
                            v-model="filterStatus"
                            :options="statusOptions"
                            option-label="label"
                            option-value="value"
                            placeholder="Status"
                            show-clear
                        />
                        <Button label="Reset" severity="secondary" text icon="pi pi-times" />
                    </FilterBar>

                    <h3 class="mb-2 text-sm font-medium text-text-secondary">
                        Sticky (scroll the bounded frame below to see it stick)
                    </h3>
                    <div
                        class="h-48 overflow-y-auto rounded-md border border-border-default bg-surface"
                    >
                        <FilterBar sticky>
                            <InputText placeholder="Search..." />
                            <Button label="Apply" />
                        </FilterBar>
                        <div class="space-y-2 p-4 text-sm text-text-secondary">
                            <p v-for="i in 12" :key="i">
                                Scroll content row {{ i }} — filter bar stays at the top.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- ─── 4. LoadingState ────────────────────────────────────── -->
                <section id="loading-state">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">4. LoadingState</h2>
                    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div>
                            <h3 class="mb-2 text-sm font-medium text-text-secondary">
                                list (5 rows)
                            </h3>
                            <div class="rounded-md border border-border-default bg-surface p-4">
                                <LoadingState variant="list" />
                            </div>
                        </div>
                        <div>
                            <h3 class="mb-2 text-sm font-medium text-text-secondary">detail</h3>
                            <LoadingState variant="detail" />
                        </div>
                        <div>
                            <h3 class="mb-2 text-sm font-medium text-text-secondary">card</h3>
                            <LoadingState variant="card" />
                        </div>
                    </div>
                </section>

                <!-- ─── 5. EmptyState ──────────────────────────────────────── -->
                <section id="empty-state">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">5. EmptyState</h2>
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <CardSection title="Title only" :padded="false">
                            <EmptyState title="No journal entries yet" />
                        </CardSection>
                        <CardSection title="With description" :padded="false">
                            <EmptyState
                                title="No employees found"
                                description="Try adjusting your filters or create a new employee."
                            />
                        </CardSection>
                        <CardSection title="With actions slot" :padded="false">
                            <EmptyState
                                icon="pi pi-file-edit"
                                title="No drafts"
                                description="Drafts you save will appear here."
                            >
                                <template #actions>
                                    <Button label="Create your first entry" icon="pi pi-plus" />
                                </template>
                            </EmptyState>
                        </CardSection>
                    </div>
                </section>

                <!-- ─── 6. ErrorState ──────────────────────────────────────── -->
                <section id="error-state">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">6. ErrorState</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Retry button clicks logged here:
                        <strong>{{ retryLog }}</strong>
                    </p>
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <CardSection title="Default (i18n)" :padded="false">
                            <ErrorState @retry="retryLog++" />
                        </CardSection>
                        <CardSection title="Custom copy" :padded="false">
                            <ErrorState
                                title="Couldn't load journal entries"
                                description="We couldn't reach the server. Check your connection."
                                @retry="retryLog++"
                            />
                        </CardSection>
                        <CardSection title="Custom actions slot" :padded="false">
                            <ErrorState>
                                <template #actions>
                                    <Button label="Reload page" icon="pi pi-refresh" />
                                    <Button label="Report issue" severity="secondary" text />
                                </template>
                            </ErrorState>
                        </CardSection>
                    </div>
                </section>

                <!-- ─── 7. PageHeader ──────────────────────────────────────── -->
                <section id="page-header">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">7. PageHeader</h2>
                    <div class="space-y-6">
                        <CardSection title="Minimal (title only)" :padded="true">
                            <PageHeader title="Dashboard" />
                        </CardSection>
                        <CardSection title="With subtitle" :padded="true">
                            <PageHeader
                                title="Journal Entries"
                                subtitle="Manual journal entries posted to the general ledger."
                            />
                        </CardSection>
                        <CardSection title="With breadcrumbs" :padded="true">
                            <PageHeader
                                title="Journal Entries"
                                :breadcrumbs="sampleBreadcrumbs"
                            />
                        </CardSection>
                        <CardSection title="With actions slot" :padded="true">
                            <PageHeader title="Employees">
                                <template #actions>
                                    <Button label="Export" severity="secondary" icon="pi pi-download" />
                                    <Button label="New employee" icon="pi pi-plus" />
                                </template>
                            </PageHeader>
                        </CardSection>
                        <CardSection title="Full (everything)" :padded="true">
                            <PageHeader
                                title="Acme Trading Co."
                                subtitle="Tenant settings and configuration"
                                :breadcrumbs="sampleBreadcrumbs"
                            >
                                <template #actions>
                                    <Button label="Save" icon="pi pi-check" />
                                </template>
                            </PageHeader>
                        </CardSection>
                    </div>
                </section>

                <!-- ─── 8. TabGroup ────────────────────────────────────────── -->
                <section id="tab-group">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">8. TabGroup</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Active tab v-model: <strong>{{ activeTab }}</strong>.
                        URL query <code>?tab=</code> updates as you switch.
                        Mounted panels (lazy):
                        <strong>{{ Array.from(mountedPanels).join(', ') || 'none yet' }}</strong>
                    </p>
                    <CardSection>
                        <TabGroup v-model="activeTab">
                            <Tab name="overview" label="Overview" icon="pi pi-info-circle">
                                <div v-if="recordMount('overview')" class="py-4 text-sm">
                                    Overview tab content. This panel mounted on first activation.
                                </div>
                            </Tab>
                            <Tab name="audit" label="Audit Log" icon="pi pi-history">
                                <div v-if="recordMount('audit')" class="py-4 text-sm">
                                    Audit log content. Lazy-mounted — only created when you click here.
                                </div>
                            </Tab>
                            <Tab name="related" label="Related">
                                <div v-if="recordMount('related')" class="py-4 text-sm">
                                    Related records content. No icon on this tab.
                                </div>
                            </Tab>
                        </TabGroup>
                    </CardSection>
                </section>

                <!-- ─── 9. PermissionDeniedPage ────────────────────────────── -->
                <section id="permission-denied">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">
                        9. PermissionDeniedPage
                    </h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Bounded preview frame (600×400). In F4, this renders full-viewport
                        as the <code>/403</code> route.
                    </p>
                    <div class="space-y-4">
                        <div
                            class="h-[400px] w-full max-w-[600px] overflow-hidden rounded-md border border-border-default"
                        >
                            <PermissionDeniedPage class="!min-h-full" />
                        </div>
                        <div
                            class="h-[400px] w-full max-w-[600px] overflow-hidden rounded-md border border-border-default"
                        >
                            <PermissionDeniedPage resource="Journal Entries" class="!min-h-full" />
                        </div>
                    </div>
                </section>

                <!-- ─── 10. NotFoundPage ───────────────────────────────────── -->
                <section id="not-found">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">10. NotFoundPage</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Bounded preview frame (600×400). In F4, this renders full-viewport
                        as the catch-all route.
                    </p>
                    <div
                        class="h-[400px] w-full max-w-[600px] overflow-hidden rounded-md border border-border-default"
                    >
                        <NotFoundPage class="!min-h-full" />
                    </div>
                </section>

                <!-- ─── 11. StatusBadge ──────────────────────────────────────── -->
                <section id="status-badge">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">11. StatusBadge</h2>
                    <div class="flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                        <StatusBadge severity="success" label="Posted" />
                        <StatusBadge severity="warning" label="Pending review" />
                        <StatusBadge severity="danger" label="Reversed" />
                        <StatusBadge severity="info" label="Draft" />
                        <StatusBadge severity="neutral" label="Archived" />
                    </div>
                </section>

                <!-- ─── 12. MoneyDisplay ─────────────────────────────────────── -->
                <section id="money-display">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">12. MoneyDisplay</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        BCMath strings end-to-end. The 15+ significant-figures row would
                        silently break under <code>parseFloat</code> — BigInt-splice keeps
                        it exact.
                    </p>
                    <div class="rounded-md border border-border-default bg-surface">
                        <table class="w-full text-sm">
                            <thead class="border-b border-border-default text-text-secondary">
                                <tr>
                                    <th class="px-4 py-2 text-left font-medium">Label</th>
                                    <th class="px-4 py-2 text-left font-medium">Input</th>
                                    <th class="px-4 py-2 text-right font-medium">Right-aligned</th>
                                    <th class="px-4 py-2 text-left font-medium">Left-aligned</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="m in moneyAmounts" :key="m.label" class="border-b border-border-default last:border-0">
                                    <td class="px-4 py-2 text-text-primary">{{ m.label }}</td>
                                    <td class="px-4 py-2"><code class="text-xs text-text-tertiary">{{ m.amount }} {{ m.currency }}</code></td>
                                    <td class="px-4 py-2"><MoneyDisplay :amount="m.amount" :currency="m.currency" /></td>
                                    <td class="px-4 py-2"><MoneyDisplay :amount="m.amount" :currency="m.currency" align="left" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- ─── 13. DateDisplay ──────────────────────────────────────── -->
                <section id="date-display">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">13. DateDisplay</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Sample date: <code>{{ sampleDate }}</code>. Five formats — two
                        machine, three human.
                    </p>
                    <div class="rounded-md border border-border-default bg-surface">
                        <table class="w-full text-sm">
                            <thead class="border-b border-border-default text-text-secondary">
                                <tr>
                                    <th class="px-4 py-2 text-left font-medium">format</th>
                                    <th class="px-4 py-2 text-left font-medium">en (default)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="f in (['iso-datetime', 'iso-date', 'short', 'medium', 'long'] as const)" :key="f" class="border-b border-border-default last:border-0">
                                    <td class="px-4 py-2"><code class="text-xs text-text-tertiary">{{ f }}</code></td>
                                    <td class="px-4 py-2"><DateDisplay :date="sampleDate" :format="f" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- ─── 14. UserAvatar ───────────────────────────────────────── -->
                <section id="user-avatar">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">14. UserAvatar</h2>

                    <h3 class="mb-2 text-sm font-medium text-text-secondary">Photo mode (with photoUrl)</h3>
                    <div class="mb-4 flex items-center gap-3 rounded-md border border-border-default bg-surface p-4">
                        <UserAvatar
                            name="Jane Bookkeeper"
                            email="jane@acme.example"
                            photo-url="https://i.pravatar.cc/80?img=47"
                            size="md"
                        />
                        <span class="text-sm text-text-secondary">Jane Bookkeeper</span>
                    </div>

                    <h3 class="mb-2 text-sm font-medium text-text-secondary">Initials mode (color hashed from email)</h3>
                    <div class="mb-4 flex flex-wrap items-center gap-4 rounded-md border border-border-default bg-surface p-4">
                        <div v-for="p in samplePeople" :key="p.email" class="flex items-center gap-2">
                            <UserAvatar :name="p.name" :email="p.email" />
                            <span class="text-sm text-text-secondary">{{ p.name }}</span>
                        </div>
                    </div>

                    <h3 class="mb-2 text-sm font-medium text-text-secondary">Sizes</h3>
                    <div class="flex items-center gap-4 rounded-md border border-border-default bg-surface p-4">
                        <UserAvatar name="Jane Bookkeeper" email="jane@acme.example" size="sm" />
                        <UserAvatar name="Jane Bookkeeper" email="jane@acme.example" size="md" />
                        <UserAvatar name="Jane Bookkeeper" email="jane@acme.example" size="lg" />
                    </div>
                </section>

                <!-- ─── 15. FormField + FormActions ──────────────────────────── -->
                <section id="form-field">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">
                        15. FormField + FormActions
                    </h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Three fields wrapped in a Zod-validated form. Required asterisks visible;
                        button "Trigger server error" sets a synthetic field error on `salary`.
                        Submit count: <strong>{{ formSubmitCount }}</strong>.
                    </p>
                    <CardSection>
                        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
                            <FormField name="employeeName" label="Employee name" required>
                                <InputText name="employeeName" :model-value="undefined" class="w-full" placeholder="Jane Bookkeeper" />
                            </FormField>
                            <FormField
                                name="salary"
                                label="Salary"
                                required
                                help="BCMath string at scale 2–4, e.g. 50000.00"
                            >
                                <InputText name="salary" class="w-full" placeholder="50000.00" />
                            </FormField>
                            <FormField name="hireDate" label="Hire date" required>
                                <InputText name="hireDate" class="w-full" placeholder="2026-05-12" />
                            </FormField>
                            <div class="flex items-center gap-2">
                                <Button
                                    type="button"
                                    label="Trigger server error on salary"
                                    severity="warn"
                                    size="small"
                                    @click="triggerValidationError"
                                />
                            </div>
                            <FormActions
                                :loading="formSubmitting"
                                @submit="onSubmit"
                                @cancel="onCancel"
                            />
                        </form>
                    </CardSection>
                </section>

                <!-- ─── 16. ConfirmDialog ────────────────────────────────────── -->
                <section id="confirm-dialog">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">16. ConfirmDialog</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Accept count: <strong>{{ confirmAcceptCount }}</strong> ·
                        Reject count: <strong>{{ confirmRejectCount }}</strong>.
                        Focus lands on Cancel by default (safer for destructive ops).
                    </p>
                    <div class="flex flex-wrap gap-3">
                        <Button label="Delete entry" severity="danger" icon="pi pi-trash" @click="demoDelete" />
                        <Button label="Reverse entry" severity="warn" icon="pi pi-undo" @click="demoReverse" />
                    </div>
                </section>

                <!-- ─── 17. AppSidebar ───────────────────────────────────────── -->
                <section id="app-sidebar">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">17. AppSidebar</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Live render of the sidebar against the real stores
                        ($patch-driven mocks). Toggle the collapsed state and
                        flip permissions to watch modules appear/disappear.
                        Dashboard has no permission gate and always shows.
                    </p>

                    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <CardSection title="Sidebar state">
                            <div class="flex flex-col gap-3 text-sm">
                                <div class="flex items-center gap-3">
                                    <span class="font-medium text-text-primary">Collapsed:</span>
                                    <span>{{ ui.sidebarCollapsed ? 'yes' : 'no' }}</span>
                                </div>
                                <Button
                                    :label="ui.sidebarCollapsed ? 'Expand' : 'Collapse'"
                                    icon="pi pi-bars"
                                    severity="secondary"
                                    @click="ui.toggleSidebar()"
                                />
                            </div>
                        </CardSection>
                        <CardSection title="Permissions">
                            <div class="flex flex-col gap-2">
                                <label
                                    v-for="p in MODULE_PERMISSIONS"
                                    :key="p.key"
                                    class="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        v-model="permissionToggles"
                                        :input-id="`perm-${p.key}`"
                                        :value="p.key"
                                    />
                                    <span>{{ p.label }}</span>
                                    <code class="ml-auto text-xs text-text-tertiary">
                                        {{ p.key }}
                                    </code>
                                </label>
                            </div>
                        </CardSection>
                    </div>

                    <div class="overflow-hidden rounded-md border border-border-default">
                        <div class="flex" style="height: 480px">
                            <AppSidebar />
                            <div class="flex-1 bg-surface-sunken p-6 text-sm text-text-secondary">
                                <p class="font-medium text-text-primary">Page content area</p>
                                <p class="mt-2">
                                    Sidebar links route to stub destinations in dev (each
                                    redirects back here). Permission checkboxes above
                                    drive which modules appear.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ─── 18. AppTopBar ────────────────────────────────────────── -->
                <section id="app-topbar">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">18. AppTopBar</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        The top bar consumes <code>useAuthStore</code> and
                        <code>useTenantStore</code> directly. Edit the fields
                        below to drive the bar via <code>$patch</code>.
                        Clicking <strong>Log out</strong> in the user menu
                        calls the real <code>auth.logout()</code> contract
                        which <code>$reset</code>s the store — the top bar
                        clears as a result. Use <strong>Restore demo</strong>
                        to repopulate.
                    </p>

                    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <FormField name="topbar-user-name" label="User name">
                            <InputText v-model="topbarUserName" name="topbar-user-name" class="w-full" />
                        </FormField>
                        <FormField name="topbar-user-email" label="User email">
                            <InputText v-model="topbarUserEmail" name="topbar-user-email" class="w-full" />
                        </FormField>
                        <FormField name="topbar-tenant-name" label="Tenant name">
                            <InputText v-model="topbarTenantName" name="topbar-tenant-name" class="w-full" />
                        </FormField>
                    </div>

                    <div class="mb-4 flex flex-wrap items-center gap-3">
                        <Button
                            label="Restore demo"
                            icon="pi pi-refresh"
                            severity="secondary"
                            @click="restoreDemo"
                        />
                        <span class="text-xs text-text-tertiary">
                            Repopulates the auth + tenant mocks after a logout reset.
                        </span>
                    </div>

                    <div class="overflow-hidden rounded-md border border-border-default">
                        <AppTopBar />
                    </div>
                </section>

                <!-- ─── 19. Breadcrumbs ──────────────────────────────────────── -->
                <section id="breadcrumbs">
                    <h2 class="mb-4 text-xl font-semibold text-text-primary">19. Breadcrumbs</h2>
                    <p class="mb-4 text-sm text-text-secondary">
                        Manual <code>items</code> prop demo. Edit the labels
                        and watch the trail update. Auto-derivation from
                        <code>route.matched</code> is exercised in F4 once
                        the real router tree exists; here we only verify the
                        prop-driven path.
                    </p>

                    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <FormField name="crumb-1" label="Crumb 1 (link)">
                            <InputText v-model="crumb1" name="crumb-1" class="w-full" />
                        </FormField>
                        <FormField name="crumb-2" label="Crumb 2 (link)">
                            <InputText v-model="crumb2" name="crumb-2" class="w-full" />
                        </FormField>
                        <FormField name="crumb-3" label="Crumb 3 (current page)">
                            <InputText v-model="crumb3" name="crumb-3" class="w-full" />
                        </FormField>
                    </div>

                    <div class="rounded-md border border-border-default bg-surface p-4">
                        <Breadcrumbs :items="editableCrumbs" />
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
