// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';


const WATERFALL_TEMPLATE = {
    chart: {
        type: 'waterfall'
    },
    legend: {
        enabled: false
    }
};

export function getWaterfallConfiguration() {
    return cloneDeep(WATERFALL_TEMPLATE);
}
