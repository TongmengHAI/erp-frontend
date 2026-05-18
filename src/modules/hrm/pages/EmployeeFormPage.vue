<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';

import PageLayout from '@/shared/components/layout/PageLayout.vue';
import PageHeader from '@/shared/components/layout/PageHeader.vue';
import CardSection from '@/shared/components/layout/CardSection.vue';
import { HRM_ROUTES } from '@/modules/hrm/routes';

// ─────────────────────────────────────────────────────────────────────────────
// EmployeeFormPage — placeholder. The real create/edit form lands in the
// next slice. This stub exists so Vite's dev-mode import scan resolves the
// route target without crashing; navigation to /hrm/employees/new or
// /hrm/employees/:id/edit lands here and points the user back to the list.
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();
const router = useRouter();

function back(): void {
    void router.push({ name: HRM_ROUTES.EMPLOYEE_LIST });
}
</script>

<template>
    <PageLayout width="narrow">
        <PageHeader
            :title="t('hrm.employee.list.title')"
            :breadcrumbs="[
                { label: t('hrm.employee.breadcrumb.list'), to: { name: HRM_ROUTES.EMPLOYEE_LIST } },
            ]"
        />
        <CardSection>
            <div class="flex flex-col items-center gap-3 py-8 text-center">
                <i class="pi pi-hammer text-5xl text-text-tertiary" aria-hidden="true"></i>
                <h2 class="text-xl font-medium text-text-primary">
                    {{ t('comingSoonPage.cardTitle') }}
                </h2>
                <p class="max-w-md text-base text-text-secondary">
                    {{ t('comingSoonPage.subtitle') }}
                </p>
                <Button
                    :label="t('hrm.employee.notFound.action')"
                    icon="pi pi-arrow-left"
                    severity="secondary"
                    class="mt-2"
                    data-testid="employee-form-placeholder-back"
                    @click="back"
                />
            </div>
        </CardSection>
    </PageLayout>
</template>
