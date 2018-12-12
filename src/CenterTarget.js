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

    updateStatistics(point, change) {
        if (this.textNode !== null) {
            const count = parseInt(this.textNode.textContent, 10);
            this.textNode.textContent = count + change;
        }
    }

    getStatsEl() {
        return this.textNode;
    }

    render() {
        const group = this.chart.document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', this.chart.createPrefixedIdentifier('center-target'));
        this.chart.layers.svg.appendChild(group);

        // Calculate dimensions for hexagon.
        let size = this.chart.settings.centerTarget.hexagonSize;

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


        // This must come at the end.
        this.calculateGroupCenterTargetCoordinates(this.xCenter, this.yCenter, size);

        if (this.chart.debug === true) {
            this.renderDebugElements();
        }

        return this;
    }

    renderDebugElements() {
        // We have to offset the target bbox by the chart holder
        // because the client returns global coordinates instead
        // of local to the parent.
        const bbox = this.iconNode.getBoundingClientRect();
        const bboxChart = this.chart.holder.getBoundingClientRect();

        const customBBox = {
            left: bbox.left - bboxChart.left,
            top: bbox.top - bboxChart.top,
            width: bbox.width,
            height: bbox.height
        };

        this.chart.drawBoundingBox(customBBox);

        // Visualize the group center traget coordiantes
        this.chart.groups.forEach(group => {
            const el = this.chart.document.createElement('div');

            el.setAttribute('style', [
                'position: absolute',
                `left: ${this.groupTargetCoordinates[group.id].x}px`,
                `top: ${this.groupTargetCoordinates[group.id].y}px`,
                'width: 10px',
                'height: 10px',
                'border-radius: 100px',
                'background: rgba(0, 250, 0, .5)',
                'z-index: 1000',
                'transform: translate(-50%, -50%)'
            ].join(';'));

            this.chart.holder.appendChild(el);
        });
    }

    calculateGroupCenterTargetCoordinates(xCenter, yCenter, size) {
        let counter = 0;
        const rotationStart = 360 / this.chart.groups.size;

        this.chart.groups.forEach(group => {
            const rotation = rotationStart + (counter * rotationStart);
            const x = xCenter + (Math.cos(rotation * Math.PI / 180) * size);
            const y = yCenter + (Math.sin(rotation * Math.PI / 180) * size);

            this.groupTargetCoordinates[group.id] = {
                x: x,
                y: y,
                angle: rotation
            };

            counter++;
        });
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

        text.style.fontSize = this.chart.settings.centerTarget.fontSize;

        // Count only the active points.
        let activeCount = 0;
        Object.keys(this.points).forEach(key => {
            if (this.points[key].isActive) {
                activeCount++;
            }
        });

        text.textContent = activeCount;

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

            point.target = this;
            point.x = coordsOnPath.x;
            point.y = coordsOnPath.y;
            point.radius = this.collisionPrecision / 2;
            points.push(point);
        }

        const cpoint = new Point(this.chart);
        cpoint.target = this;
        cpoint.isStatic = true;
        cpoint.x = this.xCenter;
        cpoint.y = this.yCenter;
        cpoint.radius = this.chart.settings.centerTarget.hexagonSize - 5;
        points.push(cpoint);

        return points;
    }
}
