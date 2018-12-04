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
            pointCount: null
        };

        this.defaultSettings = {
            hexagonSize: 20,
            target: {
                startAngle: 90,
                width: 150,
                height: 30
            },

            groups: {

            }
        };

        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);

        this.d3 = d3();

        const force = this.d3.layout.force();
        console.log('D3', force);

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

        console.log(this);
        return this;
    }

    init() {
        this.setupLayers();

        return this;
    }

    render() {
        this.renderTargets();
    }

    renderTargets() {
        // Depending on the amount of categories we will start at different locations
        // and have a different angle.

        const angleStep = 360 / this.data.targetsLength;
        let step = 0;

        Object.keys(this.data.targets).forEach(key => {
            const target = this.data.targets[key];

            target.setAngle(this.settings.target.startAngle - (angleStep * step))
                .render();
            console.log(target);

            step++;
        });
    }

    fillWithRandomData(targets = 6, groups = 2) {
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

    createTargetsLayer() {
        this.layers.targets = this.document.createElement('div');

        this.layers.targets.setAttribute('style', 'position: absolute; left: 0; top: 0; height: 100%; width: 100%; z-index: 1;');
        this.layers.targets.setAttribute('class', this.createPrefixedIdentifier('targets'));

        this.holder.appendChild(this.layers.targets);
    }


    createCenterPointCountLayers() {
        const size = this.settings.hexagonSize;
        const hexagon = this.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const g = this.document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const width = size * window.devicePixelRatio;
        const height = size * Math.sqrt(3) / 2 * window.devicePixelRatio;


        const xTranslate = (this.holder.clientWidth / 2) - (width / 2);
        const yTranslate = (this.holder.clientHeight / 2) - (height / 2);
        g.setAttribute('transform', `translate(${xTranslate}, ${yTranslate})`);

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


        this.layers.svg.appendChild(g);

        g.appendChild(hexagon);

        this.layers.hexagon = hexagon;
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

        // Convert data into classes.

        for (let i = 0; i < data.length; i++) {
            const category = data[i];


        }

        this.data = data;
    }


}
