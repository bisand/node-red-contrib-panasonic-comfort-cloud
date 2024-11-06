// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const { ComfortCloudClient } = require('panasonic-comfort-cloud-client');
const Tools = require('./tools');

module.exports = function (RED) {
    function ComfortCloudGroups(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const _config = config;
        const _tools = new Tools();
        if (!_config.appVersion) {
            _tools.getCcAppVersion().then(version => {
                _config.appVersion = version;
            }).catch(error => {
                console.error('Error getting app version:', error);
                node.error(error);
            });
        }
        // var context = this.context();
        // var globalContext = this.context().global;
        var credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            let client = new ComfortCloudClient(_config.appVersion);
            await client.login(credentials.username, credentials.password);
            let retryCount = 0;
            const maxRetry = 3;
            if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                msg.payload = null;
                send(msg);
            }
            while (retryCount++ < maxRetry) {
                try {
                    msg.payload = await client.getGroups();
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
                            const err = new Error(`An error ocurred while trying to get group. Check credentials: ${JSON.stringify(error)}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        } else {
                            const err = new Error(`An error ocurred while trying to get group: ${JSON.stringify(error)}`)
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