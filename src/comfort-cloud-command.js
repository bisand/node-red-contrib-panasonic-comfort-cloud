// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');
const { Power } = require('panasonic-comfort-cloud-client');

module.exports = function (RED) {
    function ComfortCloudCommand(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const _config = config;
        var context = this.context();
        var globalContext = this.context().global;
        let credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            // For maximum backwards compatibility, check that send exists.
            // If this node is installed in Node-RED 0.x, it will need to
            // fallback to using `node.send`
            send = send || function () { node.send.apply(node, arguments) }
            let client = new cloud.ComfortCloudClient();
            client.token = credentials.accessToken;
            let retryCount = 0;
            const maxRetry = 3;
            if (!_config.deviceId && !msg.payload && !msg.payload.deviceId) {
                const err = 'Missing Device ID. Send Device ID via payload or define in config.';
                if (done) {
                    done(err);
                } else {
                    node.error(err, msg);
                }
            }
            if (!msg.payload && !msg.payload.command) {
                const err = 'Missing command. Send command via payload.';
                if (done) {
                    done(err);
                } else {
                    node.error(err, msg);
                }
            }
            while (retryCount++ < maxRetry) {
                try {
                    node.log(msg.payload);
                    const deviceId = _config.deviceId ? _config.deviceId : msg.payload.deviceId;
                    const device = await client.getDevice(deviceId);
                    switch (msg.payload.command) {
                        case 'off':
                            device.operate = Power.Off;
                            break;
                        case 'on':
                            device.operate = Power.On;
                            break;
                    }
                    msg.payload = device;
                    msg.payload = await client.setDevice(device);
                    send(msg);
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

            if (done) {
                done();
            }
        });
    }
    RED.nodes.registerType("pcc-command", ComfortCloudCommand);
}