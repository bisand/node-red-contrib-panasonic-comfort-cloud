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

}
module.exports = Tools;
