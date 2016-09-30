#!/usr/bin/env node
var webshot = require('webshot')
	, commandLineArgs = require('command-line-args')
	, fs = require('fs')
	, gm = require('gm').subClass({imageMagick: true})
	, path = require('path')
	, GIFEncoder = require('gifencoder')
	, pngFileStream = require('png-file-stream')
	, optionDefinitions = [
	{name: 'name', 		alias: 'n', type: String, defaultValue: 'Chicago'},
	{name: 'url', 		alias: 'u', type: String, defaultValue: 'https://www.google.com/maps/@41.8427834,-87.9392789,10.94z/data=!5m1!1e1'},
	{name: 'interval', 	alias: 'i', type: Number, defaultValue: 5},
	{name: 'duration', 	alias: 'd', type: Number, defaultValue: 60},
	{name: 'gifout', 	alias: 'g', type: String, defaultValue: 'output.gif'},
	{name: 'xoffset', 				type: Number, defaultValue: 0},
	{name: 'yoffset', 				type: Number, defaultValue: 0},
	{name: 'font', 					type: String, defaultValue: 'Arial'},
	{name: 'fontsize', 				type: Number, defaultValue: 32},
	{name: 'fontcolor', 			type: String, defaultValue: '#000000b0'},
	{name: 'directory', 			type: String, defaultValue: 'screenshots'},
	{name: 'gifdelay',				type: Number, defaultValue: 500},
];
const options = commandLineArgs(optionDefinitions);
const start_time = new Date().getTime();


function generateScreenshot() {
	var date = new Date();

	// If the snapshot directory doesn't exist, then lets create it.
	if ( !fs.existsSync(options.directory)) {
		fs.mkdirSync(options.directory);
	}

	// Now to generate the file path
	var shotFilename = path.format({
		dir: options.directory, 
		base: options.name + '-' + new Date().getTime() + '.png'
	});

	// Generate the screenshot from the web applicaition
	webshot(options.url, shotFilename, {
		screenSize: {
			width: 1920,
			height: 1080
		},
		shotSize: {
			width: 900,
			height: 900
		},
		shotOffset: {
			left: 700 + options.xoffset,
			top: 60 + options.yoffset
		},
	}, function(err) {
		// Now to modify the screenshot and add the name and the timestamp to the upper-left corner
		if (!err) {
			gm(shotFilename)
				.stroke(options.fontcolor)
				.font(options.font)
				.fontSize(options.fontsize)
				.drawText(10, 50, options.name + ': ' + date.getHours() + ':' + date.getMinutes())
				.write(shotFilename, function(err){
					if (err) {console.log(err)}
				})
			console.log('Generated ' + shotFilename)
		} else {
			console.log(err);
		}
	});
}


function generateGIF() {
	var encoder = new GIFEncoder(900, 900);	// GIF Encoder set to 900x900px

	// generate the pathing to 
	var shots = path.format({
		dir: options.directory, 
		base: options.name + '-?????????????.png'
	});

	// Now to stream all of the PNG files into the Animated GIF.
	pngFileStream(shots)
		.pipe(encoder.createWriteStream({
			repeat: -1,
			delay: 500,
			quality: 10
		}))
		.pipe(fs.createWriteStream(options.gifout));
	console.log('Created ' + options.gifout)
	process.exit();
}


function runLoop() {
	// We will check every minute to see if we need to run the screenshot generator
	// and use the interval option to determine if its the appropriate time.  This
	// means that we should always get clean and reliable times (e.g. 05,10,15) for
	// 5 minute intervals, etc.
	var intervalId = setInterval(function() {
		var minutes = new Date().getMinutes();
		if (minutes % options.interval == 0) {
			generateScreenshot();
		}
	}, 60000);

	// Here we will check to see if enough time has elapsed (set in the duration)
	// for us to terminate the screenshot generator and compile everything into
	// an animated GIF.  Once the GIF is generated, terminate the application.
	var running = true;
	var watcher = setInterval(function() {
		if ((new Date().getTime() - start_time) > ((options.duration * 60000) + 1000) && running) {
			clearInterval(intervalId);
			running = false;
			generateGIF();
			clearInterval(watcher);
		}
	}, 60000);
}

runLoop();