const { __ } = wp.i18n;
const { useEffect, useState } = wp.element;
const { apiFetch } = wp;

const tagsPath = window.fluentPlayerBlockVars?.rest?.url ? `${window.fluentPlayerBlockVars.rest.url}/media/tags` : '';
let cachedTagOptions = null;
let inFlightRequest = null;

const useTags = ({ enabled = false } = {}) => {
    const [tagOptions, setTagOptions] = useState(Array.isArray(cachedTagOptions) ? cachedTagOptions : []);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagsError, setTagsError] = useState('');
    const [retryNonce, setRetryNonce] = useState(0);

    const availableTags = tagOptions.map((tag) => tag.name);

    useEffect(() => {
        if (!enabled || !tagsPath) {
            return;
        }

        let cancelled = false;

        if (Array.isArray(cachedTagOptions)) {
            setTagOptions(cachedTagOptions);
            setTagsLoading(false);
            setTagsError('');
            return;
        }

        const fetchTags = async () => {
            setTagsLoading(true);
            setTagsError('');
            try {
                if (!inFlightRequest) {
                    inFlightRequest = apiFetch({ url: tagsPath });
                }

                const response = await inFlightRequest;
                const tagOptions = Array.isArray(response?.tagOptions) && response.tagOptions.length
                    ? response.tagOptions
                    : (Array.isArray(response?.tags) ? response.tags.map((tag) => ({ name: tag, slug: tag })) : []);
                const sanitized = tagOptions.filter((tag) => tag?.name && tag?.slug);
                cachedTagOptions = sanitized;
                if (!cancelled) {
                    setTagOptions(sanitized);
                }
            } catch (e) {
                if (!cancelled) {
                    setTagOptions([]);
                    setTagsError(
                        e?.code === 'rest_no_route'
                            ? __('Tag suggestions are unavailable. Tag playlists require FluentPlayer Pro.', 'fluent-player')
                            : __('Failed to load tag suggestions. You can type tags manually or retry.', 'fluent-player')
                    );
                }
            } finally {
                inFlightRequest = null;
                if (!cancelled) {
                    setTagsLoading(false);
                }
            }
        };

        fetchTags();

        return () => {
            cancelled = true;
        };
    }, [enabled, retryNonce]);

    return {
        tagOptions,
        availableTags,
        tagsLoading,
        tagsError,
        retryTags: () => {
            cachedTagOptions = null;
            inFlightRequest = null;
            setRetryNonce((prev) => prev + 1);
        }
    };
};

export default useTags;
