// (C) 2007-2018 GoodData Corporation
import { pick } from 'lodash';
import { RIGHT } from './PositionTypes';
import { PIE_CHART, DONUT_CHART, HISTOGRAM_CHART } from '../../VisualizationTypes'; 

export const DEFAULT_LEGEND_CONFIG = {
    enabled: true,
    position: RIGHT
};

export function shouldLegendBeEnabled(chartOptions) {
    const seriesLength = chartOptions.data.series.length;
    // More than one measure or stackedBy more than one category
    const hasMoreThanOneSeries = seriesLength > 1;
    const isStacked = !!chartOptions.stacking;
    const isPieChartWithMoreThanOneCategory =
        ((chartOptions.type === PIE_CHART || chartOptions.type === DONUT_CHART ) && chartOptions.data.series[0].data.length > 1);

    return (hasMoreThanOneSeries && (chartOptions.type != HISTOGRAM_CHART) ) || isPieChartWithMoreThanOneCategory || isStacked;
}

export function getLegendItems(chartOptions) {
    const legendDataSource = (chartOptions.type === PIE_CHART || chartOptions.type === DONUT_CHART)
        ? chartOptions.data.series[0].data
        : chartOptions.data.series;
    return legendDataSource.map(legendDataSourceItem => pick(legendDataSourceItem, ['name', 'color', 'legendIndex']));
}

export default function getLegend(legendConfig = {}, chartOptions) {
    const baseConfig = {
        ...DEFAULT_LEGEND_CONFIG,
        ...legendConfig
    };
    return {
        ...baseConfig,
        enabled: baseConfig.enabled && shouldLegendBeEnabled(chartOptions),
        items: getLegendItems(chartOptions)
    };
}
