// (C) 2007-2018 GoodData Corporation
import cloneDeep from 'lodash/cloneDeep';

const WORDCLOUD_TEMPLATE = {
    chart: {
        type: "wordcloud",
    },
    plotOptions: {       
      wordcloud: { 
                   colorByPoint: false
      }        
    },
    legend: {
        enabled: false
    }
};

export function getWordCloudConfiguration() {
    
    return cloneDeep(WORDCLOUD_TEMPLATE);
}
