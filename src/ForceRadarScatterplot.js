import d3 from './d3-v3.5.5';
import CenterTarget from './CenterTarget';
import Group from './Group';
import Helpers from './Helpers';
import Point from './Point';
import Stats from './Stats';
import Target from './Target';

export default class ForceRadarScatterplot {
    /**
     * @param {Object} document
     * @param {String} holderSelector
     * @param {Object} customSettings
     * @param {Array}  data
     */
    constructor(document, holderSelector, customSettings = {}, data = null) {
        /**
         * This will turn on some visuals and statistics for the chart so
         * you have a better view on what is going on.
         *
         * @type {Boolean}
         */
        this.debug = false;

        /**
         * @type {d3}
         */
        this.d3 = d3();

        /**
         * @type {Object}
         */
        this.document = document;

        /**
         * Prefix for all class/ids in order to
         * avoid conflicts in css.
         *
         * @type {String}
         */
        this.prefix = 'frc';

        this.holderSelector = holderSelector;

        /**
         * The general holder for the entire visualisation.
         *
         * @type {Object}
         */
        this.holder = document.querySelector(holderSelector);

        /**
         * References to the layer objects.
         *
         * @type {Object}
         */
        this.layers = {
            svg: null,
            targets: null,
            pointNodes: []
        };

        /**
         * Will be overwritten by custom settings.
         *
         * @type {Object}
         */
        this.defaultSettings = {
            // Delay between points when they change state.
            delayBetweenPoints: 2,

            // Global settings for all target options.
            target: {
                // Background color.
                background: '#f3f3f3',
                borderColor: '#8B8B8B',
                borderRadius: 100,
                borderWidth: 2,

                // Text color.
                color: '#8B8B8B',

                // Font size of the label in the target.
                fontSize: 16,

                // Font size of the statistics labels.
                fontSizeStatistics: 12,

                // At which angle do we start placing targets.
                // The algorithm will start from there in a clockwise direction.
                startAngle: 90,

                // This moves the target center coordinate for the groups to the outside (postive number)
                // or to the center of the target element (negative). This allows you to move the target
                // centers of groups closer together or more wide apart.
                //
                // this is a floatnumber and it's a relative to the segment size.
                //
                // a segement is the distance between the target points, they are all equal.
                //
                // 0 does nothing and the point in very center of the target, if there is one, is never moved.
                groupTargetCenterOffset: 0,

                width: 150,
                height: 30,

                // The padding (in px) between Target box and Target statistics (left and right).
                offsetStatistics: 25,
            },

            // Global settings for the center target.
            centerTarget: {
                // Text color.
                color: '#8B8B8B',

                // Fill of the hexagon.
                fill: '#FFF',

                // Font size of the number inside.
                fontSize: 14,

                // Size of the center hexagon icon.
                // This will be multiplied by the window.devicePixelRatio property when rendered.
                // We do not do it this in the settings because it will confuse the user if he ever inspects the settings and sees a different number
                // than to the actual one he has set.
                // On 4K screens we will also double te size because otherwise it is ridicuously small.
                hexagonSize: 40,
            },

            // Global options for points.
            point: {
                radius: 2.5,

                // Fill for highlighting points
                highlightFill: '#FFF',

                // Color for border when highlighting.
                highlightStroke: '#000',

                // Width for the border when highlighting.
                highlightStrokeWidth: 1,

                // Upon load we initialize the points with a radius of 0
                // and animate them in to their size. This is the duration of that
                // animation PER point.
                initAnimationDuration: 750,

                // Upon load we initialize the points with a radius of 0
                // and animate them in to their size. This is the delay
                // between each point for that animation
                initAnimationDelayFactorBetweenPoints: 3,

                // The color that will be applied to points when they are set to inactive.
                inactiveColor: '#8B8B8B'
            },

            // Tooltips for points only.
            tooltip: {
                // Are we showing tooltips?
                show: false,

                // Padding.
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                },

                // The formatter is a user supplied function that
                // will return the html for the tooltip when the
                // user hovers over a point.
                formatter: function tooltipFormatter() {
                    return 'To be implemented by the user';
                }
            },

            // Collision detection options.
            collisionDetection: {
                // While this is used for collision detection
                // this will actually effectively create padding
                // between the points. You can view it as an
                // invisible radius or bubble around the point.
                nodePadding: 1,

                // This property explains itself.
                ignoreCollisionWhenAlphaLowerThan: 0.075
            },

            // All the force properties work together to create a specific
            // movement effect. It can be very difficult to get exactly what you want.
            // I have set them to something that I think looks visually pleasing and natural
            // but you can play with these properties until you get your desired effect.
            force: {
                // This is increases the effect of the collision when points collide with the static poins (which we use only for collision detection).
                // We set the effect slightly higher so there is less chance of points flying through.
                // Still trying to figure why it keeps happening.
                staticCollisionRepulseFactor: 1.2,

                // Slows down the rate at which the node travels from its original position to its newly calculated position.
                // Lower values = MORE friction!!!
                friction: 0.91,

                // Strength of the attraction force towards it's destination point.
                gravity: 0.051,

                // “cooling parameter” that decrements at each tick
                // and reduces the effect each of the forces play on the position of the nodes.
                // Used only at the loading of the chart to put all the points in the middle.
                startAlpha: 0.1,

                // “cooling parameter” that decrements at each tick
                // and reduces the effect each of the forces play on the position of the nodes.
                alpha: 0.1

                // friction slows the nodes down at each tick, and alpha slows
                // them down between each tick. After a certain threshold is
                // reached for alpha, the force layout stops calculating, freezing
                // the graph into what is hopefully an optimal layout.
            }
        };

        /**
         * The force.
         *
         * @type {Skywalker}
         */
        this.force = null;

        /**
         * Map of the targets.
         *
         * @type {Map}
         */
        this.targets = new Map();

        /**
         * Map of datapoints.
         *
         * @type {Map}
         */
        this.points = new Map();

        /**
         * Map of the groups.
         *
         * @type {Map}
         */
        this.groups = new Map();

        /**
         * Contains the points that will be rendered in the visualisation.
         * It is not the same as the point property because
         * the rendered points will contain unvisible collision detection points
         * as well.
         *
         * @type {Array}
         */
        this.renderedPoints = [];

        /**
         * Final settings object.
         *
         * @type {Object}
         */
        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);

        /**
         * Dependings on settings so it must come after it.
         *
         * @type {Target}
         */
        this.centerTarget = new CenterTarget(this, this.settings.centerTarget);

        /**
         * Interval id for the looping animation.
         *
         * @type {Number}
         */
        this.loopingAnimationIntervalId = null;

        /**
         * Has this chart been initialzed?
         *
         * @type {Boolean}
         */
        this.initialized = false;


        /**
         * All currently running timeouts for updatePoints
         *
         * @type {Array}
         */
        this.updatePoints_timeouts = [];

        // Must go at the very end.
        if (data !== null) {
            this.setData(data);
        }

        if (this.debug === true) {
            // Activate stats and log this class for use in the console.
            //this.stats = new Stats();
            //document.body.appendChild(this.stats.dom);
            //this.stats.showPanel(0);

            this.drawRulers();

            // Log the chart to the console for inspection.
            console.log(this);
        }
    }

    /**
     * Initialized the chart.
     * Bundle functions that need to run upon init here.
     *
     * @return {ForceRadarScatterplot}
     */
    init() {
        this.setupLayers();

        this.initialized = true;
        return this;
    }

    /**
     * Sets up all the necessary layers for the visualisation.
     */
    setupLayers() {
        this.d3.select(this.holderSelector).selectAll('*').remove();

        this.createSVGLayer();
        this.createPointsLayer();
        this.createTargetsLayer();
    }

    /**
     * Creates the svg object.
     */
    createSVGLayer() {
        this.layers.svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.layers.svg.setAttribute('class', this.createPrefixedIdentifier('svg'));
        this.layers.svg.setAttribute('width', this.holder.clientWidth);
        this.layers.svg.setAttribute('height', this.holder.clientHeight);
        this.holder.appendChild(this.layers.svg);
    }

    /**
     * Creates holder for the point nodes.
     */
    createPointsLayer() {
        this.layers.points = this.document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.layers.points.setAttribute('class', this.createPrefixedIdentifier('points'));
        this.layers.svg.appendChild(this.layers.points);
    }

    /**
     * Creates the holder for the targets.
     */
    createTargetsLayer() {
        this.layers.targets = this.document.createElement('div');

        this.layers.targets.setAttribute('style', [
            'position: absolute',
            'left: 0px',
            'top: 0px',
            'height: 100',
            'pointer-events: none', // Disable pointer events so on hover on points works.
            'width: 100%',
            'z-index: 1'
        ].join(';'));

        this.layers.targets.setAttribute('class', this.createPrefixedIdentifier('targets'));
        this.holder.appendChild(this.layers.targets);
    }

    /**
     * Renders all the layers.
     *
     * @return {ForceRadarScatterplot}
     */
    render() {
        this.renderTargets();
        this.renderPoints();
        return this;
    }

    /**
     * Renders each target object into the dom.
     * Also creates their collision objects and adds them to be rendered.
     */
    renderTargets() {
        const angleStep = 360 / (this.targets.size - 1); // -1 because we have to remove the center target.
        let step = 0;

        this.targets.forEach((target, id) => {
            if (id === 'FRC_CENTER_TARGET') { // Center target only need to be rendered.
                target.render();
            } else {
                const angle = this.settings.target.startAngle - (angleStep * step);
                target.setAngle(angle)
                    .render();

                step++;
            }
        });
    }

    /**
     * Renders all the points.
     */
    renderPoints() {
        if (this.force !== null) {
            this.force.stop();
            this.force = null;
        }

        this.renderedPoints = [];

        // Add collision points over the entire circle so points cannot escape and go out of bounds.
        this.renderedPoints = this.renderedPoints.concat(this.createCircleCollisionPoints());

        // Add collision points for each target.
        this.targets.forEach(target => {
            // Create the collision points and add them to be rendered.
            this.renderedPoints = this.renderedPoints.concat(target.createCollisionPoints());
        });

        // We add the actual datapoints.
        this.renderedPoints = this.renderedPoints.concat([...this.points.values()]);

        // We assume that the points will always start in the center.
        // Start each point in a random point around the center
        // so it will fall to the center nicely on the startup.
        let pointAngleAllowedVariation;
        if (this.groups.size === 1) {
            pointAngleAllowedVariation = 360;
        } else {
            pointAngleAllowedVariation = 360 / this.groups.size / 2;
        }

        this.points.forEach(point => {
            const offsetFromCenter = this.holder.clientWidth / 4;
            // const randAngleInRadians = (Math.random() * 360) * Math.PI / 180;
            // point.x = (Math.cos(randAngleInRadians) * offsetFromCenter) + centerCoords.x;
            // point.y = (Math.sin(randAngleInRadians) * offsetFromCenter) + centerCoords.y;

            const targetCenterAngle = this.centerTarget.getTargetCenterAngle(point.group);

            // add ofset to the angle.
            let angle;
            if (Math.random() > 0.5) {
                angle = targetCenterAngle + (Math.random() * pointAngleAllowedVariation);
            } else {
                angle = targetCenterAngle - (Math.random() * pointAngleAllowedVariation);
            }

            point.x = this.centerTarget.getX(point.group) + (Math.cos(Helpers.degToRad(angle)) * (50 + Math.random() * (offsetFromCenter - 50)));
            point.y = this.centerTarget.getY(point.group) + (Math.sin(Helpers.degToRad(angle)) * (50 + Math.random() * (offsetFromCenter - 50)));
        });


        // We create the force.
        // Keep the gravity and charge to 0.
        // we do not use it, we have our own gravity function.
        // You can play with the values to see what other effects you might get.
        this.force = this.d3.layout.force()
            .nodes(this.renderedPoints)
            .size([this.layers.svg.width, this.layers.svg.height])
            .gravity(0)
            .charge(0)
            .friction(this.settings.force.friction)
            .on('tick', this.createForceTick(this.renderedPoints));

        // Draw a circle for each point.
        for (let i = 0; i < this.renderedPoints.length; i++) {
            const renderPoint = this.renderedPoints[i];

            const node = this.d3.select(this.layers.points)
                .append('circle')
                .datum(renderPoint)
                .attr('class', this.createPrefixedIdentifier('point'))
                .attr('id', d => d.getId())
                .style('fill', d => d.getColor());

            renderPoint.setNode(node.node());

            if (renderPoint.isStatic === false && this.settings.tooltip.show === true) {
                node.on('mouseover', point => {
                    this.highlightPoint(point);
                    this.showTooltipForPoint(point);
                });

                node.on('mouseout', point => {
                    point.unhighlight();
                    this.hideTooltip();
                });
            }

            // We only push the actuall circle svg node.
            this.layers.pointNodes.push(node.node());
        }

        // Static points must have their radius set immediatly.
        // We generaly use them for collisions.
        this.d3.selectAll(this.layers.pointNodes).filter(d => d.isStatic)
            .attr('r', d => d.getRadius());

        // Normal data points will be animated in.
        this.d3.selectAll(this.layers.pointNodes).filter(d => !d.isStatic)
            .transition()
            .duration(this.settings.point.initAnimationDuration)
            .delay((d, i) => i * this.settings.point.initAnimationDelayFactorBetweenPoints)
            .attrTween('r', d => {
                const i = this.d3.interpolate(0, d.radius);

                return function a(t) {
                    return d.radius = i(t);
                };
            });

        // Start the force and set the start alpha.
        this.force.start().alpha(this.settings.force.startAlpha);
    }

    highlightPoint(pointInstanceOrId) {
        let point = null;

        // If a string is passed we assume id and try to get the point from the map.
        if (typeof pointInstanceOrId === 'string') {
            point = this.points.get(pointInstanceOrId);
        } else {
            point = pointInstanceOrId;
        }

        if (point !== null) {
            point.highlight(
                this.settings.point.highlightFill,
                this.settings.point.highlightStroke,
                this.settings.point.highlightStrokeWidth,
            );
        }
    }

    unhighlightPoint(pointInstanceOrId) {
        let point = null;

        if (typeof pointInstanceOrId === 'string') {
            point = this.points.get(pointInstanceOrId);
        } else {
            point = pointInstanceOrId;
        }

        if (point !== null) {
            point.unhighlight();
        }
    }

    /**
     * Show tooltip for a specific point.
     *
     * Todo:
     *     - Have some kind of position placement algorhitm.
     *     - Draw a line from the point to the tooltip.
     *
     * @param  {Point} point
     */
    showTooltipForPoint(point) {
        const tooltipHtml = this.settings.tooltip.formatter(point);

        if (this.layers.tooltip !== null) {
            const centerCoords = this.getCenterCoords();
            const tooltip = this.document.createElement('div');
            tooltip.setAttribute('class', this.createPrefixedIdentifier('point-tooltip'));

            tooltip.setAttribute('style', [
                'pointer-events: none', // Very important if the tooltip ends up covering some points.
                'background: rgba(255, 255, 255, 0.7)',
                'display: none', // Start hidden.

                `padding-top: ${this.settings.tooltip.padding.top}`,
                `padding-right: ${this.settings.tooltip.padding.right}`,
                `padding-bottom: ${this.settings.tooltip.padding.bottom}`,
                `padding-left: ${this.settings.tooltip.padding.left}`,

                'position: absolute',
                `left: ${centerCoords.x}px`,
                `top: ${centerCoords.y / 2}px`,
                'transform: translate(-50%, -50%)'
            ].join(';'));

            this.holder.appendChild(tooltip);

            this.layers.tooltip = tooltip;
        }

        // Set the HTML and after show the tooltip.
        this.layers.tooltip.innerHTML = tooltipHtml;
        this.layers.tooltip.style.display = 'block';
    }

    hideTooltip() {
        if (this.layers.tooltip !== null) {
            this.layers.tooltip.style.display = 'none';
        }
    }

    /**
     * This creates a perimeter circle with collision points
     * but currently I have disabled it because when having them
     * sometimes points flyout through the targets and then
     * because of this perimeter they cannot get back in.
     *
     * I am still figuring out how to stop points getting
     * pushed through targets or how to have them reset when
     * they go out of bounds.
     *
     * @return {Array}
     */
    createCircleCollisionPoints() {
        const points = [];

        const pointSize = 25;
        const originCoord = this.holder.clientWidth / 2;

        // We reduce the size of the chart slightly to have a more compact collision circle.
        const radius = (this.holder.clientWidth - 25) / 2;
        const circumference = 2 * Math.PI * radius;
        const steps = circumference / pointSize;

        for (let i = 0; i <= steps; i++) {
            // Get percentage of how far we are on the circle.
            const pct = (i * pointSize) / circumference;

            // calculate angle based on the percentage
            const angle = 360 * pct;

            // Convert to radians.
            const radians = angle * Math.PI / 180;

            // calculate x and y.
            const x = originCoord + Math.cos(radians) * radius;
            const y = originCoord + Math.sin(radians) * radius;

            const point = new Point(
                this,
                `circle-collision-point-${i}`,
                x,
                y
            );

            point.radius = pointSize / 2;
            point.isStatic = true;

            points.push(point);
        }

        // Atm I have disabled this because the points always
        // fall behind the targets even with the perimeter and
        // because of the perimetere they can return into the chart later
        // so I disabled it until we find a better solution.
        return [];
        // return points;
    }

    /**
     * Creates the function for the tick of d3.force.
     *
     * @param  {Array} points
     * @return {Function}
     */
    createForceTick(points) {
        const cls = this;
        return function forceTick(e) {
            if (cls.debug === true) {
                //cls.stats.begin();
            }

            cls.d3.selectAll(cls.layers.pointNodes)
                .each(cls.createGravityForce(cls.settings.force.gravity * e.alpha))
                .each(cls.createCollisionDetection(points, 0.5, e.alpha))
                .attr('fill', d => d.color)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            if (cls.debug === true) {
                //cls.stats.end();
            }
        };
    }

    /**
     * Creates the gravity force function.
     *
     * @param  {Number} alpha Decay factor between ticks.
     * @return {Function}
     */
    createGravityForce(alpha) {
        return function gravityForce(d) {
            const target = d.getTarget();

            // Don't apply force to elements without a target.
            if (target === null || d.isStatic === true) return;

            d.x += (target.getX(d.group) - d.x) * alpha;
            d.y += (target.getY(d.group) - d.y) * alpha;
        };
    }

    /**
     * Create the collision detection function.
     * Understanding this function can be a bit difficult but
     * if you start from the top and follow the comments it should clear up
     * the functionality.
     *
     * There is some functionality in comments but I keep it for reference
     * and experimentation.
     *
     * @param  {Array}    points
     * @param  {Number}   alpha       It's called alpha but it's static. so it's basically a multiplying factor.
     * @param  {Number}   globalAlpha Decay factor from the d3 force instance.
     * @return {Function}
     */
    createCollisionDetection(points, alpha, globalAlpha) {
        const cls = this;
        const quadtree = this.d3.geom.quadtree(points);

        const nodePadding = cls.settings.collisionDetection.nodePadding;
        return function collisionDetection(d) {
            let r = (d.radius * 2) + nodePadding;

            const nx1 = d.x - r;
            const nx2 = d.x + r;
            const ny1 = d.y - r;
            const ny2 = d.y + r;

            quadtree.visit((quad, x1, y1, x2, y2) => {
                const returnValue = (x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1);

                if (quad.point && (quad.point !== d)) {
                    const x = d.x - quad.point.x;
                    const y = d.y - quad.point.y;
                    let l = Math.sqrt(x * x + y * y);
                    r = d.radius + quad.point.radius + nodePadding;


                    if (globalAlpha < cls.settings.collisionDetection.ignoreCollisionWhenAlphaLowerThan) {
                        if (d.target && quad.point.target && d.target !== quad.point.target) {
                            return returnValue;
                        }
                    }

                    const staticRepulseFactor = cls.settings.force.staticCollisionRepulseFactor;

                    // points are directly stacked on top of
                    // each other move them away randomly.
                    if (l === 0) {
                        if (d.isStatic === false) {
                            d.x -= Math.random() / 20;
                            d.y -= Math.random() / 20;
                        }

                        if (quad.point.isStatic === false) {
                            quad.point.x += Math.random() / 20;
                            quad.point.y += Math.random() / 20;
                        }
                    } else if (l < r) {
                        l = (l - r) / l * alpha;

                        if (quad.point.isStatic === true && d.isStatic === false) {
                            d.x -= (x * l);
                            d.y -= (y * l);
                        }

                        if (d.isStatic === true && quad.point.isStatic === false) {
                            quad.point.x += (x * l * staticRepulseFactor);
                            quad.point.y += (y * l * staticRepulseFactor);
                        }

                        if (d.isStatic === false && quad.point.isStatic === false) {
                            d.x -= x * l;
                            d.y -= y * l;

                            quad.point.x += x * l;
                            quad.point.y += y * l;
                        }
                    }
                }

                return returnValue;
            });
        };
    }

    /**
     * Resets the data and re-rerenders.
     * I turned this off because it is much more complex to reset this chart
     * while it is not really neceassary right now.
     *
     * If you want to reset the chart you actually just move all the points back to the center.
     */
    reset() {
        // // Reset these properties or we will have double data.
        // this.renderedPoints = [];

        // // You must do this before resetting the property!
        // // Remove all the point nodes.
        // this.d3.selectAll(this.layers.pointNodes).remove();

        // this.layers.pointNodes = [];
        // this.points = new Map();

        // this.setData(this.rawData);
        // this.render();
    }

    /**
     * Create identifier with our set prefix.
     *
     * @param  {String} id Id.
     * @return {String}
     */
    createPrefixedIdentifier(id) {
        return `${this.prefix}-${id}`;
    }

    /**
     * Getters
     */
    getCenterCoords() {
        return {
            x: this.holder.clientWidth / 2,
            y: this.holder.clientHeight / 2,
        };
    }

    /**
     * Setters
     */
    setData(data) {
        this.targets.clear();
        this.groups.clear();
        this.points.clear();
        this.centerTarget.clearPoints();

        this.checkDataIntegrity(data);

        this.rawData = data;

        // Add the center target first.
        this.targets.set(this.centerTarget.getId(), this.centerTarget);

        // Create targets.
        for (let i = 0; i < data.targets.length; i++) {
            const rawData = data.targets[i];
            const target = new Target(this, rawData);

            this.targets.set(target.getId(), target);
        }

        // Create the groups.
        for (let i = 0; i < data.groups.length; i++) {
            const rawData = data.groups[i];

            this.groups.set(rawData.id, rawData);
        }

        // Create points.
        for (let i = 0; i < data.points.length; i++) {
            const rawData = data.points[i];

            const point = new Point(this, rawData.id);
            point.radius = this.settings.point.radius;

            point.setTarget(this.targets.get('FRC_CENTER_TARGET'), false);
            point.setGroup(rawData.group);
            point.isActive = rawData.isActive;

            this.points.set(rawData.id, point);
        }
    }

    /**
     * Check if the raw data object is correctly formatted.
     *
     * @param {Object}
     */
    checkDataIntegrity(data) {
        if (!Array.isArray(data.targets)) {
            throw new Error('Targets must be an array');
        }

        if (!Array.isArray(data.points)) {
            throw new Error('Points must be an array');
        }

        if (data.targets) {
            for (let i = 0; i < data.targets.length; i++) {
                const target = data.targets[i];
                if (typeof target.id !== 'string') throw new Error('A target must have an id type of string');
            }
        }

        if (data.points) {
            for (let i = 0; i < data.points.length; i++) {
                const point = data.points[i];
                if (typeof point.id !== 'string') throw new Error('A point must have an id type of string');
            }
        }
    }

    /**
     * Trigger the force so the points move.
     *
     * @param  {Number} alpha
     * @return {ForceRadarScatterplot}
     */
    triggerForce(alpha = null) {
        if (typeof alphe !== 'number') {
            alpha = this.settings.force.alpha;
        }

        this.force.alpha(alpha);

        return this;
    }

    /**
     * Start an infinite animation where a random point
     * gets a random target assigned.
     *
     * @param {Number} intervalTimeInMs
     */
    startRandomLoopingAnimation(intervalTimeInMs = 50) {
        const targets = Array.from(this.targets.values());
        const points = Array.from(this.points.values());

        // Each interval we select a random point and a random target
        // and set the target to the point.
        this.loopingAnimationIntervalId = setInterval(() => {
            const randomTargetIndex = Math.floor(Math.random() * (targets.length));
            const randomTarget = targets[randomTargetIndex];

            const randomPointIndex = Math.floor(Math.random() * (points.length));
            const randomPoint = points[randomPointIndex];

            randomPoint.setTarget(randomTarget);
        }, intervalTimeInMs);
    }

    /**
     * Start an infinite animation where a random point
     * gets a random target assigned.
     *
     * @param {Number} intervalTimeInMs
     */
    startRandomCenterLoopAnimation(intervalTimeInMs = 50) {
        const targets = Array.from(this.targets.values());
        const points = Array.from(this.points.values());

        // Each interval we select a random point.
        // If the point is in the center. we move it to a random target.
        // If it's not in the center target, we move it to the center.
        this.loopingAnimationIntervalId = setInterval(() => {
            const randomPointIndex = Math.floor(Math.random() * (points.length));
            const randomPoint = points[randomPointIndex];

            const targetOfPoint = randomPoint.getTarget();

            if (targetOfPoint.getId() === 'FRC_CENTER_TARGET') {
                const randomTargetIndex = Math.floor(Math.random() * (targets.length));
                const randomTarget = targets[randomTargetIndex];

                randomPoint.setTarget(randomTarget);
            } else {
                randomPoint.setTarget(this.getCenterTarget());
            }
        }, intervalTimeInMs);
    }

    stopRandomLoopingAnimation() {
        clearInterval(this.loopingAnimationIntervalId);
    }

    /**
     * Development helper functions
     */

    /**
     * @param  {Number} targetCount
     * @param  {Number} groupCount
     * @param  {Number} pointCount
     * @return {ForceRadarScatterplot}
     */
    fillWithRandomData(targetCount = 12, groupCount = 2, pointCount = 355) {
        if (this.initialized === false) throw new Error('You must initialize the class before filling with data.');

        const data = {
            targets: [],
            groups: [],
            points: []
        };

        const targetPool = [
            {
                id: 'Verwaltung',
                title: 'Verwaltung',
                showFloatingLabel: false,
                showStatistics: false
            },
            {
                id: 'Sonstige',
                title: 'Sonstige',
                showFloatingLabel: false,
                showStatistics: false
            },
            {
                id: 'PrivatWirtschaft',
                title: 'PrivatWirtschaft',
                showFloatingLabel: false,
                showStatistics: false
            },
            {
                id: 'Betrieb',
                title: 'Staatsnaher Betrieb',
                showFloatingLabel: false,
                showStatistics: false
            },
            {
                id: 'Partei/Parlament',
                title: 'Partei/Parlament',
                showFloatingLabel: false,
                showStatistics: false
            },
            {
                id: 'Kammer',
                title: 'Kammer',
                showFloatingLabel: false,
                showStatistics: false
            }
        ];

        const groupPool = [
            {
                color: '#2b2d42',
                id: 'OVP',
                title: 'ÖVP'
            },
            {
                color: '#cf2123',
                id: 'SPO',
                title: 'SPÖ'
            },
            {
                color: '#007be5',
                id: 'FPO',
                title: 'FPO'
            },
            {
                color: '#ff89e7',
                id: 'NEOS',
                title: 'NEOS'
            },
            {
                color: '#b9c5bd',
                id: 'JETZT',
                title: 'JETZT'
            },
            {
                color: '#64a013',
                id: 'GRUNE',
                title: 'GRUNE'
            },
            {
                color: '#7c7c68',
                id: 'OK',
                title: 'OK'
            },
            {
                color: '#c8c8c8',
                id: 'SONSTIGE',
                title: 'SONSTIGE'
            },
        ];

        // Create the amount of desired targets.
        let targetPoolIndex = 0;
        let targetIdPrefix = 0;
        for (let i = 0; i < targetCount; i++) {
            // Reset the target pool index to 0 if we go out of bounds.
            if (targetPoolIndex >= targetPool.length) {
                targetPoolIndex = 0;
                targetIdPrefix++;
            }

            const targetConfig = targetPool[targetPoolIndex];

            // We set a new object otherwise we are using a reference.
            data.targets.push({
                id: `${targetIdPrefix}-${targetConfig.id}`,
                title: targetConfig.title,
                showFloatingLabel: targetConfig.showFloatingLabel,
                showStatistics: targetConfig.showStatistics
            });

            targetPoolIndex++;
        }

        let groupPoolIndex = 0;
        let groupIdPrefix = 0;
        for (let i = 0; i < groupCount; i++) {
            // Reset the target pool index to 0 if we go out of bounds.
            if (groupPool >= groupPool.length) {
                groupPoolIndex = 0;
                groupIdPrefix++;
            }

            const groupConfig = groupPool[groupPoolIndex];

            data.groups.push({
                id: `${groupIdPrefix}-${groupConfig.id}`,
                title: groupConfig.title,
                color: groupConfig.color
            });

            groupPoolIndex++;
        }

        // const centerCoords = this.getCenterCoords();
        for (let i = 0; i < pointCount; i++) {
            const pointConfig = {
                id: `point-${i}`,
                target: 'FRC_CENTER_TARGET',
                group: data.groups[Math.floor(Math.random() * groupCount)].id,
                isActive: true
            };

            data.points.push(pointConfig);
        }

        this.setData(data);
        return this;
    }

    /**
     * @param {Object}
     */
    drawBoundingBox(BBox) {
        const el = this.document.createElement('div');

        const style = [
            'position: absolute;',
            `left: ${BBox.left}`,
            `top:${BBox.top}`,
            `width: ${BBox.width}`,
            `height: ${BBox.height}`,
            'border: 1px solid #F0F'
        ];

        el.setAttribute('style', style.join(';'));

        this.holder.appendChild(el);
    }

    /**
     * Draw rulers in the chart so we can have a better picture of alignment.
     *
     * @return {ForceRadarScatterplot}
     */
    drawRulers() {
        const rulerHorizontal = this.document.createElement('div');
        const rulerVertical = this.document.createElement('div');
        const circleRuler = this.document.createElement('div');
        const chartBorderRuler = this.document.createElement('div');

        const baseStyles = [
            'position: absolute',
            'height: 1px',
            'width: 100%',
            'left: 0',
            'top: 50%',
            'background: #00F',
            'transform-origin: center'
        ];

        const horizontalRuleStyles = baseStyles.concat(['transform: translate(0, -50%)']);
        const verticalRuleStyles = baseStyles.concat(['transform: translate(0, -50%) rotate(90deg)']);

        rulerHorizontal.setAttribute('style', horizontalRuleStyles.join(';'));
        this.holder.appendChild(rulerHorizontal);

        rulerVertical.setAttribute('style', verticalRuleStyles.join(';'));
        this.holder.appendChild(rulerVertical);

        circleRuler.setAttribute('style', [
            'position: absolute',
            'top: 0',
            'left: 0',
            'width: 100%',
            'height: 100%',
            'border: 1px solid #F00',
            'border-radius: 500px'
        ].join(';'));
        this.holder.appendChild(circleRuler);

        chartBorderRuler.setAttribute('style', [
            'position: absolute',
            'top: 0',
            'left: 0',
            'width: 100%',
            'height: 100%',
            'border: 1px solid #F0F'
        ].join(';'));
        this.holder.appendChild(chartBorderRuler);

        return this;
    }

    /**
     * Moves points ta random coordinate in the chart.
     *
     * @return {ForceRadarScatterplot}
     */
    movePointsRandomly() {
        const points = [...this.points.values()];

        for (let i = 0; i < points.length; i++) {
            const node = points[i];

            const target = new Target(this);
            target.setX(Math.random() * this.holder.clientWidth);
            target.setY(Math.random() * this.holder.clientHeight);

            node.setTarget(target);
        }

        this.triggerForce();

        return this;
    }

    movePointsToCenter(filterFunc = null, delayBetweenPoints = null) {
        let count = 0;

        if (typeof delayBetweenPoints !== 'number') {
            delayBetweenPoints = this.settings.delayBetweenPoints;
        }

        this.points.forEach(point => {
            if (point.isStatic === false) {
                let pointPassedFiltering = true;

                if (typeof filterFunc === 'function' && filterFunc(point) !== true) {
                    pointPassedFiltering = false;
                }

                if (pointPassedFiltering === true) {
                    if (delayBetweenPoints > 0) {
                        point.setTargetWithDelay(count * delayBetweenPoints, this.centerTarget, false);
                        count++;
                    } else {
                        point.setTarget(this.centerTarget, false, false);
                    }
                }
            }
        });

        this.triggerForce();

        return this;
    }

    /**
     * Moves points ta random selected target.
     *
     * @return {ForceRadarScatterplot}
     */
    movePointsToRandomTarget(delayBetweenPoints = null) {
        const targets = [...this.targets.values()];
        let count = 0;

        if (typeof delayBetweenPoints !== 'number') {
            delayBetweenPoints = this.settings.delayBetweenPoints;
        }

        this.points.forEach(point => {
            if (point.isStatic === false) {
                const index = Math.floor(Math.random() * (targets.length));
                const randomTarget = targets[index];

                if (typeof delayBetweenPoints === 'number' && delayBetweenPoints > 0) {
                    point.setTargetWithDelay(count * delayBetweenPoints, randomTarget, false);
                    count++;
                } else {
                    point.setTarget(randomTarget, false, false);
                }
            }
        });

        this.triggerForce();
        return this;
    }

    setColorToAllPoints(color) {
        const points = [...this.points.values()];

        for (let i = 0; i < points.length; i++) {
            points[i].setColor(color);
        }
    }

    setColorToPoint(pointId, color) {
        if (typeof pointId === 'string') {
            const point = this.points.get(pointId);

            if (point !== null) {
                point.setColor(color);
            } else {
                console.log(`Point with id: ${pointId} not found. Could not set the color.`);
            }
        } else {
            throw new Error('Incorrect argument for point');
        }
    }

    setState(state) {
        if (state.points) {
            this.updatePoints(state.points);
        }

        if (state.targets) {
            this.updateTargets(state.targets);
        }
    }


    /**
     * Array of new point settings.
     *
     * @param {Array.<Object>} pointStates
     */
    updatePoints(pointStates, delayBetweenPoints = null, forceAlphaValue = 0.1) {
        if (typeof delayBetweenPoints !== 'number') {
            delayBetweenPoints = this.settings.delayBetweenPoints;
        }

        while (this.updatePoints_timeouts.length > 0) {
            const to = this.updatePoints_timeouts.pop();
            clearTimeout(to);
        }

        for (let i = 0; i < pointStates.length; i++) {
            const pointState = pointStates[i];

            const point = this.points.get(pointState.id);

            if (point !== null) {
                if (delayBetweenPoints > 0) {
                    this.updatePoints_timeouts.push(setTimeout(
                        point.update.bind(point, pointState, true),
                        i * delayBetweenPoints
                    ));
                } else {
                    point.update(pointState);
                }
            } else {
                console.log('No ID given for point. Cannot update.', pointState);
            }
        }

        this.triggerForce(forceAlphaValue);
    }

    /**
     * @param {Array.<Objects>} states
     */
    updateTargets(states) {
        for (let i = 0; i < states.length; i++) {
            const state = states[i];

            const target = this.targets.get(state.id);

            target.setState(state);
        }
    }

    getRandomTarget() {
        const targets = [...this.targets.values()];
        const index = Math.floor(Math.random() * targets.length);
        return targets[index];
    }

    getCenterTarget() {
        return this.targets.get('FRC_CENTER_TARGET');
    }
}
