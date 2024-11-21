// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const {
    Power,
    AirSwingLR,
    AirSwingUD,
    FanAutoMode,
    EcoMode,
    OperationMode,
    FanSpeed,
    NanoeMode,
    InsideCleaning
} = require('panasonic-comfort-cloud-client');
const { handleError, getClient } = require('./tools');

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
            try {
                // For maximum backwards compatibility, check that send exists.
                // If this node is installed in Node-RED 0.x, it will need to
                // fallback to using `node.send`
                send = send || function () { node.send.apply(node, arguments) }

                let client = await getClient(credentials);
                let retryCount = 0;
                const maxRetry = 3;

                if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                    msg.payload = null;
                    send(msg);
                    return;
                }

                const payloadValidation = validatePayload(msg.payload)
                if (!payloadValidation.result) {
                    handleError(done, payloadValidation.err, node, msg);
                    return;
                }
                const payload = payloadValidation.payload;

                if (!_config.deviceId && (!payload || (!payload.deviceId && !payload.deviceGuid))) {
                    const err = 'Missing Device ID. Send Device ID via payload or define in config.';
                    handleError(done, err, node, msg);
                    return;
                }

                const pid = (payload.deviceId ? payload.deviceId : payload.deviceGuid);
                const deviceId = pid ? pid : _config.deviceId;
                // const device = await client.getDevice(deviceId);

                while (retryCount++ < maxRetry) {
                    try {
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
                        if (payload.insideCleaning) {
                            const insideCleaning = Number(isNaN(payload.insideCleaning)
                                ? InsideCleaning.getProp(payload.insideCleaning)
                                : payload.insideCleaning);
                            node.log(`insideCleaning: ${insideCleaning}`);
                            if (!isNaN(insideCleaning))
                                parameters.insideCleaning = insideCleaning;
                        }

                        msg.payload = await client.setParameters(deviceId, parameters);
                        send(msg);
                        break;
                    } catch (error) {
                        try {
                            if (error.httpCode === 401 || error.httpCode === 412) {
                                await client.login(credentials.username, credentials.password);
                                node.log('Obtained a new access token.');
                            } else if (error.httpCode === 403) {
                                const err = new Error(`An error ocurred while trying to set device parameter. Check Device ID (${deviceId}) or credentials: ${JSON.stringify(error)}`)
                                handleError(done, err, node, msg);
                                return;
                            } else {
                                const err = new Error(`An error ocurred while trying to set device parameter: ${JSON.stringify(error)}`)
                                handleError(done, err, node, msg);
                                return;
                            }
                        } catch (loginErr) {
                            handleError(done, loginErr, node, msg);
                            break;
                        }
                    }
                }
                if (retryCount >= maxRetry) {
                    const retryErr = new Error('Reached max retry count ' + maxRetry + '. Please check your credentials, or read the logs for more information.');
                    handleError(done, retryErr, node, msg);
                }

                if (done) {
                    done();
                }
            } catch (error) {
                handleError(done, error, node, msg);
            }
        });
    }
    RED.nodes.registerType("pcc-command", ComfortCloudCommand);
}
