<script setup>
const props = defineProps({
	modelValue: { type: Boolean, default: false },
	instructions: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue']);

const close = () => {
	emit('update:modelValue', false);
};

const openExternalLink = (url) => {
	const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
	if (newWindow) newWindow.opener = null;
};
</script>

<template>
	<el-dialog
		:model-value="modelValue"
		:title="instructions?.title || 'Setup Instructions'"
		width="60%"
		class="fplayer-setup-instructions-modal"
		@update:model-value="emit('update:modelValue', $event)"
		@close="close"
		append-to-body
	>
		<div v-if="instructions" class="fplayer-setup-instructions-content">
			<div
				v-for="(step, index) in instructions.steps"
				:key="index"
				class="fplayer-instruction-step"
			>
				<div class="fplayer-step-header">
					<span class="fplayer-step-number">{{ index + 1 }}</span>
					<h4 class="fplayer-step-title">{{ step.title }}</h4>
				</div>
				<div class="fplayer-step-content">
					<p>{{ step.content }}</p>
					<div v-if="step.code" class="fplayer-code-block">
						<pre><code>{{ step.code }}</code></pre>
					</div>
					<div v-if="step.link" class="fplayer-step-link">
						<el-button type="primary" link @click="openExternalLink(step.link.url)">
							{{ step.link.text }}
						</el-button>
					</div>
					<div v-if="step.note" class="fplayer-step-note">
						<el-alert :title="step.note" type="info" :closable="false" show-icon/>
					</div>
				</div>
			</div>
		</div>
		<template #footer>
			<el-button @click="close" class="fplayer-secondary-btn">Close</el-button>
		</template>
	</el-dialog>
</template>
