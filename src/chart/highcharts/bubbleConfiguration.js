// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

import { MAX_POINT_WIDTH } from './commonConfiguration';

const BUBBLE_TEMPLATE = {
    chart: {
        type: 'bubble',
        plotBorderWidth: 1,
        zoomType: 'xy'
    },
    plotOptions: {
         bubble: {
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
            },
            dataLabels: {
                color: 'rgb(0,0,0)'  ,
                borderWidth: 0,
                shadow: false,
                 style: {
                    fontWeight: 'normal',
                    textOutline : 'none'
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
    

export function getBubbleConfiguration() {
    return cloneDeep(BUBBLE_TEMPLATE);
}
