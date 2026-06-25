<template>
	<div class="fplayer-settings-section fplayer-email-capture-settings-page">
		<div class="settings-section fplayer-export-control">
			<h3>Email Export</h3>
			<p>All email submissions are stored in your WordPress database and can be exported anytime.</p>
			<el-form-item>
				<div class="export-format-options" dir="ltr">
					<el-radio-group v-model="exportFormat" size="small">
						<el-radio-button value="csv">CSV</el-radio-button>
						<el-radio-button value="json">JSON</el-radio-button>
						<el-radio-button value="ods">ODS</el-radio-button>
					</el-radio-group>
				</div>
			</el-form-item>
			<el-button
				class="fplayer-secondary-btn"
				@click="exportEmails"
				:loading="loading.export"
			>
				Export Email List
			</el-button>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import Notify from '@/utils/Notify.js';
import Rest from '@/utils/http/Rest.js';

const exportFormat = ref('csv');

// State for API operations
const loading = reactive({
	settings: false,
	export: false
});

const buildDownloadUrl = () => {
	const appVars = window.fluentFrameworkAdmin || {};
	const baseUrl = (appVars.rest?.url || '').replace(/\/+$/, '');
	const nonce = appVars.rest?.nonce || '';

	if (!baseUrl || !nonce) {
		throw new Error('Export URL is unavailable');
	}

	const url = new URL(`${ baseUrl }/email-providers/export-emails`);
	url.searchParams.set('format', exportFormat.value);
	url.searchParams.set('download', '1');
	url.searchParams.set('_wpnonce', nonce);
	url.searchParams.set('query_timestamp', Date.now());

	return url.toString();
};

const triggerDownload = (url) => {
	const iframe = document.createElement('iframe');
	iframe.style.display = 'none';
	iframe.src = url;
	document.body.appendChild(iframe);

	window.setTimeout(() => {
		iframe.remove();
	}, 60000);
};

const exportEmails = async () => {
	loading.export = true;
	try {
		const response = await Rest.get('email-providers/export-emails', {
			format: exportFormat.value
		});

		if (response) {
			const payload = response.data || response;
			triggerDownload(buildDownloadUrl());
			Notify.success(`Email export started for ${ payload.count } submission${ payload.count === 1 ? '' : 's' }`);
		}
	} catch (error) {
		console.error('Export error:', error);
		Notify.error(error.message || 'Failed to export email list');
	} finally {
		loading.export = false;
	}
};
</script>
