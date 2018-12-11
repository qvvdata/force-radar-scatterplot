export default class Helpers {
    constructor() {
        console.log('This is a pure static class. Do not instantiate');
    }

    /**
     * Check if item is in fact an Object and not an array.
     *
     * @param  {*}       item
     * @return {Boolean}
     */
    static isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Deep merge 2 objects.
     *
     * The source will overwrite properties in the target.
     *
     * @param  {Object} target
     * @param  {Object} source
     * @return {Object}
     */
    static mergeDeep(target, source) {
        const output = Object.assign({}, target);
        if (Helpers.isObject(target) && Helpers.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (Helpers.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = Helpers.mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }

        return output;
    }

    /**
     * Convert degrees to radians.
     *
     * @param  {Number} angle
     * @return {Number}
     */
    static degToRad(angle) {
        return angle * Math.PI / 180;
    }

    /**
     * return the angle between two points.
     *
     * @param {number} x1       x position of first point
     * @param {number} y1       y position of first point
     * @param {number} x2       x position of second point
     * @param {number} y2       y position of second point
     * @return {number}         angle between two points (in radian)
     */
    static getAngleInRadians(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;

        return Math.atan2(dy, dx);
    }

    /**
     * return the angle between two points.
     *
     * @param {number} x1       x position of first point
     * @param {number} y1       y position of first point
     * @param {number} x2       x position of second point
     * @param {number} y2       y position of second point
     * @return {number}         angle between two points (in radian)
     */
    static getAngleInDegrees(x1, y1, x2, y2) {
        return Helpers.getAngleInRadians(x1, y1, x2, y2) * 180 / Math.PI;
    }

    /**
     * Rotates a point around an origin.
     *
     * @param  {Number} cx
     * @param  {Number} cy
     * @param  {Number} x
     * @param  {Number} y
     * @param  {Number} angle
     * @return {Number}
     */
    static rotate(cx, cy, x, y, angle) {
        const radians = (Math.PI / 180) * angle;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
        const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

        return {
            x: nx,
            y: ny
        };
    }

    /**
     * Checks if we are on a 4k screen.
     *
     * @return {Boolean}
     */
    static on4kScreen() {
        let test;

        const width = screen.width;
        const height = screen.height;

        if (height > width) {
            test = height;
        } else {
            test = width;
        }

        return (test > 3839);
    }
}
