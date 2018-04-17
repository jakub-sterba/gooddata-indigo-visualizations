// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

import { MAX_POINT_WIDTH } from './commonConfiguration';

const SCATTER_TEMPLATE = {
    chart: {
        type: 'scatter',
        zoomType: 'xy'
    },
    plotOptions: {
         scatter: {
            marker: {
                radius: 5,
                states: {
                    hover: {
                        enabled: true,
                        lineColor: 'rgb(100,100,100)'
                    }
                }
            },
            states: {
                hover: {
                    marker: {
                        enabled: false
                    }
                }
            }
        },
      xAxis: {
        title: {
            enabled: true,
            text: 'X'
        },
        labels: {
            enabled: true
        },
        startOnTick: true,
        endOnTick: true,
        showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Y'
          },
          labels: {
            enabled: true
        }
      }   
    
    }, 
        series: {
            states: {
                hover: {
                    enabled: false
                }
            }
        }
    
}
    

export function getScatterConfiguration() {
    return cloneDeep(SCATTER_TEMPLATE);
}
