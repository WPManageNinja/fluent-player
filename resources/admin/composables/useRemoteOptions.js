import { ref, computed, watch } from 'vue';
import Rest from '@/utils/http/Rest.js';

/**
 * Lazy remote options for select fields. Fetches on first dropdown open;
 * a scoping-param change only invalidates (fresh fetch on next open, zero
 * background requests) and an emptied scoping param clears locally.
 * Server-embedded labels for saved values render through extraSeedOptions
 * without any fetch. When the server flags has_more (result set capped),
 * serverSearch flips on and typing re-queries with a debounce; otherwise
 * the complete list is local and the caller lets the select filter it
 * client-side.
 */
export function useRemoteOptions({
	endpoint,
	getSeededOptions = () => [],
	getParams = () => ({}),
	clearOnEmptyParam = null,
	searchDebounce = 300
}) {
	const options = ref([]);
	const groups = ref([]);
	const loading = ref(false);
	const fetched = ref(false);
	const serverSearch = ref(false);

	let lastSearch = null;
	let searchTimer = null;
	let requestSeq = 0;

	const extraSeedOptions = computed(() => {
		const have = new Set();
		options.value.forEach(o => have.add(String(o.value)));
		groups.value.forEach(g => (g.options || []).forEach(o => have.add(String(o.value))));
		return getSeededOptions().filter(o => !have.has(String(o.value)));
	});

	const fetchOptions = async (search = '') => {
		if (!endpoint) return;
		const seq = ++requestSeq;
		loading.value = true;
		fetched.value = true;
		lastSearch = search;
		try {
			const response = await Rest.get(endpoint, { search, ...getParams() });
			// ignore a slower earlier request that resolved after a newer one
			if (seq !== requestSeq) return;
			groups.value = response.groups || [];
			options.value = response.options || [];
			serverSearch.value = !!response.has_more;
		} catch (e) {
			if (seq !== requestSeq) return;
			groups.value = [];
			options.value = [];
		} finally {
			if (seq === requestSeq) loading.value = false;
		}
	};

	const debouncedSearch = (search) => {
		clearTimeout(searchTimer);
		// re-checked at fire time: the open-triggered fetch may land in between
		searchTimer = setTimeout(() => {
			if (search !== lastSearch) fetchOptions(search);
		}, searchDebounce);
	};

	const onVisibleChange = (open) => {
		if (open && !fetched.value) fetchOptions();
	};

	watch(() => JSON.stringify(getParams()), () => {
		const params = getParams() || {};
		if (clearOnEmptyParam && clearOnEmptyParam in params && !params[clearOnEmptyParam]) {
			groups.value = [];
			options.value = [];
			fetched.value = false;
			return;
		}
		// stale data stays for chip labels; the next open refetches
		fetched.value = false;
	});

	return { options, groups, loading, fetched, serverSearch, extraSeedOptions, fetchOptions, debouncedSearch, onVisibleChange };
}
