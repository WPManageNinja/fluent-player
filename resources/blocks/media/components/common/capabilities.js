/**
 * Whether the current user may delete or rename remote provider assets
 * (Bunny, Cloudflare Stream, R2, Mux, Gumlet). Those endpoints require
 * manage_options; this only decides whether to render the control.
 */
export function canManageProviders() {
    const flag = window.fluentPlayerBlockVars?.canManageProviders;

    // wp_localize_script() stringifies scalars, so MediaBlock sends '1'/'' while
    // the wp_json_encode hosts (FluentCommunity, Divi) preserve the type. The
    // block-var filters are public, so a third party can substitute int 1.
    return flag === true || flag === 1 || flag === '1';
}

export default canManageProviders;
