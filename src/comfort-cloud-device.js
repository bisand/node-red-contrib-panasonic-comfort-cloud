// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');

module.exports = function (RED) {
    function ComfortCloudDevice(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var context = this.context();
        var globalContext = this.context().global;
        let credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg) {
            let client = new cloud.ComfortCloudClient();
            client.token = credentials.accessToken;
            let retryCount = 0;
            const maxRetry = 3;
            if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                msg.payload = null;
                node.send(msg);
            }
            while (retryCount++ < maxRetry) {
                try {
                    node.log(msg.payload);
                    // const device = await client.getDevice(msg.payload);
                    const groups = await client.getGroups();
                    const guid = msg.payload;
                    msg.payload = null;
                    let found = false;
                    if (groups && groups.length > 0) {
                        for (let i = 0; i < groups.length; i++) {
                            const group = groups[i];
                            if (group._devices && group._devices.length > 0) {
                                for (let j = 0; j < group._devices.length; j++) {
                                    const device = group._devices[j];
                                    if (device && device.guid === guid) {
                                        msg.payload = device;
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            if (found) {
                                break;
                            }
                        }
                    }
                    node.send(msg);
                    break;
                } catch (err) {
                    try {
                        let accessToken = await client.login(credentials.username, credentials.password);
                        credentials.accessToken = accessToken;
                        RED.nodes.addCredentials(config.comfortCloudConfig, credentials);
                        node.log('Obtained a new access token.');
                    } catch (loginErr) {
                        node.error(loginErr);
                        break;
                    }
                }
            }
            if (retryCount >= maxRetry) {
                node.error('Reached max retry count ' + maxRetry + '. Please check your credentials, or read the logs for more information.')
            }
        });
    }
    RED.nodes.registerType("pcc-device", ComfortCloudDevice);
}