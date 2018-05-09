// (C) 2007-2018 GoodData Corporation
import { merge, get } from 'lodash';
import invariant from 'invariant';
import {
    DEFAULT_SERIES_LIMIT,
    DEFAULT_CATEGORIES_LIMIT,
    getCommonConfiguration
} from './highcharts/commonConfiguration';
import { getLineConfiguration } from './highcharts/lineConfiguration';
import { getBarConfiguration } from './highcharts/barConfiguration';
import { getColumnConfiguration } from './highcharts/columnConfiguration';
import { getCustomizedConfiguration } from './highcharts/customConfiguration';
import { getPieConfiguration } from './highcharts/pieConfiguration';
import { getDonutConfiguration } from './highcharts/donutConfiguration';
import { getAreaConfiguration } from './highcharts/areaConfiguration';
import { getColumnLineConfiguration } from './highcharts/columnLineConfiguration';
import { getColumnAreaConfiguration } from './highcharts/columnAreaConfiguration';
import { getTreeMapConfiguration } from './highcharts/treeMapConfiguration';
import { getWordCloudConfiguration } from './highcharts/wordCloudConfiguration'; 
import { getScatterConfiguration } from './highcharts/scatterConfiguration'; 
import { getHeatMapConfiguration } from './highcharts/heatmapConfiguration';  
import { getBulletConfiguration } from './highcharts/bulletConfiguration';   
import { getBubbleConfiguration } from './highcharts/bubbleConfiguration';  
import { getWaterfallConfiguration } from './highcharts/waterfallConfiguration';  
import { getFunnelConfiguration } from './highcharts/funnelConfiguration';  
import { getHistogramConfiguration } from './highcharts/histogramConfiguration';  
import { getParetoConfiguration } from './highcharts/paretoConfiguration';  
import { getDualAxisConfiguration } from './highcharts/dualAxisConfiguration';  
import { getSankeyConfiguration } from './highcharts/sankeyConfiguration';  

import { LINE_CHART, BAR_CHART, COLUMN_CHART, PIE_CHART, DONUT_CHART, AREA_CHART, COLUMN_LINE_CHART, COLUMN_AREA_CHART, TREEMAP_CHART, SCATTER_CHART, BULLET_CHART, WORDCLOUD_CHART, HEATMAP_CHART, BUBBLE_CHART, WATERFALL_CHART, FUNNEL_CHART, HISTOGRAM_CHART, PARETO_CHART, DUAL_AXIS_CHART, SANKEY_DIAGRAM } from '../VisualizationTypes';

const chartConfigurationMap = {
    [LINE_CHART]: getLineConfiguration,
    [BAR_CHART]: getBarConfiguration,
    [COLUMN_CHART]: getColumnConfiguration,
    [PIE_CHART]: getPieConfiguration,
    [DONUT_CHART]: getDonutConfiguration,
    [AREA_CHART]: getAreaConfiguration,
    [COLUMN_LINE_CHART]: getColumnLineConfiguration,
    [COLUMN_AREA_CHART]: getColumnAreaConfiguration,
    [TREEMAP_CHART]: getTreeMapConfiguration,
    [WORDCLOUD_CHART]: getWordCloudConfiguration,
    [SCATTER_CHART]: getScatterConfiguration,
    [BULLET_CHART]: getBulletConfiguration,
    [HEATMAP_CHART]: getHeatMapConfiguration,
    [BUBBLE_CHART]: getBubbleConfiguration,
    [WATERFALL_CHART]: getWaterfallConfiguration,
    [FUNNEL_CHART]: getFunnelConfiguration,
    [HISTOGRAM_CHART]: getHistogramConfiguration,
    [PARETO_CHART]: getParetoConfiguration,  
    [DUAL_AXIS_CHART]: getDualAxisConfiguration,
    [SANKEY_DIAGRAM]: getSankeyConfiguration  
};

export function getHighchartsOptions(chartOptions, drillConfig) {
    const getConfigurationByType = chartConfigurationMap[chartOptions.type];
    invariant(getConfigurationByType, `visualisation type ${chartOptions.type} is invalid (valid types: ${Object.keys(chartConfigurationMap).join(', ')}).`);
    return merge({},
        getCommonConfiguration(chartOptions, drillConfig),
        getConfigurationByType(),
        getCustomizedConfiguration(chartOptions)
    );
}

export function isDataOfReasonableSize(chartData, limits) {
    const seriesLimit = get(limits, 'series', DEFAULT_SERIES_LIMIT);
    const categoriesLimit = get(limits, 'categories', DEFAULT_CATEGORIES_LIMIT);
    return chartData.series.length <= seriesLimit &&
        chartData.categories.length <= categoriesLimit;
}
