// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

const DONUT_TEMPLATE = {
    chart: {
        type: 'pie'
    },
    plotOptions: {
        pie: {
            size: '100%',
            innerSize: '60%',
            allowPointSelect: false,
            dataLabels: {
                enabled: false
            },
            showInLegend: true
        }
    },
    legend: {
        enabled: false
    }
};

export function getDonutConfiguration() {
    return cloneDeep(DONUT_TEMPLATE);
}
