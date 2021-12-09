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
    function getType(p) {
        if (Array.isArray(p)) return 'array';
        else if (typeof p == 'string') return 'string';
        else if (p != null && typeof p == 'object') return 'object';
        else return 'other';
    }

    function validatePayload(payload) {
        if (payload) {
            try {
                if (getType(payload) === 'string')
                    payload = JSON.parse(payload);
                if (getType(payload) === 'object')
                    return { result: true, payload };
            } catch (error) {
                let err = new Error(`An error ocurred while parsing payload. Payload must be valid JSON. Error: ${error}`);
                return { result: false, payload, err };
            }
        }
        const err = new Error('Payload must be valid JSON.');
        return { result: false, payload, err };
    }

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

            const payloadValidation = validatePayload(msg.payload)
            if (!payloadValidation.result) {
                if (done) {
                    done(payloadValidation.err);
                } else {
                    node.error(payloadValidation.err, msg);
                }
                return;
            }
            const payload = payloadValidation.payload;

            if (!_config.deviceId && (!payload || !payload.deviceId)) {
                const err = 'Missing Device ID. Send Device ID via payload or define in config.';
                if (done) {
                    done(err);
                } else {
                    node.error(err, msg);
                }
                return;
            }

            while (retryCount++ < maxRetry) {
                try {
                    node.log(payload);
                    const deviceId = _config.deviceId ? _config.deviceId : payload.deviceId;
                    const device = await client.getDevice(deviceId);

                    if (payload.operate) {
                        const power = Number(isNaN(payload.operate)
                            ? Power.getProp(payload.operate)
                            : payload.operate);
                        node.log(power);
                        if (!isNaN(power))
                            device.power = power;
                    }
                    if (payload.operationMode) {
                        const operationMode = Number(isNaN(payload.operationMode)
                            ? OperationMode.getProp(payload.operationMode)
                            : payload.operationMode);
                        node.log(operationMode);
                        if (!isNaN(operationMode))
                            device.operationMode = operationMode;
                    }
                    if (payload.ecoMode) {
                        const ecoMode = Number(isNaN(payload.ecoMode)
                            ? EcoMode.getProp(payload.ecoMode)
                            : payload.ecoMode);
                        node.log(ecoMode);
                        if (!isNaN(ecoMode))
                            device.ecoMode = ecoMode;
                    }
                    if (payload.temperatureSet) {
                        const temperature = Number(payload.temperatureSet);
                        node.log(temperature);
                        if (!isNaN(temperature))
                            device.temperatureSet = temperature;
                    }
                    if (payload.airSwingUD) {
                        const airSwingUD = Number(isNaN(payload.airSwingUD)
                            ? AirSwingUD.getProp(payload.airSwingUD)
                            : payload.airSwingUD);
                        node.log(airSwingUD);
                        if (!isNaN(airSwingUD))
                            device.airSwingUD = airSwingUD;
                    }
                    if (payload.airSwingLR) {
                        const airSwingLR = Number(isNaN(payload.airSwingLR)
                            ? AirSwingLR.getProp(payload.airSwingLR)
                            : payload.airSwingLR);
                        node.log(airSwingLR);
                        if (!isNaN(airSwingLR))
                            device.airSwingLR = airSwingLR;
                    }
                    if (payload.fanAutoMode) {
                        const fanAutoMode = Number(isNaN(payload.fanAutoMode)
                            ? FanAutoMode.getProp(payload.fanAutoMode)
                            : payload.fanAutoMode);
                        node.log(fanAutoMode);
                        if (!isNaN(fanAutoMode))
                            device.fanAutoMode = fanAutoMode;
                    }
                    if (payload.fanSpeed) {
                        const fanSpeed = Number(isNaN(payload.fanSpeed)
                            ? FanSpeed.getProp(payload.fanSpeed)
                            : payload.fanSpeed);
                        node.log(fanSpeed);
                        if (!isNaN(fanSpeed))
                            device.fanSpeed = fanSpeed;
                    }

                    msg.payload = await client.setParameters(deviceId, device.parameters);
                    send(msg);
                    break;
                } catch (error) {
                    try {
                        if (error.httpCode === 403) {
                            const err = new Error(`An error ocurred while trying to set device parameter. Check Device ID or credentials: ${error}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        }

                        let accessToken = await client.login(credentials.username, credentials.password);
                        credentials.accessToken = accessToken;
                        RED.nodes.addCredentials(config.comfortCloudConfig, credentials);
                        node.log('Obtained a new access token.');
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
                const retryErr = new Error('Reached max retry count ' + maxRetry + '. Please check your credentials, or read the logs for more information.');
                if (done) {
                    done(retryErr);
                } else {
                    node.error(retryErr, msg);
                }
            }

            if (done) {
                done();
            }
        });
    }
    RED.nodes.registerType("pcc-command", ComfortCloudCommand);
}