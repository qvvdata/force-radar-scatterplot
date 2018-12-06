import Target from './Target';

/**
 * This construct a point for the chart.
 *
 * !!! Important !!!
 * Because we pass this to d3.force as the node it will automatically append some variables which we have
 * described in the constructor.
 */
export default class Point {
    /**
     * !! Important
     *
     * We don't use a settings object here because this point will be used
     * by the d3.force algorhytm and it will internally access some properties on
     * this object directly so I decided to keep all properties global to the class.
     *
     * @param  {[type]} chart [description]
     * @param  {[type]} id    [description]
     * @param  {[type]} x     [description]
     * @param  {[type]} y     [description]
     * @param  {Number} value [description]
     *
     * @return {Point}
     */
    constructor(chart, id, x, y, value = 1) {
        /**
         * Is this a static point meaning no forces apply to it.
         *
         * @type {Boolean}
         */
        this.isStatic = false;

        /**
         * @type {ForceRadarScatterplot}
         */
        this.chart = chart;

        /**
         * @type {String}
         */
        this.id = id;

        /**
         * @type {Number}
         */
        this.value = value;

        /**
         * @type {Target}
         */
        this.target = null;

        /**
         * TODO..
         */
        this.group = null;

        /**
         * HEX.
         *
         * @type {String}
         */
        this.color = '#8B8B8B';

        /**
         * Radius for this specific point.
         * If it's null we will use the chart's point radius setting.
         *
         * @type {?Number}
         */
        this.radius = 2;

        /**
         * @type {Number}
         */
        this.x = x || Math.random();

        /**
         * @type {Number}
         */
        this.y = y || Math.random();
    }

    /**
     * Getters
     */

    /**
     * @return {String}
     */
    getColor() {
        if (this.isStatic === false) {
            return this.color;
        } else if (this.isStatic === true && this.chart.debug === true) {
            return 'rgba(255, 0, 255, 0.5)';
        }

        return 'rgba(0, 0, 0, 0)';
    }

    /**
     * @return {String}
     */
    getId() {
        return this.id;
    }

    /**
     * @return {Number}
     */
    getRadius() {
        if (typeof this.radius !== 'number') {
            return this.chart.settings.point.radius;
        }

        return this.radius;
    }

    /**
     * @return {?Target}
     */
    getTarget() {
        return this.target;
    }

    /**
     * Setters
     */

    /**
     * @param {String|Target}
     */
    setTarget(target, useTargetColor = false) {
        if (target instanceof Target) {
            this.target = target;
        } else if (typeof target === 'string') {
            target = this.chart.targets.get(id);

            if (target !== null) {
                this.target = target;


                if (useTargetColor === true) {
                    this.setColor(target.getColor());
                }

                // Trigger the force so the point moves.
                this.chart.triggerForce();
            } else {
                console.log(`Target with id; ${id} does not exist.`);
            }
        }
    }

    /**
     * @param {String}
     */
    setColor(color) {
        this.color = color;

        // Update the svg node.
    }
}
