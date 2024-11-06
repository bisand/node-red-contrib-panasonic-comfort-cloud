"use strict";

class Tools {

    constructor() { }

    /** Map object and remove leading underscores on properties */
    mapObject(input) {
        let result = Array.isArray(input) ? [] : {};
        if (Array.isArray(input)) {
            input.forEach(item => {
                result.push(this.mapObject(item));
            });
        } else if (typeof input === 'object') {
            Object.keys(input).forEach(key => {
                const k = key.indexOf('_') == 0 ? key.substring(1) : key;
                result[k] = this.mapObject(input[key]);
            });
        } else {
            result = input;
        }
        return result;
    }

    /**
     * Returns Panasonic Comfort Cloud app version
     * @returns Version number as String
     */
    async getCcAppVersion() {
        try {
            const uri = new URL(`https://itunes.apple.com/lookup?id=1348640525`);
            const response = await fetch(uri.href).then(response => response.json())
            const version = response?.results[0]?.version;
            return version;
        } catch (error) {
            console.error(error);
            node.error(error, msg);
        }
        return this._ccAppVersion;
    }


}
module.exports = Tools;
