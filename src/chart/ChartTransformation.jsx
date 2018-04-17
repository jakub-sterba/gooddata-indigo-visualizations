// (C) 2007-2018 GoodData Corporation
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { ExecutionRequestPropTypes, ExecutionResponsePropTypes, ExecutionResultPropTypes } from './../proptypes/execution';
import { getChartOptions, validateData } from './chartOptionsBuilder';
import { getHighchartsOptions } from './highChartsCreators';
import getLegend from './legend/legendBuilder';
import HighChartRenderer from './HighChartRenderer';
import DrillableItem from '../proptypes/DrillableItem';

export function renderHighCharts(props) {
    return <HighChartRenderer {...props} />;
}

export default class ChartTransformation extends Component {
    static propTypes = {
        config: PropTypes.shape({
            type: PropTypes.string.isRequired,
            legend: PropTypes.shape({
                enabled: PropTypes.bool
            }),
            colors: PropTypes.arrayOf(PropTypes.string)
        }).isRequired,
        limits: PropTypes.shape({
            series: PropTypes.number,
            categories: PropTypes.number
        }),
        drillableItems: PropTypes.arrayOf(PropTypes.shape(DrillableItem)),
        height: PropTypes.number,
        width: PropTypes.number,

        afterRender: PropTypes.func,
        renderer: PropTypes.func,
        onDataTooLarge: PropTypes.func.isRequired,
        onNegativeValues: PropTypes.func,
        onFiredDrillEvent: PropTypes.func,
        onLegendReady: PropTypes.func,

        executionRequest: ExecutionRequestPropTypes.isRequired,
        executionResponse: ExecutionResponsePropTypes.isRequired,
        executionResult: ExecutionResultPropTypes.isRequired
    };

    static defaultProps = {
        afm: {},
        drillableItems: [],
        renderer: renderHighCharts,
        afterRender: () => {},
        onNegativeValues: null,
        onFiredDrillEvent: () => {},
        onLegendReady: () => {},
        limits: {},
        height: undefined,
        width: undefined
    };

    componentWillMount() {
        this.assignChartOptions(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.assignChartOptions(nextProps);
    }

    getRendererProps() {
        const { chartOptions } = this;
        const {
            executionRequest: { afm },
            height,
            width,
            afterRender,
            config,
            onFiredDrillEvent,
            onLegendReady
        } = this.props;
        const drillConfig = { afm, onFiredDrillEvent };
        const hcOptions = getHighchartsOptions(chartOptions, drillConfig);
        return {
            chartOptions,
            hcOptions,
            height,
            width,
            afterRender,
            onLegendReady,
            legend: getLegend(config.legend, chartOptions)
        };
    }

    assignChartOptions(props) {
        const {
            drillableItems,
            executionRequest: { afm, resultSpec },
            executionResponse: { dimensions },
            executionResult: { data, headerItems },
            config,
            onDataTooLarge,
            onNegativeValues,
            mdObject
        } = props;

        this.chartOptions = getChartOptions(
            afm,
            resultSpec,
            dimensions,
            data,
            headerItems,
            config,
            drillableItems,
            mdObject
        );
        const validationResult = validateData(config.limits, this.chartOptions);

        if (validationResult.dataTooLarge) {
            // always force onDataTooLarge error handling
            invariant(onDataTooLarge, 'Visualization\'s onDataTooLarge callback is missing.');
            onDataTooLarge(this.chartOptions);
        } else if (validationResult.hasNegativeValue) {
            // ignore hasNegativeValue if validation already fails on dataTooLarge
            // force onNegativeValues error handling only for pie chart.
            // hasNegativeValue can be true only for pie chart.
            invariant(onNegativeValues, '"onNegativeValues" callback required for pie chart transformation is missing.');
            onNegativeValues(this.chartOptions);
        }
        this.setState(validationResult);

        return this.chartOptions;
    }

    render() {
        if (this.state.dataTooLarge || this.state.hasNegativeValue) {
            return null;
        }
        return this.props.renderer(this.getRendererProps());
    }
}
