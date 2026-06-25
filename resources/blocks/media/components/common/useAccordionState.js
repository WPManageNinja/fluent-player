const { useEffect, useState } = wp.element;

const useAccordionState = (initialId = null, resetKey = null) => {
	const [openId, setOpenId] = useState(initialId);

	useEffect(() => {
		if (resetKey === null) {
			return;
		}

		setOpenId(initialId);
	}, [initialId, resetKey]);

	const toggle = (id) => {
		setOpenId((currentId) => (currentId === id ? null : id));
	};

	return {
		openId,
		setOpenId,
		toggle,
	};
};

export default useAccordionState;
