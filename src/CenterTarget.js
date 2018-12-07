import Helpers from './Helpers';
import Point from './Point';
import Target from './Target';

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
        const group = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', this.chart.createPrefixedIdentifier('total-count-holder'));
        this.chart.layers.svg.appendChild(group);

        // Calculate dimensions for hexagon.
        let size = this.chart.settings.hexagonSize;

        // We must double the size on 4k monitors.
        if (Helpers.on4kScreen() === true) {
            size *= 2;
        }

        const width = size * window.devicePixelRatio;
        const height = size * Math.sqrt(3) / 2 * window.devicePixelRatio;

        // Move the group to the center.
        const x = (this.chart.holder.clientWidth / 2) - (width / 2);
        const y = (this.chart.holder.clientHeight / 2) - (height / 2);

        const icon = this.createHexagonElement(x, y, width, height);
        group.appendChild(icon);

        // Render text element for statistics.
        this.renderTextElement(group);

        this.iconNode = icon;
        this.xCenter = this.chart.holder.clientWidth / 2;
        this.yCenter = this.chart.holder.clientHeight / 2;

        return this;
    }

    renderTextElement(group) {
        const text = this.createTextElement();

        // First append the text element to the chart.
        group.appendChild(text);

        // Get the size.
        const bbox = text.getBoundingClientRect();

        text.setAttribute('x', this.chart.holder.clientWidth / 2);

        // Have to offset 3 pixels otherwise it is not correctly centered.
        // No idea why.
        text.setAttribute('y', this.chart.holder.clientHeight / 2 + bbox.height / 2 - 3);

        this.textNode = text;
    }

    /**
     * @return {Object}
     */
    createHexagonElement(x, y, width, height) {
        const hexagon = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Create the hexagon path.
        const path = [
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
            hexagon.setAttribute('opacity', '.5');
        }

        hexagon.setAttribute('stroke-width', 1 * window.devicePixelRatio);

        return hexagon;
    }

    createTextElement() {
        const text = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'text');

        text.setAttribute('class', this.chart.createPrefixedIdentifier('total-count'));
        text.setAttribute('x', 0);

        // For some reason need 3 px offset on the Y to get it centered correctly.
        // Maybe has something to
        text.setAttribute('y', 0);
        text.setAttribute('fill', '#8B8B8B');
        text.setAttribute('text-anchor', 'middle');

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
        cpoint.x = this.xCenter;
        cpoint.y = this.yCenter;
        cpoint.radius = this.chart.settings.hexagonSize - 5;
        points.push(cpoint);


        return points;
    }
}
