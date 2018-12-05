import d3 from './d3-v3.5.5';
import Group from './Group';
import Helpers from './Helpers';
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
            pointNodes:[]
        };

        this.defaultSettings = {
            hexagonSize: 20,
            target: {
                startAngle: 90,
                width: 150,
                height: 30
            },

            groups: {

            },

            point: {
                radius: 5
            },

            collisionDetection: {
                clusterPadding: 10,
                nodePadding: 1
            }
        };

        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);

        this.d3 = d3();

        this.force = null;

        /**
         * Data.
         *
         * @type {{
         *       categories: Array,
         *       points: Array
         * }}
         */
        this.data = {
            targetsLength: 0, // Length of the categories map.
            targets: {},
            points: [],
            groups: {},
            groupsLength: 0
        };

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

    render() {
        this.renderTargets();
        this.setTotalPointcount(this.data.points.length);
        this.renderPoints();
    }

    renderPoints() {
        console.log(this.d3);
        this.nodes_ = [];
        for (let i = 0; i < this.data.points.length; i++) {
            const point = this.data.points[i];

            point.id = `point-${i}`;
            point.x = 0;
            point.y = 0;
            point.radius = this.settings.point.radius;
            point.color = '#F0F';
            point.target.x = 250;
            point.target.y = 250;

            const a = {
                id: 'node' + i,
                x: Math.random(),
                y: Math.random(),
                radius: this.settings.point.radius,
                target: {
                    x: 250,
                    y: 250
                }
            };

            this.nodes_.push(a);
        }


        // Use the force.
        this.force = this.d3.layout.force()
            .nodes(this.nodes_)
            .size([this.layers.svg.width, this.layers.svg.height])
            .gravity(0)
            .charge(0)
            .friction(0.91)
            .on('tick', this.createForceTick())
            .start();


        // Draw circle for each node.
        this.layers.pointNodes = this.d3.select(this.layers.points).selectAll('circle')
            .data(this.nodes_)
            .enter()
            .append('circle')
            .attr('id', d => d.id)
            .attr('class', 'point')
            .style('fill', d => d.color);

        // For smoother initial transition to settling spots.
        this.layers.pointNodes.transition()
            .duration(900)
            .delay((d, i) => i * 5)
            .attrTween('r', d => {
                const i = this.d3.interpolate(0, d.radius);

                return function a(t) {
                    return d.radius = i(t);
                };
            });
    }

    createForceTick(e) {
        const cls = this;
        return function forceTick(e) {
            cls.layers.pointNodes
                .each(cls.createGravityForce(0.051 * e.alpha))
                .each(cls.createCollisionDetection(0.5))
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        };
    }

    createGravityForce(alpha) {
        return function gravityForce(d) {
            d.x += (d.target.x - d.x) * alpha;
            d.y += (d.target.y - d.y) * alpha;
        };
    }

    createCollisionDetection(alpha) {
        const cls = this;
        const quadtree = this.d3.geom.quadtree(this.nodes_);

        // console.log('Q', quadtree);

        const nodePadding = cls.settings.collisionDetection.nodePadding;
        const clusterPadding = cls.settings.collisionDetection.clusterPadding;
        return function collisionDetection(d) {

            let r = d.radius + cls.settings.point.radius + Math.max(nodePadding, clusterPadding);

            // console.log('R', r);
            // // let r = cls.settings.point.radius + Math.max(nodePadding, clusterPadding);


            const nx1 = d.x - r;
            const nx2 = d.x + r;
            const ny1 = d.y - r;
            const ny2 = d.y + r;


            // console.log(r, nx1, nx2, ny1, ny2);

            quadtree.visit((quad, x1, y1, x2, y2) => {

                // console.log(quad.point);
                if (quad.point && (quad.point !== d)) {
                //     // console.log('yolo');
                    let x = d.x - quad.point.x;
                    let y = d.y - quad.point.y;
                    let l = Math.sqrt(x * x + y * y);

                    r = d.radius + quad.point.radius + (d.choice === quad.point.choice ? nodePadding : clusterPadding);



                    if (l < r) {
                        // console.log(l, r, alpha, l - r, l * alpha);
                        l = (l - r) / l * alpha;
                        d.x -= (x *= l);
                        d.y -= (y *= l);
                        quad.point.x += x;
                        quad.point.y += y;
                    }


                }

                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    setTotalPointcount(count) {
        this.layers.totalCountText.textContent = count;
    }

    renderTargets() {
        // Depending on the amount of categories we will start at different locations
        // and have a different angle.
        const angleStep = 360 / this.data.targetsLength;
        let step = 0;

        Object.keys(this.data.targets).forEach(key => {
            const target = this.data.targets[key];
            const angle = this.settings.target.startAngle - (angleStep * step);
            target.setAngle(angle)
                .render();
            // console.log(target);

            step++;
        });
    }

    /**
     * !important: you must run init first before
     * filling with data!
     *
     * @param  {Number} targets [description]
     * @param  {Number} groups  [description]
     * @return {[type]}         [description]
     */
    fillWithRandomData(targets = 6, groups = 2) {
        if (this.initialized === false) throw new Error('You must initialize the class before filling with data.');

        const targetTitles = [
            'Verwaltung',
            'Sonstige',
            'PrivatWirtschaft',
            'Staatsnaher Betrieb',
            'Partei/Parlament',
            'Kammer'
        ];

        const groupData = [
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

        for (let i = 0; i < targets; i++) {
            const title = targetTitles[i];

            const target = new Target(this, title);

            this.addTarget(title, target);
        }

        for (let i = 0; i < groups; i++) {
            const group = new Group(this, groupData[i]);

            group.fillWithRandomData();

            this.addGroup(groupData[i].id, group);

            this.data.points = this.data.points.concat(group.getPoints());
        }

        return this;
    }

    /**
     * Add a category from the chart.
     *
     * @param  {String}                id
     * @param  {Target}              category
     * @return {ForceRadarScatterplot}
     */
    addTarget(id, target) {
        this.data.targets[id] = target;
        this.data.targetsLength++;

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

    setupLayers() {
        this.createSVGLayer();
        this.createPointsLayer();
        this.createTargetsLayer();
        this.createCenterPointCountLayers();
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


    createCenterPointCountLayers() {
        const size = this.settings.hexagonSize;
        const hexagon = this.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const text = this.document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const g = this.document.createElementNS('http://www.w3.org/2000/svg', 'g');

        g.setAttribute('class', this.createPrefixedIdentifier('total-count-holder'));

        // Calculate dimensions for hexagon.
        const width = size * window.devicePixelRatio;
        const height = size * Math.sqrt(3) / 2 * window.devicePixelRatio;

        // Move the group to the center.
        const xTranslate = (this.holder.clientWidth / 2) - (width / 2);
        const yTranslate = (this.holder.clientHeight / 2) - (height / 2);
        g.setAttribute('transform', `translate(${xTranslate}, ${yTranslate})`);

        // Create the hexagon path
        const path = [
            // Top Left Middle
            'M', width * 0.25, 0,

            // Top Right Middle
            'L', width * 0.75, 0,

            // Right Top Middle
            'L', width, height * 0.5,

            'L', width * 0.75, height,

            'L', width * 0.25, height,


            'L', 0, height * 0.5,

            'Z'
        ];

        hexagon.setAttribute('d', path.join(' '));
        hexagon.setAttribute('stroke', '#8B8B8B');
        hexagon.setAttribute('stroke-width', 1 * window.devicePixelRatio);
        hexagon.setAttribute('fill', '#FFF');

        text.setAttribute('class', this.createPrefixedIdentifier('total-count'));
        text.setAttribute('x', 0);
        text.setAttribute('y', 0);
        text.setAttribute('fill', '#F00');
        text.setAttribute('text-anchor', 'middle');
        // For some reason need 3 px offset on the Y to get it centered correctly.
        text.setAttribute('transform', `translate(${width / 2}, ${(width / 2) + 3})`);
        text.textContent = '/';


        // Add all layers.
        this.layers.svg.appendChild(g);
        g.appendChild(hexagon);
        g.appendChild(text);

        // Cache hexagon.
        this.layers.hexagon = hexagon;
        this.layers.totalCountText = text;
    }

    checkDataIntegrity(data) {
        if (!data.categories) throw new Error('Data contains no categories.');
        if (!data.points) throw new Error('Data contains no points.');
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

        // TODO.

        // Convert data into classes.

        for (let i = 0; i < data.length; i++) {
            const category = data[i];


        }

        this.data = data;
    }


}
