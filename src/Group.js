import Helpers from './Helpers';
import TargetPoint from './TargetPoint';

export default class group {
    constructor(parent, customSettings) {
        this.parent = parent;

        this.defaultSettings = {
            color: '#000',
            label: null,
            id: null
        };

        this.points = [];

        this.settings = Helpers.mergeDeep(this.defaultSettings, customSettings);
    }

    /**
     * @param  {Number} min [description]
     * @param  {Number} max [description]
     * @return {[type]}     [description]
     */
    fillWithRandomData(min = 150, max = 150) {
        const amount = min + (Math.random() * (max - min));

        const centerCoords = this.parent.getCenterCoords();
        for (let i = 0; i < amount; i++) {
            const point = {
                value: 1,
                group: this,
                label: 'Gerald Gartner',
                target: new TargetPoint(centerCoords.x, centerCoords.y),
                radius: this.parent.settings.point.radius,
                x: 0,
                y: 0
            };

            this.points.push(point);
        }

        return this;
    }

    /**
     * Getters.
     */
    getPoints() {
        return this.points;
    }
}
