// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-api';
const {
    ComfortCloud,
    Power,
    AirSwingLR,
    AirSwingUD,
    FanAutoMode,
    EcoMode,
    OperationMode,
    FanSpeed,
    NanoeMode
} = require('panasonic-comfort-cloud-api');

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
        // var context = this.context();
        // var globalContext = this.context().global;
        let credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            // For maximum backwards compatibility, check that send exists.
            // If this node is installed in Node-RED 0.x, it will need to
            // fallback to using `node.send`
            send = send || function () { node.send.apply(node, arguments) }
            let client = new ComfortCloud();
            client.token = credentials.accessToken ? credentials.accessToken : '42';
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

            if (!_config.deviceId && (!payload || (!payload.deviceId && !payload.deviceGuid))) {
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
                    const pid = (payload.deviceId ? payload.deviceId : payload.deviceGuid);
                    const deviceId = pid ? pid : _config.deviceId;
                    // const device = await client.getDevice(deviceId);
                    const parameters = {};

                    if (payload.operate) {
                        const operate = Number(isNaN(payload.operate)
                            ? Power.getProp(payload.operate)
                            : payload.operate);
                        node.log(`Power: ${operate}`);
                        if (!isNaN(operate))
                            parameters.operate = operate;
                    }
                    if (payload.operationMode) {
                        const operationMode = Number(isNaN(payload.operationMode)
                            ? OperationMode.getProp(payload.operationMode)
                            : payload.operationMode);
                        node.log(`Operation Mode: ${operationMode}`);
                        if (!isNaN(operationMode))
                            parameters.operationMode = operationMode;
                    }
                    if (payload.ecoMode) {
                        const ecoMode = Number(isNaN(payload.ecoMode)
                            ? EcoMode.getProp(payload.ecoMode)
                            : payload.ecoMode);
                        node.log(`Eco Mode: ${ecoMode}`);
                        if (!isNaN(ecoMode))
                            parameters.ecoMode = ecoMode;
                    }
                    if (payload.temperatureSet) {
                        const temperature = Number(payload.temperatureSet);
                        node.log(`Temperature: ${temperature}`);
                        if (!isNaN(temperature))
                            parameters.temperatureSet = temperature;
                    }
                    if (payload.airSwingUD) {
                        const airSwingUD = Number(isNaN(payload.airSwingUD)
                            ? AirSwingUD.getProp(payload.airSwingUD)
                            : payload.airSwingUD);
                        node.log(`Air swing UD: ${airSwingUD}`);
                        if (!isNaN(airSwingUD))
                            parameters.airSwingUD = airSwingUD;
                    }
                    if (payload.airSwingLR) {
                        const airSwingLR = Number(isNaN(payload.airSwingLR)
                            ? AirSwingLR.getProp(payload.airSwingLR)
                            : payload.airSwingLR);
                        node.log(`Air swing LR: ${airSwingLR}`);
                        if (!isNaN(airSwingLR))
                            parameters.airSwingLR = airSwingLR;
                    }
                    if (payload.fanAutoMode) {
                        const fanAutoMode = Number(isNaN(payload.fanAutoMode)
                            ? FanAutoMode.getProp(payload.fanAutoMode)
                            : payload.fanAutoMode);
                        node.log(`Fan auto mode: ${fanAutoMode}`);
                        if (!isNaN(fanAutoMode))
                            parameters.fanAutoMode = fanAutoMode;
                    }
                    if (payload.fanSpeed) {
                        const fanSpeed = Number(isNaN(payload.fanSpeed)
                            ? FanSpeed.getProp(payload.fanSpeed)
                            : payload.fanSpeed);
                        node.log(`Fan speed: ${fanSpeed}`);
                        if (!isNaN(fanSpeed))
                            parameters.fanSpeed = fanSpeed;
                    }
                    if (payload.nanoe) {
                        const nanoe = Number(isNaN(payload.nanoe)
                            ? NanoeMode.getProp(payload.nanoe)
                            : payload.nanoe);
                        node.log(`Nanoe mode: ${nanoe}`);
                        if (!isNaN(nanoe))
                            parameters.nanoe = nanoe;
                    }

                    msg.payload = await client.setParameters(deviceId, parameters);
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
                            const err = new Error(`An error ocurred while trying to set device parameter. Check Device ID (${deviceId}) or credentials: ${JSON.stringify(error)}`)
                            if (done) {
                                done(err);
                            } else {
                                node.error(err, msg);
                            }
                            return;
                        } else {
                            const err = new Error(`An error ocurred while trying to set device parameter: ${JSON.stringify(error)}`)
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