<template>
    <div class="fplayer-settings-section fplayer-migration-settings-page">

        <!-- Initial detection / scan skeleton -->
        <div v-if="loading && !scanData" class="fplayer-migration-skeleton" aria-hidden="true">
            <el-skeleton :rows="6" animated />
        </div>

        <!-- Step: Detection / Select -->
        <template v-if="step === 'detect' || step === 'select'">

            <!-- State: PP removed after migration -->
            <div v-if="!detected && !loading && migrationHistory?.has_history" class="fplayer-migration-history">
                <div class="fplayer-migration-header">
                    <h3 class="fplayer-migration-title fplayer-migration-success">{{ $t('Previously Imported from Presto Player') }}</h3>
                </div>
                <el-alert type="warning" :closable="false" class="fplayer-migration-history-notice">
                    {{ $t('Presto Player is no longer installed on this site.') }}
                </el-alert>
                <div class="fplayer-migration-history-summary">
                    <ul class="fplayer-migration-results-list">
                        <li v-if="migrationHistory.settings">{{ $t('Global settings imported') }}</li>
                        <li v-if="migrationHistory.presets">{{ migrationHistory.presets }} {{ $t('presets imported') }}</li>
                        <li v-if="migrationHistory.media">{{ migrationHistory.media }} {{ $t('media items imported') }}</li>
                        <li v-if="migrationHistory.playlists">{{ migrationHistory.playlists }} {{ $t('playlists imported') }}</li>
                        <li v-if="migrationHistory.visits">{{ $t('Analytics visits imported') }}</li>
                        <li v-if="migrationHistory.email_submissions">{{ $t('Email submissions imported') }}</li>
                        <li v-if="migrationHistory.content_rewrite">{{ migrationHistory.content_rewrite }} {{ $t('posts rewritten') }}</li>
                    </ul>
                </div>
                <div class="fplayer-migration-actions">
                    <el-button class="fplayer-secondary-btn" @click="confirmResetFresh">{{ $t('Delete Imported Data & Clear History') }}</el-button>
                    <el-button class="fplayer-secondary-btn" @click="clearHistory">{{ $t('Keep Data, Clear History Only') }}</el-button>
                </div>
            </div>

            <!-- State: Already migrated, PP still present -->
            <div v-else-if="detected && !loading && migrationHistory?.has_history" class="fplayer-migration-history">
                <div class="fplayer-migration-header">
                    <h3 class="fplayer-migration-title fplayer-migration-success">{{ $t('Previously Imported from Presto Player') }}</h3>
                    <el-tag type="success" size="small" v-if="scanData?.version">v{{ scanData.version }}</el-tag>
                </div>
                <div class="fplayer-migration-history-summary">
                    <ul class="fplayer-migration-results-list">
                        <li v-if="migrationHistory.settings">{{ $t('Global settings imported') }}</li>
                        <li v-if="migrationHistory.presets">{{ migrationHistory.presets }} {{ $t('presets imported') }}</li>
                        <li v-if="migrationHistory.media">{{ migrationHistory.media }} {{ $t('media items imported') }}</li>
                        <li v-if="migrationHistory.playlists">{{ migrationHistory.playlists }} {{ $t('playlists imported') }}</li>
                        <li v-if="migrationHistory.visits">{{ $t('Analytics visits imported') }}</li>
                        <li v-if="migrationHistory.email_submissions">{{ $t('Email submissions imported') }}</li>
                        <li v-if="migrationHistory.content_rewrite">{{ migrationHistory.content_rewrite }} {{ $t('posts rewritten') }}</li>
                    </ul>
                    <p v-if="skippedProItems.length" class="fplayer-migration-history-note">
                        {{ $t('Some items were not imported because they require FluentPlayer Pro:') }}
                        {{ skippedProItems.join(', ') }}.
                        {{ $t('Do not deactivate Presto Player until these are imported.') }}
                    </p>
                    <p v-if="hasNewDataToMigrate" class="fplayer-migration-history-note">
                        {{ $t('New eligible Presto Player items were found. Use Run Again to review and import them.') }}
                    </p>
                    <p v-else-if="!skippedProItems.length" class="fplayer-migration-history-note">
                        {{ $t('All eligible Presto Player data has been imported.') }}
                    </p>
                </div>
                <div class="fplayer-migration-actions">
                    <el-button class="fplayer-secondary-btn" @click="skipHistory">{{ $t('Run Again') }}</el-button>
                    <el-button class="fplayer-danger-btn" @click="confirmResetFresh">{{ $t('Delete imported data') }}</el-button>
                </div>
            </div>

            <!-- State: Detected but not active -->
            <div v-else-if="detected && !scanData?.active && !loading" class="fplayer-migration-empty">
                <el-alert type="warning" :closable="false" show-icon>
                    {{ $t('Presto Player is installed but not active. Please activate it before migrating.') }}
                </el-alert>
            </div>

            <div v-else-if="detected && scanData?.active && hasNothingToMigrate && !loading" class="fplayer-migration-empty">
                <el-alert type="info" :closable="false" show-icon>
                    {{ $t('No supported Presto Player data found to migrate.') }}
                </el-alert>
            </div>

            <!-- State: Not detected, no history -->
            <div v-else-if="!detected && !loading" class="fplayer-migration-empty">
                <el-alert type="info" :closable="false" show-icon>
                    {{ $t('No Presto Player data found in this site\'s database.') }}
                </el-alert>
            </div>

            <!-- Detected + active: show scan results -->
            <template v-else-if="detected && scanData?.active && !hasNothingToMigrate && !migrationHistory?.has_history">
                <div class="fplayer-migration-header">
                    <div class="fplayer-migration-header-info">
                        <h3 class="fplayer-migration-title">{{ $t('Import from Presto Player') }}</h3>
                        <el-tag type="success" size="small" v-if="scanData?.version">v{{ scanData.version }}</el-tag>
                    </div>
                    <p class="fplayer-migration-subtitle">
                        {{ $t('Select what you want to import. Your Presto Player data will not be modified.') }}
                    </p>
                </div>

                <div class="fplayer-migration-categories">
                    <div class="fplayer-migration-category">
                        <el-checkbox v-model="selections.settings">{{ $t('Global Settings') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail">
                            {{ hasProActive ? $t('Branding, Google Analytics') : $t('Branding') }}
                        </span>
                    </div>

                    <div class="fplayer-migration-category">
                        <el-checkbox v-model="selections.presets" :disabled="!hasProActive">{{ $t('Presets') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail" dir="auto">
                            {{ presetSummary }}
                            <el-tag v-if="!hasProActive" type="warning" size="small">{{ $t('Pro') }}</el-tag>
                        </span>
                        <el-button v-if="selections.presets && hasProActive" link size="small" class="fplayer-migration-link" @click="showPresetSelector = true">
                            {{ $t('Select specific presets') }} <span class="fplayer-migration-arrow" aria-hidden="true">&rarr;</span>
                        </el-button>
                    </div>

                    <div class="fplayer-migration-category">
                        <el-checkbox v-model="selections.media">{{ $t('Media') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail" dir="auto">{{ mediaSummary }}</span>
                        <el-button v-if="selections.media" link size="small" class="fplayer-migration-link" @click="showMediaSelector = true">
                            {{ $t('Select specific media') }} <span class="fplayer-migration-arrow" aria-hidden="true">&rarr;</span>
                        </el-button>
                    </div>

                    <div v-if="scanData?.playlists > 0 && scanData?.has_pro" class="fplayer-migration-category">
                        <el-checkbox v-model="selections.playlists" :disabled="!hasProActive || !selections.media">{{ $t('Playlists') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail">
                            {{ scanData.playlists }} {{ $t('playlists found') }}
                            <el-tag v-if="!hasProActive" type="warning" size="small">{{ $t('Pro') }}</el-tag>
                            <span v-else-if="!selections.media" class="fplayer-migration-dependency-hint">{{ $t('(requires Media)') }}</span>
                        </span>
                    </div>

                    <div v-if="scanData?.visits > 0" class="fplayer-migration-category">
                        <el-checkbox v-model="selections.visits" :disabled="!hasProActive || !selections.media">{{ $t('Analytics') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail">
                            {{ scanData.visits.toLocaleString() }} {{ $t('visits') }}
                            <el-tag v-if="!hasProActive" type="warning" size="small">{{ $t('Pro') }}</el-tag>
                            <span v-else-if="!selections.media" class="fplayer-migration-dependency-hint">{{ $t('(requires Media)') }}</span>
                        </span>
                    </div>

                    <div v-if="scanData?.email_submissions > 0" class="fplayer-migration-category">
                        <el-checkbox v-model="selections.emailSubmissions" :disabled="!hasProActive">{{ $t('Email Submissions') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail">
                            {{ scanData.email_submissions.toLocaleString() }} {{ $t('emails') }}
                            <el-tag v-if="!hasProActive" type="warning" size="small">{{ $t('Pro') }}</el-tag>
                        </span>
                    </div>

                    <div v-if="scanData?.affected_posts > 0" class="fplayer-migration-category">
                        <el-checkbox v-model="selections.contentRewrite" :disabled="!selections.media">{{ $t('Rewrite Content References') }}</el-checkbox>
                        <span class="fplayer-migration-category-detail">
                            {{ scanData.affected_posts }} {{ $t('posts with Presto Player blocks') }}
                            <span v-if="!selections.media" class="fplayer-migration-dependency-hint">{{ $t('(requires Media)') }}</span>
                        </span>
                        <el-alert v-if="selections.contentRewrite" type="warning" :closable="false" class="fplayer-migration-warning">
                            {{ $t('This will modify existing post content to replace Presto Player blocks with FluentPlayer blocks.') }}
                        </el-alert>
                    </div>
                </div>

                <div class="fplayer-migration-unmigratable">
                    <h4>{{ $t('Cannot migrate:') }}</h4>
                    <ul>
                        <li>{{ $t('Popup blocks') }}</li>
                        <li>{{ $t('Private media') }}</li>
                        <li v-if="!hasProActive">{{ $t('Video tags (requires FluentPlayer Pro)') }}</li>
                        <li>{{ $t('Watermark settings') }}</li>
                    </ul>
                </div>

                <div class="fplayer-migration-actions">
                    <el-button class="fplayer-primary-btn" @click="goToReview" :disabled="!hasSelections">
                        {{ $t('Next: Review Selection') }} &rarr;
                    </el-button>
                </div>
            </template>
        </template>

        <!-- Selector Dialogs -->
        <MigrationMediaSelector
            v-model="showMediaSelector"
            :items="allMedia"
            :selected="selectedMediaIds"
            :has-pro-active="hasProActive"
            :media-map="migrationHistory?.media_map || {}"
            :media-counts="scanData?.media || {}"
            @update:selected="selectedMediaIds = $event"
        />
        <MigrationPresetSelector
            v-model="showPresetSelector"
            :items="allPresets"
            :selected="selectedPresetIds"
            @update:selected="selectedPresetIds = $event"
        />

        <!-- Step: Review -->
        <template v-if="step === 'review'">
            <div class="fplayer-migration-header">
                <h3 class="fplayer-migration-title">{{ $t('Review Migration') }}</h3>
            </div>
            <div class="fplayer-migration-review">
                <h4>{{ $t('Will import:') }}</h4>
                <ul class="fplayer-migration-review-list">
                    <li v-if="selections.settings">{{ hasProActive ? $t('Global settings (branding, Google Analytics)') : $t('Global settings (branding)') }}</li>
                    <li v-if="selections.presets">{{ selectedPresetIds.length }} {{ $t('presets') }}</li>
                    <li v-if="selections.media">{{ selectedMediaIds.length }} {{ $t('media items') }}</li>
                    <li v-if="selections.playlists">{{ scanData?.playlists || 0 }} {{ $t('playlists') }}</li>
                    <li v-if="selections.visits">{{ $t('Analytics visits (for selected media)') }}</li>
                    <li v-if="selections.emailSubmissions">{{ scanData?.email_submissions || 0 }} {{ $t('email submissions') }}</li>
                    <li v-if="selections.contentRewrite">{{ $t('Rewrite blocks/shortcodes in') }} {{ affectedPostIds.length }} {{ $t('posts') }}</li>
                </ul>
                <div v-if="hadPriorMigration" class="fplayer-migration-category" style="margin-top: 16px;">
                    <el-checkbox v-model="forceReimport">
                        {{ $t('Re-import existing items (overwrites current data)') }}
                    </el-checkbox>
                </div>
                <el-alert type="info" :closable="false" class="fplayer-migration-review-note">
                    {{ $t('This will NOT modify or delete your Presto Player data. You can safely keep both plugins.') }}
                </el-alert>
            </div>
            <div class="fplayer-migration-actions">
                <el-button class="fplayer-secondary-btn" @click="step = 'select'">&larr; {{ $t('Back') }}</el-button>
                <el-button class="fplayer-primary-btn" @click="executeMigration">{{ $t('Start Import') }}</el-button>
            </div>
        </template>

        <!-- Step: Progress -->
        <template v-if="step === 'progress'">
            <div class="fplayer-migration-header">
                <h3 class="fplayer-migration-title">{{ $t('Importing...') }}</h3>
            </div>
            <div class="fplayer-migration-progress">
                <el-progress :percentage="progressPercent" :stroke-width="20" :text-inside="true" />
                <p class="fplayer-migration-progress-detail">{{ progress.details }}</p>
                <div class="fplayer-migration-progress-phases">
                    <div v-for="phase in progressPhases" :key="phase.key" class="fplayer-migration-progress-phase">
                        <span :class="phaseStatusClass(phase.key)">{{ phaseStatusIcon(phase.key) }}</span>
                        {{ phase.label }}
                    </div>
                </div>
            </div>
        </template>

        <!-- Step: Complete -->
        <template v-if="step === 'complete'">
            <div class="fplayer-migration-header">
                <h3 class="fplayer-migration-title" :class="{ 'fplayer-migration-success': !errors.length }">
                    {{ errors.length ? $t('Migration Completed with Warnings') : $t('Migration Complete!') }}
                </h3>
            </div>
            <div class="fplayer-migration-results">
                <ul class="fplayer-migration-results-list">
                    <li v-if="results.presets">{{ results.presets.migrated }} {{ $t('presets imported') }}</li>
                    <li v-if="results.settings?.migrated">{{ $t('Settings imported:') }} {{ results.settings.sections?.join(', ') }}</li>
                    <li v-if="results.media">
                        {{ results.media.migrated }} {{ $t('media items imported') }}
                        <template v-if="results.media.skipped"> ({{ results.media.skipped }} {{ $t('skipped') }})</template>
                    </li>
                    <li v-if="results.playlists">{{ results.playlists.migrated }} {{ $t('playlists imported') }}</li>
                    <li v-if="results.visits">{{ results.visits.migrated }} {{ $t('analytics visits imported') }}</li>
                    <li v-if="results.emailSubmissions">{{ results.emailSubmissions.migrated }} {{ $t('email submissions imported') }}</li>
                    <li v-if="results.contentRewrite">{{ results.contentRewrite.rewritten }} {{ $t('posts updated') }}</li>
                </ul>
                <div v-if="postMigrationSetupItems.length" class="fplayer-migration-setup-notice">
                    <el-alert type="info" :closable="false">
                        <template #title>{{ $t('Setup required to complete migration:') }}</template>
                        <ul>
                            <li v-for="(item, i) in postMigrationSetupItems" :key="i">{{ item }}</li>
                        </ul>
                    </el-alert>
                </div>

                <div v-if="errors.length" class="fplayer-migration-errors">
                    <el-alert type="warning" :closable="false">
                        <template #title>{{ errors.length }} {{ $t('issues encountered:') }}</template>
                        <ul>
                            <li v-for="(err, i) in errors" :key="i">{{ err.title || err.name || '' }}: {{ err.error }}</li>
                        </ul>
                    </el-alert>
                </div>
            </div>
            <div class="fplayer-migration-actions">
                <el-button class="fplayer-primary-btn" @click="$router.push('/')">{{ $t('View Imported Media') }}</el-button>
                <el-button class="fplayer-secondary-btn" @click="resetAndRestart">{{ $t('Back to Settings') }}</el-button>
            </div>
        </template>
    </div>
</template>

<script setup>
    import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue';
    import { useMigration } from '@/composables/useMigration.js';
    import { useProFeatures } from '@/composables/useFeatures.js';
    import Notify from '@/utils/Notify.js';
    import MigrationMediaSelector from './MediaSelector.vue';
    import MigrationPresetSelector from './PresetSelector.vue';

    const { proxy } = getCurrentInstance();

    const {
        detected, scanData, migrationHistory, loading, step, progress, progressPercent,
        results, errors,
        detect, scan, startMigration, resetState, resetAndDelete, clearHistory,
    } = useMigration();
    const { isProActive: hasProActive } = useProFeatures();

    const showMediaSelector = ref(false);
    const showPresetSelector = ref(false);
    const allMedia = ref([]);
    const allPresets = ref([]);
    const selectedMediaIds = ref([]);
    const selectedPresetIds = ref([]);
    const affectedPostIds = ref([]);

    const forceReimport = ref(false);
    const hadPriorMigration = ref(false);

    const selections = ref({
        settings: true,
        presets: hasProActive.value,
        media: true,
        playlists: false,
        visits: false,
        emailSubmissions: false,
        contentRewrite: false,
    });

    watch(() => selections.value.media, (isChecked) => {
        if (!isChecked) {
            selections.value.playlists = false;
            selections.value.visits = false;
            selections.value.contentRewrite = false;
        }
    });

    const presetSummary = computed(() => {
        const p = scanData.value?.presets;
        if (!p) return '';
        const count = selectedPresetIds.value.length;
        if (count && count !== allPresets.value.length) {
            return `${count} of ${p.total || allPresets.value.length} selected`;
        }
        return `${p.total || 0} presets`;
    });

    const mediaSummary = computed(() => {
        const m = scanData.value?.media;
        if (!m) return '';
        const count = selectedMediaIds.value.length;
        if (count && count !== m.total) {
            return `${count} of ${m.total} selected`;
        }
        const parts = [];
        if (m.youtube) parts.push(`${m.youtube} YouTube`);
        if (m.self_hosted) parts.push(`${m.self_hosted} Self-hosted`);
        if (m.vimeo) parts.push(`${m.vimeo} Vimeo`);
        if (m.audio) parts.push(`${m.audio} Audio`);
        if (m.bunny) parts.push(`${m.bunny} Bunny`);
        return `${m.total} total` + (parts.length ? ` (${parts.join(', ')})` : '');
    });

    const hasNothingToMigrate = computed(() => {
        if (!scanData.value) return false;
        return (scanData.value?.media?.total || 0) === 0
            && (scanData.value?.presets?.total || 0) === 0
            && (scanData.value?.affected_posts || 0) === 0
            && (scanData.value?.email_submissions || 0) === 0;
    });

    const skippedProItems = computed(() => {
        if (hasProActive.value || !scanData.value) return [];
        const items = [];
        if (scanData.value?.presets?.total) items.push(`${scanData.value.presets.total} presets`);
        if (scanData.value?.media?.bunny) items.push(`${scanData.value.media.bunny} Bunny media`);
        if (scanData.value?.playlists) items.push(`${scanData.value.playlists} playlists`);
        if (scanData.value?.visits) items.push('analytics data');
        return items;
    });

    const postMigrationSetupItems = computed(() => {
        if (step.value !== 'complete') return [];
        const items = [];
        if (results.value.media?.migrated > 0) {
            const hasBunny = allMedia.value.some(m => selectedMediaIds.value.includes(m.id) && m.provider === 'bunny');
            if (hasBunny) {
                items.push('Configure Bunny CDN API keys in Settings \u2192 Storage to play imported Bunny media.');
            }
        }
        const extProviders = results.value.presets?.external_providers || [];
        if (extProviders.includes('mailchimp')) {
            items.push('Configure Mailchimp API key in Settings \u2192 Integrations to activate email capture.');
        }
        if (extProviders.includes('webhook')) {
            items.push('Configure Webhook URLs in Settings \u2192 Integrations to activate webhook email capture.');
        }
        return items;
    });

    const hasNewDataToMigrate = computed(() => {
        if (!migrationHistory.value?.has_history || !scanData.value) return false;
        return (migrationHistory.value?.unmapped_media || 0) > 0
            || (migrationHistory.value?.unmapped_presets || 0) > 0;
    });

    const hasSelections = computed(() => {
        return selections.value.settings
            || selections.value.presets
            || (selections.value.media && selectedMediaIds.value.length > 0)
            || selections.value.playlists
            || selections.value.visits
            || selections.value.emailSubmissions
            || selections.value.contentRewrite;
    });

    const phaseOrder = ['presets', 'settings', 'media', 'playlists', 'visits', 'emailSubmissions', 'contentRewrite'];

    const progressPhases = computed(() => {
        const labels = { presets: 'Presets', settings: 'Settings', media: 'Media', playlists: 'Playlists', visits: 'Analytics', emailSubmissions: 'Email Submissions', contentRewrite: 'Content Rewrite' };
        return phaseOrder.filter(k => selections.value[k]).map(k => ({ key: k, label: labels[k] }));
    });

    const phaseStatusClass = (key) => {
        if (step.value === 'complete') return 'fplayer-phase-done';
        const currentIdx = phaseOrder.indexOf(progress.value.phase);
        const keyIdx = phaseOrder.indexOf(key);
        if (key === progress.value.phase) return 'fplayer-phase-active';
        if (keyIdx < currentIdx) return 'fplayer-phase-done';
        return 'fplayer-phase-pending';
    };

    const phaseStatusIcon = (key) => {
        const cls = phaseStatusClass(key);
        return cls === 'fplayer-phase-done' ? '✓' : cls === 'fplayer-phase-active' ? '⏳' : '○';
    };

    const goToReview = () => {
        if (selections.value.media && selectedMediaIds.value.length === 0) {
            selectedMediaIds.value = allMedia.value
                .filter(m => hasProActive.value || m.provider !== 'bunny')
                .map(m => m.id);
        }
        step.value = 'review';
    };

    const executeMigration = () => {
        startMigration({
            settings: selections.value.settings,
            presets: selections.value.presets,
            presetIds: selections.value.presets ? selectedPresetIds.value : [],
            mediaIds: selections.value.media ? selectedMediaIds.value : [],
            playlists: selections.value.playlists,
            visits: selections.value.visits,
            emailSubmissions: selections.value.emailSubmissions,
            contentRewrite: selections.value.contentRewrite,
            affectedPostIds: affectedPostIds.value,
            force: forceReimport.value,
        });
    };

    const skipHistory = async () => {
        const ok = await loadScanData();
        if (ok === false) {
            Notify.error('Failed to scan Presto Player data.');
            return;
        }

        forceReimport.value = true;
        migrationHistory.value = null;
        step.value = 'select';
    };

    const confirmResetFresh = async () => {
        try {
            await proxy.$confirm(
                'This will revert any content rewrites back to Presto Player blocks, then delete all imported media, playlists, and presets from Fluent Player.',
                'Delete Imported Data',
                { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
            );

            const response = await resetAndDelete();
            if (response) {
                const parts = [];
                if (response.deleted_media) parts.push(`${response.deleted_media} media`);
                if (response.deleted_presets) parts.push(`${response.deleted_presets} presets`);
                if (response.deleted_playlists) parts.push(`${response.deleted_playlists} playlists`);
                if (response.reverted_posts) parts.push(`${response.reverted_posts} posts reverted`);
                Notify.success(parts.length ? `Deleted ${parts.join(', ')}.` : 'Migration data cleared.');
                await detect();
                if (detected.value) {
                    await loadScanData();
                }
            }
        } catch (e) {
            //
        }
    };

    const resetAndRestart = async () => {
        resetState();
        await detect();
    };

    const loadScanData = async () => {
        const scanResult = await scan();
        if (!scanResult) return false;

        allMedia.value = scanResult.media || [];
        allPresets.value = (scanResult.presets || []).map(p => ({ ...p, uid: p.id }));
        affectedPostIds.value = (scanResult.affected_posts || []).map(p => p.id);
        selectedPresetIds.value = allPresets.value.map(p => p.uid);

        const importedMap = migrationHistory.value?.media_map || {};
        selectedMediaIds.value = allMedia.value
            .filter(m => !importedMap[m.id])
            .filter(m => hasProActive.value || m.provider !== 'bunny')
            .map(m => m.id);

        return true;
    };

    onMounted(async () => {
        await detect();
        hadPriorMigration.value = !!migrationHistory.value?.has_history;
        forceReimport.value = hadPriorMigration.value;
        if (detected.value && !migrationHistory.value?.has_history) {
            const ok = await loadScanData();
            if (ok === false) {
                Notify.error('Failed to scan Presto Player data.');
            }
        }
    });
</script>
