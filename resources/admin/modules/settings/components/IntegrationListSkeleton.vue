<template>
	<div class="fplayer-integrations-list-container fplayer-integrations-skeleton" aria-hidden="true">
		<el-skeleton animated>
			<template #template>
				<div v-for="row in rows" :key="row" class="fplayer-integrations-item">
					<div class="fplayer-integrations-row">
						<el-skeleton-item variant="circle" class="fplayer-integrations-skeleton-brand" />
						<div class="fplayer-integrations-info">
							<el-skeleton-item variant="text" class="fplayer-integrations-skeleton-title" />
							<el-skeleton-item variant="text" class="fplayer-integrations-skeleton-desc" />
						</div>
						<div class="fplayer-integrations-actions">
							<el-skeleton-item variant="text" class="fplayer-integrations-skeleton-pill" />
							<el-skeleton-item variant="text" class="fplayer-integrations-skeleton-btn" />
						</div>
					</div>
				</div>
			</template>
		</el-skeleton>
	</div>
</template>

<script setup>
defineProps({
	rows: {
		type: Number,
		default: 5
	}
});
</script>
