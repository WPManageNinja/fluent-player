<template>
	<el-pagination
		class="fplayer-pagination"
		:background="false"
		layout="slot, sizes, ->, prev, pager, next"
		@current-change="changePage"
		@size-change="changeSize"
		:hide-on-single-page="hide_on_single"
		:current-page.sync="current_page"
		:page-sizes="page_sizes"
		:page-size="per_page"
		:total="total"
		size="small"
		popper-class="fplayer-pagination-sizes-dropdown"
	>
		<template #default>
			<div class="fplayer-pagination-info" aria-live="polite">
				{{ $t('Page') }} {{ current_page }} {{ $t('of') }} {{
					Math.ceil(total / per_page)
				}}
			</div>
		</template>
	</el-pagination>
</template>

<script type="text/babel">
export default {
    name: 'Pagination',
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
            const sizes = [];

            if (this.pagination.per_page < 10) {
                sizes.push(this.pagination.per_page);
            }

            const defaults = [
				10,
                15,
                20,
                30,
                50,
                100
            ];

            return [...sizes, ...defaults, ...this.extra_sizes];
        },
        total() {
            return +this.pagination.total;
        },
        per_page() {
            return +this.pagination.per_page;
        },
        current_page() {
            return +this.pagination.current_page;
        }
    },
    methods: {
        changePage(page) {
            this.pagination.current_page = page;

            this.$emit('fetch');
        },
        changeSize(size) {
            this.pagination.per_page = size;
            this.$emit('per_page_change', size)
            this.$emit('fetch');
        }
    }
}
</script>
