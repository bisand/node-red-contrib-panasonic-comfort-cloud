// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');
const {
    Power,
    AirSwingLR,
    AirSwingUD,
    FanAutoMode,
    EcoMode,
    OperationMode,
    FanSpeed
} = require('panasonic-comfort-cloud-client');

Object.defineProperty(Object.prototype, "getProp", {
    value: function (prop) {
        var key, self = this;
        for (key in self) {
            if (key.toLowerCase() == prop.toLowerCase()) {
                return self[key];
            }
        }
    },
    //this keeps jquery happy
    enumerable: false
});

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

                    if (msg.payload.operate) {
                        const power = Number(isNaN(msg.payload.operate)
                            ? Power.getProp(msg.payload.operate)
                            : msg.payload.operate);
                        node.log(power);
                        if (!isNaN(power))
                            device.power = power;
                    }
                    if (msg.payload.operationMode) {
                        const operationMode = Number(isNaN(msg.payload.operationMode)
                            ? OperationMode.getProp(msg.payload.operationMode)
                            : msg.payload.operationMode);
                        node.log(operationMode);
                        if (!isNaN(operationMode))
                            device.operationMode = operationMode;
                    }
                    if (msg.payload.ecoMode) {
                        const ecoMode = Number(isNaN(msg.payload.ecoMode)
                            ? EcoMode.getProp(msg.payload.ecoMode)
                            : msg.payload.ecoMode);
                        node.log(ecoMode);
                        if (!isNaN(ecoMode))
                            device.ecoMode = ecoMode;
                    }
                    if (msg.payload.temperatureSet) {
                        const temperature = Number(msg.payload.temperatureSet);
                        node.log(temperature);
                        if (!isNaN(temperature))
                            device.temperatureSet = temperature;
                    }
                    if (msg.payload.airSwingUD) {
                        const airSwingUD = Number(isNaN(msg.payload.airSwingUD)
                            ? AirSwingUD.getProp(msg.payload.airSwingUD)
                            : msg.payload.airSwingUD);
                        node.log(airSwingUD);
                        if (!isNaN(airSwingUD))
                            device.airSwingUD = airSwingUD;
                    }
                    if (msg.payload.airSwingLR) {
                        const airSwingLR = Number(isNaN(msg.payload.airSwingLR)
                            ? AirSwingLR.getProp(msg.payload.airSwingLR)
                            : msg.payload.airSwingLR);
                        node.log(airSwingLR);
                        if (!isNaN(airSwingLR))
                            device.airSwingLR = airSwingLR;
                    }
                    if (msg.payload.fanAutoMode) {
                        const fanAutoMode = Number(isNaN(msg.payload.fanAutoMode)
                            ? FanAutoMode.getProp(msg.payload.fanAutoMode)
                            : msg.payload.fanAutoMode);
                        node.log(fanAutoMode);
                        if (!isNaN(fanAutoMode))
                            device.fanAutoMode = fanAutoMode;
                    }
                    if (msg.payload.fanSpeed) {
                        const fanSpeed = Number(isNaN(msg.payload.fanSpeed)
                            ? FanSpeed.getProp(msg.payload.fanSpeed)
                            : msg.payload.fanSpeed);
                        node.log(fanSpeed);
                        if (!isNaN(fanSpeed))
                            device.fanSpeed = fanSpeed;
                    }

                    msg.payload = await client.setParameters(deviceId, device.parameters);
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