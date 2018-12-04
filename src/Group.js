import Helpers from './Helpers';

export default class group {
    constructor(parent, customSettings) {

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
    fillWithRandomData(min = 0, max = 50) {
        const amount = min + (Math.random() * (max - min));

        for (let i = 0; i < amount; i++) {
            const point = {
                value: 1,
                category: this,
                label: 'Gerald Gartner'
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
