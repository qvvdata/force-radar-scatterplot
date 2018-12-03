import d3 from './d3-v3.5.5';

export default class ForceRadarScatterplot {
    constructor(document, holder) {
        this.document = document;

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
            categories: null
        };

        this.d3 = d3();

        const force = this.d3.layout.force();
        console.log('D#', this.d3, force);

        /**
         * Data.
         *
         * @type {Array.<Object>}
         */
        this.data = [];


        console.log('yolo');
    }

    init() {
        this.setupLayers();
    }

    setupLayers() {
        this.createSVGLayer();

        this.createLabels();
    }

    createSVGLayer() {
        this.layers.svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');


        this.layers.svg.setAttribute('width', this.holder.clientWidth);
        this.layers.svg.setAttribute('height', this.holder.clientHeight);

        this.holder.appendChild(this.layers.svg);
    }

    /**
     * Setters
     */
    setData(data) {
        this.data = data;
    }
}
