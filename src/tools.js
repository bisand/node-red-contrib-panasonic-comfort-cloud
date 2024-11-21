"use strict";

const { ComfortCloudClient } = require('panasonic-comfort-cloud-client');

class Tools {

    constructor() { }

    /** Map object and remove leading underscores on properties */
    mapObject(input) {
        let result = Array.isArray(input) ? [] : {};
        if (Array.isArray(input)) {
            input.forEach(item => {
                result.push(this.mapObject(item));
            });
        } else if (typeof input === 'object') {
            Object.keys(input).forEach(key => {
                const k = key.indexOf('_') == 0 ? key.substring(1) : key;
                result[k] = this.mapObject(input[key]);
            });
        } else {
            result = input;
        }
        return result;
    }

}

function handleError(done, error, node, msg) {
    if (done) {
        done(error);
    } else {
        node.error(error, msg);
    }
}

let clients = {};

async function getClient(credentials) {
    const { username, password } = credentials;
    if (!clients[username]) {
        let clientInstance = new ComfortCloudClient();
        await clientInstance.login(username, password);
        clients[username] = clientInstance;
    }
    return clients[username];
}

module.exports = { Tools, handleError, getClient };
