/**
 *
 */
/**
 * Main file for Admin Authentication Service.
 */
'use strict';


var express = require('express');
var http = require('http');
var app = express();
var SvcConfig = require('./config/config').SvcConfig;
var config = new SvcConfig();
var winston = require('winston');
var logger = new (winston.Logger)({
		transports:[
			new (winston.transports.Console)({'timestamp':true, level:config.loggingLevel})
		]
});

var model = require("./model");
var routes = require("./routes");
var serviceBusClient = require('./serviceBusClient');

var constants = require('./lib/constants');
var StatusResponse = require('./lib/statusResponse').StatusResponse;



/**
 * Retrieves the value for a application argument, based on the specified argument name
 * @param argName
 * @returns {string}
 *
 * arguments have the form, --argName:argValue
 */
function getArgValue (argName) {
	var sReturn = "";
	for (var i = 0; i < process.argv.length; i++) {
		var parts = process.argv[i].split(':');
		if (parts.length > 1 && parts[0] == "--" + argName) {
			sReturn = parts[1];
			break;
		}
	}
	return sReturn;
}

// Configuration
app.configure(function(){
	var port = 8401,
			i = 0,
			parts;
	for(i=0; i<process.argv.length; i++){
		parts = process.argv[i].split(':');
		if(parts.length > 1 && parts[0] === "--port"){ //- Read Port number from command line in the format "--port:3000"
			port = parts[1];
		}
		if(parts.length > 1 && parts[0] === "--" + "config"){
			console.log('..using config file: ' + parts[1]);
		}
	}
	app.set('port', process.env.PORT || port); //- if port is already set for some reason, doesn’t overwrite it.
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
});


// Allow CORS
app.all('/*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With, TD-Authentication, Content-Type");
	next();
});


app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
	app.use(express.errorHandler());
});


// Routes
app.get('/isAlive', routes.isAlive); //do not use authorization middleware
app.get('/', routes.isAlive);



model.initAllModels(
		function (err, oData) {
			var message;
			var statusResponse;
			if (err) {
				message = 'System Error. Please try again.';
				statusResponse = new StatusResponse(constants.STATUS_ERROR, message, constants.STATUS_CODE_UNSPECIFIED, 'initDb', err);
				logger.info(JSON.stringify(statusResponse));
			}
			else {
				if (!module.parent) {                                                           // Only listen on $ node app.js
					app.listen(app.set('port'));
					logger.info("Express server listening on port: " + app.set('port'));
				}
			}
			serviceBusClient.initMQ();
		}
);

module.exports = app;

