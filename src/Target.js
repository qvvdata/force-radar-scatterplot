import Helpers from './Helpers';

export default class Target {
    /**
     * @param  {ForceRadarScatterplot} chart
     * @param  {Object}                customSettings
     * @return {Target}
     */
    constructor(chart, customSettings) {
        /**
         * @type {ForceRadarScatterplot}
         */
        this.chart = chart;

        /**
         * What angle relative to the center are we drawn at.
         *
         * @type {Number}
         */
        this.angle = 0;

        /**
         * @type {Object}
         */
        this.defaultSettings = {
            id: null,
            color: '#000',
            title: ''
        };

        /**
         * @type {Object}
         */
        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);

        this.x = 0;

        this.y = 0;

        /**
         * We draw circles as collision detectors
         * @type {Number}
         */
        this.collisionPrecision = 2.5 * window.devicePixelRatio;
    }

    /**
     * @return {Target}
     */
    render() {
        const element = this.createElement();
        const coords = this.calculateDrawingCoordinates();
        const rotation = this.calculateRotationAngle();

        const style = [
            `left: ${coords.x}px`,
            `top: ${coords.y}px`,
            'transform-origin: center',
            `transform: rotate(${rotation}deg)`,

            `height: ${this.chart.settings.target.height}px`,
            `width: ${this.chart.settings.target.width}px`,
        ];

        element.setAttribute('style', style.join(';'));

        this.chart.layers.targets.appendChild(element);

        this.x = coords.x;
        this.y = coords.y;
        return this;
    }

    /**
     * Calculates the rotation angle of the target so it is
     * perpendicular to the center.
     *
     * @return {Number}
     */
    calculateRotationAngle() {
        let kwadrant;

        switch (this.angle) {
            // Right.
            case 0:
                return -90;

            // Left.
            case 180:
                return 90;

            // Top and bottom.
            case 90:
            case 270:
                return 0;

            // Other angles.
            default:
                kwadrant = this.calculateKwadrantOfAngle(this.angle);

                if (kwadrant === 3 || kwadrant === 4) {
                    return -90 - this.angle;
                }

                return 90 - this.angle;
        }
    }

    /**
     * https://en.wikipedia.org/wiki/Quadrant_(plane_geometry)
     *
     * @param  {Number} angle
     * @return {?Number}
     */
    calculateKwadrantOfAngle(angle) {
        if (angle >= 0 && angle <= 90) return 1;
        if (angle > 90 && angle <= 180) return 2;
        if (angle > 180 && angle <= 270) return 3;
        if (angle > 270 && angle <= 360) return 4;

        return null;
    }

    /**
     * Calculates the x,y coordinate for the angle.
     *
     * @return {{
     *         x: Number,
     *         y: Number
     * }}
     */
    calculateDrawingCoordinates() {
        const BBoxHolder = this.chart.holder.getBoundingClientRect();
        const centerX = BBoxHolder.width / 2;
        const centerY = BBoxHolder.height / 2;
        const radius = (BBoxHolder.width - this.chart.settings.target.height) / 2;
        const angleInRadians = this.angle * Math.PI / 180;

        let x;
        let y;

        // Deal with some common angles
        // and avoid Math calculations with weird
        // js rounding errors
        switch (this.angle) {
            case 0:
                x = 1;
                y = 0;
                break;

            case 90:
                x = 0;
                y = 1;
                break;

            case 180:
                x = -1;
                y = 0;
                break;

            case 270:
                x = 0;
                y = -1;
                break;

            default:
                x = Math.cos(angleInRadians);
                y = Math.sin(angleInRadians);
                break;
        }

        return {
            x: centerX + (x * radius) - (this.chart.settings.target.width / 2),

            // We invert the  y*radius because a positive number
            // should move the location up which is a negative number in screen coordinates.
            y: centerY - (y * radius) - (this.chart.settings.target.height / 2)
        };
    }

    /**
     * @return {Object}
     */
    createElement() {
        const element = this.chart.document.createElement('div');

        element.innerHTML = this.settings.title;
        element.setAttribute('class', this.chart.createPrefixedIdentifier('target'));

        return element;
    }

    /**
     * We don't want our datapoints to overlap the targets so what we do
     * is create invisible datapoints and add them to the data so the collision
     * functionality detects them and bounces off.
     *
     * These points should be static and not move with the force. Only detect collisions.
     *
     * @return {Array}
     */
    createCollisionPoints() {
        return [];
    }

    /**
     * Getters.
     */

    /**
     * @return {String}
     */
    getId() {
        return this.settings.id;
    }

    getColor() {
        return this.settings.color;
    }

    /**
     * Setters.
     */
    setAngle(angle) {
        // Normalize all angles to be within 0 - 360.
        if (angle > 360) {
            this.angle = angle - 360;
        } else if (angle < 0) {
            this.angle = angle + 360;
        } else {
            this.angle = angle;
        }

        return this;
    }

    getX() {
        return this.x;

    }

    getY() {
        return this.y;
    }
}
