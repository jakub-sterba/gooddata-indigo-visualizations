// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

const HEATMAP_LINE_WIDTH = 3;

const HEATMAP_TEMPLATE = {
    chart: {
        type: 'heatmap',
        marginTop: 45,
        plotBorderWidth: 1
    },
    colorAxis: {
        min: 0,
        minColor: '#FFFFFF',
        maxColor: 'rgb(20,178,226)',
    },
    legend: {
        enabled: true,
        align: 'right',
        layout: 'horizontal',
        margin: 0,
        verticalAlign: 'top',
        y: -25,
        symbolWidth: 280,
        symbolHeight: 10
    },
    xAxis: {
        categories: []
    },
    yAxis: {
        categories: [],
        labels: {
        autoRotation: [-90],
        formatter: function(){
                      if(this.pos>=this.chart.yAxis[0].categories.length) return '';
                      return this.value;
            }
    }
    },
    tooltip: {
        formatter: function () {
            return '<b>' + this.series.xAxis.categories[this.point.x] + '</b> sold <br><b>' +
                this.point.value + '</b> items on <br><b>' + this.series.yAxis.categories[this.point.y] + '</b>';
        }
    },
    series: [{
        dataLabels: {         
            color: '#000000',           
            allowOverlap: false
        }
    }]
};

export function getHeatMapConfiguration() {
    return cloneDeep(HEATMAP_TEMPLATE);
}
