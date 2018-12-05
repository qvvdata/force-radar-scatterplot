export default class TargetPoint {
    constructor(x, y) {
        /**
         * X coordinate.
         *
         * @type {Number}
         */
        this.x = x;

        /**
         * Y coordinate.
         *
         * @type {Number}
         */
        this.y = y;
    }

    /**
     * Getters
     */
    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }
}
