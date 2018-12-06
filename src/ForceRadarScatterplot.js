import d3 from './d3-v3.5.5';
import CenterTarget from './CenterTarget';
import Group from './Group';
import Helpers from './Helpers';
import Point from './Point';
import Stats from './Stats';
import Target from './Target';

export default class ForceRadarScatterplot {
    /**
     * Constructor
     *
     * @param  {[type]} document [description]
     * @param  {[type]} holder   [description]
     * @param  {Array}  data     [description]
     * @return {ForceRadarScatterplot} Instance.
     */
    constructor(document, holder, customSettings = {}, data = null) {
        this.document = document;

        this.debug = true;

        if (this.debug === true) {
            this.stats = new Stats();

            document.body.appendChild(this.stats.dom);

            this.stats.showPanel(0);
            // this.stats.addPanel(1);
            // this.stats.addPanel(2);
        }

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
        this.holder = document.querySelector(holder);

        /**
         * References to the layer objects.
         *
         * @type {Object}
         */
        this.layers = {
            svg: null,
            targets: null,
            hexagon: null,
            totalCountText: null,
            pointNodes: []
        };

        this.defaultSettings = {
            hexagonSize: 20,
            target: {
                startAngle: 90,
                width: 150,
                height: 30
            },

            centerTarget: {
                color: '#8B8B8B'
            },

            group: {

            },

            point: {
                radius: 2.5
            },

            collisionDetection: {
                clusterPadding: 5,
                nodePadding: 1
            }
        };

        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);

        this.d3 = d3();

        this.force = null;

        this.targets = new Map();

        this.points = new Map();

        // Points that will be rendered.
        this.renderedPoints = [];

        /**
         * Data.
         *
         * @type {{
         *       categories: Array,
         *       points: Array
         * }}
         */

        if (data !== null) {
            this.setData(data);
        }


        this.initialized = false;
        console.log(this);
        return this;
    }

    init() {
        this.setupLayers();

        this.initialized = true;
        return this;
    }

    setupLayers() {
        this.createSVGLayer();
        this.createPointsLayer();
        this.createTargetsLayer();
    }

    render() {
        this.renderTargets();
        this.renderPoints();
    }

    movePointsRandomly() {
        const points = [...this.points.values()];

        for (let i = 0; i < points.length; i++) {
            const node = points[i];

            const target = new Target(this);
            target.x = Math.random() * 500;
            target.y = Math.random() * 500;

            node.setTarget(target);
        }

        this.force.resume();
    }

    renderPoints() {
        this.renderedPoints = this.renderedPoints.concat([...this.points.values()]);

        const points = this.renderedPoints;

        console.log(this.renderedPoints, points);
        // Use the force.
        this.force = this.d3.layout.force()
            .nodes(points)
            .size([this.layers.svg.width, this.layers.svg.height])
            .gravity(0)
            .charge(0)
            .friction(0.91)
            .on('tick', this.createForceTick(points))
            .start();


        // Draw circle for each node.
        this.layers.pointNodes = this.d3.select(this.layers.points).selectAll('circle')
            .data(points)
            .enter()
            .append('circle')
            .attr('id', d => d.getId())
            .attr('class', 'point')
            // .attr('r', d => d.getRadius())
            .style('fill', d => d.getColor());

        this.layers.pointNodes.filter(d => d.isStatic)
            .attr('r', d => d.getRadius());

        // For smoother initial transition to settling spots.
        this.layers.pointNodes.filter(d => !d.isStatic)
            .transition()
            .duration(750)
            .delay((d, i) => i * 3)
            .attrTween('r', d => {
                const i = this.d3.interpolate(0, d.radius);

                return function a(t) {
                    return d.radius = i(t);
                };
            });
    }

    createForceTick(points) {
        const cls = this;
        return function forceTick(e) {

            if (cls.debug === true) {
                cls.stats.begin();
            }

            cls.layers.pointNodes
                .each(cls.createGravityForce(0.051 * e.alpha))
                .each(cls.createCollisionDetection(points, 0.5))
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            if (cls.debug === true) {
                cls.stats.end();
            }
        };
    }

    createGravityForce(alpha) {
        return function gravityForce(d) {
            const target = d.getTarget();

            // Don't apply force to elements without a target.
            if (target === null) return;

            d.x += (target.getX() - d.x) * alpha;
            d.y += (target.getY() - d.y) * alpha;
        };
    }

    createCollisionDetection(points, alpha) {
        const cls = this;
        const quadtree = this.d3.geom.quadtree(points);

        const nodePadding = cls.settings.collisionDetection.nodePadding;
        const clusterPadding = cls.settings.collisionDetection.clusterPadding;
        return function collisionDetection(d) {

            let r = d.radius + cls.settings.point.radius + Math.max(nodePadding, clusterPadding);

            const nx1 = d.x - r;
            const nx2 = d.x + r;
            const ny1 = d.y - r;
            const ny2 = d.y + r;

            // console.log(r, nx1, nx2, ny1, ny2);
            quadtree.visit((quad, x1, y1, x2, y2) => {

                // console.log(quad.point);
                if (quad.point && (quad.point !== d)) {
                    // console.log('yolo', quad.point, d);
                    let x = d.x - quad.point.x;
                    let y = d.y - quad.point.y;
                    let l = Math.sqrt(x * x + y * y);

                    let staticRepulseFactor = 1.5;

                    // r = d.radius + quad.point.radius + (d.target.id === quad.point.target.id ? nodePadding : clusterPadding);

                    r = d.radius + quad.point.radius + nodePadding;

                    // if (d.getTarget() !== null && quad.point.getTarget() !== null) {
                    //     if (d.target === quad.point.target) {
                    //         r += nodePadding;
                    //     } else {
                    //         r += clusterPadding;
                    //     }
                    // } else {
                    //     r += nodePadding;
                    // }

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



                        // if (l < -2.6) {
                        //     l = -0.0006;
                        //     // console.log('L', l, (x *= l));
                        // }


                        if (d.isStatic && quad.point.isStatic === false) {
                            quad.point.x -= (x * l * staticRepulseFactor);

                            quad.point.y -= (y * l * staticRepulseFactor);
                        }

                        if (quad.point.isStatic && d.isStatic === false) {
                            d.x -= (x * l * staticRepulseFactor);
                            d.y -= (y * l * staticRepulseFactor);

                            // d.x -= (x *= l);
                            // d.y -= (y *= l);
                        }

                        if (d.isStatic === false && quad.point.isStatic === false) {
                            // if (d.isStatic === false) {
                                d.x -= x * l;
                                d.y -= y * l;
                            // }

                            // if (quad.point.isStatic === false) {
                                quad.point.x += x * l;
                                quad.point.y += y * l;
                            // }
                        }
                        // if (d.isStatic === false) {
                        //     d.x -= (x *= l);
                        //     d.y -= (y *= l);
                        // }

                        // if (quad.point.isStatic === false) {
                        //     quad.point.x += x;
                        //     quad.point.y += y;
                        // }
                    }
                }

                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    /**
     * @return {ForceRadarScatterplot}
     */
    renderTargets() {
        // Depending on the amount of categories we will start at
        // a different locations and have a different angle.
        const angleStep = 360 / (this.targets.size - 1); // -1 because we have to remove the center target.
        let step = 0;

        this.targets.forEach((target, id) => {
            if (id === 'TARGET_CENTER') {
                target.render();
            } else {
                const angle = this.settings.target.startAngle - (angleStep * step);
                target.setAngle(angle)
                    .render();

                step++;
            }

            // Create the collision points and add them to the renderer.
            this.renderedPoints = this.renderedPoints.concat(target.createCollisionPoints());
        });

        return this;
    }

    /**
     * @param  {String}                id
     * @param  {Target}              category
     * @return {ForceRadarScatterplot}
     */
    addGroup(id, group) {
        this.data.groups[id] = group;
        this.data.groupsLength++;

        return this;
    }

    /**
     * Remove a category from the chart.
     *
     * @param  {String}                id
     * @return {ForceRadarScatterplot}
     */
    removeTarget(id) {
        if (this.data.targets[id]) {
            delete this.data.targets[id];
            this.data.targetsLength--;
        }

        return this;
    }



    createSVGLayer() {
        this.layers.svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');

        this.layers.svg.setAttribute('class', this.createPrefixedIdentifier('svg'));

        this.layers.svg.setAttribute('width', this.holder.clientWidth);
        this.layers.svg.setAttribute('height', this.holder.clientHeight);

        this.holder.appendChild(this.layers.svg);
    }

    createPointsLayer() {
        this.layers.points = this.document.createElementNS('http://www.w3.org/2000/svg', 'g');

        this.layers.points.setAttribute('class', this.createPrefixedIdentifier('points'));

        this.layers.svg.appendChild(this.layers.points);
    }

    createTargetsLayer() {
        this.layers.targets = this.document.createElement('div');

        this.layers.targets.setAttribute('style', 'position: absolute; left: 0; top: 0; height: 100%; width: 100%; z-index: 1;');
        this.layers.targets.setAttribute('class', this.createPrefixedIdentifier('targets'));

        this.holder.appendChild(this.layers.targets);
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

    getTarget(id) {
        if (this.targets[id]) {
            return this.targets[id];
        }

        return null;
    }

    /**
     * Setters
     */
    setData(data) {
        this.checkDataIntegrity(data);

        // Add the center target first.
        const centerTarget = new CenterTarget(this, this.settings.centerTarget);
        this.targets.set(centerTarget.getId(), centerTarget);

        // Create targets.
        for (let i = 0; i < data.targets.length; i++) {
            const rawData = data.targets[i];
            const target = new Target(this, rawData);

            this.targets.set(target.getId(), target);
        }

        // Create points.
        for (let i = 0; i < data.points.length; i++) {
            const rawData = data.points[i];


            const point = new Point(this, rawData.id);
            point.radius = this.settings.point.radius;

            // console.log(this.targets.get('FRC_CENTER_TARGET'));
            point.setTarget(this.targets.get('FRC_CENTER_TARGET'));

            this.points.set(rawData.id, point);
        }
    }

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

    updatePoint(id, callback) {
        if (!this.pointMap[id]) {
            console.log(`Trying to update non existing point with id: ${id}`);
        } else {
            callback(this.pointMap[id]);
        }
    }

    updatePoints(callback) {
        for (let i = 0; i < this.data.points.length; i++) {
            callback(this.data.points[i]);
        }

        return this;
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
     * !important: you must run init first before
     * filling with data!
     *
     * @param  {Number} targets
     * @param  {Number} groups
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
                id:  'Betrieb',
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
        for (let i = 0; i < targetCount; i++) {
            // Reset the target pool index to 0 if we go out of bounds.
            if (targetPoolIndex >= targetPool.length) {
                targetPoolIndex = 0;
            }

            const targetConfig = targetPool[targetPoolIndex];
            data.targets.push(targetConfig);


            targetPoolIndex++;
        }

        // for (let i = 0; i < groups; i++) {
        //     const group = new Group(this, groupData[i]);
        //     this.addGroup(groupData[i].id, group);
        // }

        // const centerCoords = this.getCenterCoords();
        for (let i = 0; i < pointCount; i++) {
            const pointConfig = {
                id: `point-${i}`,
                target: 'FRC_CENTER_TARGET'
            };

            data.points.push(pointConfig);
        }


        this.setData(data);
        return this;
    }
}
