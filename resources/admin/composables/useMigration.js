import { ref, computed } from 'vue';
import Rest from '@/utils/http/Rest.js';

const detected = ref(false);
const scanData = ref(null);
const migrationHistory = ref(null);
const loading = ref(false);
const step = ref('detect');
const progress = ref({ current: 0, total: 0, phase: '', details: '' });
const results = ref({ presets: null, settings: null, media: null, playlists: null, visits: null, emailSubmissions: null, contentRewrite: null });
const errors = ref([]);

export function useMigration() {
    /**
     * Detect Presto Player installation
     */
    const detect = async () => {
        loading.value = true;
        try {
            const response = await Rest.get('migration/detect');
            detected.value = response?.detected || false;
            migrationHistory.value = response?.migration_history || null;
            if (detected.value) {
                scanData.value = response;
            }
            return response;
        } catch (e) {
            detected.value = false;
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Scan PP data with optional filters
     */
    const scan = async (type = 'all', search = '') => {
        loading.value = true;
        try {
            const params = {};
            if (type !== 'all') params.type = type;
            if (search) params.search = search;
            return await Rest.get('migration/scan', params);
        } catch (e) {
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Run migration with selected items
     */
    const startMigration = async (selections) => {
        step.value = 'progress';
        errors.value = [];

        let totalSteps = 0;
        if (selections.presets) totalSteps++;
        if (selections.settings) totalSteps++;
        if (selections.mediaIds?.length) {
            totalSteps += Math.ceil(selections.mediaIds.length / 50);
        }
        if (selections.playlists) totalSteps++;
        if (selections.visits && selections.mediaIds?.length) {
            totalSteps += 3;
        }
        if (selections.emailSubmissions) {
            totalSteps += 1;
        }
        if (selections.contentRewrite && selections.affectedPostIds?.length) {
            totalSteps += Math.ceil(selections.affectedPostIds.length / 20);
        }

        progress.value = { current: 0, total: totalSteps, phase: '', details: '' };

        try {
            if (selections.presets) {
                progress.value.phase = 'presets';
                progress.value.details = 'Migrating presets...';
                const res = await Rest.post('migration/presets', {
                    preset_ids: selections.presetIds || [],
                    force: selections.force ? '1' : '',
                });
                results.value.presets = res;
                if (res?.errors?.length) errors.value.push(...res.errors);
                progress.value.current++;
            }

            if (selections.settings) {
                progress.value.phase = 'settings';
                progress.value.details = 'Migrating settings...';
                results.value.settings = await Rest.post('migration/settings', {});
                progress.value.current++;
            }

            if (selections.mediaIds?.length) {
                progress.value.phase = 'media';
                const ids = selections.mediaIds;
                let totalMigrated = 0;
                let totalSkipped = 0;
                const mediaErrors = [];

                for (let i = 0; i < ids.length; i += 50) {
                    const batch = ids.slice(i, i + 50);
                    progress.value.details = `Migrating media ${i + 1}-${Math.min(i + 50, ids.length)} of ${ids.length}...`;

                    const res = await Rest.post('migration/media', { post_ids: batch, force: selections.force ? '1' : '' });
                    totalMigrated += res?.migrated || 0;
                    totalSkipped += res?.skipped || 0;
                    if (res?.errors?.length) mediaErrors.push(...res.errors);
                    progress.value.current++;
                }

                results.value.media = { migrated: totalMigrated, skipped: totalSkipped, errors: mediaErrors };
                if (mediaErrors.length) errors.value.push(...mediaErrors);
            }

            if (selections.playlists) {
                progress.value.phase = 'playlists';
                progress.value.details = 'Migrating playlists...';
                const res = await Rest.post('migration/playlists', { force: selections.force ? '1' : '' });
                results.value.playlists = res;
                if (res?.errors?.length) errors.value.push(...res.errors);
                progress.value.current++;
            }

            if (selections.visits && selections.mediaIds?.length && results.value.media?.migrated > 0) {
                progress.value.phase = 'visits';
                let offset = 0;
                let remaining = 1;
                let totalVisitsMigrated = 0;

                const maxBatches = 100;
                let batch = 0;
                while (remaining > 0 && batch < maxBatches) {
                    batch++;
                    progress.value.details = `Migrating analytics visits (offset ${offset})...`;
                    const res = await Rest.post('migration/visits', {
                        offset: String(offset),
                        limit: '50',
                        force: selections.force ? '1' : '',
                    });

                    totalVisitsMigrated += res?.migrated || 0;
                    remaining = res?.remaining || 0;
                    offset = res?.next_offset || offset + 50;
                    progress.value.current++;
                    progress.value.total = Math.max(progress.value.total, progress.value.current + (remaining > 0 ? 1 : 0));
                }

                results.value.visits = { migrated: totalVisitsMigrated };
            }

            if (selections.emailSubmissions) {
                progress.value.phase = 'emailSubmissions';
                let afterId = 0;
                let done = false;
                let totalSubmissions = 0;
                // Keyset pagination — backend returns next_cursor; trust `done`.
                while (!done) {
                    progress.value.details = `Migrating email submissions (after #${afterId})...`;
                    const res = await Rest.post('migration/email-submissions', {
                        after_id: String(afterId),
                        limit: '100',
                    });
                    totalSubmissions += res?.migrated || 0;
                    done = !!res?.done;
                    afterId = Number(res?.next_cursor) || afterId;
                }
                results.value.emailSubmissions = { migrated: totalSubmissions };
                progress.value.current++;
            }

            if (selections.contentRewrite && selections.affectedPostIds?.length) {
                progress.value.phase = 'contentRewrite';
                const ids = selections.affectedPostIds;
                let totalRewritten = 0;
                const rewriteErrors = [];

                for (let i = 0; i < ids.length; i += 20) {
                    const batch = ids.slice(i, i + 20);
                    progress.value.details = `Rewriting content in posts ${i + 1}-${Math.min(i + 20, ids.length)} of ${ids.length}...`;

                    const res = await Rest.post('migration/content-rewrite', { post_ids: batch });
                    totalRewritten += res?.rewritten || 0;
                    if (res?.errors?.length) rewriteErrors.push(...res.errors);
                    progress.value.current++;
                }

                results.value.contentRewrite = { rewritten: totalRewritten, errors: rewriteErrors };
                if (rewriteErrors.length) errors.value.push(...rewriteErrors);
            }

            step.value = 'complete';
        } catch (e) {
            console.error('Migration error:', e);
            errors.value.push({ error: e?.message || 'Migration failed unexpectedly.' });
            step.value = 'complete';
        }
    };

    /**
     * Reset local UI state (no server call)
     */
    const resetState = () => {
        results.value = { presets: null, settings: null, media: null, playlists: null, visits: null, emailSubmissions: null, contentRewrite: null };
        errors.value = [];
        step.value = 'detect';
    };

    /**
     * Full reset — delete all imported data + clear map
     */
    const resetAndDelete = async () => {
        loading.value = true;
        try {
            const response = await Rest.post('migration/reset', { delete_data: '1' });
            migrationHistory.value = null;
            resetState();
            return response;
        } catch (e) {
            return null;
        } finally {
            loading.value = false;
        }
    };

    /**
     * Clear migration history only (no data deletion)
     */
    const clearHistory = async () => {
        loading.value = true;
        try {
            await Rest.post('migration/reset', {});
            migrationHistory.value = null;
            resetState();
        } catch (e) {
            //
        } finally {
            loading.value = false;
        }
    };

    const progressPercent = computed(() => {
        if (!progress.value.total) return 0;
        return Math.round((progress.value.current / progress.value.total) * 100);
    });

    return {
        detected,
        scanData,
        migrationHistory,
        loading,
        step,
        progress,
        progressPercent,
        results,
        errors,
        detect,
        scan,
        startMigration,
        resetState,
        resetAndDelete,
        clearHistory,
    };
}
