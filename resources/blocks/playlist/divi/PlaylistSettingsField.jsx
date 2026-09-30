/**
 * Divi 5 sidebar field hosting the playlist settings app. Mounts PlaylistSettingsApp as
 * its own wp.element React root (isolated from Divi's React) inside the page-builder panel
 * wrapper (.fluent-player-d5-settings) so it follows Divi's colour mode — not the
 * Elementor always-dark host class.
 */

import PlaylistSettingsApp from './PlaylistSettingsApp.jsx';
import { readPlaylistId } from './helpers';

const React = (window.vendor && window.vendor.React) || window.React;
const { useRef, useEffect } = React;
const __ = (window.wp && window.wp.i18n && window.wp.i18n.__)
    ? window.wp.i18n.__.bind(window.wp.i18n)
    : (s) => s;

function wpElement() {
    return (window.wp && window.wp.element)
        || (window.vendor && window.vendor.wp && window.vendor.wp.element)
        || null;
}

function wpComponents() {
    return (window.wp && window.wp.components)
        || (window.vendor && window.vendor.wp && window.vendor.wp.components)
        || {};
}

export default function PlaylistSettingsField(props) {
    const playlistId = readPlaylistId(props && props.attrs);
    const ref = useRef(null);
    const rootRef = useRef(null);

    useEffect(() => {
        const wpEl = wpElement();
        if (!ref.current || !wpEl) return;

        if (!playlistId) {
            if (rootRef.current) {
                try { rootRef.current.unmount(); } catch (e) { /* noop */ }
                rootRef.current = null;
            }
            return;
        }

        const app = wpEl.createElement(PlaylistSettingsApp, { playlistId: String(playlistId), debounceMs: 400 });
        const wpc = wpComponents();
        // StyleProvider points Emotion at the mount's own document; otherwise styles land
        // in the canvas iframe and the controls render unstyled.
        const StyleProvider = wpc.StyleProvider || wpc.__experimentalStyleProvider;

        // Popovers render into a body-level Popover.Slot; Divi's et-vb-modal (z-index:100)
        // would otherwise clip them behind the canvas iframe.
        const { SlotFillProvider, Popover } = wpc;
        const doc = ref.current.ownerDocument;
        let popoverHost = doc.getElementById('fp-divi-playlist-popover-host');
        if (!popoverHost) {
            popoverHost = doc.createElement('div');
            popoverHost.id = 'fp-divi-playlist-popover-host';
            // Carries the settings class so the block panel CSS styles the popovers.
            popoverHost.className = 'fluent-player-block-panel';
            popoverHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:9999999;';
            doc.body.appendChild(popoverHost);
        }
        let inner = app;
        if (SlotFillProvider && Popover && Popover.Slot && wpEl.createPortal) {
            inner = wpEl.createElement(
                SlotFillProvider,
                null,
                app,
                wpEl.createPortal(wpEl.createElement(Popover.Slot, { bubblesVirtually: true }), popoverHost)
            );
        }
        const tree = StyleProvider
            ? wpEl.createElement(StyleProvider, { document: doc }, inner)
            : inner;

        if (wpEl.createRoot) {
            if (!rootRef.current) rootRef.current = wpEl.createRoot(ref.current);
            rootRef.current.render(tree);
        } else if (wpEl.render) {
            wpEl.render(tree, ref.current);
        }

        return () => { /* keep the root across re-renders; unmounted on empty playlist */ };
    }, [playlistId]);

    if (!playlistId) {
        return React.createElement('div', {
            style: { padding: '4px 0', color: '#50575e', fontSize: 13 },
        }, __('Select a playlist above to edit its settings.', 'fluent-player'));
    }

    return React.createElement('div', { ref, className: 'fluent-player-d5-settings fluent-player-block-panel' });
}
