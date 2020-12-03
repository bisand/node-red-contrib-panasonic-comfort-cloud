# node-red-contrib-panasonic-comfort-cloud

Node-RED support for Panasonic Comfort Cloud to control air conditioning systems over REST API. This libaray uses the same endpoints as the mobile app Panasonic Comfort Cloud. Based on [panasonic-comfort-cloud-client](https://www.npmjs.com/package/panasonic-comfort-cloud-client)

> Currently it only support getting the groups of homes and devices.

## Features
* Get groups of the devices
* Get single device.

## Usage
Provide username and password via the config node. The access token will be retrieved and stored in the credentials after the first login. It will only be stored in memory store, so after a restart, it will have to be renewed again. This is done automatically if you have provided a correct username and password.

#### Groups
Does not process any input, but returns a list of all homes and devices in your setup.

#### Device
Takes device ID as an input in the payload. You can find the device id by looking for **guid** in the list of devices from the **groups** result.

## Licence
[MIT](https://github.com/bisand/node-red-contrib-panasonic-comfort-cloud/blob/HEAD/LICENSE)
