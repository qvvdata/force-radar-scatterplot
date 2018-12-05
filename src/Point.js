export default class Point {
    constructor(chart, id, value = 1) {


        this.chart = chart;

        this.id = id;

        this.value = value;

        this.target;

        this.group;

        this.color;

        this.x;

        this.y;
    }

    getRadius() {
        return this.chart.settings.point.radius;
    }

    setTarget(targetId) {


    }

    setColor(color) {
        this.color = color;

        // Update the svg node.
    }
}
