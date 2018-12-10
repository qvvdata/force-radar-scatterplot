import '../../dist/ForceRadarScatterplot.js';

// Create instance.
const ForceRadarScatterplotInstance = new ForceRadarScatterplot.default(document, '#chart-holder');

ForceRadarScatterplotInstance.init()
    .fillWithRandomData()
    .render();

window.document.querySelector('#movePointsRandomly').addEventListener('click', () => {
    ForceRadarScatterplotInstance.movePointsRandomly();
});


window.document.querySelector('#movePointsToRandomTarget').addEventListener('click', () => {
    ForceRadarScatterplotInstance.movePointsToRandomTarget();
});

window.document.querySelector('#movePointsToCenter').addEventListener('click', () => {
    ForceRadarScatterplotInstance.movePointsToCenter();
});

window.document.querySelector('#changeColours').addEventListener('click', () => {

    const colors = [
        '#F00',
        '#0F0',
        '#FF0',
        '#00F',
        '#0FF',
        '#3FC',
        '#F90'
    ];

    const color = colors[Math.floor(Math.random() * colors.length - 1)];

    ForceRadarScatterplotInstance.changeColours(color);
});

window.document.querySelector('#reset').addEventListener('click', () => {
    ForceRadarScatterplotInstance.reset();
});
