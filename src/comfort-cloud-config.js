module.exports = function (RED) {
    function ComfortCloudConfig(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('export', () => {
            console.log('EXPORT! Nothing done!');
        });
    }
    RED.nodes.registerType('pcc-config', ComfortCloudConfig, {
        credentials: {
            accessToken: {
                type: 'password',
            },
            username: {
                type: 'text',
            },
            password: {
                type: 'password',
            }
        },
    });
};
