// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

import { MAX_POINT_WIDTH } from './commonConfiguration';

const COLUMN_LINE_TEMPLATE = {
    chart: {
        type: 'column',
        spacingTop: 20
    },
    plotOptions: {
        column: {
            dataLabels: {
                enabled: true,
                crop: false,
                overflow: 'none',
                padding: 2
            },
            maxPointWidth: MAX_POINT_WIDTH
        },
        series: {
            states: {
                hover: {
                    enabled: false
                }
            }
        }
    }
};

export function getColumnLineConfiguration() {
    return cloneDeep(COLUMN_LINE_TEMPLATE);
}
