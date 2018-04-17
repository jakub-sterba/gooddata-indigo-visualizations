// (C) 2007-2018 GoodData Corporation
import { cloneDeep, invoke, get, set, isEmpty } from 'lodash';
import { chartClick } from '../../utils/drilldownEventing';
import styleVariables from '../../styles/variables';

const isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;

export const DEFAULT_SERIES_LIMIT = 1000;
export const DEFAULT_CATEGORIES_LIMIT = 365;
export const MAX_POINT_WIDTH = 100;
export const HOVER_BRIGHTNESS = 0.1;
export const MINIMUM_HC_SAFE_BRIGHTNESS = Number.MIN_VALUE;

let previousChart = null;

const BASE_TEMPLATE = {
    credits: {
        enabled: false
    },
    title: {
        // setting title to empty string prevents it from being shown
        text: ''
    },
    series: [],
    legend: {
        enabled: false
    },
    yAxis: {
        gridLineColor: '#ebebeb',
        labels: {
            style: {
                color: styleVariables.gdColorStateBlank,
                font: '12px Avenir, "Helvetica Neue", Arial, sans-serif'
            }
        },
        title: {
            margin: 15,
            style: {
                color: styleVariables.gdColorLink,
                font: '14px Avenir, "Helvetica Neue", Arial, sans-serif'
            }
        }
    },
    xAxis: {
        lineColor: '#d5d5d5',

        // hide ticks on x axis
        minorTickLength: 0,
        tickLength: 0,

        // padding of maximum value
        maxPadding: 0.05,

        labels: {
            style: {
                color: styleVariables.gdColorStateBlank,
                font: '12px Avenir, "Helvetica Neue", Arial, sans-serif'
            },
            autoRotation: [-90]
        },
        title: {
            margin: 10,
            style: {
                color: styleVariables.gdColorLink,
                font: '14px Avenir, "Helvetica Neue", Arial, sans-serif'
            }
        }
    },
    drilldown: {
        activeDataLabelStyle: {
            textDecoration: 'none'
        },
        activeAxisLabelStyle: {
            color: styleVariables.gdColorText,
            textDecoration: 'none'
        },
        drillUpButton: {
            theme: {
                style: {
                    // https://forum.highcharts.com/highcharts-usage/empty-checkbox-after-drilldown-with-x-axis-label-t33414/
                    display: 'none'
                }
            }
        }
    },
    plotOptions: {
        series: {
            animation: false,
            enableMouseTracking: true, // !Status.exportMode,
            turboThreshold: DEFAULT_CATEGORIES_LIMIT,
            events: {
                legendItemClick() {
                    if (this.visible) {
                        this.points.forEach(point => point.dataLabel && point.dataLabel.hide());
                    }
                }
            },
            dataLabels: {
                style: {                 
                    textOutline : 'none',
                    'text-shadow': '0 0 3px contrast'
                }
            },
            point: {
                events: {
                    click() {
                        if (isTouchDevice) {
                            // Close opened tooltip on previous clicked chart
                            // (click between multiple charts on dashboards)
                            const currentChart = this.series.chart;
                            const currentId = get(currentChart, 'container.id');
                            const prevId = get(previousChart, 'container.id');
                            const previousChartDisconnected = isEmpty(previousChart);
                            if (previousChart && !previousChartDisconnected && prevId !== currentId) {
                                // Remove line chart point bubble
                                invoke(previousChart, 'hoverSeries.onMouseOut');
                                previousChart.tooltip.hide();
                            }

                            if (!previousChart || prevId !== currentId) {
                                previousChart = currentChart;
                            }
                        }
                    }
                }
            }
        }
    },
    chart: {
        animation: false,
        style: {
            fontFamily: 'Avenir, "Helvetica Neue", Arial, sans-serif'
        }
    }
};

function registerDrilldownHandler(configuration, chartOptions, drillConfig) {
    set(configuration, 'chart.events.drilldown', function chartDrilldownHandler(event) {
        chartClick(drillConfig, event, this.container, chartOptions.type);
    });

    return configuration;
}

export function getCommonConfiguration(chartOptions, drillConfig) {
    const commonConfiguration = cloneDeep(BASE_TEMPLATE);

    return registerDrilldownHandler(commonConfiguration, chartOptions, drillConfig);
}
