import Target from './Target';

/**
 * This construct a point for the chart.
 *
 * !!! Important !!!
 * Because we pass this to d3.force as the node it will dynamically add properties.
 *
 * Todo: Should prefix our own variables to see the difference.
 */
export default class Point {
    /**
     * !! Important
     *
     * We don't use a settings object here because this point will be used
     * by the d3.force algorithm and it will internally access some properties on
     * this object directly so I decided to keep all properties global to the class.
     *
     * @param  {ForceRadarScatterplot} chart
     * @param  {Number}                id
     * @param  {Number}                x
     * @param  {Number}                y
     * @param  {Number}                value
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
         * Is this point active?
         * it means are we showing it in color or is it greyed out.
         *
         * @type {Boolean}
         */
        this.isActive = true;

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
         * Id of the group.
         *
         * @type {String}
         */
        this.group = null;

        /**
         * HEX.
         *
         * @type {String}
         */
        this.color = null;

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

        /**
         * The svg node.
         *
         * @type {Object}
         */
        this.node = null;
    }

    update(state, triggerForce = false) {
        // Note 1:
        //   - Have the isactive be set before colour because it will override the colour
        //     and later if the color set we don't have sudden colour switches.
        //
        // Note 2:
        //   - We do not trigger any updates if the new active state is the same as the
        //     current otherwise we get all kinds of incorrect statistics counts.
        if (state.isActive !== undefined && state.isActive !== this.isActive) {
            this.setIsActive(state.isActive);

            if (this.target !== null) {
                if (this.isActive === true) {
                    this.target.updateStatistics(this, 1);
                } else {
                    this.target.updateStatistics(this, -1);
                }
            }
        }

        if (state.target !== undefined) {
            this.setTarget(state.target, triggerForce);
        }

        if (state.group !== undefined) {
            this.setGroup(state.group);
        }

        if (state.color !== undefined) {
            this.setColor(state.color);
        }
    }

    /**
     * Getters
     */

    /**
     * @return {String}
     */
    getColor() {
        if (this.isStatic === false) {
            if (this.isActive === true) {
                if (this.color !== null) {
                    return this.color;
                }

                return this.chart.groups.get(this.group).color;
            }

            return this.chart.settings.point.inactiveColor;
        }

        if (this.isStatic === true && this.chart.debug === true) {
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
    setTarget(target, triggerForceAlphaValue = true) {
        // We only allow setting targets on non static points.
        // Static points should stay in their place and not move around.
        if (this.isStatic === false) {
            let newTargetSet = false;

            if (target instanceof Target) {
                if (this.target instanceof Target) {
                    this.target.removePoint(this);
                }

                this.target = target;

                this.target.addPoint(this);

                newTargetSet = true;
            } else if (typeof target === 'string') {
                target = this.chart.targets.get(target);

                if (target !== null) {
                    if (this.target instanceof Target) {
                        this.target.removePoint(this);
                    }

                    this.target = target;
                    this.target.addPoint(this);

                    newTargetSet = true;
                } else {
                    console.log(`Target with id; ${target} does not exist.`);
                }
            } else {
                throw new Error('Incorrect argument for target');
            }

            if (newTargetSet === true) {
                if (typeof triggerForceAlphaValue === 'number') {
                    this.chart.triggerForce(triggerForceAlphaValue);
                } else if (triggerForceAlphaValue === true) {
                    this.chart.triggerForce();
                }
            }
        }
    }

    setTargetWithDelay(delay, target) {
        setTimeout(
            this.setTarget.bind(this, target, true),
            delay
        );
    }

    highlight(fill, stroke, strokeWidth) {
        if (this.node !== null) {
            this.node.style.fill = fill;
            this.node.style.stroke = stroke;
            this.node.style.strokeWidth = strokeWidth;
        }
    }

    unhighlight() {
        if (this.node !== null) {
            this.node.style.stroke = '';
            this.node.style.strokeWidth = 0;
        }

        this.updateColor();
    }

    /**
     * @param {String}
     */
    setColor(color) {
        this.color = color;
        this.updateColor();
    }

    /**
     * @param {Object} node
     */
    setNode(node) {
        this.node = node;
    }

    setGroup(groupId) {
        this.group = groupId;
    }

    setIsActive(isActive) {
        this.isActive = isActive;
        this.updateColor();
    }

    updateColor() {
        if (this.node !== null) {
            this.node.style.fill = this.getColor();
        }
    }
}
