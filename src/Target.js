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
            background: null,
            borderColor: null,
            borderRadius: null,
            borderWidth: null,
            id: null,
            color: null,
            title: ''
        };

        /**
         * We draw circles as collision detectors.
         * this is the full width of the detection object.
         *
         * @type {Number}
         */
        this.collisionPrecision = 3 * window.devicePixelRatio;

        // On 4k screens we reduce the precision by making the dots bigger
        // otherwise it slows down too much.
        if (Helpers.on4kScreen() === true) {
            this.collisionPrecision = 5 * window.devicePixelRatio;
        }

        /**
         * Dom Element.
         *
         * @type {Object}
         */
        this.element = null;

        /**
         * BBox before the element becomes transformed into a rotation.
         *
         * @type {Object}
         */
        this.untransformedBBox = null;

        /**
         * @type {Number}
         */
        this.xCenter = 0;

        /**
         * @type {Number}
         */
        this.yCenter = 0;

        this.statsEl = {};

        /**
         * Points currently at this target.
         *
         * @type {Object}
         */
        this.points = {};

        /**
         * Coordinates for each group to target at.
         *
         * @type {Object}
         */
        this.groupTargetCoordinates = {};

        /**
         * @type {Object}
         */
        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);
    }

    addPoint(point) {
        this.points[point.getId()] = point;

        if (point.isActive === true) {
            this.updateStatistics(point, 1);
        }
    }

    removePoint(point) {
        delete this.points[point.getId()];

        if (point.isActive === true) {
            this.updateStatistics(point, -1);
        }
    }

    updateStatistics(point, change) {
        const statsEl = this.getStatsEl(point.group);

        if (statsEl !== null) {
            const count = parseInt(statsEl.innerHTML, 10);
            statsEl.innerHTML = count + change;
        }
    }

    getStatsEl(groupId) {
        if (this.statsEl[groupId]) {
            return this.statsEl[groupId];
        }

        return null;
    }

    /**
     * @return {Target}
     */
    render() {
        this.element = this.createElement();
        const coords = this.calculateDrawingCoordinates();
        const rotation = this.calculateRotationAngle();

        const color = this.settings.color || this.chart.settings.target.color;
        const background = this.settings.background || this.chart.settings.target.background;
        const borderColor = this.settings.borderColor || this.chart.settings.target.borderColor;
        const borderWidth = this.settings.borderWidth || this.chart.settings.target.borderWidth;
        const borderRadius = this.settings.borderRadius || this.chart.settings.target.borderRadius;

        const untransformedStyle = [
            'position: absolute',
            `left: ${coords.x}px`,
            `top: ${coords.y}px`,
            `height: ${this.chart.settings.target.height}px`,
            `width: ${this.chart.settings.target.width}px`,
        ];

        const style = [
            `background: ${background}`,
            `color: ${color}`,
            `border-width: ${borderWidth}px`,
            `border-color: ${borderColor}`,
            `border-radius: ${borderRadius}px`,
            'border-style: solid',

            'display: flex',
            'align-items: center',
            'justify-content: center',

            'position: absolute',
            `left: ${coords.x}px`,
            `top: ${coords.y}px`,
            'transform-origin: center',
            `transform: rotate(${rotation}deg)`,

            `height: ${this.chart.settings.target.height}px`,
            `width: ${this.chart.settings.target.width}px`,
        ];

        // When we are in debug mode we need to fade out the element a bit
        // so we can see the coliision points underneath.
        if (this.chart.debug === true) {
            style.push('opacity: 0.6');
        }

        // First apply the untransformed style so we can get it's untransformed bounding box.
        this.element.setAttribute('style', untransformedStyle.join(';'));
        this.chart.layers.targets.appendChild(this.element);

        // Get the untransformed bounding box.
        this.untransformedBBox = this.element.getBoundingClientRect();

        // Apply original style.
        this.element.setAttribute('style', style.join(';'));

        // Create and append group statistics elements.
        const groupStatsElements = this.createStatisticsElements();
        for (let i = 0; i < groupStatsElements.length; i++) {
            this.element.appendChild(groupStatsElements[i]);
        }

        this.xCenter = coords.xCenter;
        this.yCenter = coords.yCenter;

        // This must come at the end.
        this.calculateGroupCenterTargetCoordinates(this.xCenter, this.yCenter, rotation);

        if (this.chart.debug === true) {
            this.renderDebugElements();
        }

        return this;
    }

    calculateGroupCenterTargetCoordinates(xCenter, yCenter, rotation) {
        const segmentSize = this.untransformedBBox.width / this.chart.groups.size;
        let counter = 0;
        const startX = xCenter - this.untransformedBBox.width / 2;

        // Get the kwadrant of the target for later use.
        const kwadrant = this.calculateKwadrantOfAngle(this.angle);

        this.chart.groups.forEach(group => {
            let x = startX + (segmentSize / 2) + (counter * segmentSize);
            let y;

            // Move the x coordinates closer to the center depending on the offset.
            if (x < xCenter) {
                x += (this.chart.settings.target.groupTargetCenterOffset * segmentSize / 2);
            } else {
                x -= (this.chart.settings.target.groupTargetCenterOffset * segmentSize / 2);
            }

            // in the lower parts of the cirlce we have to offset the y to the top
            if (kwadrant === 3 || kwadrant === 4) {
                y = yCenter - this.untransformedBBox.height / 2;
            } else { // In the upper parts of the chart they must go down.
                y = yCenter + this.untransformedBBox.height / 2;
            }

            // Rotate the coordinates around so we get the correct positions.
            const rotated = Helpers.rotate(xCenter, yCenter, x, y, rotation * -1);

            this.groupTargetCoordinates[group.id] = {
                x: rotated.x,
                y: rotated.y
            };

            counter++;
        });
    }

    renderDebugElements() {
        const centerEl = this.chart.document.createElement('div');

        centerEl.setAttribute('style', [
            'position: absolute',
            `left: ${this.xCenter}px`,
            `top: ${this.yCenter}`,
            'width: 10px',
            'height: 10px',
            'border-radius: 100px',
            'background: rgba(0, 250, 0, .5)',
            'z-index: 1000',
            'transform: translate(-50%, -50%)'
        ].join(';'));

        this.chart.holder.appendChild(centerEl);

        // We have to offset the target bbox by the chart holder
        // because the client returns global coordinates instead
        // of local to the parent.
        const bbox = this.element.getBoundingClientRect();
        const bboxChart = this.chart.holder.getBoundingClientRect();

        const customBBox = {
            left: bbox.left - bboxChart.left,
            top: bbox.top - bboxChart.top,
            width: bbox.width,
            height: bbox.height
        };

        this.chart.drawBoundingBox(customBBox);

        // Visualize the group center traget coordiantes
        this.chart.groups.forEach(group => {
            const el = this.chart.document.createElement('div');

            el.setAttribute('style', [
                'position: absolute',
                `left: ${this.groupTargetCoordinates[group.id].x}px`,
                `top: ${this.groupTargetCoordinates[group.id].y}px`,
                'width: 10px',
                'height: 10px',
                'border-radius: 100px',
                'background: rgba(0, 250, 0, .5)',
                'z-index: 1000',
                'transform: translate(-50%, -50%)'
            ].join(';'));

            this.chart.holder.appendChild(el);
        });
    }

    /**
     * We only support 2 groups at the moment.
     *
     * @return {Array}
     */
    createStatisticsElements() {
        const elements = [];

        let counter = 0;
        this.chart.groups.forEach(group => {
            if (!group.ignoreStats) {
                // Holder.
                const holder = this.chart.document.createElement('div');
                holder.setAttribute('class', this.chart.createPrefixedIdentifier('target-stats-holder'));

                const valueEl = this.chart.document.createElement('span');
                valueEl.setAttribute('class', this.chart.createPrefixedIdentifier('stats-value'));
                valueEl.setAttribute('style', [
                    'border-bottom: 1px solid',
                    'display: inline-block',
                    'width: 100%',
                ].join(';'));
                valueEl.innerHTML = 0;

                const label = this.chart.document.createElement('div');
                label.setAttribute('class', this.chart.createPrefixedIdentifier('stats-label'));
                label.innerHTML = group.title;

                const holderStyles = [
                    'position: absolute',
                    `color: ${group.color}`,
                    'text-align: center'
                ];

                if (counter === 0) {
                    holderStyles.push('left: -25px');

                    // This will keep the element correctly aligned no matter the width.
                    holderStyles.push('transform: translate(-50%,0)');
                } else {
                    holderStyles.push('right: -25px');

                    // This will keep the element correctly aligned no matter the width.
                    holderStyles.push('transform: translate(50%,0)');
                }

                holder.setAttribute('style', holderStyles.join(';'));
                holder.appendChild(valueEl);
                holder.appendChild(label);

                elements.push(holder);

                this.statsEl[group.id] = valueEl;
            }

            counter++;
        });

        return elements;
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

            // We offset the center by the height so the target point is not inside the target
            // visualisation but on top of it.
            // xCenter: centerX + (x * (radius - this.chart.settings.target.height / 2)),
            // yCenter: centerY - (y * (radius - this.chart.settings.target.height / 2))

            xCenter: centerX + (x * (radius)),
            yCenter: centerY - (y * (radius))
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
     * @return {Number}
     */
    getX(groupId) {
        if (this.groupTargetCoordinates[groupId]) {
            return this.groupTargetCoordinates[groupId].x;
        }

        return this.xCenter;
    }

    getTargetCenterAngle(groupId) {
        if (this.groupTargetCoordinates[groupId]) {
            return this.groupTargetCoordinates[groupId].angle;
        }

        return 0;
    }

    getTargetCenterAngleInRadians(groupId) {
        if (this.groupTargetCoordinates[groupId]) {
            return Helpers.degToRad(this.groupTargetCoordinates[groupId].angle);
        }

        return 0;
    }

    /**
     * @return {Number}
     */
    getY(groupId) {
        if (this.groupTargetCoordinates[groupId]) {
            return this.groupTargetCoordinates[groupId].y;
        }

        return this.yCenter;
    }

    /**
     * Setters.
     */

    /**
     * @param {Number}
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

    /**
     * @param {Number}
     */
    setX(x) {
        this.xCenter = x;
    }

    /**
     * @param {Number}
     */
    setY(y) {
        this.yCenter = y;
    }
}
