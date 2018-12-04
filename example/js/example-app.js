import '../../dist/ForceRadarScatterplot.js';

// Create instance.
const ForceRadarScatterplotInstance = new ForceRadarScatterplot.default(document, '#chart-holder');

ForceRadarScatterplotInstance.init()
    .fillWithRandomData()
    .render();
