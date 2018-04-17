// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';


const PARETO_TEMPLATE = {
     chart: {
        type: 'pareto' ,
        zoomType: 'x'
    },
    legend: {
        enabled: false
    },
    series:[{
        type: 'pareto',
        name: 'Pareto',
        yAxis: 1,
        zIndex: 10,
        baseSeries: 1
      },
      {
        type: 'column',
        zIndex: 2
      }]
};

export function getParetoConfiguration() {
    return cloneDeep(PARETO_TEMPLATE);
}
