// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';


const HISTOGRAM_TEMPLATE = {
     chart: {
        type: 'histogram',
        zoomType: 'x' 
    },
    xAxis: {
        alignTicks: false
    },
    yAxis:  {
        title: { text: 'Count' }
    },
    legend: {
        enabled: false
    },
    series:[{},{"visible": false}]
};

export function getHistogramConfiguration() {
    return cloneDeep(HISTOGRAM_TEMPLATE);
}
