const generator = key => 'fframe-' + key; // you should change this prefix

export default class Storage {
    static get(key, defaultValue = '') {
        let value;

        try {
            value = localStorage.getItem(generator(key));
        } catch (e) {
            return defaultValue;
        }

        if (value && ['{', '['].indexOf(value[0]) !== -1) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                return defaultValue;
            }
        }

        if (!value) {
            return defaultValue;
        }

        return value;
    }

    static set(key, value) {
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }

        // Writes are best effort: private mode and quota errors must not break the UI.
        try {
            localStorage.setItem(generator(key), value);
        } catch (e) {}
    }

    static remove(key) {
        try {
            localStorage.removeItem(generator(key));
        } catch (e) {}
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (e) {}
    }
}
