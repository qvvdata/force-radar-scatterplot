import Target from './Target';
import Point from './Point';

export default class CenterTarget extends Target {
    constructor(chart, customSettings) {
        customSettings.id = 'FRC_CENTER_TARGET';

        super(chart, customSettings);

        /**
         * SVG Node.
         *
         * @type {Object}
         */
        this.iconNode = null;

        /**
         * SVG Node.
         *
         * @type {Object}
         */
        this.textNode = null;
    }

    calculateDrawingCoordinates() {
        const BBoxHolder = this.chart.holder.getBoundingClientRect();

        return {
            x: BBoxHolder.width / 2,
            y: BBoxHolder.height / 2
        };
    }

    render() {
        // Calculate dimensions for hexagon.
        const size = this.chart.settings.hexagonSize;
        const width = size * window.devicePixelRatio;
        const height = size * Math.sqrt(3) / 2 * window.devicePixelRatio;


        // Move the group to the center.
        const xTranslate = (this.chart.holder.clientWidth / 2) - (width / 2);
        const yTranslate = (this.chart.holder.clientHeight / 2) - (height / 2);

        const group = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const icon = this.createHexagonElement(xTranslate, yTranslate, width, height);
        const text = this.createTextElement(width, height);

        group.setAttribute('class', this.chart.createPrefixedIdentifier('total-count-holder'));


        // group.setAttribute('transform', `translate(${xTranslate}, ${yTranslate})`);

        this.chart.layers.svg.appendChild(group);
        group.appendChild(icon);
        group.appendChild(text);

        this.textNode = text;
        this.iconNode = icon;

        this.x = this.chart.holder.clientWidth / 2;

        this.y = this.chart.holder.clientHeight / 2;

        return this;
    }

    /**
     * @return {Object}
     */
    createHexagonElement(x, y, width, height) {
        const hexagon = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create the hexagon path.
        let path = [
            // Top Left Middle
            'M', x + width * 0.25, y,

            // Top Right Middle
            'L', x + width * 0.75, y,

            // Right Top Middle
            'L', x + width, y + height * 0.5,

            'L', x + width * 0.75, y + height,

            'L', x + width * 0.25, y + height,

            'L', x, y + height * 0.5,

            'Z'
        ];

        hexagon.setAttribute('d', path.join(' '));
        hexagon.setAttribute('stroke', '#8B8B8B');
        hexagon.setAttribute('fill', '#FFF');

        if (this.chart.debug === true) {
            hexagon.setAttribute('opacity', '.1');
        }

        hexagon.setAttribute('stroke-width', 1 * window.devicePixelRatio);

        return hexagon;
    }

    createTextElement(width, height) {
        const text = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'text');

        text.setAttribute('class', this.chart.createPrefixedIdentifier('total-count'));
        text.setAttribute('x', 0);
        text.setAttribute('y', 0);
        text.setAttribute('fill', '#8B8B8B');
        text.setAttribute('text-anchor', 'middle');
        // For some reason need 3 px offset on the Y to get it centered correctly.
        text.setAttribute('transform', `translate(${width / 2}, ${(height / 2) + 3})`);
        text.textContent = '/';

        return text;
    }

    /** @inheritDoc */
    createCollisionPoints() {
        const totalLengthPath = this.iconNode.getTotalLength();
        const points = [];

        const amountOfCollisionPoints = Math.ceil(totalLengthPath / this.collisionPrecision);

        for (let i = 0; i < amountOfCollisionPoints; i++) {
            const point = new Point(this.chart);
            point.isStatic = true;

            const dist = i / amountOfCollisionPoints * totalLengthPath;
            const coordsOnPath = this.iconNode.getPointAtLength(dist);

            point.x = coordsOnPath.x;
            point.y = coordsOnPath.y;
            point.radius = this.collisionPrecision / 2;
            points.push(point);
        }

        const cpoint = new Point(this.chart);
        cpoint.isStatic = true;
        cpoint.x = this.x;
        cpoint.y = this.y;
        cpoint.radius = this.chart.settings.hexagonSize - 5;
        points.push(cpoint);


        return points;
    }
}
