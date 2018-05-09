// (C) 2007-2018 GoodData Corporation
import { set, get, merge, map, partial, isEmpty, compact, cloneDeep, every } from 'lodash';
import cx from 'classnames';

import {
    stripColors,
    numberFormat
} from '@gooddata/numberjs';

import styleVariables from '../../styles/variables';


import { BAR_CHART, COLUMN_CHART, LINE_CHART, PIE_CHART, DONUT_CHART, AREA_CHART, COLUMN_LINE_CHART, COLUMN_AREA_CHART, TREEMAP_CHART, HEATMAP_CHART, WORDCLOUD_CHART, SCATTER_CHART, BULLET_CHART, BUBBLE_CHART, WATERFALL_CHART, FUNNEL_CHART, HISTOGRAM_CHART, PARETO_CHART, DUAL_AXIS_CHART, SANKEY_DIAGRAM } from '../../VisualizationTypes';
import { HOVER_BRIGHTNESS, MINIMUM_HC_SAFE_BRIGHTNESS } from './commonConfiguration';
import { getLighterColor, DEFAULT_COLOR_PALETTE } from '../../utils/color';

const EMPTY_DATA = { categories: [], series: [] };

const ALIGN_LEFT = 'left';
const ALIGN_RIGHT = 'right';
const ALIGN_CENTER = 'center';

const TOOLTIP_ARROW_OFFSET = 23;
const TOOLTIP_FULLSCREEN_THRESHOLD = 480;
const TOOLTIP_MAX_WIDTH = 366;
const TOOLTIP_BAR_CHART_VERTICAL_OFFSET = 5;
const TOOLTIP_VERTICAL_OFFSET = 14;

const escapeAngleBrackets = str => str && str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

function getTitleConfiguration(chartOptions) {
    return {
        yAxis: {
            title: {
                text: escapeAngleBrackets(get(chartOptions, 'title.y', ''))
            }
        },
        xAxis: {
            title: {
                text: escapeAngleBrackets(get(chartOptions, 'title.x', ''))
            }
        }
    };
}

function formatAsPercent() {
    const val = parseFloat((this.value * 100).toPrecision(14));
    return `${val}%`;
}

function getShowInPercentConfiguration(chartOptions) {
    const { showInPercent,showInPercentX } = chartOptions;

    const y = showInPercent ? {
        yAxis: {
            labels: {
                formatter: formatAsPercent
            }
        }
    } : {};
    
    const x = showInPercentX ? {
        xAxis: {
            labels: {
                formatter: formatAsPercent
            }
        }
    } : {};
        
    return merge(x,y);
}

function getArrowAlignment(arrowPosition, chartWidth) {
    const minX = -TOOLTIP_ARROW_OFFSET;
    const maxX = chartWidth + TOOLTIP_ARROW_OFFSET;

    if (
        arrowPosition + (TOOLTIP_MAX_WIDTH / 2) > maxX &&
        arrowPosition - (TOOLTIP_MAX_WIDTH / 2) > minX
    ) {
        return ALIGN_RIGHT;
    }

    if (
        arrowPosition - (TOOLTIP_MAX_WIDTH / 2) < minX &&
        arrowPosition + (TOOLTIP_MAX_WIDTH / 2) < maxX
    ) {
        return ALIGN_LEFT;
    }

    return ALIGN_CENTER;
}

const getTooltipHorizontalStartingPosition = (arrowPosition, chartWidth, tooltipWidth) => {
    switch (getArrowAlignment(arrowPosition, chartWidth)) {
        case ALIGN_RIGHT:
            return (arrowPosition - tooltipWidth) + TOOLTIP_ARROW_OFFSET;
        case ALIGN_LEFT:
            return arrowPosition - TOOLTIP_ARROW_OFFSET;
        default:
            return arrowPosition - (tooltipWidth / 2);
    }
};

function getArrowHorizontalPosition(chartType, stacking, dataPointEnd, dataPointHeight) {
    if (chartType === BAR_CHART && stacking) {
        return dataPointEnd - (dataPointHeight / 2);
    }

    return dataPointEnd;
}

function getDataPointEnd(chartType, isNegative, endPoint, height, stacking) {
    return (chartType === BAR_CHART && isNegative && stacking) ? endPoint + height : endPoint;
}

function getDataPointStart(chartType, isNegative, endPoint, height, stacking) {
    return (chartType === COLUMN_CHART && isNegative && stacking) ? endPoint - height : endPoint;
}

function getTooltipVerticalOffset(chartType, stacking, point) {
    if (chartType === COLUMN_CHART && (stacking || point.negative)) {
        return 0;
    }

    if (chartType === BAR_CHART) {
        return TOOLTIP_BAR_CHART_VERTICAL_OFFSET;
    }

    return TOOLTIP_VERTICAL_OFFSET;
}

function positionTooltip(chartType, stacking, labelWidth, labelHeight, point) {
    const dataPointEnd = getDataPointEnd(chartType, point.negative, point.plotX, point.h, stacking);
    const arrowPosition = getArrowHorizontalPosition(chartType, stacking, dataPointEnd, point.h);
    const chartWidth = this.chart.plotWidth;

    const tooltipHorizontalStartingPosition = getTooltipHorizontalStartingPosition(
        arrowPosition,
        chartWidth,
        labelWidth
    );

    const verticalOffset = getTooltipVerticalOffset(chartType, stacking, point);

    const dataPointStart = getDataPointStart(
        chartType,
        point.negative,
        point.plotY,
        point.h,
        stacking
    );

    return {
        x: this.chart.plotLeft + tooltipHorizontalStartingPosition,
        y: (this.chart.plotTop + dataPointStart) - (labelHeight + verticalOffset)
    };
}

const showFullscreenTooltip = () => {
    return document.documentElement.clientWidth <= TOOLTIP_FULLSCREEN_THRESHOLD;
};

function formatTooltip(chartType, stacking, tooltipCallback) {
    const { chart } = this.series;
    const { color: pointColor } = this.point;

    // when brushing, do not show tooltip
    if (chart.mouseIsDown) {
        return false;
    }

    const dataPointEnd = ((chartType === LINE_CHART)||(chartType === AREA_CHART)||(! this.point.tooltipPos))
        ? this.point.plotX
        : getDataPointEnd(
            chartType,
            this.point.negative,
            this.point.tooltipPos[0],
            this.point.tooltipPos[2],
            stacking
        );

    const dataPointHeight = ((chartType === LINE_CHART)||(chartType === AREA_CHART)||(! this.point.shapeArgs)) ? 0 : this.point.shapeArgs.height;

    const arrowPosition = getArrowHorizontalPosition(
        chartType,
        stacking,
        dataPointEnd,
        dataPointHeight
    );

    const chartWidth = chart.plotWidth;
    const align = getArrowAlignment(arrowPosition, chartWidth);

    const strokeStyle = pointColor ? `border-top-color: ${pointColor};` : '';

    const tailStyle = showFullscreenTooltip() ?
        `style="left: ${arrowPosition + chart.plotLeft}px;"` : '';

    const getTailClasses = (classname) => {
        return cx(classname, {
            [align]: !showFullscreenTooltip()
        });
    };

    return (
        `<div class="hc-tooltip">
            <span class="stroke" style="${strokeStyle}"></span>
            <div class="content">
                ${tooltipCallback(this.point)}
            </div>
            <div class="${getTailClasses('tail1')}" ${tailStyle}></div>
            <div class="${getTailClasses('tail2')}" ${tailStyle}></div>
        </div>`
    );
}

function formatLabel(value, format) {
    // no labels for missing values
    if (value === null) {
        return null;
    }

    const stripped = stripColors(format || '');
    return escapeAngleBrackets(String(numberFormat(value, stripped)));
}

function labelFormatter() {
    return formatLabel(this.y, get(this, 'point.format'));
}

function funnelLabelFormatter() {
    return get(this, 'point.name')+'<br>'+formatLabel(this.y, get(this, 'point.format'));
}


// check whether series contains only positive values, not consider nulls
function hasOnlyPositiveValues(series, x) {
    return every(series, (seriesItem) => {
        const dataPoint = seriesItem.yData[x];
        return dataPoint !== null && dataPoint >= 0;
    });
}

function stackLabelFormatter() {
    // show labels: always for negative,
    // without negative values or with non-zero total for positive
    const showStackLabel =
        this.isNegative || hasOnlyPositiveValues(this.axis.series, this.x) || this.total !== 0;
    return showStackLabel ?
        formatLabel(this.total, get(this, 'axis.userOptions.defaultFormat')) : null;
}

function getTooltipConfiguration(chartOptions) {
    const tooltipAction = get(chartOptions, 'actions.tooltip');
    const chartType = chartOptions.type;
    const { stacking } = chartOptions;

    return tooltipAction ? {
        tooltip: {
            borderWidth: 0,
            borderRadius: 0,
            shadow: false,
            useHTML: true,
            positioner: partial(positionTooltip, chartType, stacking),
            formatter: partial(formatTooltip, chartType, stacking, tooltipAction)
        }
    } : {};
}

function getLabelsConfiguration(chartOptions) {
    const style = chartOptions.stacking ? {
        color: '#ffffff',
        textShadow: '0 0 1px #000000'
    } : {
        color: '#000000',
        textShadow: 'none'
    };

    const drilldown = chartOptions.stacking ? {
        activeDataLabelStyle: {
            color: '#ffffff'
        }
    } : {};

    return {
        drilldown,
        plotOptions: {
            bar: {
                dataLabels: {
                    formatter: labelFormatter,
                    style,
                    allowOverlap: false
                }
            },
            column: {
                dataLabels: {
                    formatter: labelFormatter,
                    style,
                    allowOverlap: false
                }
            
            },
            bullet: {
                dataLabels: {
                    formatter: bulletLabelFormatter,
                    style,
                    allowOverlap: false
                }
            },
            funnel: {
                dataLabels: {
                    formatter: funnelLabelFormatter,
                    style,
                    allowOverlap: false
                }
            }
        },
        yAxis: {
            defaultFormat: get(chartOptions, 'title.yFormat')
        }
    };
}

function getStackingConfiguration(chartOptions) {
    const { stacking } = chartOptions;

    return stacking ? {
        plotOptions: {
            series: {
                stacking
            }
        },
        yAxis: {
            stackLabels: {
                formatter: stackLabelFormatter
            }
        }
    } : {};
}

function getSeries(series, colorPalette = []) {
    return series.map((seriesItem, index) => {
        const item = cloneDeep(seriesItem);
        item.color = colorPalette[index % colorPalette.length];
        // Escaping is handled by highcharts so we don't want to provide escaped input.
        // With one exception, though. Highcharts supports defining styles via
        // for example <b>...</b> and parses that from series name.
        // So to avoid this parsing, escape only < and > to &lt; and &gt;
        // which is understood by highcharts correctly
        item.name = item.name && escapeAngleBrackets(item.name);

        // Escape data items for pie chart
        item.data = item.data.map((dataItem) => {
            if (!dataItem) {
                return dataItem;
            }

            return {
                ...dataItem,
                name: escapeAngleBrackets(dataItem.name)
            };
        });

        return item;
    });
}

function labelFormatterHeatMap(opt) {
    return formatLabel(this.point.value, opt.formatGD);
}

function bulletLabelFormatter(opt) {
    return formatLabel(this.point.y, this.series.userOptions.formatGD);
}


function getDataConfiguration(chartOptions) {
    const data = chartOptions.data || EMPTY_DATA;
    const series = ((chartOptions.type===SANKEY_DIAGRAM)||(chartOptions.type===PARETO_CHART)||(chartOptions.type===HISTOGRAM_CHART)||(chartOptions.type===SCATTER_CHART)||(chartOptions.type===BUBBLE_CHART)||(chartOptions.type===BULLET_CHART)||(chartOptions.type===WORDCLOUD_CHART)||(chartOptions.type===HEATMAP_CHART)||(chartOptions.type==TREEMAP_CHART))?(data.series):getSeries(data.series, chartOptions.colorPalette);
    const categories = ((chartOptions.type===SANKEY_DIAGRAM)||(chartOptions.type===PARETO_CHART)||(chartOptions.type===HISTOGRAM_CHART)||(chartOptions.type===HEATMAP_CHART)||(chartOptions.type===BULLET_CHART)||(chartOptions.type===WATERFALL_CHART))?data.categories:map(data.categories, escapeAngleBrackets); 

    if (chartOptions.type===WATERFALL_CHART)
    {
        series[0].color='rgb(148,161,174)';
    }

    if (chartOptions.type===WORDCLOUD_CHART)
    {
        return {
                  series,
                  xAxis: {
                     categories
                  }      
        };
    } 
    if (chartOptions.type===HISTOGRAM_CHART)
    {
        return {
                  series        
        };
    }  
    
    if (chartOptions.type===PARETO_CHART)
    {
        return {
                  series,
                  xAxis: { categories: categories[0] || []}      
        };
    }  
    
    
    if (chartOptions.type===BULLET_CHART)
    {
        return {  
                  series,
                  categories,
                  xAxis: {
                    labels: {
                        enabled: !isEmpty(compact(categories))
                    },
                    categories: categories[0] || []
                  },              
                  yAxis: { plotBands: data.bands[0]?data.bands[0]:[],
                           softMax: (data.bands[0].length>0)? data.bands[0][data.bands[0].length-1].to : 0
                         }           
                         
        };
    }
    if (chartOptions.type===TREEMAP_CHART)
    {
      /*
      series[0].data=series[0].data.map((point,indexPoint) => {
        return { name: categories[indexPoint],
                 value: point.y,
                 format: point.format
               };
      });
      */
      

        
      return {      
        series
      };   
    }
    if (chartOptions.type===SANKEY_DIAGRAM)
    {
      
      return { plotOptions: { sankey: {
             colors: DEFAULT_COLOR_PALETTE
          }
        },     
        series
      };   
    }

    if (chartOptions.type===HEATMAP_CHART)
    {
        return {
        series,
        xAxis: {
            labels: {
                enabled: !isEmpty(compact(categories))
            },
            categories: categories[0] || []
        },
        yAxis: {
            labels: {
                enabled: !isEmpty(compact(categories))
            },
            categories: categories[1] || []
        },
        plotOptions: {
            heatmap: 
            { 
                dataLabels: {
                    formatter: labelFormatterHeatMap
                }
            }
        }
        
    };
    }

if (chartOptions.type===SCATTER_CHART)
    {
        return {
                  series        
        };
    }
if (chartOptions.type===BUBBLE_CHART)
    {
        return {
                  series        
        };
    }    
    return {
        series,
        xAxis: {
            labels: {
                enabled: !isEmpty(compact(categories))
            },
            categories
        }
    };
}

function getHoverStyles(chartOptions, config) {
    let seriesMapFn = () => { };

    switch (chartOptions.type) {
        default:
            throw new Error(`Undefined chart type "${chartOptions.type}".`);

        case LINE_CHART:
        case AREA_CHART:
            seriesMapFn = (seriesOrig) => {
                const series = cloneDeep(seriesOrig);

                if (series.isDrillable) {
                    set(series, 'marker.states.hover.fillColor', getLighterColor(series.color, HOVER_BRIGHTNESS));
                    set(series, 'cursor', 'pointer');
                } else {
                    set(series, 'states.hover.halo.size', 0);
                }

                return series;
            };
            break;

        case SANKEY_DIAGRAM:
        case PARETO_CHART:
        case HISTOGRAM_CHART:
        case WATERFALL_CHART:
        case BAR_CHART:
        case COLUMN_CHART:
        case COLUMN_LINE_CHART:
        case DUAL_AXIS_CHART:
        case COLUMN_AREA_CHART: 
        case BULLET_CHART:
        case SCATTER_CHART:
        case BUBBLE_CHART:
                seriesMapFn = (seriesOrig) => {
                const series = cloneDeep(seriesOrig);

                set(series, 'states.hover.brightness', HOVER_BRIGHTNESS);
                set(series, 'states.hover.enabled', series.isDrillable);

                return series;
            };
            break;

        case FUNNEL_CHART:
        case PIE_CHART:
        case DONUT_CHART:
        case TREEMAP_CHART:
        case WORDCLOUD_CHART:
        case HEATMAP_CHART:
            seriesMapFn = (seriesOrig) => {
                const series = cloneDeep(seriesOrig);

                return {
                    ...series,
                    data: series.data.map((dataItemOrig) => {
                        const dataItem = cloneDeep(dataItemOrig);

                        set(dataItem, 'states.hover.brightness', dataItem.drilldown ?
                            HOVER_BRIGHTNESS : MINIMUM_HC_SAFE_BRIGHTNESS);

                        if (!dataItem.drilldown) {
                            set(dataItem, 'halo.size', 0); // see plugins/pointHalo.js
                        }

                        return dataItem;
                    })
                };
            };
            break;
    }

    return {
        series: config.series.map(seriesMapFn)
    };
}


function getDualAxis(chartOptions, config) {
    
    
    const axisStyle={
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
    };
    

        if (chartOptions.dualAxis)
        {
           
           config.yAxis = [ axisStyle, merge({ opposite: true },axisStyle) ];
           
           if (config.series.length==2)
           {
             config.yAxis[0].title.text=config.series[0].name;
             config.yAxis[1].title.text=config.series[1].name;
           }
           else
           {
             config.yAxis[0].title.text='Columns';
             config.yAxis[1].title.text='Lines';
           }
           if (chartOptions.showInPercentMeasures) config.yAxis[0].labels.formatter= formatAsPercent;
           if (chartOptions.showInPercentSecondary) config.yAxis[1].labels.formatter= formatAsPercent;
        }
        
         if (chartOptions.type === PARETO_CHART)
        {
           config.yAxis = [ 
            merge(
            {
               title: { text: config.series[1].name, style: config.yAxis.title.style},              
            },axisStyle)
            ,merge({
               opposite: true, 
               title: { text: config.series[0].name, style: config.yAxis.title.style},
               minPadding: 0,
               maxPadding: 0,
               max: 100,
               min: 0,
               labels: {
                  format: "{value}%"
               }
           },axisStyle) ];           
        }       
        return config;
}


export function getCustomizedConfiguration(chartOptions) {
    const configurators = [
        getTitleConfiguration,
        getStackingConfiguration,
        getShowInPercentConfiguration,
        getLabelsConfiguration,
        getDataConfiguration,
        getTooltipConfiguration,
        getHoverStyles,
        getDualAxis
    ];

    const commonData = configurators.reduce((config, configurator) => {
        return merge(config, configurator(chartOptions, config));
    }, {});

    return merge({}, commonData);
}
