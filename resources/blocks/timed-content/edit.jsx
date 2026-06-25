/**
 * Timed Content Block - Edit Component
 *
 * Time management handled by parent's TimedContentManager.
 * Consumes TimedContentContext to show/hide based on active tab.
 */
import { TimedContentContext } from '../media/components/TimedContentContext.js';

const { __ } = wp.i18n;
const { useBlockProps, InnerBlocks } = wp.blockEditor;
const { useContext } = wp.element;

const ALLOWED_BLOCKS = [
    'core/paragraph',
    'core/heading',
    'core/image',
    'core/list',
    'core/list-item',
    'core/quote',
    'core/buttons',
    'core/button',
    'core/columns',
    'core/column',
    'core/group',
    'core/separator',
    'core/spacer',
    'core/html',
    'core/shortcode',
    'fluentfom/guten-block',
    'fluent-booking/calendar',
    'fluent-booking/team-management',
    'fluent-booking/calendar-management',
    'fluent-booking/booking-management',
];

const TimedContentEdit = ({ clientId }) => {
    const activeClientId = useContext(TimedContentContext);
    const isHidden = activeClientId !== null && activeClientId !== clientId;

    const blockProps = useBlockProps({
        className: 'fp-timed-content-block',
        style: isHidden ? { display: 'none' } : undefined,
    });

    return (
        <div {...blockProps}>
            <InnerBlocks
                allowedBlocks={ALLOWED_BLOCKS}
                templateLock={false}
                template={[
                    ['core/paragraph', {
                        placeholder: __('Add content for this time range...', 'fluent-player'),
                    }],
                ]}
            />
        </div>
    );
};

export default TimedContentEdit;
