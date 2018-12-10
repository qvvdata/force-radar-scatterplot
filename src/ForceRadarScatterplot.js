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
            // Delay between points when setting targets.
            delayBetweenPoints: 2,
            hexagonSize: 20,
            target: {
                background: '#f3f3f3',
                borderColor: '#8B8B8B',
                borderRadius: 100,
                borderWidth: 1,
                color: '#8B8B8B',
                startAngle: 90,
                width: 150,
                height: 30
            },

            centerTarget: {
                color: '#8B8B8B',
                fill: '#FFF'
            },

            group: {

            },

            point: {
                radius: 2.5,
                initAnimationDuration: 750,
                initAnimationDelayFactorBetweenPoints: 3,
                inactiveColor: '#8B8B8B'
            },

            collisionDetection: {
                clusterPadding: 5,
                nodePadding: 1
            },

            // Play with these properties untill you get your desired effect.
            force: {
                // The static points need to repulse the active points more so the point doesn't fly through it.
                staticCollisionRepulseFactor: 1,

                // Slows down the rate at which the node travels from its original position to its newly calculated position.
                // Lower values = MORE friction!!!
                friction: 0.91,

                // Strength of the attraction force towards it's destination point.
                gravity: 0.051,

                // “cooling parameter”that decrements at each tick and reduces the effect each of the forces play on the position of the nodes
                startAlpha: 0.10

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
         * Has this chart been initialzed?
         *
         * @type {Boolean}
         */
        this.initialized = false;

        // Must go at the very end.
        if (data !== null) {
            this.setData(data);
        }

        if (this.debug === true) {
            // Activate stats and log this class for use in the console.
            this.stats = new Stats();
            document.body.appendChild(this.stats.dom);
            this.stats.showPanel(0);

            this.drawRulers();

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
        this.layers.targets.setAttribute('style', 'position: absolute; left: 0; top: 0; height: 100%; width: 100%; z-index: 1;');
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

            // Create the collision points and add them to be rendered.
            this.renderedPoints = this.renderedPoints.concat(target.createCollisionPoints());
        });
    }

    /**
     * Renders all the points.
     */
    renderPoints() {
        const centerCoords = this.getCenterCoords();

        // Add collision points over the entire circle so points cannot escape and go out of bounds.
        this.renderedPoints = this.renderedPoints.concat(this.createCircleCollisionPoints());

        // We add the actual datapoints.
        this.renderedPoints = this.renderedPoints.concat([...this.points.values()]);

        // We assume that the points will always start in the center.
        // Start each point in a random point around the center
        // so it will fall to the center nicely on the startup.
        this.points.forEach(point => {
            const randAngleInRadians = (Math.random() * 360) * Math.PI / 180;
            const offsetFromCenter = this.holder.clientWidth / 4;
            point.x = (Math.cos(randAngleInRadians) * offsetFromCenter) + centerCoords.x;
            point.y = (Math.sin(randAngleInRadians) * offsetFromCenter) + centerCoords.y;
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

            renderPoint.setNode(node);

            // We only push the actuall circle svg node.
            this.layers.pointNodes.push(node[0][0]);
        }

        // Static points must have their radius set immediatly.
        // We generaly use them for collisions.
        this.d3.selectAll(this.layers.pointNodes).filter(d => d.isStatic)
            .attr('r', d => d.getRadius());

        // // Normal data points will be animated in.
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

        return points;
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
                cls.stats.begin();
            }

            cls.d3.selectAll(cls.layers.pointNodes)
                .each(cls.createGravityForce(cls.settings.force.gravity * e.alpha))
                .each(cls.createCollisionDetection(points, 0.5))
                .attr('fill', d => d.color)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            if (cls.debug === true) {
                cls.stats.end();
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
            if (target === null) return;

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
     * @param  {Number}   alpha  Decay factor between ticks.
     * @return {Function}
     */
    createCollisionDetection(points, alpha) {
        const cls = this;
        const quadtree = this.d3.geom.quadtree(points);

        const nodePadding = cls.settings.collisionDetection.nodePadding;
        const clusterPadding = cls.settings.collisionDetection.clusterPadding;
        return function collisionDetection(d) {
            let r = (d.radius * 2) + Math.max(nodePadding, clusterPadding);

            // let r = d.radius + nodePadding;

            const nx1 = d.x - r;
            const nx2 = d.x + r;
            const ny1 = d.y - r;
            const ny2 = d.y + r;

            quadtree.visit((quad, x1, y1, x2, y2) => {
                if (quad.point && (quad.point !== d)) {
                    const x = d.x - quad.point.x;
                    const y = d.y - quad.point.y;
                    let l = Math.sqrt(x * x + y * y);

                    const staticRepulseFactor = cls.settings.force.staticCollisionRepulseFactor;

                    r = d.radius + quad.point.radius + nodePadding;

                    // Try to change the radius of the detection if the points have different targets
                    // making them repulse eachother more.
                    // if (d.getTarget() !== null && quad.point.getTarget() !== null) {
                    //     if (d.target === quad.point.target) {
                    //         r += nodePadding;
                    //     } else {
                    //         r += clusterPadding;
                    //     }
                    // } else {
                    //     r += nodePadding;
                    // }

                    // Original algorithm for the code above.
                    // r = d.radius + quad.point.radius + (d.target.id === quad.point.target.id ? nodePadding : clusterPadding);

                    // points are directly stacked on top of eachother.
                    // move them away randomly.
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

                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    /**
     * Resets the data and re-rerenders.
     */
    reset() {
        // Reset these properties or we will have double data.
        this.renderedPoints = [];

        // You must do this before resetting the property!
        // Remove all the point nodes.
        this.layers.pointNodes.remove();

        this.layers.pointNodes = [];
        this.points = new Map();
        this.targets = new Map();

        this.setData(this.rawData);
        this.render();
    }

    /**
     * @param  {String} id
     * @param  {Target} category
     * @return {ForceRadarScatterplot}
     */
    addGroup(id, group) {
        this.data.groups[id] = group;
        this.data.groupsLength++;

        return this;
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

    highlightPoint(id, color) {
        if (!this.pointMap[id]) {
            console.log(`Trying to update non existing point with id: ${id}`);
        } else {
            this.pointMap.setColor(color);
        }
    }

    /**
     * Trigger the force so the points move.
     *
     * @param  {Number} alpha
     * @return {}
     */
    triggerForce(alpha = 0.1) {
        this.force.alpha(alpha);

        return this;
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
    fillWithRandomData(targetCount = 6, groupCount = 2, pointCount = 355) {
        if (this.initialized === false) throw new Error('You must initialize the class before filling with data.');

        const data = {
            targets: [],
            groups: [],
            points: []
        };

        const targetPool = [
            {
                id: 'Verwaltung',
                title: 'Verwaltung'
            },
            {
                id: 'Sonstige',
                title: 'Sonstige'
            },
            {
                id: 'PrivatWirtschaft',
                title: 'PrivatWirtschaft'
            },
            {
                id: 'Betrieb',
                title: 'Staatsnaher Betrieb'
            },
            {
                id: 'Partei/Parlament',
                title: 'Partei/Parlament'
            },
            {
                id: 'Kammer',
                title: 'Kammer'
            }
        ];

        const groupPool = [
            {
                color: '#2b2d42',
                id: 'OVP'
            },
            {
                color: '#cf2123',
                id: 'SPO'
            },
            {
                color: '#007be5',
                id: 'FPO'
            },
            {
                color: '#ff89e7',
                id: 'NEOS'
            },
            {
                color: '#b9c5bd',
                id: 'JETZT'
            },
            {
                color: '#64a013',
                id: 'GRUNE'
            },
            {
                color: '#7c7c68',
                id: 'OK'
            },
            {
                color: '#c8c8c8',
                id: 'SONSTIGE'
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
                title: targetConfig.title
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
                title: groupConfig.id,
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
                isActive: false
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

        // If there is a delay we will have to trigger the force on each point or
        // else they will not complete if we just a global force call.
        if (delayBetweenPoints === 0) {
            this.triggerForce();
        }

        return this;
    }

    /**
     * Moves points ta random selected target.
     *
     * @return {ForceRadarScatterplot}
     */
    movePointsToRandomTarget(delayBetweenPoints = 0) {
        const targets = [...this.targets.values()];
        let count = 0;

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

        // If there is a delay we will have to trigger the force on each point or
        // else they will not complete if we just a global force call.
        if (delayBetweenPoints === 0) {
            this.triggerForce();
        }

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

    /**
     * Array of new point settings.
     *
     * @param {Array.<Object>} pointStates
     */
    updatePoints(pointStates, delayBetweenPoints = 0, forceAlphaValue = 0.1) {
        for (let i = 0; i < pointStates.length; i++) {
            const pointState = pointStates[i];

            const point = this.points.get(pointState.id);

            if (point !== null) {
                if (delayBetweenPoints > 0) {
                    setTimeout(
                        point.update.bind(point, pointState, true),
                        i * delayBetweenPoints
                    );
                } else {
                    point.update(pointState);
                }
            } else {
                console.log('No ID given for point. Cannot update.', pointState);
            }
        }

        // You don't need to wrap this in an if because when there is no delay
        // this will run, and when there is a delay each point will call the force every time
        // so one extra call won't matter.
        if (forceAlphaValue !== false) {
            this.triggerForce(forceAlphaValue);
        }
    }

    getRandomTarget() {
        const targets = [...this.targets.values()];

        const index = Math.floor(Math.random() * targets.length);

        return targets[index];
    }
}
