import '../../dist/ForceRadarScatterplot.js';

// Create instance.
const ForceRadarScatterplotInstance = new ForceRadarScatterplot.default(document, '#chart-holder');

ForceRadarScatterplotInstance.init()
    .fillWithRandomData()
    .render();


window.document.querySelector('#movePointsRandomly').addEventListener('click', () => {
    ForceRadarScatterplotInstance.movePointsRandomly();
});


window.document.querySelector('#movePointsToTargets').addEventListener('click', () => {
    ForceRadarScatterplotInstance.updatePoints(point => {
        point.setTarget(point.customAttributes.target);
    });
});
