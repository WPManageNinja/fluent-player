const { Modal, Button } = wp.components;
const { __, sprintf } = wp.i18n;

const ProModal = ({ onClose, feature = 'This feature' }) => {
    return (
        <Modal
            title={__('FluentPlayer Pro Required', 'fluent-player')}
            onRequestClose={onClose}
            className="fluent-player-block-modal fluent-player-pro-need-modal"
        >
            <div className="pro-need-content">
                <p>
                    {sprintf(
                        /* translators: %s: name of the Pro feature the user tried to use. */
                        __('%s is available in FluentPlayer Pro.', 'fluent-player'),
                        feature
                    )}
                </p>
                <p>
                    {__('Upgrade to Pro to unlock this and many other advanced features.', 'fluent-player')}
                </p>
                <div className="fluent-player-modal-actions">
                    <Button
                        variant="primary"
                        href="https://fluentplayer.com/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {__('Upgrade to Pro', 'fluent-player')}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        {__('Cancel', 'fluent-player')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ProModal;