const { Button, Popover } = wp.components;
const { useSelect, useDispatch } = wp.data;
const { useState, useRef } = wp.element;
const { __ } = wp.i18n;
import CustomRadioGroup from "../../media/components/common/CustomRadioGroup.jsx";

const STATUS_META = {
    publish: { label: __("Public", "fluent-player"), bg: "rgba(2, 184, 13, 0.1)", border: "rgba(2, 184, 13, 0.3)", color: "#02b80d" },
    private: { label: __("Private", "fluent-player"), bg: "rgba(196, 144, 0, 0.1)", border: "rgba(196, 144, 0, 0.3)", color: "#c49000" },
    draft: { label: __("Draft", "fluent-player"), bg: "rgba(113, 119, 132, 0.1)", border: "rgba(113, 119, 132, 0.3)", color: "#717784" },
    pending: { label: __("Pending", "fluent-player"), bg: "rgba(53, 122, 232, 0.1)", border: "rgba(53, 122, 232, 0.3)", color: "#357ae8" },
    future: { label: __("Scheduled", "fluent-player"), bg: "rgba(123, 97, 255, 0.1)", border: "rgba(123, 97, 255, 0.3)", color: "#7b61ff" },
};

// Only public/private are toggleable; other statuses show read-only.
const SETTABLE = ["publish", "private"];

const ToolbarApp = () => {
    const { editPost } = useDispatch("core/editor");
    const status = useSelect((select) => {
        const editorStore = select("core/editor");
        return editorStore ? editorStore.getEditedPostAttribute("status") : "draft";
    }, []);

    const meta = STATUS_META[status] || STATUS_META.draft;
    const selectedValue = SETTABLE.includes(status) ? status : "";

    const onStatusChange = (newValue) => {
        editPost({ status: newValue });
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

    const helpText = status === "future"
        ? __("Scheduled to publish automatically. Change the date in the editor's Publish panel.", "fluent-player")
        : __("Private media is only visible to logged-in editors. Draft and Pending are hidden from the public.", "fluent-player");

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
                    backgroundColor: meta.bg,
                    borderColor: meta.border,
                    color: meta.color,
                    transition: "all 0.2s ease",
                    fontWeight: "400"
                } }
            >
                { meta.label }
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
                            selected={ selectedValue }
                            options={ [
                                { value: "publish", label: __("Make it Public", "fluent-player") },
                                { value: "private", label: __("Make it Private", "fluent-player") }
                            ] }
                            onChange={ onStatusChange }
                            help={ helpText }
                        />
                        { selectedValue === "" && status !== "future" && (
                            <p
                                className="fp-status-current-note"
                                style={ { margin: "8px 0 0", fontSize: "12px", color: meta.color } }
                            >
                                { __("Current status:", "fluent-player") } { meta.label }
                            </p>
                        ) }
                        { status === "future" && (
                            <p
                                className="fp-status-scheduled-note"
                                style={ { margin: "8px 0 0", fontSize: "12px", color: STATUS_META.future.color } }
                            >
                                { __("Currently Scheduled — selecting a status above will unschedule it.", "fluent-player") }
                            </p>
                        ) }
                    </div>
                </Popover>
            ) }
        </div>
    );
};

export default ToolbarApp;
