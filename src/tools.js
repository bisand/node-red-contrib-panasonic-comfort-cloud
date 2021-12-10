"use strict";

class Tools {

    constructor() { }

    mapObject(input) {
        let result = Array.isArray(input) ? [] : {};
        if (Array.isArray(input)) {
            input.forEach(item => {
                result.push(this.mapObject(item));
            });
        } else if (typeof input === 'object') {
            Object.keys(input).forEach(key => {
                result[key.indexOf('_') == 0 ? key.substring(1) : key] = this.mapObject(input[key]);
            });
        } else {
            result = input;
        }
        return result;
    }

}
module.exports = Tools;
