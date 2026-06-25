/**
 * VideoLayout component for Fluent Player
 * Based on the PHP VideoLayout structure
 */

import TopControls from './TopControls';
import CenterControls from './CenterControls';
import BottomControls from './BottomControls';
import AudioLayout from './AudioLayout';
import Gestures from './Gestures';
import Captions from './Captions';
import CustomOverlay from './CustomOverlay';
import LogoOverlay from './LogoOverlay';
import EmailCaptureOverlay from './EmailCaptureOverlay';
import CTAOverlay from './CTAOverlay';
import ActionBarOverlay from './ActionBarOverlay';
// TopTitleOverlay and LanguageControls are now part of TopControls

const VideoLayout = ({ currentTime, settings, presetData, skin = 'modern' }) => {
    const behaviors = settings.behaviors || {};
    const isAudio = settings.viewType === 'audio';

    // Audio Layout (minimal shows play button only)
    if (isAudio) {
        return (
            <>
                {!behaviors.hide_bottom_controls && (
                    <AudioLayout settings={settings} skin={skin} />
                )}
            </>
        );
    }

    // Video Layout
    return (
        <>
            {/* Top Title Overlay and Language Controls are now part of TopControls */}

            <CustomOverlay overlaySettings={settings.overlays} currentTime={currentTime}/>
            <LogoOverlay
                mediaData={settings}
                blockVars={window.fluentPlayerBlockVars || {}}
            />
            <Gestures />
            {!settings._hideCaptions && <Captions />}
            
            {/* Email Capture Overlay */}
            {presetData?.settings?.email_capture && (
                <EmailCaptureOverlay 
                    settings={presetData?.settings?.email_capture} 
                    visible={true}
                />
            )}
            
            {/* CTA Overlay */}
            {presetData?.settings?.cta && (
                <CTAOverlay 
                    settings={presetData?.settings?.cta} 
                    visible={true}
                />
            )}

            {/* Action Bar Overlay */}
            {presetData?.settings?.action_bar && (
                <ActionBarOverlay
                    settings={presetData?.settings?.action_bar}
                />
            )}

            {skin !== 'minimal' && !behaviors.hide_top_controls && (
                <TopControls skin={skin} settings={settings} mediaId={settings?.ID} />
            )}

            {(skin === 'minimal' || !behaviors.hide_center_controls) && (
                <CenterControls skin={skin} />
            )}

            {skin !== 'minimal' && !behaviors.hide_bottom_controls && (
                <BottomControls
                    settings={settings}
                    skin={skin}
                    controls={settings.controls || {}}
                    behaviors={behaviors}
                />
            )}
        </>
    );
};

export default VideoLayout;
