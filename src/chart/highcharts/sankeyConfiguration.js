// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';


const SANKEY_TEMPLATE = {
    chart: {
        type: 'sankey'
    },
    plotOptions: {
        sankey: {
            dataLabels: {
                color: 'rgb(0,0,0)'  ,
                borderWidth: 0,
                shadow: false,
                 style: {
                  
                    textOutline : 'none'
                }
            }
        }
    },
     series: [{
        keys: ['from', 'to', 'weight']       
    }]
    
};

export function getSankeyConfiguration() {
    return cloneDeep(SANKEY_TEMPLATE);
}
