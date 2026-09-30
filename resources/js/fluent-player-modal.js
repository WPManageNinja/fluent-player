import { bindModalTriggers, openModal, closeModal } from './modal';

// Standalone frontend entry so the modal code stays OUT of the core player runtime
// (fluent-player.js). Enqueued on demand by the Pro [fluent_player_modal] trigger,
// alongside the core runtime it depends on for mounting (observeInjectedPlayers) and
// teardown (the DestroyFluentPlayer event).
if (!window.__fluentPlayerModalBootstrapped) {
    window.__fluentPlayerModalBootstrapped = true;

    bindModalTriggers();

    // Reachable programmatically; attach to the shared global when the core runtime
    // has already defined it, and always expose a dedicated namespace.
    if (window.FluentPlayer) {
        window.FluentPlayer.openModal = openModal;
        window.FluentPlayer.closeModal = closeModal;
    }
    window.FluentPlayerModal = { open: openModal, close: closeModal };
}
