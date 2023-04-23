const urls = ['https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json',
            'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json'];

function drawChoroplethMap(data) {
    // Get data
    let eduData = data[0];
    let mapData = data[1];
    
    // Set up variables for chart
    const padding = {top: 40, left: 20, right: 60, bottom: 20};
    const w = 1000 + padding.left + padding.right;
    const h = 600 + padding.top + padding.bottom;

    const legendRectCount = 10; // how many rectangles we want to have in out legend
    const legendRectH = (h - padding.top - padding.bottom) / legendRectCount;
    const legendRectW = 10;
    const legendSpacing = 15; // for spacing the legend's text labels from their rectangles

    // Set three colors for colormapping. Note hue and lightness is the same, only saturation is different
    const minColor = "#c21d00", //hsl(10, 100, 60),
    pivotColor = "#ffff33", //hsl(60, 100, 60),
    maxColor = "#00941b"; //"#33ff3d"; //hsl(120, 100, 60);

    // In order to display our colors and have these progress very granularly based on the data for each county, we'll use a linear scale to create a color "gradient":		
    const eduMin = d3.min(eduData, (d) => d.bachelorsOrHigher),
    eduMean = d3.mean(eduData, (d) => d.bachelorsOrHigher),
    eduMax = d3.max(eduData, (d) => d.bachelorsOrHigher);

    const colorScale = d3 // Colorscale for scaling the colors on the chloropleth map
        .scaleLinear()
        .domain([eduMin, eduMean, eduMax]) // We pass a middle value, in our case the mean, to get a better color contrast
        .range([minColor, pivotColor, maxColor]); // We pass a pivot color that will be matched up to the pivot value in our domain. 

    // Create a SVG that will be our chart
    const svg = d3
        .select("#canvas")
        .append("svg")
        .attr("id","chart")
        .attr("width",w)
        .attr("height",h);

    // Some title
    svg.append("text")
        .text("Higher Education Rates by US county")
        .attr("id", "title") // project requirement
        .attr("transform", "translate(" + w/2 + ", " + padding.top + ")")
        .attr("text-anchor","middle");
    // .. and add a description
    svg.append("text")
    .text("Lowest " + eduMin + "% - Mean: " + eduMean.toFixed(1) + "% - Highest: " + eduMax + "%")
    .attr("id", "description") // project requirement
    .attr("transform", "translate(" + w/2 + ", " + 2.2*padding.top + ")")
    .attr("text-anchor","middle");
    // ... and add a description
    svg.append("text")
        .text("Adults age above 24 with a bachelor's degree or higher (2010-2014)")
        .attr("id","description") // project requirement
        .attr("transform", "translate(" + w/2 + ", " + 1.7*padding.top + ")")
        .attr("text-anchor","middle");
    
    
    
    // For our chart's county colors, education rates, county names, state names, etc. we need to compare --on multiple occasions--  the ID of our mapData to the FIPS of our eduData in order to find a match, and then pull from the matching eduData object the data that we need. Rather than clutter our D3 commands later on and repeat our code unecessarily, we'll write a function here that we can reuse multiple times.
    // Note that because each county or tooltip requires us to access multiple pieces of information (e.g., for tooltip: area_name, state, bachelorsOrHigher), we will create a variable for temporarily saving the most recently matched eduData. By doing this, whenever we need to retireve multiple pieces of data for the same county, we'll be able to avoid calling a .filter() methods over the entire 3000+ length of eduData EACH TIME just to retrieve the same eduData object:
    // We'll store the most recent eduData object in a variable. By default, we'll set it to the first object in eduData, mostly as a place holder:
    let recentEduData = [eduData[0]];
    
    // With our temporary storage variable ready, let's write the function that returns the correct eduData value for a given county:
    const fetchEduData = function(d, keyName) {
        // If the object in recentEduData doesn't match the ID of the county we're working on, then we'll update recentEduData...
        if (recentEduData[0].fips != d.id) {
            recentEduData = eduData.filter( (val) => val.fips == d.id);
        }
        // .. and in return either the value we wanted from the prexisting recentEduData, or from the updated recentEduData variable:
        return recentEduData[0][keyName];
    };

    // Let's now turn our attention to the tooltip part of the project. We'll start by placing the DIV that will hold our tooltip on the page:
    const toolTipBox = d3.select("#canvas")
        .append("div")
        .attr("id", "tooltip");

    // Next, we'll put together a function that will automatically create the HTML content of our tooltips:
    const toolTipContent = function(d) {
        // Rather than use our fetchEduData function for each piece of information we need for our tooltips, we'll filter for the correct county's education data once only, and save a copy of it. By doing this, we avoid having to filter three times through 3000+ entries for the same data:
        let currentCounty = eduData.filter( (val) => val.fips == d.id)[0];

        let area_name = currentCounty.area_name;
        let state = currentCounty.state;
        let eduLevel = currentCounty.bachelorsOrHigher;
        return area_name + ", " + state + "<br>" + eduLevel + "%";
    }

    // Let's add a legend:
    // First, we'll create and place a group that will hold all of our legend elements:
    const legend = svg
        .append("g")
        .attr("id","legend") // project requirement
        .attr("transform","translate(" + (w - padding.left - padding.right) + ", " + (h - padding.bottom) + ")")
        // we move the whole group to where we want it, so that we don't have to also move the children elements one-by-one, thus saving on clutter and repeated code. Note that because we want the lowest value in our legend to be at the bottom, we have placed our legend in the bottom-right corner.

    const legendData = function() {
        // We'll start by defining an array and prepopulating it with the lowest value...
        let arr = [eduMin]
        // .. then determine how far apart each of the steps should be based on how many rectangles we want in our legend.
        let stepSize = (eduMax - eduMin) / legendRectCount;
        // With this info, we'll populate the array with the values for each step (minus 1)...
        for (i=1; i<= legendRectCount-1; i++) {
            arr.push( parseFloat( (i * stepSize + eduMin).toFixed(1)))
        };
        // ... and finally add the largest value to our array...
        arr.push(eduMax)
        // ... before returning our array of values:			
        return arr;
    };

    legend.selectAll("rect")
        .data( legendData().slice(0, -1)) // We remove the last rectangle so that we end on the eduMax value
        .enter()
        .append("rect")
        .attr("id", "legend-rect")
        .attr("y", (d, i) => i * ( -legendRectH) - legendRectH ) // adding rectangles upwards
        .attr("width", legendRectW )
        .attr("height", legendRectH )
        .attr("fill", (d) => colorScale(d) ) // determine the fill color based on the rectangle's value
        .attr("stroke", "white") // to make it easier to see the change from one rectangle to the next
        ;

    // ... and then we'll place the labels, inline with the edge of each rectangle in our legend:
    legend
        .append("g")
        .attr("id","legend-axis")
        .selectAll("text")
        .data( legendData() )
        .enter()
        .append("text")
        .attr("id", "legend-label")
        .text( (d) => d+"%")
        .attr("y", (d,i) => i * (-legendRectH)) // populating the labels "upwards"
        .attr("transform", "translate(" + legendSpacing + ", 0)") // moving the label text over to the right
    
        
    // Now that all the other stuff is on place, let's get to the task of adding the counties and states to create our choropleth chart
    // To achieve this goal, we'll use topoJSON. When When given a GeoJSON geometry or feature object, topoJSON generates an SVG path data string or renders the path. Paths can be used with projections or transforms, or they can be used to render planar geometry directly to Canvas or SVG.
    // NB: TopoJSON is an extension of GeoJSON that encodes topology. Rather than representing geometries discretely, geometries in TopoJSON files are stitched together from shared line segments called arcs. This means that the border between two counties, for example, doesn't get represented twice, but rather one border is shared by both county shapes. This makes maps generated with topoJSON lighter.
    // In our case, it appears that the data we've received from our AJAX request is not latitude/longitude coordinates, but rather pre-projected arcs (GeometryCollection). For this reason, we don't need to/can't specify any projection details (e.g. d3.geoAlbersUSA(), scale, etc.) when we define our path generator:
    const geoPathMaker = d3.geoPath()
			//.projection(null)
		;
    const topoJSONdata = topojson.feature(mapData, mapData.objects.counties).features;

    console.log((topoJSONdata[0]))

    // With our D3 path generator defined and ready to go, we'll create a container for all of our counties using a group:
    const counties = svg
        .append("g")
        .attr("id", "counties")
        .attr("transform", "translate(" + padding.left + ", " + padding.top + ")" ) // moving the whole group and its children
    ;		
    // We'll also create a container group for the individual states:
    const states = svg
        .append("g")
        .attr("id", "states")
        .attr("transform", "translate(" + padding.left + ", " + padding.top + ")" ) // moving the whole group and its children
    ;

    counties
        .selectAll("path")
        .data( topoJSONdata ) // How to pass data to topoJSON
        .enter()
        .append("path") // we're adding path elements (line segments) to our SVG to create the map
        .attr("class","county") // project requirement
        .attr("d", geoPathMaker) //we call our path genereator, which we defined earlier
        .attr("data-fips", (d) => d.id) // fips (in eduData) and id (in mapData) are the unique identifiers that allow us to match data between the two datasets, so we can just return d.id here instead of fips (https://en.wikipedia.org/wiki/Federal_Information_Processing_Standards)
        .attr("data-education", (d) => fetchEduData(d, "bachelorsOrHigher")) // project requirement
        .attr("fill", (d) => colorScale( fetchEduData(d, "bachelorsOrHigher")))
        .on("mouseover", (d,i) => {
            let data = d.target.__data__;
            toolTipBox
                .style("top", d.pageY + 10 + "px")
                .style("left", d.pageX + 10 + "px")
                .attr("data-education", fetchEduData(data, "bachelorsOrHigher")) // project requirement
                .style("background", colorScale(fetchEduData(data, "bachelorsOrHigher")) ) // we'll go the extra step and make the background color of the tooltip match the color of its county
                .style("visibility", "visible")
                .html( toolTipContent(data) );
        })
        .on('mouseout', (d) => {
            toolTipBox
                .style("visibility", "hidden")
        })
    // With the counties added, we'll also place the elements for our state borders in order to make it easier for the user to make sense of where all the counties (3000+) are:
    states
        .selectAll("path")
        .data( topoJSONdata )
        .enter()
        .append("path")
        .attr("class","state")
        .attr("d", geoPathMaker)
        .attr("fill","none") // so that the states are transparent
        .attr("stroke", "#322a2a") // So we can identify the states
        // .on("mouseover", (d) => {
        //     d3.select(this)
        //         .attr("stroke","black")
        //         .attr("stroke-width", "100")
        // })
} // END of drawChoroplethMap() function
// And just like that, we're done! :D


async function ChoroplethMapAsync(urls) {
    urls.map((url) => console.log(url))
    try {
        const urlData = await Promise.all(
                urls.map((url) => fetch(url)
                    .then((res) => res.json())
                )
            );
            drawChoroplethMap(urlData);
    } catch (error) {
        console.log(error)
    }
} // END of ChoroplethMapAsync() function

ChoroplethMapAsync(urls);