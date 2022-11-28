// time selection component in P1 and P2
import * as utils from "./utils.js";
import { Page, Component } from "./prototype.js";

/**
 *  This class creates a time selection component
 */
class TimeSelect extends Component {
    /**
     * This constructor creates a time selection component with the upper left corner at (x,y)
     * and a specified width and height. If no dimesions are specified, the default is (0,0)
     * for x,y and 500x500 for width and height.
     * 
     * @param {Page} page
     * @param {Array<utils.AvalancheData>} data 
     * @param {bool} verbose
     */
    constructor(page, data, verbose = false) {
        super(page, data, verbose)
        this.page = page;

        this.verbose = verbose // This dictates whether or not the component will print to the console
        this.dates = { date1: null, date2: null }; // This is the object that will store the dates

        // Setting some constants
        this.margin_bottom = 18;
        this.margin_left = 15;

        this.data = data; // This is the data that will be used to create the time selection component

        //Grouping the data by length per date and convert to an array of objects
        this.data = Array.from(d3.rollup(this.data, v => {
            let aids = [];
            v.forEach(d => aids.push(d.aid));
            return [v.length, aids];
        }, d => d.date));

        //Converting this.data back to a list of objects
        this.data = this.data.map((d) => {
            return {
                date: (d[0]),
                aids: d[1][1],
                count: d[1][0]
            };
        });

        let dates = d3.timeDays(d3.min(this.data, d => d.date), d3.max(this.data, d => d.date));

        dates.forEach((d) => {
            if (!this.data.some((e) => e.date.getTime() === d.getTime())) {
                this.data.push({ date: d, aids: [], count: 0 });
            }
        });

        this.data = this.data.sort((a, b) => a.date - b.date);
    }

    update() {

    }


    /**
     * This method draws the time selection component in the div specified
     * 
     * @param {d3.Selection} div 
     */
    async render(div) {
        let barSelect = false;
        super.render(div);

        //Creating svg to hold the time selection component
        let svg = div
            .append('svg')
            .attr('width', this.dimensions.width)
            .attr('height', this.dimensions.height)
            .attr('id', 'timeselect');

        //Creating groups to hold sub components
        let chart = svg
            .append('g')
            .attr('id', 'ts-chart');

        let selectors = svg
            .append('g')
            .attr('id', 'ts-selectors');

        let brush = svg
            .append('g')
            .attr('id', 'ts-brush');

        let labels = svg
            .append('g')
            .attr('id', 'ts-labels');

        labels
            .append('text')
            .attr('id', 'ts-label1')
            .attr('x', this.margin_left)
            .attr('y', this.dimensions.height / 2)
            .attr('visibility', 'hidden')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .text('Start Date');

        labels
            .append('text')
            .attr('id', 'ts-label2')
            .attr('x', this.margin_left)
            .attr('y', this.dimensions.height / 2)
            .attr('visibility', 'hidden')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .text('End Date');


        //Appending Line Selectors to the Selector Group
        // selectors
        //     .append('line')
        //     .attr('id', 'ts-line1')
        //     .attr('x1', this.margin_left)
        //     .attr('y1', 0)
        //     .attr('x2', this.margin_left)
        //     .attr('y2', this.dimensions.height - this.margin_bottom)
        //     .attr('stroke', 'grey')
        //     .attr('stroke-width', 4)
        //     .attr('visibility', 'hidden');

        // selectors
        //     .append('line')
        //     .attr('id', 'ts-line2')
        //     .attr('x1', this.margin_left)
        //     .attr('y1', 0)
        //     .attr('x2', this.margin_left)
        //     .attr('y2', this.dimensions.height - this.margin_bottom)
        //     .attr('stroke', 'grey')
        //     .attr('stroke-width', 4)
        //     .attr('visibility', 'hidden');

        //Creating scales
        let xScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.date))
            .range([this.margin_left * 2, this.dimensions.width - this.margin_left]);

        let yScale = d3.scaleLinear()
            .domain([0, Math.sqrt(d3.max(this.data, d => d.count))]) //Square root scale to make the graph more readable
            .range([this.dimensions.height - this.margin_bottom, 0]);

        let xBarScale = d3.scaleBand()
            .domain(this.data.map(d => d.date))
            .range([this.margin_left * 2, this.dimensions.width - this.margin_left])
            .padding(0.1);

        //Adding Axis
        let xAxis = d3.axisBottom(xScale)
            .ticks(13)
            .tickFormat(d3.timeFormat("%Y"));

        chart
            .append('g')
            .attr('id', 'ts-xaxis')
            .attr('transform', `translate(0, ${this.dimensions.height - this.margin_bottom})`)
            .call(xAxis)
            .call(g => g.select(".domain").remove());

        //Adding a rect to the svg to add a border
        svg
            .append('rect')
            .attr('x', this.margin_left)
            .attr('y', 0)
            .attr('rx', 5)
            .attr('width', this.dimensions.width - this.margin_left)
            .attr('height', this.dimensions.height - this.margin_bottom)
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .attr('stroke', 'black');

        //Plotting the bars
        chart
            .selectAll('rect')
            .data(this.data)
            .join('rect')
            .attr('x', d => xBarScale(d.date))
            .attr('y', d => yScale(d.count))
            .attr('width', xBarScale.bandwidth())
            .attr('height', d => this.dimensions.height - this.margin_bottom - yScale(d.count))
            .attr('fill', 'lightblue')
            .attr('stroke', 'lightblue');

        //Adding a brush to the chart
        let brusher = d3.brushX()
            .extent([[this.margin_left * 2, 0], [this.dimensions.width - this.margin_left, this.dimensions.height - this.margin_bottom]])
            .on('brush', (event) => {
                let label1 = d3.select('#ts-label1');
                let label2 = d3.select('#ts-label2');
                let selection = event.selection;

                if (selection) {
                    let [x1, x2] = selection;
                    let l1 = label1.node().getBBox();
                    let l2 = label2.node().getBBox();
                    label1
                        .attr('x', x1 > this.margin_left + 200 ? x1 - l1.width : x1)
                        .attr('visibility', 'visible')
                        .text(d3.timeFormat("%B %d, %Y")(xScale.invert(x1)));
                    label2
                        .attr('x', x2 < this.dimensions.width - 200 ? x2 : x2 - l2.width)
                        .attr('visibility', 'visible')
                        .text(d3.timeFormat("%B %d, %Y")(xScale.invert(x2)));
                }
            })
            .on('end', (event) => {
                let selection = event.selection;
                let label1 = d3.select('#ts-label1');
                let label2 = d3.select('#ts-label2');
                let aids = [];
                if (selection) {
                    //Getting the selected dates and getting rid of time values
                    let date1 = new Date(xScale.invert(selection[0]).toDateString());
                    let date2 = new Date(xScale.invert(selection[1]).toDateString());

                    let date1Index = this.data.findIndex((d) => d.date.getTime() === date1.getTime());
                    let date2Index = this.data.findIndex((d) => d.date.getTime() === date2.getTime());


                    for (let i = date1Index; i <= date2Index; i++) {
                        aids = aids.concat(this.data[i].aids);
                    }
                }
                this.log('The selected AIDs are:');
                this.log(aids);
                label1
                    .attr('visibility', 'hidden');

                label2
                    .attr('visibility', 'hidden');
                //this.page.setSelection(aids);
            });
        brush.call(brusher);


        // DEPRECATED: This is the old way of selecting dates. This can now be done by brushing.
        // if (barSelect === true) {
        //     svg.on('click', (e) => {
        //         let line1 = d3.select('#ts-line1');
        //         let line2 = d3.select('#ts-line2');
        //         if (e.offsetX > this.margin_left && e.offsetX < this.dimensions.width) {
        //             // Is timeselect in the default state?
        //             if (!line1.classed('active') && !line2.classed('active')) {
        //                 // If it is, when clicked we need to start moving select 1
        //                 if (!line1.classed('moving')) {
        //                     line1
        //                         .attr('x1', e.offsetX)
        //                         .attr('x2', e.offsetX)
        //                         .attr('visibility', 'visible')
        //                         .classed('moving', true);
        //                 }
        //                 else {
        //                     // If select 1 is already moving, stop and and grab the date
        //                     line1
        //                         .classed('moving', false)
        //                         .classed('active', true);
        //                     this.dates.date1 = xScale.invert(e.offsetX);
        //                 }
        //             }
        //             else if (line1.classed('active') && !line2.classed('active')) {

        //                 // If select 1 is active, but select 2 is not, when clicked we need to start moving select 2
        //                 if (!line2.classed('moving')) {
        //                     line2
        //                         .attr('x1', e.offsetX)
        //                         .attr('x2', e.offsetX)
        //                         .attr('visibility', 'visible')
        //                         .classed('moving', true);
        //                 }
        //                 else if (e.offsetX > line1.attr('x1')) {
        //                     // If select 2 is already moving, stop and and grab the date
        //                     line2
        //                         .classed('moving', false)
        //                         .classed('active', true)
        //                     this.dates.date2 = xScale.invert(e.offsetX);
        //                 }
        //                 else if (e.offsetX < line1.attr('x1')) {
        //                     // If select 2 is to the left of select 1, swap them
        //                     line2
        //                         .classed('moving', false)
        //                         .classed('active', true)
        //                     this.dates.date2 = this.dates.date1;
        //                     this.dates.date1 = xScale.invert(e.offsetX);
        //                 }
        //                 else {
        //                     // If select 2 and select 1 are the same then throw and error and do nothing
        //                     chart
        //                         .select('path')
        //                         .transition()
        //                         .duration(100)
        //                         .attr('stroke', 'red')
        //                         .attr('fill', 'red')
        //                         .transition()
        //                         .duration(100)
        //                         .attr('stroke', 'lightblue')
        //                         .attr('fill', 'lightblue');
        //                 }
        //             }
        //             else if (line1.classed('active') && line2.classed('active')) {
        //                 // If both are active, reset the chart
        //                 line1
        //                     .attr('x1', 0)
        //                     .attr('x2', 0)
        //                     .attr('visibility', 'hidden')
        //                     .classed('active', false)
        //                     .classed('moving', false);

        //                 line2
        //                     .attr('x1', 0)
        //                     .attr('x2', 0)
        //                     .attr('visibility', 'hidden')
        //                     .classed('active', false)
        //                     .classed('moving', false);
        //                 this.dates.date1 = null;
        //                 this.dates.date2 = null;
        //             }
        //             text
        //                 .text(`(Demonstration Purposes Only) Selection type: ${this.dates.date1 && this.dates.date2 ? 'range' : 'single'} , Start date: ${this.dates.date1 ? this.dates.date1.toDateString() : 'null'}, End date: ${this.dates.date2 ? this.dates.date2.toDateString() : 'null'}`)
        //             this.log(this.getDates());
        //         }
        //     });

        //     //Allows Selection elements to move when mouse is dragged and they are in the moving state
        //     svg.on('mousemove', (e) => {
        //         if (e.offsetX > this.margin_left && e.offsetX < this.dimensions.width) {
        //             if (d3.select('#ts-line1').classed('moving')) {
        //                 d3.select('#ts-line1')
        //                     .attr('x1', e.offsetX)
        //                     .attr('x2', e.offsetX);
        //             }
        //             else if (d3.select('#ts-line2').classed('moving')) {
        //                 d3.select('#ts-line2')
        //                     .attr('x1', e.offsetX)
        //                     .attr('x2', e.offsetX);
        //             }
        //         }
        //     });
        //}
    }

    /**
     * This method will return an object with the start and end dates of the time selection and a key
     * indicating the mode of the time selection. If the mode is single, the end date will be null.
     * 
     * @returns {Object} {mode: "single"|"range", start: Date, end: Date}
     */
    getDates() {
        if (this.dates.date1 == null) {
            return null;
        }
        else if (this.dates.date2 == null) {
            return {
                mode: "single",
                start: this.dates.date1,
                end: null
            };
        }
        else {
            return {
                mode: "range",
                start: this.dates.date1,
                end: this.dates.date2
            };
        }
    }






}
export { TimeSelect };