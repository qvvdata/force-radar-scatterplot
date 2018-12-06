import Helpers from './Helpers';
import Point from './Point';

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
         * We draw circles as collision detectors.
         * this is the full width of the detection object.
         * @type {Number}
         */
        this.collisionPrecision = 2 * window.devicePixelRatio;

        if (Helpers.on4kScreen() === true) {
            this.collisionPrecision = 5 * window.devicePixelRatio;
        }

        // console.log(Helpers.test4k());
        this.element = null;

        this.untransformedBBox = null;
    }

    /**
     * @return {Target}
     */
    render() {
        this.element = this.createElement();
        const coords = this.calculateDrawingCoordinates();
        const rotation = this.calculateRotationAngle();

        const untransformedStyle = [
            `left: ${coords.x}px`,
            `top: ${coords.y}px`,
            `height: ${this.chart.settings.target.height}px`,
            `width: ${this.chart.settings.target.width}px`,
        ];

        const style = [
            `left: ${coords.x}px`,
            `top: ${coords.y}px`,
            'transform-origin: center',
            `transform: rotate(${rotation}deg)`,

            `height: ${this.chart.settings.target.height}px`,
            `width: ${this.chart.settings.target.width}px`,
        ];

        // First apply the untransformed style so we can get it's untransformed bounding box.
        this.element.setAttribute('style', untransformedStyle.join(';'));
        this.chart.layers.targets.appendChild(this.element);


        // Get the untransformed bounding box.
        this.untransformedBBox = this.element.getBoundingClientRect();

        // Apply original style.
        this.element.setAttribute('style', style.join(';'));

        this.x = coords.xCenter;
        this.y = coords.yCenter;
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
            y: centerY - (y * radius) - (this.chart.settings.target.height / 2),

            xCenter: centerX + (x * radius),
            yCenter: centerY - (y * radius)
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
        const points = [];
        const BBox = this.untransformedBBox;
        const BBoxChart = this.chart.holder.getBoundingClientRect();
        const chartCenter = this.chart.getCenterCoords();

        const relativePos = {
            top: BBox.top - BBoxChart.top,
            right: BBox.right - BBoxChart.left,
            bottom: BBox.bottom - BBoxChart.top,
            left: BBox.left - BBoxChart.left
        };

        relativePos.width = relativePos.right - relativePos.left;
        relativePos.height = relativePos.bottom - relativePos.top;
        relativePos.x = relativePos.left;
        relativePos.y = relativePos.top;

        const stepsWidth = Math.ceil(BBox.width / this.collisionPrecision);
        const stepsHeight = Math.ceil(BBox.height / this.collisionPrecision / 2);

        const targetCenterX = relativePos.left + relativePos.width / 2;
        const targetCenterY = relativePos.top + relativePos.height / 2;

        console.log('stepsHeight', stepsHeight);
        for (let i = 1; i < stepsWidth; i++) {
            for (let j = 0; j < stepsHeight; j++) {
                // Skip the first and last circle of the row closest the center
                // because they are out of bounds because the targets are rounded.
                if (i === 1 && j === stepsHeight - 1) continue;
                if (i === stepsWidth - 1 && j === stepsHeight - 1) continue;

                const point = new Point(this.chart);
                point.isStatic = true;

                point.x = relativePos.left + (i * this.collisionPrecision);
                point.y = relativePos.bottom - (BBox.height / 2) + (j * this.collisionPrecision);

                const rotatedCoords = Helpers.rotate(targetCenterX, targetCenterY, point.x, point.y, this.angle - 90);

                point.x = rotatedCoords.x;
                point.y = rotatedCoords.y;

                point.radius = this.collisionPrecision / 2;
                points.push(point);
            }
        }

        return points;
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
