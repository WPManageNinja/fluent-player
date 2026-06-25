/**
 * Lightweight Vidstack custom element loader for the editor-canvas iframe.
 * This script only imports and registers Vidstack's custom elements — no WP dependencies needed.
 * Used when the main block script can't run inside the iframe (FluentCommunity double-iframe).
 */
import 'vidstack/player';
import 'vidstack/player/ui';
import 'vidstack/player/styles/base.css';
import '@icons';
