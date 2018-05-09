// (C) 2007-2018 GoodData Corporation
import Highcharts from 'highcharts';
window.Highcharts=Highcharts;

/*
import * as HighchartsTreemap from 'highcharts/modules/treemap';
import * as HighchartsMore from 'highcharts/highcharts-more';
import * as HighchartsHeatmap from 'highcharts/modules/heatmap';
import * as HighchartsBullet from 'highcharts/modules/bullet';
import * as HighchartsWordCloud from 'highcharts/modules/wordcloud';
import * as HighchartsFunnel from 'highcharts/modules/funnel';
import * as HighchartsHistogram from 'highcharts/modules/histogram-bellcurve';
import * as HighchartsPareto from 'highcharts/modules/pareto';
*/  

import { default as HighchartsTreemap } from 'highcharts/modules/treemap';
import { default as HighchartsMore } from 'highcharts/highcharts-more';
import { default as HighchartsHeatmap } from 'highcharts/modules/heatmap';
import { default as HighchartsBullet } from 'highcharts/modules/bullet';
import { default as HighchartsWordCloud } from 'highcharts/modules/wordcloud';
import { default as HighchartsFunnel } from 'highcharts/modules/funnel';
import { default as HighchartsHistogram } from 'highcharts/modules/histogram-bellcurve';
import { default as HighchartsPareto } from 'highcharts/modules/pareto';
import { default as HighchartsSankey } from 'highcharts/modules/sankey';

import drillmodule from 'highcharts/modules/drilldown';
//require('highcharts/modules/wordcloud.src')(Highchart);

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, set, isEqual, partial } from 'lodash';
import cx from 'classnames';

import { PIE_CHART, DONUT_CHART, HISTOGRAM_CHART, PARETO_CHART } from '../VisualizationTypes';
import Chart from './Chart';
import Legend from './legend/Legend';
import { initChartPlugins } from './highcharts/chartPlugins';
import { TOP, LEFT, BOTTOM, RIGHT } from './legend/PositionTypes';


const CHART_TEXT_PADDING = 50;

HighchartsMore(Highcharts);
HighchartsTreemap(Highcharts);
HighchartsHeatmap(Highcharts);
HighchartsBullet(Highcharts);
HighchartsWordCloud(Highcharts);
HighchartsFunnel(Highcharts);
HighchartsHistogram(Highcharts);
HighchartsPareto(Highcharts);
HighchartsSankey(Highcharts);

drillmodule(Highcharts);




initChartPlugins(Highcharts, CHART_TEXT_PADDING);

export function renderChart(props) {
    return <Chart {...props} />;
}

export function renderLegend(props) {
    return <Legend {...props} />;
}

export default class HighChartRenderer extends PureComponent {
    static propTypes = {
        hcOptions: PropTypes.object.isRequired,
        chartOptions: PropTypes.object.isRequired,
        afterRender: PropTypes.func,
        height: PropTypes.number,
        legend: PropTypes.shape({
            enabled: PropTypes.bool,
            position: PropTypes.string,
            responsive: PropTypes.bool,
            items: PropTypes.arrayOf(PropTypes.shape({
                legendIndex: PropTypes.number.isRequired,
                name: PropTypes.string.isRequired,
                color: PropTypes.string.isRequired
            })).isRequired
        }),
        chartRenderer: PropTypes.func,
        legendRenderer: PropTypes.func,
        onLegendReady: PropTypes.func
    };

    static defaultProps = {
        afterRender: () => {},
        height: null,
        legend: {
            enabled: true,
            responsive: false,
            position: RIGHT
        },
        chartRenderer: renderChart,
        legendRenderer: renderLegend,
        onLegendReady: () => {}
    };

    constructor(props) {
        super(props);
        this.state = {
            legendItemsEnabled: []
        };
        this.setChartRef = this.setChartRef.bind(this);
        this.onLegendItemClick = this.onLegendItemClick.bind(this);
    }

    componentWillMount() {
        this.resetLegendState(this.props);
    }

    componentDidMount() {
        // http://stackoverflow.com/questions/18240254/highcharts-width-exceeds-container-div-on-first-load
        setTimeout(() => {
            if (this.chartRef) {
                const chart = this.chartRef.getChart();

                chart.container.style.height = this.props.height || '100%';
                chart.container.style.position = this.props.height ? 'relative' : 'absolute';

                chart.reflow();
            }
        }, 0);

        this.props.onLegendReady({
            legendItems: this.getItems(this.props.legend.items)
        });
    }

    componentWillReceiveProps(nextProps) {
        const thisLegendItems = get(this.props, 'legend.items', []);
        const nextLegendItems = get(nextProps, 'legend.items', []);
        const hasLegendChanged = !isEqual(thisLegendItems, nextLegendItems);
        if (hasLegendChanged) {
            this.resetLegendState(nextProps);
        }

        if (!isEqual(this.props.legend.items, nextProps.legend.items)) {
            this.props.onLegendReady({
                legendItems: this.getItems(nextProps.legend.items)
            });
        }
    }

    onLegendItemClick(item) {
        this.setState({
            legendItemsEnabled: set(
                [...this.state.legendItemsEnabled],
                item.legendIndex,
                !this.state.legendItemsEnabled[item.legendIndex]
            )
        });
    }

    setChartRef(chartRef) {
        this.chartRef = chartRef;
    }

    getFlexDirection() {
        const { legend } = this.props;

        if (legend.position === TOP || legend.position === BOTTOM) {
            return 'column';
        }

        return 'row';
    }

    getItems(items) {
        return items.map((i) => {
            return {
                name: i.name,
                color: i.color,
                onClick: partial(this.onLegendItemClick, i)
            };
        });
    }

    resetLegendState(props) {
        const legendItemsCount = get(props, 'legend.items.length', 0);
        this.setState({
            legendItemsEnabled: new Array(legendItemsCount).fill(true)
        });
    }

    createChartConfig(chartConfig, legendItemsEnabled) {
        var config = cloneDeep(chartConfig);

        if (config.yAxis.title)
        {
          config.yAxis.title.style = {
              ...config.yAxis.title.style,
              textOverflow: 'ellipsis',
              overflow: 'hidden'
          };
        }
        else
        {
          for(var i=0;i<config.yAxis.length;i++)
          {
            config.yAxis[i].title.style = {
                ...config.yAxis[i].title.style,
                textOverflow: 'ellipsis',
                overflow: 'hidden'
            };
          } 
        
        }
        

        if (this.props.height) {
            // fixed chart height is used in Dashboard mobile view
            // with minHeight of the container (legend overlaps)
            config.chart.height = this.props.height;
        }

        if (config.chart.type !== HISTOGRAM_CHART)
        {
            // render chart with disabled visibility based on legendItemsEnabled
            const itemsPath = ((config.chart.type === PIE_CHART) || (config.chart.type === DONUT_CHART)) ? 'series[0].data' : 'series';
            set(config, itemsPath, get(config, itemsPath).map((item, itemIndex) => {
                const visible = legendItemsEnabled[itemIndex] !== undefined
                    ? legendItemsEnabled[itemIndex]
                    : true;
                return {
                    ...item,
                    visible
                };
            }));
        }
        
        

        
        /*
        if (config.series[config.series.length-1].yAxis==1)
        {
           config.yAxis = [ config.yAxis, { opposite: true, title: { text: "", style: config.yAxis.title.style}, labels: config.yAxis.labels } ];
           
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
        }*/
        
      
        
                
        
        return config;
    }

    renderLegend() {
        const { chartOptions, legend, height, legendRenderer } = this.props;
        const { items } = legend;

        if (!legend.enabled) {
            return false;
        }

        const legendProps = {
            position: legend.position,
            responsive: legend.responsive,
            chartType: chartOptions.type,
            series: items,
            onItemClick: this.onLegendItemClick,
            legendItemsEnabled: this.state.legendItemsEnabled,
            height
        };

        return legendRenderer(legendProps);
    }

    renderHighcharts() {
        const style = { flex: '1 1 auto', position: 'relative' };
        const chartProps = {
            domProps: { className: 'viz-react-highchart-wrap', style },
            ref: this.setChartRef,
            config: this.createChartConfig(this.props.hcOptions, this.state.legendItemsEnabled),
            callback: this.props.afterRender
        };
        console.log(chartProps.config);
        //console.log(JSON.stringify(chartProps.config,null,' '));
        return this.props.chartRenderer(chartProps);
    }

    render() {
        const { legend } = this.props;

        const classes = cx(
            'viz-line-family-chart-wrap',
            legend.responsive ? 'responsive-legend' : 'non-responsive-legend',
            {
                [`flex-direction-${this.getFlexDirection()}`]: true
            }
        );

        const renderLegendFirst = !legend.responsive && (
            legend.position === TOP || legend.position === LEFT
        );

        return (
            <div className={classes}>
                {renderLegendFirst && this.renderLegend()}
                {this.renderHighcharts()}
                {!renderLegendFirst && this.renderLegend()}
            </div>
        );
    }
}
