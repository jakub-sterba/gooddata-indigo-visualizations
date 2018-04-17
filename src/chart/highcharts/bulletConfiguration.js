// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';


const BULLET_TEMPLATE = {
    chart: {
        inverted: true,
        marginLeft: 135,
        type: 'bullet',
        height: '100px'
    },
    legend: {
        enabled: false
    },
    yAxis: {
        gridLineWidth: 0
    },
    plotOptions: {
        bullet: {
          targetOptions: { color: 'black'}
        },
        series: {
            maxPointWidth: 100,
            pointPadding: 0.2,
            borderWidth: 0,
            targetOptions: {
                width: '200%'
            }
        }
    }
};

export function getBulletConfiguration() {
    return cloneDeep(BULLET_TEMPLATE);
}
