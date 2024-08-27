// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const { ComfortCloudClient } = require('panasonic-comfort-cloud-client');
// const Tools = require('./tools');

module.exports = function (RED) {
    function ComfortCloudDevice(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const _config = config;
        // const _tools = new Tools();
        // var context = this.context();
        // var globalContext = this.context().global;
        let credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            // For maximum backwards compatibility, check that send exists.
            // If this node is installed in Node-RED 0.x, it will need to
            // fallback to using `node.send`
            send = send || function () { node.send.apply(node, arguments) }
            let client = new ComfortCloudClient();
            await client.login(credentials.username, credentials.password);
            let retryCount = 0;
            const maxRetry = 3;
            if (!_config.deviceId && (msg.payload === undefined || msg.payload === null || msg.payload === '')) {
                const err = 'Missing Device ID. Send Device ID via payload or define in config.';
                if (done) {
                    done(err);
                } else {
                    node.error(err, msg);
                }
            }
            while (retryCount++ < maxRetry) {
                try {
                    const deviceId = _config.deviceId ? _config.deviceId : msg.payload;
                    msg.payload = await client.getDevice(deviceId);
                    send(msg);
                    break;
                } catch (error) {
                    try {
                        if (error.httpCode === 401) {
                            let accessToken = await client.login(credentials.username, credentials.password);
                            credentials.accessToken = accessToken.uToken;
                            RED.nodes.addCredentials(config.comfortCloudConfig, credentials);
                            node.log('Obtained a new access token.');
                        } else if (error.httpCode === 403) {
                            const err = new Error(`An error ocurred while trying to get device. Check Device ID or credentials: ${JSON.stringify(error)}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        } else {
                            const err = new Error(`An error ocurred while trying to get device: ${JSON.stringify(error)}`)
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
    RED.nodes.registerType("pcc-device", ComfortCloudDevice);
}