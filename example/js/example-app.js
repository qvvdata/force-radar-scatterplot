import ForceRadarScatterplot from './ForceRadarScatterplot.js';


// Fetch data.

const ForceRadarScatterplotInstance = new ForceRadarScatterplot(document, '#chart-holder');

// Set Data
ForceRadarScatterplotInstance.setData();

ForceRadarScatterplotInstance.init();
console.log(ForceRadarScatterplotInstance);
