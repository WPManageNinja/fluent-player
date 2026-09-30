const { useState, useEffect, useRef } = wp.element;
const { __ } = wp.i18n;
const { Button, SelectControl } = wp.components;
const apiFetch = wp.apiFetch;
import ConfirmPopover from './common/ConfirmPopover.jsx';
import useNotification from './common/useNotification.js';
import { BackArrowSmallSVG } from './common/Icons.jsx';
import { buildGumletMediaData } from './common/buildGumletMediaData.js';
import { defaultPostStatus } from '@share/helper.js';

const CopyIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7 3.75C7 3.33579 7.33579 3 7.75 3H14.25C14.6642 3 15 3.33579 15 3.75V12.25C15 12.6642 14.6642 13 14.25 13H13V14.5H14.25C15.4926 14.5 16.5 13.4926 16.5 12.25V3.75C16.5 2.50736 15.4926 1.5 14.25 1.5H7.75C6.50736 1.5 5.5 2.50736 5.5 3.75V5H7V3.75ZM3.5 7.75C3.5 6.50736 4.50736 5.5 5.75 5.5H12.25C13.4926 5.5 14.5 6.50736 14.5 7.75V16.25C14.5 17.4926 13.4926 18.5 12.25 18.5H5.75C4.50736 18.5 3.5 17.4926 3.5 16.25V7.75ZM5.75 7C5.33579 7 5 7.33579 5 7.75V16.25C5 16.6642 5.33579 17 5.75 17H12.25C12.6642 17 13 16.6642 13 16.25V7.75C13 7.33579 12.6642 7 12.25 7H5.75Z" fill="currentColor" />
    </svg>
);

const EyeIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4.5C5.81818 4.5 2.28182 7.07727 1 10.75C2.28182 14.4227 5.81818 17 10 17C14.1818 17 17.7182 14.4227 19 10.75C17.7182 7.07727 14.1818 4.5 10 4.5ZM10 14.9167C7.70182 14.9167 5.83636 13.0495 5.83636 10.75C5.83636 8.45045 7.70182 6.58333 10 6.58333C12.2982 6.58333 14.1636 8.45045 14.1636 10.75C14.1636 13.0495 12.2982 14.9167 10 14.9167ZM10 8.25C8.61818 8.25 7.50909 9.36045 7.50909 10.75C7.50909 12.1395 8.61818 13.25 10 13.25C11.3818 13.25 12.4909 12.1395 12.4909 10.75C12.4909 9.36045 11.3818 8.25 10 8.25Z" fill="currentColor" /></svg>
);

const EyeOffIconSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.70711 1.29289L1.29289 2.70711L4.34233 5.75655C2.78922 6.93585 1.54578 8.58776 1 10.75C2.28182 14.4227 5.81818 17 10 17C11.5668 17 13.0432 16.5998 14.3345 15.9017L17.2929 18.8601L18.7071 17.4459L2.70711 1.29289ZM10 14.9167C7.70182 14.9167 5.83636 13.0495 5.83636 10.75C5.83636 10.0741 6.01364 9.44318 6.31818 8.89318L7.69091 10.2659C7.66364 10.4218 7.63636 10.5818 7.63636 10.75C7.63636 12.0568 8.69273 13.1136 10 13.1136C10.1682 13.1136 10.3318 13.0864 10.4845 13.0591L11.8573 14.4318C11.2909 14.7409 10.6636 14.9167 10 14.9167ZM19 10.75C17.9 13.9273 15.2045 16.2318 12.0273 17L10.2818 15.2545C12.6727 14.85 14.1636 13.0091 14.1636 10.75C14.1636 10.0864 14.0045 9.45909 13.7273 8.89091L16.5818 6.03636C17.6364 7.24545 18.4727 8.95909 19 10.75ZM10 6.58333C10.1364 6.58333 10.2682 6.59242 10.4 6.60606L6.60606 10.4C6.59242 10.2682 6.58333 10.1364 6.58333 10C6.58333 8.00909 8.00909 6.58333 10 6.58333Z" fill="currentColor" /></svg>
);

const GumletStream = ({
    setAttributes,
    onCancel,
    defaultSettings,
    saveMediaToServer,
}) => {
    const { showNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [resolution, setResolution] = useState('720p');
    const [creating, setCreating] = useState(false);
    const [stream, setStream] = useState(null); // normalized live asset
    const [showKey, setShowKey] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteAnchor, setDeleteAnchor] = useState(null);
    const pollRef = useRef(null);
    const selectingRef = useRef(false);
    const [selecting, setSelecting] = useState(false);

    const blockVars = window.fluentPlayerBlockVars || {};
    const apiRequestPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;
    const presetSlug = blockVars.defaultPreset?.slug ||
        defaultSettings?.defaultPresetSlug || defaultSettings?.preset_slug || 'course';

    const notify = (type, message, duration = 4000) =>
        showNotification({ type, message, duration, position: 'top-right' });

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // Poll live status once a stream exists so the Idle/Live badge updates.
    useEffect(() => {
        if (!stream?.live_asset_id) return;
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const s = await apiFetch({ path: `${apiRequestPath}/gumlet/live/${stream.live_asset_id}` });
                if (s?.live_asset_id) setStream((prev) => ({ ...prev, ...s }));
            } catch (e) { /* silent */ }
        }, 6000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [stream?.live_asset_id, apiRequestPath]);

    const createStream = async () => {
        setCreating(true);
        try {
            const created = await apiFetch({
                path: `${apiRequestPath}/gumlet/live`,
                method: 'POST',
                data: { title: title.trim(), resolution: [resolution] },
            });
            setStream(created);
            notify('success', __('Live stream created', 'fluent-player'), 3000);
        } catch (e) {
            notify('error', (e?.message || __('Failed to create live stream', 'fluent-player')), 6000);
        } finally {
            setCreating(false);
        }
    };

    const copy = (text) => {
        // Clipboard API is only present in secure contexts; guard before calling
        // writeText so the button reports failure instead of throwing.
        if (!navigator.clipboard?.writeText) {
            notify('error', __('Copying is not available in this browser', 'fluent-player'), 3000);
            return;
        }
        navigator.clipboard.writeText(text).then(
            () => notify('success', __('Copied to clipboard', 'fluent-player'), 2000),
            () => notify('error', __('Failed to copy', 'fluent-player'), 3000)
        );
    };

    const useStream = async () => {
        if (selectingRef.current) return; // guard against double-clicks / concurrent saves
        if (!stream?.playback_url) {
            notify('error', __('This stream has no playback URL yet', 'fluent-player'));
            return;
        }
        selectingRef.current = true;
        setSelecting(true);
        const data = buildGumletMediaData(
            {
                id: stream.live_asset_id,
                title: stream.title || title || __('Gumlet Live', 'fluent-player'),
                playback_url: stream.playback_url,
                thumbnail: '',
                duration: 0,
                is_private: false,
            },
            { presetSlug, assetType: 'live', untitledLabel: __('Gumlet Live', 'fluent-player'), postStatus: defaultPostStatus() }
        );
        try {
            // Persist first — only reflect the selection in the block once the
            // media record is saved, so a failed save can't leave a phantom
            // selection that vanishes on reload.
            if (typeof saveMediaToServer === 'function') {
                await saveMediaToServer(data);
            }
            setAttributes({
                preview: true,
                provider: 'gumlet_live',
                gumlet: { asset_id: stream.live_asset_id, playback_url: stream.playback_url },
            });
        } catch (e) {
            notify('error', __('Unable to select live stream', 'fluent-player') + ': ' + (e?.message || ''));
        } finally {
            selectingRef.current = false;
            setSelecting(false);
        }
    };

    const doDelete = async () => {
        setConfirmDelete(false);
        setDeleteAnchor(null);
        if (!stream?.live_asset_id) { setStream(null); return; }
        try {
            await apiFetch({ path: `${apiRequestPath}/gumlet/live/${stream.live_asset_id}`, method: 'DELETE' });
            notify('success', __('Live stream deleted', 'fluent-player'), 3000);
            if (pollRef.current) clearInterval(pollRef.current);
            setStream(null);
        } catch (e) {
            notify('error', (e?.message || __('Failed to delete live stream', 'fluent-player')), 6000);
        }
    };

    const DetailRow = ({ label, value, mono = true, action = null }) => (
        <div className="fluent-player-stream-detail-row">
            <span className="fluent-player-stream-detail-row-label">{label}</span>
            <div className="fluent-player-stream-detail-row-value">
                <span style={{ flex: 1, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</span>
                {action}
            </div>
        </div>
    );

    // ── Details panel (after creation) ──
    if (stream) {
        const isLive = !!stream.is_live;
        return (
            <div className="fluent-player-bunny fluent-player-gumlet">
                <div className="fluent-player-stream-detail">
                    <h5>{stream.title || title || __('Gumlet Live', 'fluent-player')}</h5>

                    <DetailRow
                        label={__('Status', 'fluent-player')}
                        mono={false}
                        value={
                            <span className={`fluent-player-live-status fluent-player-live-status--${isLive ? 'active' : 'idle'}`} role="img" aria-label={isLive ? __('Live', 'fluent-player') : __('Idle', 'fluent-player')}>
                                <span className="fluent-player-live-status-dot"></span>
                                {isLive ? __('Live', 'fluent-player') : __('Idle — waiting for encoder', 'fluent-player')}
                            </span>
                        }
                    />

                    {(stream.rtmp_server_url || stream.stream_url) && (
                        <DetailRow
                            label={__('RTMP Server URL (paste in OBS “Server”)', 'fluent-player')}
                            value={stream.rtmp_server_url || stream.stream_url}
                            action={<Button className="fp-icon-btn" onClick={() => copy(stream.rtmp_server_url || stream.stream_url)} label={__('Copy RTMP server URL', 'fluent-player')} showTooltip><CopyIconSVG /></Button>}
                        />
                    )}

                    {stream.stream_key && (
                        <DetailRow
                            label={__('Stream Key (paste in OBS “Stream Key”)', 'fluent-player')}
                            value={showKey ? stream.stream_key : '••••••••••••••••'}
                            action={
                                <>
                                    <Button className="fp-icon-btn" onClick={() => setShowKey(!showKey)} label={showKey ? __('Hide stream key', 'fluent-player') : __('Show stream key', 'fluent-player')} showTooltip>
                                        {showKey ? <EyeOffIconSVG /> : <EyeIconSVG />}
                                    </Button>
                                    <Button className="fp-icon-btn" onClick={() => copy(stream.stream_key)} label={__('Copy stream key', 'fluent-player')} showTooltip><CopyIconSVG /></Button>
                                </>
                            }
                        />
                    )}

                    {stream.playback_url && (
                        <DetailRow
                            label={__('Playback URL (HLS)', 'fluent-player')}
                            value={stream.playback_url}
                            action={<Button className="fp-icon-btn" onClick={() => copy(stream.playback_url)} label={__('Copy playback URL', 'fluent-player')} showTooltip><CopyIconSVG /></Button>}
                        />
                    )}

                    {stream.vod_asset_id && (
                        <p className="fluent-player-stream-detail-note" role="note">
                            {__('A recording (VOD) is saved automatically and appears in your video list after the stream ends.', 'fluent-player')}
                        </p>
                    )}

                    <div className="fluent-player-stream-detail-actions">
                        <Button className="components-button fp-btn-secondary" onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStream(null); }}>
                            <BackArrowSmallSVG />
                            {__('Back', 'fluent-player')}
                        </Button>
                        <Button className="components-button fp-btn-secondary" onClick={(e) => { setDeleteAnchor(e.currentTarget); setConfirmDelete(true); }}>
                            {__('Delete Stream', 'fluent-player')}
                        </Button>
                        <Button className="components-button fp-btn-primary" onClick={useStream} disabled={selecting}>
                            {selecting ? __('Adding…', 'fluent-player') : __('Use This Stream', 'fluent-player')}
                        </Button>
                    </div>
                </div>

                <ConfirmPopover
                    isOpen={confirmDelete}
                    anchor={deleteAnchor}
                    title={__('Delete Live Stream', 'fluent-player')}
                    message={__('Are you sure you want to delete this live stream? This action cannot be undone.', 'fluent-player')}
                    confirmText={__('Delete', 'fluent-player')}
                    cancelText={__('Cancel', 'fluent-player')}
                    onConfirm={doDelete}
                    onCancel={() => { setConfirmDelete(false); setDeleteAnchor(null); }}
                />
            </div>
        );
    }

    // ── Create form ──
    return (
        <div className="fluent-player-bunny fluent-player-gumlet">
            <h5>{__('Create Live Stream', 'fluent-player')}</h5>

            <div className="fluent-player-bunny-form-row">
                <label htmlFor="fp-gumlet-live-title">{__('Stream Title', 'fluent-player')}</label>
                <input
                    id="fp-gumlet-live-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={__('Enter a stream title', 'fluent-player')}
                    className="fluent-player-bunny-form-control"
                />
            </div>

            <div className="fluent-player-bunny-form-row">
                <SelectControl
                    label={__('Max Resolution', 'fluent-player')}
                    value={resolution}
                    options={[
                        { value: '360p', label: '360p' },
                        { value: '480p', label: '480p' },
                        { value: '720p', label: '720p (HD)' },
                        { value: '1080p', label: '1080p (Full HD)' },
                    ]}
                    onChange={setResolution}
                />
            </div>

            <div className="fluent-player-bunny-action-button">
                <Button className="components-button back-button fp-btn-secondary" onClick={onCancel}>
                    <BackArrowSmallSVG />
                    {__('Back to Media Selector', 'fluent-player')}
                </Button>
                <Button className="components-button fp-btn-primary" onClick={createStream} disabled={creating}>
                    {creating ? __('Creating…', 'fluent-player') : __('Create Stream', 'fluent-player')}
                </Button>
            </div>
        </div>
    );
};

export default GumletStream;
