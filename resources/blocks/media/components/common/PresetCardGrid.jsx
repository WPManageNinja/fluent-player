import { PlayIconSmallSVG, ReplayMutedIconSVG } from './Icons.jsx';
import { isAmbientPreset } from './ambientPreset.js';
import InfoIcon from './InfoIcon.jsx';

const PresetPreview = ({ skin, isAmbient = false }) => {
	const CenterIcon = isAmbient
		? () => <ReplayMutedIconSVG className="fplayer-preset-muted-icon fplayer-preset-replay-muted-icon" />
		: PlayIconSmallSVG;
	switch (skin) {
		case 'classic':
		case 'default':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-classic">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-controls fplayer-preset-controls-default">
						<div className="fplayer-preset-progress-row">
							<div className="fplayer-preset-progress"></div>
						</div>
						<div className="fplayer-preset-buttons-row">
							<span className="fplayer-preset-time"></span>
							<div className="fplayer-preset-center-buttons">
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot"></span>
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot-sm"></span>
							</div>
							<div className="fplayer-preset-buttons">
								<span className="fplayer-preset-dot"></span>
								<span className="fplayer-preset-dot"></span>
								<span className="fplayer-preset-dot"></span>
							</div>
						</div>
					</div>
				</div>
			);
		case 'modern':
		case 'course':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-modern">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-controls fplayer-preset-controls-modern">
						<span className="fplayer-preset-dot"></span>
						<span className="fplayer-preset-dot"></span>
						<span className="fplayer-preset-dot"></span>
						<span className="fplayer-preset-time"></span>
						<div className="fplayer-preset-progress"></div>
						<span className="fplayer-preset-dot"></span>
						<span className="fplayer-preset-dot"></span>
					</div>
				</div>
			);
		case 'simple':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-simple">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-controls fplayer-preset-controls-simple">
						<span className="fplayer-preset-dot"></span>
						<div className="fplayer-preset-progress"></div>
						<span className="fplayer-preset-dot"></span>
					</div>
				</div>
			);
		case 'minimal':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-minimal">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
				</div>
			);
		case 'standard':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-standard">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-controls fplayer-preset-controls-standard">
						<div className="fplayer-preset-progress-row">
							<span className="fplayer-preset-time"></span>
							<div className="fplayer-preset-progress"></div>
							<span className="fplayer-preset-time"></span>
						</div>
						<div className="fplayer-preset-buttons-row">
							<span className="fplayer-preset-dot"></span>
							<div className="fplayer-preset-center-buttons">
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot"></span>
								<span className="fplayer-preset-dot-sm"></span>
								<span className="fplayer-preset-dot-sm"></span>
							</div>
							<span className="fplayer-preset-dot"></span>
						</div>
					</div>
				</div>
			);
		case 'floating':
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-floating">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-floating-wrapper">
						<div className="fplayer-preset-controls fplayer-preset-controls-floating">
							<span className="fplayer-preset-dot"></span>
							<span className="fplayer-preset-time"></span>
							<div className="fplayer-preset-progress"></div>
							<span className="fplayer-preset-dot"></span>
							<span className="fplayer-preset-dot"></span>
						</div>
					</div>
				</div>
			);
		default:
			return (
				<div className="fplayer-preset-preview fplayer-preset-preview-default">
					<div className="fplayer-preset-video-area">
						<CenterIcon />
					</div>
					<div className="fplayer-preset-controls">
						<div className="fplayer-preset-progress"></div>
					</div>
				</div>
			);
	}
};

const PresetCardGrid = ({ presets, selectedSlug, onSelect }) => {
	if (!presets || presets.length === 0) return null;

	return (
		<div className="fplayer-preset-grid">
			{presets.map(preset => {
				const isSelected = selectedSlug === preset.slug;
				const skin = preset.settings?.skin || preset.settings?.slug || 'modern';

				return (
					<div key={preset.slug}>
						<button
							type="button"
							className={`fplayer-preset-card ${isSelected ? 'is-selected' : ''}`}
							aria-pressed={isSelected}
							onClick={() => onSelect(preset)}
						>
							<PresetPreview skin={skin} isAmbient={isAmbientPreset(preset)} />
						</button>
						<div className="fplayer-preset-card-footer">
							<span className="fplayer-preset-name">
								{preset.name}
								{preset.description && (
									<InfoIcon tooltip={preset.description} />
								)}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export { PresetPreview, PresetCardGrid };
export default PresetCardGrid;
