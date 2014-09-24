/**
 * Contains HTTP handlers for admin authentication functionality
 */
"use strict";
var business = require('./business');
var SvcConfig = require('./config/config').SvcConfig;
var config = new SvcConfig();
var winston = require('winston');
var logger = new (winston.Logger)({
	transports:[
		new (winston.transports.Console)({'timestamp':true, level:config.loggingLevel})
	]
});
var constants = require('./lib/constants');
var StatusResponse = require('./lib/statusResponse').StatusResponse;
var uautils = require('./lib/utils');


function isAlive(request, response){
	business.isAlive(function(err, statusResponse) {
		response.writeHead(200, 'success', {'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*'});
		response.end(JSON.stringify(statusResponse));
	});
}
exports.isAlive = isAlive;

