const { handleError, getClient } = require('./tools');

module.exports = function (RED) {
    function ComfortCloudGroups(config) {
        RED.nodes.createNode(this, config);
        const node = this;
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

                if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                    msg.payload = null;
                    send(msg);
                    return;
                }

                while (retryCount++ < maxRetry) {
                    try {
                        msg.payload = await client.getGroups();
                        send(msg);
                        break;
                    } catch (error) {
                        if (error.httpCode === 401 || error.httpCode === 403 || error.httpCode === 412) {
                            try {
                                await client.login(cfg.credentials.username, cfg.credentials.password);
                                node.log('Obtained a new access token.');
                            } catch (loginError) {
                                handleError(done, loginError, node, msg);
                            }
                        } else {
                            const err = new Error(`An error ocurred while loading groups: ${JSON.stringify(error)}`)
                            handleError(done, err, node, msg);
                        }
                    }
                }
            } catch (error) {
                handleError(done, error, node, msg);
            }
        });
    }

    RED.nodes.registerType("pcc-groups", ComfortCloudGroups);
};