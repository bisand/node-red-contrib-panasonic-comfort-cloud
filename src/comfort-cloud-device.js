// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');

module.exports = function (RED) {
    function ComfortCloudDevice(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg) {
            let client = new cloud.ComfortCloudClient();
            client.token = credentials.accessToken;
            if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                msg.payload = null;
                node.send(msg);
            }
            const device = await client.getDevice(msg.payload);
            msg.payload = device;
            node.send(msg);
        });
    }
    RED.nodes.registerType("pcc-device", ComfortCloudDevice);
}