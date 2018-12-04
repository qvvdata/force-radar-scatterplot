import Helpers from './Helpers';

export default class Target {
    /**
     * @param  {[type]} parent         [description]
     * @param  {[type]} title          [description]
     * @param  {[type]} customSettings [description]
     * @return {[type]}                [description]
     */
    constructor(parent, title, customSettings) {
        /**
         * Parent chart.
         *
         * @type {ForceRadarScatterplot}
         */
        this.parent = parent;

        /**
         * Title for the category.
         *
         * @type {String}
         */
        this.title = title;

        /**
         * Datapoints.
         *
         * @type {Array}
         */
        this.points = [];

        /**
         * What angle relatie to the center are we drawn at.
         *
         * @type {Number}
         */
        this.angle = 0;


        this.defaultSettings = {
            color: '#000'
        };

        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);
    }


    /**
     * @return {[type]}
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

            `height: ${this.parent.settings.target.height}px`,
            `width: ${this.parent.settings.target.width}px`,
        ];

        element.setAttribute('style', style.join(';'));

        this.parent.layers.targets.appendChild(element);
        return this;
    }

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
        const BBoxHolder = this.parent.holder.getBoundingClientRect();
        const centerX = BBoxHolder.width / 2;
        const centerY = BBoxHolder.height / 2;
        const radius = (BBoxHolder.width - this.parent.settings.target.height) / 2;
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
            x: centerX + (x * radius) - (this.parent.settings.target.width / 2),

            // We invert the  y*radius because a positive number
            // should move the location up which is a negative number in screen coordinates.
            y: centerY - (y * radius) - (this.parent.settings.target.height / 2)
        };
    }

    /**
     * Create element.
     *
     * @return {Object}
     */
    createElement() {
        const element = this.parent.document.createElement('div');

        element.innerHTML = this.title;
        element.setAttribute('class', this.parent.createPrefixedIdentifier('target'));

        return element;
    }

    /**
     * Setters
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
}
