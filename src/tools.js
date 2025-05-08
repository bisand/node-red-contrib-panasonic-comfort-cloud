"use strict"

const { ComfortCloudClient } = require('panasonic-comfort-cloud-client')
const { version: moduleVersion } = require('../package.json')
const { devDependencies } = require('../package.json')

class Tools {

    constructor() { }

    /** Map object and remove leading underscores on properties */
    mapObject(input) {
        let result = Array.isArray(input) ? [] : {}
        if (Array.isArray(input)) {
            input.forEach(item => {
                result.push(this.mapObject(item))
            })
        } else if (typeof input === 'object') {
            Object.keys(input).forEach(key => {
                const k = key.indexOf('_') == 0 ? key.substring(1) : key
                result[k] = this.mapObject(input[key])
            })
        } else {
            result = input
        }
        return result
    }

}

function getRequestOptions(method, uri) {
    const noderedVersion = devDependencies && devDependencies['node-red']
        ? devDependencies['node-red'].replace(/^[^\d]*/, '') // remove any non-numeric prefix like ^ or ~
        : 'unknown'

    const requestOptions = {
        host: uri.host,
        port: uri.port,
        path: uri.path,
        protocol: uri.protocol,
        method: method,
        headers: {
            Connection: "Keep-Alive",
            "Content-Type": "application/json charset=utf-8",
            Accept: "application/json charset=utf-8",
            Host: uri.hostname,
            "User-Agent": `node-red/${noderedVersion} node-red-contrib-panasonic-comfort-cloud/${moduleVersion}`,
        },
    }

    return requestOptions
}

async function getCcAppVersion() {
    try {
        const uri = 'https://itunes.apple.com/lookup?id=1348640525'
        const options = getRequestOptions('GET', uri)
        const response = await fetch(uri)
        const data = await response.json()
        const version = data.results[0].version
        return version
    } catch (error) {
        console.error(error)
    }
    return this._ccAppVersion
}

function handleError(done, error, node, msg) {
    if (done) {
        done(error)
    } else {
        node.error(error, msg)
    }
}

let clients = {}

async function getClient(config) {
    if (!config.credentials || !config.credentials.username || !config.credentials.password) {
        throw new Error('Missing credentials')
    }
    const { username, password } = config.credentials
    if (!clients[username]) {
        const version = config.appVersion || await getCcAppVersion()
        let clientInstance = new ComfortCloudClient(version)
        try {
            await clientInstance.login(username, password)
        } catch (error) {
            throw new Error(error.message)
        }
        clients[username] = clientInstance
    }
    return clients[username]
}

module.exports = { Tools, handleError, getClient, getCcAppVersion }
