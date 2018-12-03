import '../../dist/ForceRadarScatterplot.js';

// Fetch data.
const ForceRadarScatterplotInstance = new ForceRadarScatterplot.default(document, '#chart-holder');

console.log('YOLO', ForceRadarScatterplot.default, ForceRadarScatterplotInstance);

// Set Data
// ForceRadarScatterplotInstance.setData();

ForceRadarScatterplotInstance.init();
// console.log(ForceRadarScatterplotInstance);
