// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const { handleError, getClient } = require('./tools');
// const Tools = require('./tools');

module.exports = function (RED) {
    function ComfortCloudDevice(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const _config = config;
        // const _tools = new Tools();
        // var context = this.context();
        // var globalContext = this.context().global;
        const cfg = RED.nodes.getNode(config.comfortCloudConfig);
        node.on('input', async function (msg, send, done) {
            try {
                // For maximum backwards compatibility, check that send exists.
                // If this node is installed in Node-RED 0.x, it will need to
                // fallback to using `node.send`
                send = send || function () { node.send.apply(node, arguments) }

                let client = await getClient(cfg);
                let retryCount = 0;
                const maxRetry = 3;

                if (!_config.deviceId && (msg.payload === undefined || msg.payload === null || msg.payload === '')) {
                    const err = 'Missing Device ID. Send Device ID via payload or define in config.';
                    handleError(done, err, node, msg);
                    return;
                }
                while (retryCount++ < maxRetry) {
                    try {
                        const deviceId = _config.deviceId ? _config.deviceId : msg.payload;
                        msg.payload = await client.getDevice(deviceId);
                        send(msg);
                        break;
                    } catch (error) {
                        try {
                            if (error.httpCode === 401 || error.httpCode === 412) {
                                try {
                                    await client.login(cfg.credentials.username, cfg.credentials.password);
                                    node.log('Obtained a new access token.');
                                } catch (loginError) {
                                    handleError(done, loginError, node, msg);
                                }
                            } else if (error.httpCode === 403) {
                                const err = new Error(`An error ocurred while trying to get device. Check Device ID or credentials: ${JSON.stringify(error)}`)
                                handleError(done, err, node, msg);
                                return;
                            } else {
                                const err = new Error(`An error ocurred while trying to get device: ${JSON.stringify(error)}`)
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
                    node.error('Reached max retry count ' + maxRetry + '. Please check your credentials, or read the logs for more information.')
                }

                if (done) {
                    done();
                }
            } catch (error) {
                handleError(done, error, node, msg);
            }
        });
    }
    RED.nodes.registerType("pcc-device", ComfortCloudDevice);
}