// (C) 2007-2018 GoodData Corporation
import { colors2Object, numberFormat } from '@gooddata/numberjs';
import invariant from 'invariant';

import { range, get, without, escape, unescape } from 'lodash';
import { parseValue, getAttributeElementIdFromAttributeElementUri } from '../utils/common';
import { getMeasureUriOrIdentifier, isDrillable } from '../utils/drilldownEventing';
import { DEFAULT_COLOR_PALETTE, getLighterColor } from '../utils/color';
import { PIE_CHART, DONUT_CHART, COLUMN_LINE_CHART, COLUMN_AREA_CHART,SCATTER_CHART, HEATMAP_CHART, TREEMAP_CHART, BUBBLE_CHART, WORDCLOUD_CHART, BULLET_CHART, WATERFALL_CHART, FUNNEL_CHART, HISTOGRAM_CHART, PARETO_CHART, DUAL_AXIS_CHART,SANKEY_DIAGRAM, CHART_TYPES } from '../VisualizationTypes'; 
import { isDataOfReasonableSize } from './highChartsCreators';
import { VIEW_BY_DIMENSION_INDEX, STACK_BY_DIMENSION_INDEX, PIE_CHART_LIMIT } from './constants';

import { DEFAULT_CATEGORIES_LIMIT } from './highcharts/commonConfiguration';

export function unwrap(wrappedObject) {
    return wrappedObject[Object.keys(wrappedObject)[0]];
}

export function isNegativeValueIncluded(series) {
    return series
        .some(seriesItem => ( 
            seriesItem.data.some(({ y }) => (y < 0))
        ));
}

export function validateData(limits = {}, chartOptions) { 
    const pieChartLimits = {
        series: 1, // pie charts can have just one series
        categories: Math.min(limits.categories || DEFAULT_CATEGORIES_LIMIT, PIE_CHART_LIMIT)
    };
    const isPieChart = (chartOptions.type === PIE_CHART)||(chartOptions.type === DONUT_CHART) ;
    return {
        // series and categories limit
        dataTooLarge: !isDataOfReasonableSize(chartOptions.data, isPieChart
            ? pieChartLimits
            : limits),
        // check pie chart for negative values
        hasNegativeValue: isPieChart && isNegativeValueIncluded(chartOptions.data.series)
    };
}

export function isPopMeasure(measureItem, afm) {
    return afm.measures.some((measure) => {
        const popMeasureIdentifier = get(measure, 'definition.popMeasure') ? measure.localIdentifier : null;
        return popMeasureIdentifier && popMeasureIdentifier === measureItem.measureHeaderItem.localIdentifier;
    });
}

export function normalizeColorToRGB(color) {
    const hexPattern = /#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})/i;
    return color.replace(hexPattern, (_match, r, g, b) => {
        return `rgb(${[r, g, b].map(value => (parseInt(value, 16).toString(10))).join(', ')})`;
    });
}

export function getColorPalette(
    colorPalette = DEFAULT_COLOR_PALETTE,
    measureGroup,
    viewByAttribute,
    stackByAttribute,
    afm,
    type
) {
    let updatedColorPalette = [];
    const isAttributePieChart = ((type === PIE_CHART) || (type=== DONUT_CHART)|| (type=== FUNNEL_CHART)) && afm.attributes && afm.attributes.length > 0;

    if (stackByAttribute || isAttributePieChart) {
        const itemsCount = stackByAttribute ? stackByAttribute.items.length : viewByAttribute.items.length;
        updatedColorPalette = range(itemsCount)
            .map(itemIndex => colorPalette[itemIndex % colorPalette.length]);
    } else {
        let linkedPopMeasureCounter = 0;
        measureGroup.items.forEach((measureItem, measureItemIndex) => {
            // skip linked popMeasures in color palete
            const colorIndex = (measureItemIndex - linkedPopMeasureCounter) % colorPalette.length;
            let color = colorPalette[colorIndex];

            // if this is a pop measure and we found it`s original measure
            if (isPopMeasure(measureItem, afm)) {
                // find source measure
                const sourceMeasureIdentifier = afm.measures[measureItemIndex].definition.popMeasure.measureIdentifier;
                const sourceMeasureIndex = afm.measures.findIndex(
                    measure => measure.localIdentifier === sourceMeasureIdentifier
                );
                if (sourceMeasureIndex > -1) {
                    linkedPopMeasureCounter += 1;
                    // copy sourceMeasure color and lighten it if it exists, then insert it at pop measure position
                    const sourceMeasureColorIndex =
                        (sourceMeasureIndex - linkedPopMeasureCounter) % colorPalette.length;
                    const sourceMeasureColor = colorPalette[sourceMeasureColorIndex];
                    const popMeasureColor = getLighterColor(normalizeColorToRGB(sourceMeasureColor), 0.6);
                    color = popMeasureColor;
                }
            }
            updatedColorPalette.push(color);
        });
    }
    return updatedColorPalette;
}

export function getSeriesItemData(
    seriesItem,
    seriesIndex,
    measureGroup,
    viewByAttribute,
    stackByAttribute,
    type,
    colorPalette
) {
    return seriesItem.map((pointValue, pointIndex, arr) => {
        // by default seriesIndex corresponds to measureGroup label index
        let measureIndex = seriesIndex;
        // by default pointIndex corresponds to viewBy label index
        let viewByIndex = pointIndex;
        // drillContext can have 1 to 3 items
        // viewBy attribute label, stackby label if available
        // last drillContextItem is always current serie measure
        if (stackByAttribute) {
            // pointIndex corresponds to viewBy attribute label (if available)
            viewByIndex = pointIndex;
            // stack bar chart has always just one measure
            measureIndex = 0;
        } else if (((type === PIE_CHART) || (type=== DONUT_CHART)|| (type=== FUNNEL_CHART)|| (type=== WATERFALL_CHART)) && !viewByAttribute) {
            measureIndex = pointIndex;
        }

        const pointData = {
            y: parseValue(pointValue),
            format: unwrap(measureGroup.items[measureIndex]).format,
            marker: {
                enabled: ((pointValue !== null)&&(arr.length<=30))
            }
        };
        if (stackByAttribute) {
            // if there is a stackBy attribute, then seriesIndex corresponds to stackBy label index
            pointData.name = unwrap(stackByAttribute.items[seriesIndex]).name;
        } else if (((type === PIE_CHART) || (type=== DONUT_CHART)|| (type=== FUNNEL_CHART)|| (type=== WATERFALL_CHART)) && viewByAttribute) { 
            pointData.name = unwrap(viewByAttribute.items[viewByIndex]).name;
        } else {
            pointData.name = unwrap(measureGroup.items[measureIndex]).name;
        }

        if ((type === PIE_CHART) || (type === DONUT_CHART)|| (type=== FUNNEL_CHART)) {
            // add color to pie chart points from colorPalette
            pointData.color = colorPalette[pointIndex];
            // Pie charts use pointData viewByIndex as legendIndex if available instead of seriesItem legendIndex
            pointData.legendIndex = viewByAttribute ? viewByIndex : pointIndex;
        }
        return pointData;
    });
}


export function getSeries(
    executionResultData,
    measureGroup,
    viewByAttribute,
    stackByAttribute,
    type,
    colorPalette
) {
    return executionResultData.map((seriesItem, seriesIndex) => {
        const seriesItemData = getSeriesItemData(
            seriesItem,
            seriesIndex,
            measureGroup,
            viewByAttribute,
            stackByAttribute,
            type,
            colorPalette
        );
        const seriesItemConfig = {
            color: colorPalette[seriesIndex],
            legendIndex: seriesIndex,
            data: seriesItemData
        };

        if (stackByAttribute) {
            // if stackBy attribute is available, seriesName is a stackBy attribute value of index seriesIndex
            // this is a limitiation of highcharts and a reason why you can not have multi-measure stacked charts
            seriesItemConfig.name = stackByAttribute.items[seriesIndex].attributeHeaderItem.name;
        } else if (((type === PIE_CHART) || (type === DONUT_CHART)) && !viewByAttribute) {
            // Pie charts with measures only have a single series which name would is ambiguous
            seriesItemConfig.name = measureGroup.items.map((wrappedMeasure) => {
                return unwrap(wrappedMeasure).name;
            }).join(', ');
        } else {
            // otherwise seriesName is a measure name of index seriesIndex
            seriesItemConfig.name = measureGroup.items[seriesIndex].measureHeaderItem.name;
        }

        return seriesItemConfig;
    });
}

export const customEscape = str => str && escape(unescape(str));

export function generateTooltipFn(viewByAttribute, type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const formattedValue = customEscape(formatValue((point.y)||(point.value), point.format).label);
        const textData = [[customEscape(point.series.name), formattedValue]];

        if (type===TREEMAP_CHART)
        {
            textData.unshift([customEscape(viewByAttribute.formOf.name), customEscape(point.name)]);
        }
        else
        if (viewByAttribute) {
            // For some reason, highcharts ommit categories for pie charts with attribute. Use point.name instead.
            // use attribute name instead of attribute display form name
            textData.unshift([customEscape(viewByAttribute.formOf.name), customEscape(point.category || point.name)]);
        } else if ((type === PIE_CHART) || (type=== DONUT_CHART)|| (type=== FUNNEL_CHART)|| (type=== WATERFALL_CHART)) {
            // Pie charts with measure only have to use point.name instead of series.name to get the measure name
            textData[0][0] = customEscape(point.name);
        }

       if (type===HISTOGRAM_CHART)
       {  
          textData.unshift([point.series.xAxis.userOptions.title.text,customEscape(formatValue(point.x,point.series.userOptions.formatX).label)+' - '+customEscape(formatValue(point.x2,point.series.userOptions.formatX).label)]);
       }

        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}

export function generateTooltipHeatMapFn(viewByAttribute,stackByAttribute, type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const formattedValue = customEscape(formatValue(point.value, point.series.userOptions.dataLabels.formatGD).label);  
        const textData = [];
        
        textData.unshift([customEscape(point.series.name), formattedValue]);

        
        if (viewByAttribute) textData.unshift([customEscape(viewByAttribute.formOf.name), customEscape(viewByAttribute.items[point.x].attributeHeaderItem.name)]);
        if (stackByAttribute) textData.unshift([customEscape(stackByAttribute.formOf.name), customEscape(stackByAttribute.items[point.y].attributeHeaderItem.name)]);   

        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}


export function generateTooltipSankeyFn(viewByAttribute,stackByAttribute, type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const formattedValue = customEscape(formatValue(point.weight, point.series.userOptions.formatGD).label);  
        const textData = [];
        
        if (isNaN(point.weight)) {
            const formattedSum = customEscape(formatValue(point.sum, point.series.userOptions.formatGD).label);  
            textData.unshift([customEscape(point.series.name), formattedSum]);
            
        }
        else
        {    
        
        textData.unshift([customEscape(point.series.name), formattedValue]);

        
        if (stackByAttribute) textData.unshift([customEscape(stackByAttribute.formOf.name), customEscape(point.to)]);   
        if (viewByAttribute) textData.unshift([customEscape(viewByAttribute.formOf.name), customEscape(point.from)]);
        }
        
        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}

export function generateTooltipXYFn(measures,viewByAttribute,type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const textData = [];
       if (viewByAttribute) textData.push([customEscape(viewByAttribute.formOf.name), customEscape(point.name)]);

       
       if (measures[0]) textData.push([customEscape(measures[0].measureHeaderItem.name), customEscape(formatValue(point.x,measures[0].measureHeaderItem.format).label)]);
       if (measures[1]) textData.push([customEscape(measures[1].measureHeaderItem.name), customEscape(formatValue(point.y,measures[1].measureHeaderItem.format).label)]);
       if (measures[2]) textData.push([customEscape(measures[2].measureHeaderItem.name), customEscape(formatValue(point.z,measures[2].measureHeaderItem.format).label)]);
       
        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}

export function generateTooltipBulletFn(type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const textData = [];
       if (point.y) textData.push([customEscape(point.series.name), customEscape(formatValue(point.y,point.series.userOptions.formatGD).label)]);
       if (point.target) textData.push(['Target', customEscape(formatValue(point.target,point.series.userOptions.formatGD).label)]);
       
        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}


export function generateTooltipParetoFn(viewByAttribute,type) {
    const formatValue = (val, format) => {
        return colors2Object(numberFormat(val, format));
    };

    return (point) => {
        const textData = [];
       if (viewByAttribute) textData.push([customEscape(viewByAttribute.formOf.name), customEscape(point.name)]);

       
        textData.push([customEscape(point.series.name), customEscape(formatValue(point.y,point.series.userOptions.format).label)]);
       
        return `<table class="tt-values">${textData.map(line => (
            `<tr>
                <td class="title">${line[0]}</td>
                <td class="value">${line[1]}</td>
            </tr>`
        )).join('\n')}</table>`;
    };
}


export function findInDimensionHeaders(dimensions, headerCallback) {
    let returnValue = null;
    dimensions.some((dimension, dimensionIndex) => {
        dimension.headers.some((wrappedHeader, headerIndex) => {
            const headerType = Object.keys(wrappedHeader)[0];
            const header = wrappedHeader[headerType];
            const headerCount = dimension.headers.length;
            returnValue = headerCallback(headerType, header, dimensionIndex, headerIndex, headerCount);
            return !!returnValue;
        });
        return !!returnValue;
    });
    return returnValue;
}

export function findMeasureGroupInDimensions(dimensions) {
    return findInDimensionHeaders(dimensions, (headerType, header, dimensionIndex, headerIndex, headerCount) => {
        const measureGroupHeader = headerType === 'measureGroupHeader' ? header : null;
        if (measureGroupHeader) {
            invariant(headerIndex === headerCount - 1, 'MeasureGroup must be the last header in it\'s dimension');
        }
        return measureGroupHeader;
    });
}

export function findAttributeInDimension(dimension, attributeHeaderItemsDimension) {
    return findInDimensionHeaders([dimension], (headerType, header) => {
        if (headerType === 'attributeHeader') {
            return {
                ...header,
                // attribute items are delivered separately from attributeHeaderItems
                // there should ever only be maximum of one attribute on each dimension, other attributes are ignored
                items: attributeHeaderItemsDimension[0]
            };
        }
        return null;
    });
}

export function getDrillContext(stackByItem, viewByItem, measure, afm) {
    return without([
        stackByItem,
        viewByItem,
        measure
    ], null).map(({
        uri, // header attribute value or measure uri
        identifier = '', // header attribute value or measure identifier
        name, // header attribute value or measure text label
        format, // measure format
        localIdentifier,
        attribute // attribute header if available
    }) => {
        return {
            id: attribute
                ? getAttributeElementIdFromAttributeElementUri(uri)
                : localIdentifier, // attribute value id or measure localIndentifier
            ...(attribute ? {} : {
                format
            }),
            value: name, // text label of attribute value or formatted measure value
            identifier: attribute ? attribute.identifier : identifier, // identifier of attribute or measure
            uri: attribute
                ? attribute.uri // uri of attribute
                : get(getMeasureUriOrIdentifier(afm, localIdentifier), 'uri') // uri of measure
        };
    });
}

export function getDrillableSeries(
    series,
    drillableItems,
    measureGroup,
    viewByAttribute,
    stackByAttribute,
    type,
    afm
) {
    const isMetricPieChart = ((type === PIE_CHART) || (type=== DONUT_CHART))  && !viewByAttribute;

    return series.map((seriesItem, seriesIndex) => {
        let isSeriesDrillable = false;
        const data = seriesItem.data.map((pointData, pointIndex) => {
            // measureIndex is usually seriesIndex,
            // except for stack by attribute and metricOnly pie chart it is looped-around pointIndex instead
            // Looping around the end of items array only works when measureGroup is the last header on it's dimension
            // We do not support setups with measureGroup before attributeHeaders
            const measureIndex = !stackByAttribute && !isMetricPieChart
                ? seriesIndex
                : pointIndex % measureGroup.items.length;
            const measure = unwrap(measureGroup.items[measureIndex]);

            const viewByItem = viewByAttribute ? {
                ...unwrap(viewByAttribute.items[pointIndex]),
                attribute: viewByAttribute
            } : null;

            // stackBy item index is always equal to seriesIndex
            const stackByItem = stackByAttribute ? {
                ...unwrap(stackByAttribute.items[seriesIndex]),
                attribute: stackByAttribute
            } : null;

            // point is drillable if a drillableItem matches:
            //   point's measure,
            //   point's viewBy attribute,
            //   point's viewBy attribute item,
            //   point's stackBy attribute,
            //   point's stackBy attribute item,
            const drillableHooks = without([
                measure,
                viewByAttribute,
                viewByItem,
                stackByAttribute,
                stackByItem
            ], null);

            const drilldown = drillableHooks.some(drillableHook =>
                isDrillable(drillableItems, drillableHook, afm)
            );

            const drillableProps = {
                drilldown
            };
            if (drilldown) {
                drillableProps.drillContext = getDrillContext(measure, viewByItem, stackByItem, afm);
                isSeriesDrillable = true;
            }
            return {
                ...pointData,
                ...drillableProps
            };
        });

        return {
            ...seriesItem,
            data,
            isDrillable: isSeriesDrillable
        };
    });
}

function getCategories(type, viewByAttribute, measureGroup) {
    // Categories make up bar/slice labels in charts. These usually match view by attribute values.
    // Measure only pie charts geet categories from measure names
    if (viewByAttribute) {
        return viewByAttribute.items.map(({ attributeHeaderItem }) => attributeHeaderItem.name);
    }
    if ((type === PIE_CHART) || (type=== DONUT_CHART)) {
        // Pie chart with measures only (no viewByAttribute) needs to list
        return measureGroup.items.map(wrappedMeasure => unwrap(wrappedMeasure).name);
        // Pie chart categories are later sorted by seriesItem pointValue
    }
    return [];
}

/**
 * Creates an object providing data for all you need to render a chart except drillability.
 *
 * @param afm <executionRequest.AFM> object listing metrics and attributes used.
 * @param resultSpec <executionRequest.resultSpec> object defining expected result dimension structure,
 * @param dimensions <executionResponse.dimensions> array defining calculated dimensions and their headers,
 * @param executionResultData <executionResult.data> array with calculated data
 * @param unfilteredHeaderItems <executionResult.headerItems> array of attribute header items mixed with measures
 * @param config object defining chart display settings
 * @param drillableItems array of items for isPointDrillable matching
 * @return Returns composed chart options object
 */
export function getChartOptions(
    afm,
    resultSpec,
    dimensions,
    executionResultData,
    unfilteredHeaderItems,
    config,
    drillableItems,
    mdObject
) {
    // Future version of API will return measures alongside attributeHeaderItems
    // we need to filter these out in order to stay compatible
    const attributeHeaderItems = unfilteredHeaderItems.map((dimension) => {
        return dimension.filter(attributeHeaders => attributeHeaders[0].attributeHeaderItem);
    });

    invariant(config && CHART_TYPES.includes(config.type), `config.type must be defined and match one of supported chart types: ${CHART_TYPES.join(', ')}`);

    const { type } = config;
    const measureGroup = findMeasureGroupInDimensions(dimensions);
    const viewByAttribute = findAttributeInDimension(
        dimensions[VIEW_BY_DIMENSION_INDEX],
        attributeHeaderItems[VIEW_BY_DIMENSION_INDEX]
    );
    const stackByAttribute = findAttributeInDimension(
        dimensions[STACK_BY_DIMENSION_INDEX],
        attributeHeaderItems[STACK_BY_DIMENSION_INDEX]
    );

    invariant(measureGroup, 'missing measureGroup');

    const colorPalette =
        getColorPalette(config.colors, measureGroup, viewByAttribute, stackByAttribute, afm, type);
 
    var measureGroupIdentifiers=measureGroup.items.map((item) => { return item.measureHeaderItem.localIdentifier});
    var measureBuckets={};
    
    mdObject.buckets.forEach((bucket) => {
        
        const bucketItems = bucket.items;
        const metricIndexes=[]
        bucketItems.forEach((item) => {
           if (item.measure)
           {
             const metricIndex=measureGroupIdentifiers.indexOf(item.measure.localIdentifier);
             metricIndexes.push(metricIndex);
           }
        });
        measureBuckets[bucket.localIdentifier]=metricIndexes;
    });
        
    

    if (type==HISTOGRAM_CHART)
    {
       
        const data = executionResultData[0].map( (item,itemIndex) => {
               return parseValue(item);
           });           
        
        
        const series=[{
                        baseSeries: 1,
                        zIndex: -1,
                        color: DEFAULT_COLOR_PALETTE[0],
                        legendIndex: 0 ,
                        formatX: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.format : '',
                        name: 'Count'                       
                      }, {        
                        data: data,
                        legendIndex: 1 ,
                        name: 'Data',
                        color: DEFAULT_COLOR_PALETTE[1],
                        "visible": false
                      }];

        const categories=[];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: { x: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.name : '',
                     xFormat: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.format : ''},            
            showInPercent: false,
            data: {
                series,
                categories
            },
            actions: {
                tooltip: generateTooltipFn(stackByAttribute, type)
            }
       };
       
       return options;
    }
    
 if (type==PARETO_CHART)
    {
       
        const data = executionResultData[0].map( (item,itemIndex) => {
               return parseValue(item);
           });           
        
        
        const series=[{
                        baseSeries: 1,
                        zIndex: 10,
                        color: DEFAULT_COLOR_PALETTE[1],
                        name: 'Cumulative percentage',
                        format: '##.0\\%',
                        legendIndex: 1                    
                      }, {        
                        data: data,
                        name: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.name : '',
                        color: DEFAULT_COLOR_PALETTE[0],
                        format: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.format : '',
                        legendIndex: 0,
                      }];

        const categories=[viewByAttribute ? viewByAttribute.items.map(({ attributeHeaderItem }) => attributeHeaderItem.name) : [''] ];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: { x: viewByAttribute ? viewByAttribute.formOf.name : '',
                     xFormat: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.format : ''},            
            showInPercent: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.format.includes('%') : false,
            data: {
                series,
                categories
            },
            actions: {
                tooltip: generateTooltipParetoFn(stackByAttribute, type)
            }
       };
       
       return options;
    }   

 if (type==BULLET_CHART)
    {
        
         
        const data = executionResultData.map( (item,itemIndex) => {
               const values = item.map( (value) => {
                 return parseValue(value);
               } );
               return { y: (measureBuckets.measures ? values [measureBuckets.measures[0]]:null),
                        target: (measureBuckets.secondary ? values [measureBuckets.secondary[0]]:null)
                        //name: stackByAttribute.items[itemIndex].attributeHeaderItem.name
                      };
           }); 
        
        
        const bands = executionResultData.map( (item,itemIndex) => {
               const values = item.map( (value) => {
                 return parseValue(value);
               } );
               
               var last=0;
               const bands=[];
               const bandCount = values.length -2;
               
               const bandMeasures=measureBuckets.range;
               if (bandMeasures)
               for (var i=0;i<bandMeasures.length;i++)
               {
                 const opacity=(bandMeasures.length>1)? 0.4*(bandMeasures.length-i)/bandMeasures.length : 0.2;
                 
                 bands.push( { from: last,
                               to: values[bandMeasures[i]],
                               color: 'rgba(0,0,0,'+opacity+')' } );
                 last=bandMeasures[i];
               }
               return bands;
           }); 
        
   
        const seriesItem = {
            name: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.name : '',
            data: data,
            color: colorPalette[0],
            legendIndex: 0,
            dataLabels: {
                enabled: true,
                shadow: false,
                style: {textOutline: 'none'}
            },
            formatGD:  measureBuckets.measures ? unwrap(measureGroup.items[measureBuckets.measures[0]]).format : ''      
        }        
        
        const series=[seriesItem];
        const categories=[ [measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.name:''],[''] ];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: {},            
            showInPercent: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.format.includes('%') : false,
            data: {
                series,
                categories,
                bands
            },
            actions: {
                tooltip: generateTooltipBulletFn(type)
            }
       };
       
       return options;
    }

    if (type==WORDCLOUD_CHART)
    {
       
        const data = executionResultData[0].map( (item,itemIndex) => {
               return { weight: parseValue(item),
                        y: parseValue(item),
                        name: viewByAttribute ? viewByAttribute.items[itemIndex].attributeHeaderItem.name : (measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.name : '')
                      };
           }); 
           

           
   
        const seriesItem = {
            name: measureGroup.items[0] ? measureGroup.items[0].measureHeaderItem.name : '',
            data: data,
            color: colorPalette[0],
            legendIndex: 0             
        }        
        
        const series=[seriesItem];
        const categories=viewByAttribute ? viewByAttribute.items.map(({ attributeHeaderItem }) => attributeHeaderItem.name) : [""];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: {},            
            showInPercent: false,
            data: {
                series,
                categories
            },
            actions: {                                
                tooltip: generateTooltipFn(viewByAttribute, type)
            }
       };
       
       return options;
    }


 if (type==SANKEY_DIAGRAM)
    {
        const data = [];
        var defColorPalette=DEFAULT_COLOR_PALETTE;
        
      
        if (attributeHeaderItems[0].length==2)
        {
           
                  
           executionResultData.forEach((item, itemIndex) => {              
     
                 data.push([attributeHeaderItems[0][0][itemIndex].attributeHeaderItem.name,
                            attributeHeaderItems[0][1][itemIndex].attributeHeaderItem.name,
                            parseValue(item)                            
                           ]);                 
               });          
        }

        const seriesItem = {
            name: measureGroup.items[0].measureHeaderItem.name,
            data: data,
            color: defColorPalette[0],
            legendIndex: 0,
            formatGD:  measureBuckets.measures ? unwrap(measureGroup.items[measureBuckets.measures[0]]).format : ''        
        }        
        
         
        const series=[seriesItem];
        const categories=[''];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            title: {        
            },            
            showInPercent: false,
            data: {
                series,
                categories
            },
            actions: {
                tooltip: (dimensions[0].headers.length==2)?generateTooltipSankeyFn(dimensions[0].headers[0].attributeHeader,dimensions[0].headers[1].attributeHeader, type) : null
            }
       };
       return options;
    }
    

    
 if (type==TREEMAP_CHART)
    {
        const data = [];
        var defColorPalette=DEFAULT_COLOR_PALETTE;
        
        if (attributeHeaderItems[0].length==1)
        {
           executionResultData.forEach((item, itemIndex) => {
                  data.push({ name: attributeHeaderItems[0][0][itemIndex].attributeHeaderItem.name,
                             value: parseValue(item),
                             format: unwrap(measureGroup.items[0]).format  
                           });
               });
        } 

        if (attributeHeaderItems[0].length==2)
        {
           var parentItems = Array.from(new Set(attributeHeaderItems[0][0].map((x)=>{return x.attributeHeaderItem.name;})));
           
           parentItems.forEach((item, itemIndex) => {              
                 data.push({ name: item,
                             id: itemIndex.toString(),
                             color: defColorPalette[itemIndex%defColorPalette.length]                                                     
                           });                 
               }); 
                  
           executionResultData.forEach((item, itemIndex) => {              
     
                 data.push({ name: attributeHeaderItems[0][1][itemIndex].attributeHeaderItem.name,
                             value: parseValue(item),
                             parent: parentItems.indexOf(attributeHeaderItems[0][0][itemIndex].attributeHeaderItem.name).toString(),
                             format: unwrap(measureGroup.items[0]).format                             
                           });                 
               });          
        }

        const seriesItem = {
            name: measureGroup.items[0].measureHeaderItem.name,
            data: data,
            color: defColorPalette[0],
            legendIndex: 0       
        }        
        
        if (attributeHeaderItems[0].length==2)
        {
        seriesItem.levels= [{
            level: 1,
            layoutAlgorithm: 'sliceAndDice',
            dataLabels: {
                enabled: true,
                align: 'left',
                verticalAlign: 'top',
                style: {
                    fontSize: '15px',
                    fontWeight: 'bold'
                }
            }
        }];
        }
         
        const series=[seriesItem];
        const categories=[''];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            title: {        
            },            
            showInPercent: false,
            data: {
                series,
                categories
            },
            actions: {
                tooltip: generateTooltipFn(stackByAttribute, type)
            }
       };
       return options;
    }
    

    if (type==HEATMAP_CHART)
    {
        const data = [];
        
        executionResultData.forEach((rowItem, rowItemIndex) => {
               rowItem.forEach((columnItem, columnItemIndex) => {
                 data.push([columnItemIndex,rowItemIndex,parseValue(columnItem)]);
                 
               } );
           }); 
        const seriesItem = {
            name: measureGroup.items[0].measureHeaderItem.name,
            data: data,
            turboThreshold: 0,
            dataLabels: { enabled: ((!viewByAttribute || (viewByAttribute.items.length<=6)) && (!stackByAttribute || (stackByAttribute.items.length<=20))),
                          formatGD: unwrap(measureGroup.items[0]).format   
                        },
            legendIndex: 0,
            borderWidth: ((!viewByAttribute || (viewByAttribute.items.length<=30)) && (!stackByAttribute || (stackByAttribute.items.length<=30)))?1:0,
            color: colorPalette[0]       
        }        
        
        const series=[seriesItem];
        const categories=[viewByAttribute ? viewByAttribute.items.map(({ attributeHeaderItem }) => attributeHeaderItem.name) : [''],
                          stackByAttribute ? stackByAttribute.items.map(({ attributeHeaderItem }) => attributeHeaderItem.name) : [''] ];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: {
                x: (viewByAttribute ? viewByAttribute.formOf.name : ''),
                y: (stackByAttribute ? stackByAttribute.formOf.name : ''),
                format: unwrap(measureGroup.items[0]).format              
            },            
            showInPercent: false,
            data: {
                series,
                categories
            },
            actions: {
                tooltip: generateTooltipHeatMapFn(viewByAttribute,stackByAttribute, type)                
            }
       };
       return options;
    }
    
    if (type==SCATTER_CHART)
    {
        /* const data = executionResultData.map( (item) => {
               var values = item.map( (value) => {
                 return parseValue(value);
               } );
               if (!measureBuckets.measures) values.unshift(0);
               
               if (!measureBuckets.secondary) values=[values[0],0,values[1]];
               
               return values;
           }); 
        */  
        const data = executionResultData.map( (item,itemIndex) => {
               const values = item.map( (value) => {
                 return parseValue(value);
               } );
               return { x: measureBuckets.measures ? values [measureBuckets.measures[0]]:0,
                        y: measureBuckets.secondary ? values [measureBuckets.secondary[0]]:0,
                        name: stackByAttribute ? stackByAttribute.items[itemIndex].attributeHeaderItem.name : ''                    
                      };
           });    

        const measureInfo =  [ 
           measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]] : null,
           measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]] : null
          ];   

           
        const seriesItem = {
            name: '',
            color: colorPalette[0],
            data: data,
            legendIndex: 0       
        }        
        
        const series=[seriesItem];
        const categories=[""];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: {
                x: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.name : '',
                y: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.name : '',
                xFormat: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.format : '',
                yFormat: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.format : ''                           
            },            
            showInPercent: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.format.includes('%') : false, 
            showInPercentX: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.format.includes('%') : false, 
            data: {
                series,
                categories
            },
            actions: {
                tooltip: generateTooltipXYFn(measureInfo, stackByAttribute, type)
            }
       };
       
       return options;
    }

if (type==BUBBLE_CHART)
    {
       
        const data = executionResultData.map( (item,itemIndex) => {
               const values = item.map( (value) => {
                 return parseValue(value);
               } );
               return { x: measureBuckets.measures ? values [measureBuckets.measures[0]]:0,
                        y: measureBuckets.secondary ? values [measureBuckets.secondary[0]]:0,
                        z: measureBuckets.size ? values [measureBuckets.size[0]]:0, 
                        name: stackByAttribute ? stackByAttribute.items[itemIndex].attributeHeaderItem.name : ''
                      };
           }); 
           

        const measureInfo =  [ 
           measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]] : null,
           measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]] : null,
           measureBuckets.size ? measureGroup.items[measureBuckets.size[0]] : null
          ];   
   
        const seriesItem = {
            name: '',
            color: colorPalette[0],
            data: data   ,
            dataLabels: {
                enabled: true,
                format: '{point.name}'
            },
            legendIndex: 0
           
        }        
        
        const series=[seriesItem];
        const categories=[""];
        
        const options= {
            type,
            stacking: null,
            legendLayout: 'horizontal',
            colorPalette,
            title: {
                x: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.name : '',
                y: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.name : '',
                xFormat: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.format : '',
                yFormat: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.format : ''              
            },            
            showInPercent: measureBuckets.secondary ? measureGroup.items[measureBuckets.secondary[0]].measureHeaderItem.format.includes('%') : false,           
            showInPercentX: measureBuckets.measures ? measureGroup.items[measureBuckets.measures[0]].measureHeaderItem.format.includes('%') : false,
            data: {
                series,
                categories
            },
            actions: {
                 tooltip: generateTooltipXYFn(measureInfo, stackByAttribute, type)              
            }
       };
       
       return options;
    }
    
    {
    
    
    const seriesWithoutDrillability = getSeries(
        executionResultData,
        measureGroup,
        viewByAttribute,
        stackByAttribute,
        type,
        colorPalette
    );

    const series = getDrillableSeries(
        seriesWithoutDrillability,
        drillableItems,
        measureGroup,
        viewByAttribute,
        stackByAttribute,
        type,
        afm
    );
    
    

    let categories = getCategories(type, viewByAttribute, measureGroup);

    // Pie charts dataPoints are sorted by default by value in descending order
    if ((type === PIE_CHART) || (type === DONUT_CHART) || (type === FUNNEL_CHART)) {
        const dataPoints = series[0].data;
        const indexSortOrder = [];
        const sortedDataPoints = dataPoints.sort((pointDataA, pointDataB) => {
            if (pointDataA.y === pointDataB.y) { return 0; }
            return pointDataB.y - pointDataA.y;
        }).map((dataPoint, dataPointIndex) => {
            // Legend index equals original dataPoint index
            indexSortOrder.push(dataPoint.legendIndex);
            return {
                // after sorting, colors need to be reassigned in original order and legendIndex needs to be reset
                ...dataPoint,
                color: dataPoints[dataPoint.legendIndex].color,
                legendIndex: dataPointIndex
            };
        });
        // categories need to be sorted in exactly the same order as dataPoints
        categories = categories.map((_category, dataPointIndex) => categories[indexSortOrder[dataPointIndex]]);
        series[0].data = sortedDataPoints;
    }

    if (type===WATERFALL_CHART)
    {
       categories=measureGroup.items ? measureGroup.items.map(({ measureHeaderItem }) => measureHeaderItem.name) : [];
       series[0].upColor='rgb(20,178,226)';
          
    }
    
    

    // Attribute axis labels come from attribute instead of attribute display form.
    // They are listed in attribute headers. So we need to find one attribute header and read the attribute name
    const xLabel = config.xLabel || (viewByAttribute ? viewByAttribute.formOf.name : '');
    // if there is only one measure, yLabel is name of this measure, otherwise an empty string
    const yLabel = config.yLabel || (measureGroup.items.length === 1 ? unwrap(measureGroup.items[0]).name : '');
    const yFormat = config.yFormat || unwrap(measureGroup.items[0]).format;
    
 if (type === COLUMN_LINE_CHART)
    {
        
        const secondary=measureBuckets.secondary;
        var dualAxis=false;
        if (measureBuckets.secondary)
        {
          measureBuckets.secondary.forEach((measureIndex) => {
            series[measureIndex].type = 'line';         
          })
        }
        
        return {
        type,
        stacking: (stackByAttribute && type !== 'line') ? 'normal' : null,
        legendLayout: config.legendLayout || 'horizontal',
        colorPalette,
        title: {
            x: xLabel,
            y: yLabel,
            yFormat
        },
        dualAxis,
        showInPercent: measureGroup.items.some((wrappedMeasure) => {
            const measure = wrappedMeasure[Object.keys(wrappedMeasure)[0]];
            return measure.format.includes('%');
        }),
        showInPercentMeasures: measureBuckets.measures && measureBuckets.measures.some((item) => {
            const measure = unwrap(measureGroup.items[item]);
            return measure.format.includes('%');
        }),
        showInPercentSecondary: measureBuckets.secondary && measureBuckets.secondary.some((item) => {
            const measure = unwrap(measureGroup.items[item]);
            return measure.format.includes('%');
        }),
        data: {
            series,
            categories
        },
        actions: {
            tooltip: generateTooltipFn(viewByAttribute, type)
        }
    };
    }
 
    if (type === DUAL_AXIS_CHART)
    {
        
        const secondary=measureBuckets.secondary;
        var dualAxis=false;
        if (measureBuckets.secondary)
        {
          measureBuckets.secondary.forEach((measureIndex) => {
            series[measureIndex].type = 'line';
            
            if (measureBuckets.measures) 
            {
                series[measureIndex].yAxis = 1;
                dualAxis=true;
                
            }
          })
        }
        
        return {
        type,
        stacking: (stackByAttribute && type !== 'line') ? 'normal' : null,
        legendLayout: config.legendLayout || 'horizontal',
        colorPalette,
        title: {
            x: xLabel,
            y: yLabel,
            yFormat
        },
        dualAxis,
        showInPercent: measureGroup.items.some((wrappedMeasure) => {
            const measure = wrappedMeasure[Object.keys(wrappedMeasure)[0]];
            return measure.format.includes('%');
        }),
        showInPercentMeasures: measureBuckets.measures && measureBuckets.measures.some((item) => {
            const measure = unwrap(measureGroup.items[item]);
            return measure.format.includes('%');
        }),
        showInPercentSecondary: measureBuckets.secondary && measureBuckets.secondary.some((item) => {
            const measure = unwrap(measureGroup.items[item]);
            return measure.format.includes('%');
        }),
        data: {
            series,
            categories
        },
        actions: {
            tooltip: generateTooltipFn(viewByAttribute, type)
        }
    };
    }
   
    if (type === COLUMN_AREA_CHART)
    {
        const secondary=measureBuckets.secondary;
        
        if (measureBuckets.secondary)
        {
          measureBuckets.secondary.forEach((measureIndex) => {
            series[measureIndex].type = 'area'; 
            series[measureIndex].zIndex = -1;
          })
        }
        
        
    }

    
    return {
        type,
        stacking: (stackByAttribute && type !== 'line') ? 'normal' : null,
        legendLayout: config.legendLayout || 'horizontal',
        colorPalette,
        title: {
            x: xLabel,
            y: yLabel,
            yFormat
        },
        showInPercent: measureGroup.items.some((wrappedMeasure) => {
            const measure = wrappedMeasure[Object.keys(wrappedMeasure)[0]];
            return measure.format.includes('%');
        }),
        data: {
            series,
            categories
        },
        actions: {
            tooltip: generateTooltipFn(viewByAttribute, type)
        }
    };
}
}
