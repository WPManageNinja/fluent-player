<template>
	<el-pagination
		v-if="is_visible"
		class="fplayer-pagination"
		:background="false"
		:layout="layout"
		@current-change="changePage"
		@size-change="changeSize"
		:current-page="current_page"
		:page-sizes="page_sizes"
		:page-size="per_page"
		:total="total"
		size="small"
		popper-class="fplayer-pagination-sizes-dropdown"
	>
		<template #default>
			<div class="fplayer-pagination-info" aria-live="polite">
				{{ $t('Page') }} {{ current_page }} {{ $t('of') }} {{ total_pages }}
			</div>
		</template>
	</el-pagination>
</template>

<script type="text/babel">
const DEFAULT_PAGE_SIZE = 10;

export default {
    name: 'Pagination',
    emits: ['fetch', 'per_page_change'],
    props: {
        pagination: {
            required: true,
            type: Object
        },
        extra_sizes: {
            required: false,
            type: Array,
            default() {
                return [];
            }
        },
        hide_on_single: {
            required: false,
            type: Boolean,
            default() {
                return true;
            }
        }
    },
    computed: {
        page_sizes() {
            const sizes = [
                DEFAULT_PAGE_SIZE,
                15,
                20,
                30,
                50,
                100,
                ...this.extra_sizes,
                this.per_page
            ];

            return [...new Set(sizes)].sort((a, b) => a - b);
        },
        total() {
            return +this.pagination.total;
        },
        per_page() {
            return +this.pagination.per_page;
        },
        current_page() {
            return +this.pagination.current_page;
        },
        total_pages() {
            return Math.max(1, Math.ceil(this.total / this.per_page) || 1);
        },
        // Element Plus' hide-on-single-page would unmount the size selector too.
        is_visible() {
            if (!this.total) {
                return false;
            }

            return this.total_pages > 1 || !this.hide_on_single || this.per_page !== DEFAULT_PAGE_SIZE;
        },
        layout() {
            return this.total_pages > 1
                ? 'slot, sizes, ->, prev, pager, next'
                : 'slot, sizes';
        }
    },
    methods: {
        changePage(page) {
            this.pagination.current_page = page;

            this.$emit('fetch');
        },
        changeSize(size) {
            const next_total_pages = Math.max(1, Math.ceil(this.total / size));

            this.pagination.per_page = size;

            if (this.current_page > next_total_pages) {
                this.pagination.current_page = 1;
            }

            this.$emit('per_page_change', size)
            this.$emit('fetch');
        }
    }
}
</script>
