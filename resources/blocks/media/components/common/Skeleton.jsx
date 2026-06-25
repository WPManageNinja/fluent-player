const Skeleton = ({
	className = '',
	animated = true,
	children,
}) => (
	<div
		className={`fp-skeleton ${animated ? 'fp-skeleton--animated' : ''} ${className}`.trim()}
	>
		{children}
	</div>
);

Skeleton.Item = ({ className = '', style = {} }) => (
	<div className={`fp-skeleton__item ${className}`.trim()} style={style} />
);

Skeleton.Row = ({ className = '', width }) => (
	<div
		className={`fp-skeleton__item fp-skeleton__row ${className}`.trim()}
		style={width != null ? { width: typeof width === 'number' ? `${width}px` : width } : undefined}
	/>
);

Skeleton.VideoCardGrid = ({ count = 6, className = '' }) => (
	<Skeleton className={`fp-skeleton-video-card-grid ${className}`.trim()}>
		{Array.from({ length: count }, (_, i) => (
			<div key={i} className="fp-skeleton-video-card">
				<Skeleton.Item className="fp-skeleton-video-card__thumbnail" />
				<div className="fp-skeleton-video-card__info">
					<Skeleton.Row width="80%" />
					<Skeleton.Row width="40%" />
				</div>
			</div>
		))}
	</Skeleton>
);

Skeleton.SearchBar = ({ className = '' }) => (
	<Skeleton className={`fp-skeleton-search-bar ${className}`.trim()}>
		<Skeleton.Item className="fp-skeleton-search-bar__input" />
	</Skeleton>
);

Skeleton.DirectoryGrid = ({ count = 4, className = '' }) => (
	<Skeleton className={`fp-skeleton-directory-grid ${className}`.trim()}>
		{Array.from({ length: count }, (_, i) => (
			<div key={i} className="fp-skeleton-directory-item">
				<Skeleton.Item className="fp-skeleton-directory-item__icon" />
				<Skeleton.Row width="70%" />
			</div>
		))}
	</Skeleton>
);

Skeleton.Toolbar = ({ className = '' }) => (
	<Skeleton className={`fp-skeleton-toolbar ${className}`.trim()}>
		<div className="fp-skeleton-toolbar__breadcrumb">
			<Skeleton.Row width={60} />
			<Skeleton.Row width={80} />
		</div>
		<Skeleton.SearchBar />
	</Skeleton>
);

export default Skeleton;
