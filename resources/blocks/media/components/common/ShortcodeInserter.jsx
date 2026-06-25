import './ShortcodeInserterStyles.scss';

const { __ } = wp.i18n;
const { Button, Dropdown, Spinner } = wp.components;
const { useState, useRef, useCallback, useMemo, useEffect } = wp.element;
const { apiFetch } = wp;

// Module-level cache shared across all instances
let cachedSmartcodes = null;
let fetchPromise = null;

const ThreeDotsIcon = () => (
	<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
		<circle cx="10" cy="5" r="1.5" fill="currentColor" />
		<circle cx="10" cy="10" r="1.5" fill="currentColor" />
		<circle cx="10" cy="15" r="1.5" fill="currentColor" />
	</svg>
);

const ShortcodeInserter = ({ onInsert, inputRef, extraShortcodes = [], buttonText }) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [smartcodes, setSmartcodes] = useState([]);
	const [activeTab, setActiveTab] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');

	const blockVars = window.fluentPlayerBlockVars || {};
	const apiPath = `${blockVars.rest?.namespace}/${blockVars.rest?.version}`;

	const hasFetched = useRef(false);
	const cursorPos = useRef(null);

	// Save cursor position when input loses focus (fires before button click)
	useEffect(() => {
		const input = inputRef?.current;
		if (!input) return;
		const save = () => { cursorPos.current = input.selectionStart; };
		input.addEventListener('blur', save);
		return () => input.removeEventListener('blur', save);
	}, [inputRef]);

	const fetchSmartcodes = useCallback(async () => {
		if (cachedSmartcodes) {
			setSmartcodes(cachedSmartcodes);
			return;
		}

		if (fetchPromise) {
			return fetchPromise;
		}

		setLoading(true);
		setError(null);

		fetchPromise = apiFetch({ path: `${apiPath}/smartcodes` })
			.then((response) => {
				if (response?.smartcodes) {
					cachedSmartcodes = response.smartcodes;
					setSmartcodes(response.smartcodes);
				}
			})
			.catch((err) => {
				setError(err?.message || __('Failed to load shortcodes', 'fluent-player'));
			})
			.finally(() => {
				setLoading(false);
				fetchPromise = null;
			});

		return fetchPromise;
	}, [apiPath]);

	const allGroups = [...smartcodes, ...extraShortcodes];

	const filteredItems = useMemo(() => {
		const group = allGroups[activeTab];
		if (!group?.shortcodes) return [];

		const entries = Object.entries(group.shortcodes);
		const query = searchQuery.trim().toLowerCase();
		if (!query) return entries;

		return entries.filter(([code, label]) =>
			code.toLowerCase().includes(query) || String(label).toLowerCase().includes(query)
		);
	}, [allGroups, activeTab, searchQuery]);

	return (
		<Dropdown
			className="fp-shortcode-inserter"
			popoverProps={{ placement: 'bottom-end', className: 'fp-shortcode-inserter-popover' }}
			onToggle={(isOpen) => {
				if (isOpen && !hasFetched.current) {
					hasFetched.current = true;
					fetchSmartcodes();
				}
				if (!isOpen) {
					setSearchQuery('');
				}
			}}
			renderToggle={({ isOpen, onToggle }) => (
				<Button
					className="fp-shortcode-inserter-btn"
					onClick={onToggle}
					aria-expanded={isOpen}
					aria-label={__('Insert shortcode', 'fluent-player')}
					size="small"
				>
					{buttonText != null && buttonText !== '' ? buttonText : <ThreeDotsIcon />}
				</Button>
			)}
			renderContent={({ onClose }) => {
				if (loading) {
					return (
						<div className="fp-shortcode-inserter-loading">
							<Spinner />
							<span>{__('Loading...', 'fluent-player')}</span>
						</div>
					);
				}

				if (error) {
					return (
						<div className="fp-shortcode-inserter-empty">
							{error}
						</div>
					);
				}

				if (allGroups.length === 0) {
					return (
						<div className="fp-shortcode-inserter-empty">
							{__('No shortcodes available', 'fluent-player')}
						</div>
					);
				}

				return (
					<div className="fp-shortcode-inserter-content">
						{allGroups.length > 1 && (
							<div className="fp-shortcode-inserter-sidebar">
								<div className="fp-shortcode-inserter-tabs">
									{allGroups.map((group, index) => (
										<button
											key={group.key}
											type="button"
											className={`fp-shortcode-inserter-tab ${activeTab === index ? 'is-active' : ''}`}
											onClick={() => {
												setActiveTab(index);
												setSearchQuery('');
											}}
										>
											{group.title}
										</button>
									))}
								</div>
							</div>
						)}
						<div className="fp-shortcode-inserter-body">
							<div className="fp-shortcode-inserter-search">
								<input
									type="text"
									placeholder={__('Search shortcodes...', 'fluent-player')}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<div className="fp-shortcode-inserter-items">
								{filteredItems.map(([code, label]) => (
									<button
										key={code}
										type="button"
										className="fp-shortcode-inserter-item"
										onClick={() => {
											if (inputRef?.current) {
												const val = inputRef.current.value;
												const pos = cursorPos.current ?? val.length;
												const newVal = val.slice(0, pos) + code + val.slice(pos);
												onInsert?.(newVal);
												cursorPos.current = null;
												// Restore cursor after inserted shortcode once React has updated the DOM
												const newPos = pos + code.length;
												setTimeout(() => {
													if (inputRef?.current) {
														inputRef.current.selectionStart = newPos;
														inputRef.current.selectionEnd = newPos;
														inputRef.current.focus();
													}
												}, 0);
											} else {
												onInsert?.(code);
											}
											onClose();
										}}
									>
										<span className="fp-shortcode-inserter-item-label">{label}</span>
										<span className="fp-shortcode-inserter-item-code">{code}</span>
									</button>
								))}
								{filteredItems.length === 0 && (
									<div className="fp-shortcode-inserter-no-results">
										{__('No shortcodes found.', 'fluent-player')}
									</div>
								)}
							</div>
						</div>
					</div>
				);
			}}
		/>
	);
};

export default ShortcodeInserter;
