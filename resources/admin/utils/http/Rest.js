import ResponseProxyItr from './ResponseProxyItr';

let instance = null;

const addQueryParam = function(url, key, value) {
    let separator = url.indexOf('?') !== -1 ? '&' : '?';
    return url + separator + key + '=' + value;
}

const request = function (method, route, data = {}, headers = {}) {
    const config = instance.config.globalProperties.appVars;
    const url = `${config.rest.url}/${route.replace(/^\/+/, '')}`;

    headers['X-WP-Nonce'] = config.rest.nonce;

    if (['PUT', 'PATCH', 'DELETE'].indexOf(method.toUpperCase()) !== -1) {
        headers['X-HTTP-Method-Override'] = method;
        method = 'POST';
    }

    return new Promise((resolve, reject) => {
        jQuery.ajax({
            url: addQueryParam(url, 'query_timestamp', Date.now()),
            type: method,
            data: data,
            headers: headers
        })
        .then(response => resolve(response))
        .fail(response => reject(new ResponseProxyItr(response)));
    });
}

export default {
    setInstance(app) {
        instance = app;
    },
    get(route, data = {}, headers = {}) {
        return request('GET', route, data, headers);
    },
    post(route, data = {}, headers = {}) {
        return request('POST', route, data, headers);
    },
    delete(route, data = {}, headers = {}) {
        return request('DELETE', route, data, headers);
    },
    put(route, data = {}, headers = {}) {
        return request('PUT', route, data, headers);
    },
    patch(route, data = {}, headers = {}) {
        return request('PATCH', route, data, headers);
    }
};

jQuery(document).on('heartbeat-tick', function(event, data) {
    const key = instance.config.globalProperties.appVars.slug;
    if (data[key]) {
        instance.config.globalProperties.appVars.rest.nonce = data[key];
    }
});
