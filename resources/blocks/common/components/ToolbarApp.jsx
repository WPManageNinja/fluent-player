const { Button, Popover } = wp.components;
const { useSelect, useDispatch } = wp.data;
const { useState, useRef } = wp.element;
const { __ } = wp.i18n;
import CustomRadioGroup from "../../media/components/common/CustomRadioGroup.jsx";

const ToolbarApp = () => {
    const { editPost } = useDispatch("core/editor");
    const mediaVisibility = useSelect((select) => {
        const editorStore = select("core/editor");
        const status = editorStore.getEditedPostAttribute("status");
        return status === "publish";
    }, []);

    const onVisibilityChange = (newValue) => {
        editPost({
            status: newValue === "public" ? "publish" : "private"
        });
    };

    const [isVisible, setIsVisible] = useState(false);
    const anchorRef = useRef(null);
    const toggleVisible = () => {
        setIsVisible((state) => !state);
    };

    const closeAndFocusTrigger = () => {
        setIsVisible(false);
        setTimeout(() => anchorRef.current?.focus(), 0);
    };

    const handleKeyDown = (event) => {
        if (!isVisible) {
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            closeAndFocusTrigger();
            return;
        }
        if (event.key !== "Tab") {
            return;
        }
        const options = document.querySelectorAll(".fp-media-visibility-dropdown .custom-radio-option");
        if (!options.length) {
            return;
        }
        const first = options[0];
        const last = options[options.length - 1];
        const onTrigger = event.target === anchorRef.current;
        if (!event.shiftKey && onTrigger) {
            event.preventDefault();
            first.focus();
        } else if (!event.shiftKey && event.target === last) {
            event.preventDefault();
            closeAndFocusTrigger();
        } else if (event.shiftKey && event.target === first) {
            event.preventDefault();
            closeAndFocusTrigger();
        }
    };

    return (
        <div onKeyDown={ handleKeyDown }>
            <Button
                ref={ anchorRef }
                variant="tertiary"
                onClick={ toggleVisible }
                style={ {
                    display: "flex",
                    justifyContent: "center",
                    gap: 0,
                    alignItems: "center",
                    padding: "4px 12px",
                    backgroundColor: mediaVisibility ? "rgba(2, 184, 13, 0.1)" : "rgba(196, 144, 0, 0.1)",
                    borderColor: mediaVisibility ? "rgba(2, 184, 13, 0.3)" : "rgba(196, 144, 0, 0.3)",
                    color: mediaVisibility ? "#02b80d" : "#c49000",
                    transition: "all 0.2s ease",
                    fontWeight: "400"
                } }
            >
                { mediaVisibility ? __("Public", "fluent-player") : __("Private", "fluent-player") }
            </Button>
            { isVisible && (
                <Popover
                    placement="bottom-end"
                    shift
                    anchor={ anchorRef.current }
                    resize={ false }
                    focusOnMount={ false }
                    onFocusOutside={ toggleVisible }
                    className="fp-media-visibility-dropdown"
                >
                    <div
                        className="fluent-player-block-panel"
                        style={ { padding: "16px", width: "240px" } }
                    >
                        <CustomRadioGroup
                            className="fp-radio-borderless"
                            label={ __("Visibility", "fluent-player") }
                            selected={ mediaVisibility ? "public" : "private" }
                            options={ [
                                { value: "public", label: __("Make it Public", "fluent-player") },
                                { value: "private", label: __("Make it Private", "fluent-player") }
                            ] }
                            onChange={ onVisibilityChange }
                            help={ __("Private media is only visible to logged-in editors.", "fluent-player") }
                        />
                    </div>
                </Popover>
            ) }
        </div>
    );
};

export default ToolbarApp;
