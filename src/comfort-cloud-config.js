module.exports = function (RED) {
    function ComfortCloudConfig(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('export', () => {
            console.log('EXPORT! Nothing done!');
        });
    }
    RED.nodes.registerType('comfort-cloud-config', ComfortCloudConfig, {
        credentials: {
            accessToken: {
                type: 'text',
            },
        },
    });
};
