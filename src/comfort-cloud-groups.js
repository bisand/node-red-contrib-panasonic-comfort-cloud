// import { Device, Group, ComfortCloudClient } from 'panasonic-comfort-cloud-client';
const cloud = require('panasonic-comfort-cloud-client');

module.exports = function (RED) {
    function ComfortCloudGroups(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var credentials = RED.nodes.getCredentials(config.comfortCloudConfig);
        node.on('input', async function (msg) {
            let client = new cloud.ComfortCloudClient();
            client.token = credentials.accessToken;
            // List of groups representing different homes, containig a list of devices
            const groups = await client.getGroups();
            msg.payload = groups;
            node.send(msg);
        });
    }
    RED.nodes.registerType("pcc-groups", ComfortCloudGroups);
}