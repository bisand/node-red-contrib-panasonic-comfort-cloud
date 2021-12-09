// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');

module.exports = function (RED) {
    function mapValue(input) {
        const result = {};
        Object.keys(input).forEach(key => {
            if (typeof input[key] === 'object')
                result[key.indexOf('_') == 0 ? key.substring(1) : key] = mapObject(input[key]);
            else
                result[key.indexOf('_') == 0 ? key.substring(1) : key] = input[key];
        });
        return result;
    }

    function mapObject(input) {
        const result = Array.isArray(input) ? [] : {};
        if (Array.isArray(input)) {
            input.forEach(item => {
                if (typeof item === 'object')
                    result[key.indexOf('_') == 0 ? key.substring(1) : key] = mapObject(input[key]);
                else
                    result.push(input);
            });
        } else {
            Object.keys(input).forEach(key => {
                if (Array.isArray(input[key]))
                    result.push(mapObject(input[key]));
                else
                    result[key.indexOf('_') == 0 ? key.substring(1) : key] = mapValue(input[key]);
            });
        }
        return result;
    }

    function ComfortCloudGroups(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var context = this.context();
        var globalContext = this.context().global;
        var credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            let client = new cloud.ComfortCloudClient();
            client.token = credentials.accessToken ? credentials.accessToken : '42';
            let retryCount = 0;
            const maxRetry = 3;
            if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                msg.payload = null;
                send(msg);
            }
            while (retryCount++ < maxRetry) {
                try {
                    const groups = await client.getGroups();
                    msg.payload = mapObject(groups);
                    send(msg);
                    break;
                } catch (error) {
                    try {
                        if (error.httpCode === 401) {
                            let accessToken = await client.login(credentials.username, credentials.password);
                            credentials.accessToken = accessToken;
                            RED.nodes.addCredentials(config.comfortCloudConfig, credentials);
                            node.log('Obtained a new access token.');
                        } else if (error.httpCode === 403) {
                            const err = new Error(`An error ocurred while trying to get group. Check credentials: ${error}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        } else {
                            const err = new Error(`An error ocurred while trying to get group: ${error}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        }
                    } catch (loginErr) {
                        if (done) {
                            done(loginErr);
                        } else {
                            node.error(loginErr, msg);
                        }
                        break;
                    }
                }
            }
            if (retryCount >= maxRetry) {
                node.error('Reached max retry count ' + maxRetry + '. Please check your credentials, or read the logs for more information.')
            }

            if (done) {
                done();
            }
        });
    }
    RED.nodes.registerType("pcc-groups", ComfortCloudGroups);
}