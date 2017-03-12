////////////////////////////////////////////////////////////
//////////////////////// Set-up ////////////////////////////
////////////////////////////////////////////////////////////

//Chart variables
var startYear,
	years, //save height per year
	rectWidth,
	rectHeight,
	rectCorner,
	currentYear = 2015,
	chosenYear = currentYear,
	chosenYearOld = currentYear,
	optArray, //for search box
	inSearch = false, //is the search box being used - for tooltip
	selectedArtist, //for search box and highlighting
	updateDots; //function needed in global
	
//Width and Height of the SVG
var	wind = window,
	d = document,
	e = d.documentElement,
	g = d.getElementsByTagName('body')[0],
	maxWidth = 1200, //Maximum width of the chart, regardless of screen size
	maxHeight = 800, //Maximum height of the chart, regardless of screen size
	w = Math.min(maxWidth, wind.innerWidth || e.clientWidth || g.clientWidth),
	h = Math.min(maxHeight, wind.innerHeight|| e.clientHeight|| g.clientHeight);

//Offsets needed to properly position elements
var xOffset = Math.max(0, ((wind.innerWidth || e.clientWidth || g.clientWidth)-maxWidth)/2),
	yOffset = Math.max(0, ((wind.innerHeight|| e.clientHeight|| g.clientHeight)-maxHeight)/2)

//Find the offsets due to other divs
var offsets = document.getElementById('chart').getBoundingClientRect();
	
//SVG locations
var margin = {top: 200, right: 20, bottom: 50, left: 40},
	padding = 40,
    width = w - margin.left - margin.right - padding,
    height = h - margin.top - margin.bottom - padding - offsets.top;

////////////////////////////////////////////////////////////
////////////////// Reposition elements /////////////////////
////////////////////////////////////////////////////////////

//Change note location
d3.select("#note")
	.style("top", (height + margin.top + margin.bottom + 40)+"px")
	.style("left", (xOffset + 20)+"px");
	
//Change intro location
d3.select("#intro")
	.style("left", (xOffset + 20)+"px");

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);


var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
	//.tickFormat(d3.format("d"))
	.tickValues(['FEMALE','MALE']);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
	.tickFormat(d3.format("d"));
	
//Create colors
var hexLocation = [
	{color:"#007F24", text: "1 - 1000", position: d3.range(1,1000)},
	{color:"#62BF18", text: "1000 - 5000", position: d3.range(1000,5000)},
	{color:"#FFC800", text: "5000 - 10000", position: d3.range(5000,10000)},
	{color:"#FF5B13", text: "10000 - 100000", position: d3.range(10000,100000)},
	{color:"#E50000", text: "100000 and above", position: d3.range(100000,500000)}
];
var hexKey = [];
hexLocation.forEach(function(d,i) {
	hexKey[d.color] = i;
})
	
var color = d3.scale.linear()
	.domain([1,1000,5000,10000,100000,500000])
	.range(hexLocation.map(function(d) { return d.color; }));

////////////////////////////////////////////////////////////	
///////////////////// Initiate SVG /////////////////////////
////////////////////////////////////////////////////////////
	
//Initiate outer chart SVG
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
//Container for all the rectangles
var dotContainer = svg.append("g").attr("class","dotContainer");
	
//Create title to show chosen year
var yearTitle = svg.append('text')                                     
	  .attr('x', width/2) 
	  .attr('y', -10)	  
	  .attr("class", "yearTitle")
	  .text("Top Genre by Gender");  

////////////////////////////////////////////////////////////	
///////////////////// Read in data /////////////////////////
////////////////////////////////////////////////////////////

d3.csv("data/gender.csv", function(error, data) {

	for(var i = 0; i < data.length; i++) { //Faster?
		data[i].release = data[i].gender;
		data[i].year = +data[i].plays;
		data[i].position = +data[i].position;
		data[i].title = data[i].plays;
		data[i].ranking = data[i].ranking;
		data[i].artist = "" + data[i].genre;
	}



	//Crossfilter
	var cf = crossfilter(data);
	// Create a dimension by political party
    var cfYear = cf.dimension(function(d) { return +d.year; });


	
	
	x.domain(data.map(function(d) { return d.release; }));
	//x.domain(['female','male'])




	y.domain([0,50]).nice();
	
	
	//Keeps track of the height of each year

	years = d3.range(0,2)
		.map(function(d,i) {
		  return {
			year: d,
			number: 1
		  };
		});

	//Size of the "song" rectangles

	rectWidth = Math.floor(x.range()[1]/10);
	rectHeight = Math.min(5,Math.floor(y.range()[0]/50));//Math.min(3,Math.floor(y.range()[0]/100));
	rectCorner = rectHeight/2;

	//Create x axis
	svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + height + ")")
		  .call(xAxis)
		.append("text")
		  .attr("class", "label")
		  .attr("x", x.rangeRoundBands/2)
		  .attr("y", 35)
		  .style("text-anchor", "middle")
		  .text("Gender");


	
	//Create the legend
	createLegend();

	//Change the year when moving the slider
	updateDots = function (chosenYear) {
		
		//Filter the chosen year from the total dataset
		var yearData = cfYear//.filterExact(+chosenYear);


		//Reset the heights
		years.forEach(function(value, index) {
			years[index].number = 1;
		});


	
		//DATA JOIN
		//Join new data with old elements, if any.
		var dots = dotContainer.selectAll(".dot")
					.data(yearData
							.top(Infinity)
							.sort(function(a, b) {return a.position - b.position}) 
							, function(d) { return d.position; });
		
		//ENTER
		dots.enter().append("rect")
			  .attr("class", "dot")
			  .attr("width", rectWidth)
			  .attr("height", rectHeight)
			  .attr("rx", rectCorner)
			  .attr("ry", rectCorner)
			  .style("fill", function(d) { return color(d.year); })
			  .on("mouseover", showTooltip)
			  .on("mouseout", hideTooltip)
			  .attr("x", function(d) { return x(d.release) + x.rangeBand()/2 - rectWidth/2; })//
			  .attr("y", function(d) {return y(0);})
			  .style("opacity",0);

		//EXIT
		dots.exit()
			.transition().duration(500)
			.attr("y", function(d) { return y(0); })
			.style("opacity",0)
			.remove();
			
		//UPDATE
		//First drop all rects to the zero y-axis and make them invisible
		//Then set them all to the correct new release year (x-axis)
		//Then let them grow to the right y locations again and make the visible
		dots
			.transition().duration(500)
			.attr("y", function(d) { return y(0); })
			.style("opacity",0)
			.call(endall, function() {
				dots
					.attr("x", function(d) { return x(d.release) + x.rangeBand()/2 -  rectWidth/2; })
					.attr("y", function(d) { return locateY(d); })
					.transition().duration(10).delay(function(d,i) { return i/2; })
					.style("opacity",1);
			});
			
		//Change year title
		yearTitle.text("Top Genre By Gender");
		//Save the current year
		chosenYearOld = chosenYear;
		
	}//function updateDots
	
	//Call first time
	updateDots(chosenYear);
	
});
