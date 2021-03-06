/**
 * Contains business logic functions for shell app
 */
"use strict";
var SvcConfig = require('./config/config').SvcConfig;
var config = new SvcConfig();
var constants = require('./lib/constants');
var StatusResponse = require('./lib/statusResponse').StatusResponse;
var winston = require('winston');
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({'timestamp': true, level: config.loggingLevel})
	]
});

var async = require('async');

var model = require('./model');
var uautils = require('./lib/utils');
var crypto = require('crypto');

function isAlive(callback){
	var oData = {};
	var statusResponse = new StatusResponse(config.STATUS_SUCCESS,'isAlive',config.STATUS_CODE_UNSPECIFIED,null,oData);
	callback(null, statusResponse);

}

function logRequest(){
	return function (req, res, next) {
		try {                                           //We mus NEVER break an action because of any logging problem!
			var sAdminId = req.query.authAdminId || '';
			var sUsrId = req.query.authUsrId || '';
			var sUrl = req.url;
			var iEnd = sUrl.indexOf('?');
			var sServiceMethod = (iEnd > -1)? sUrl.substring(1,iEnd):sUrl.substring(1);
			var sMethod = req.method;
			var sQueryJson = JSON.stringify(req.query);
			var sBodyJson = JSON.stringify(req.body);
			var sParamsJson = JSON.stringify(req.params);
			var sHeadersJson = JSON.stringify(req.headers);
			var sValueTmp = '';
			var oTmp = {};
			var oSubDoc = [];

			var oInsert = {
				timestamp: new Date().toISOString(),
				adminId: sAdminId,
				usrId: sUsrId,
				url: sUrl,
				serviceMethod: sServiceMethod,
				method: sMethod,
				query: {json: sQueryJson},
				body: {json: sBodyJson},
				params: {json: sParamsJson},
				headers: {json: sHeadersJson}
			};             //do not supply _id, an ObjectId will be generated by mongo

			var sParam = '';
			var sName = '';

			//Log query parameters
			if (!uautils.isEmptyObject(req.query)) {
				for (sParam in req.query) {
					if (req.query.hasOwnProperty(sParam)) {
						if (sParam === 'authToken') {continue;}
						try {
							sValueTmp = req.query[sParam];
							if (sValueTmp) {
								if (typeof(sValueTmp) === 'object') {       //thi sis probably a dotted path, like email.value
									oInsert.query[sParam] = JSON.stringify(sValueTmp);
								}
								else {
									if (sValueTmp.charAt(0) === '{') {        //this is an JSON object representation
										oSubDoc = {json: sValueTmp};            //we still want this string
										oTmp = JSON.parse(sValueTmp);           //parse the object
										for (sName in oTmp) {
											if (oTmp.hasOwnProperty(sName)) {
												if (sName === 'authToken') {continue;}
												oSubDoc[sName] = oTmp[sName];
											}
										}
										oInsert.query[sParam] = oSubDoc;
									}
									else {                                      //else it is a simple string
										if (sParam === 'password') {
											oInsert.query[sParam] = '[NOT LOGGED]';
										}
										else {
											oInsert.query[sParam] = sValueTmp;
										}
									}
								}
							}
							else {
								logger.error('logRequest: request parameter is null or undefined: parameter name: ' + sParam);
							}
						}
						catch (err) {
							if (req.query.hasOwnProperty('password')) {                               //never display the password
								delete req.query.password;
							}
							logger.error('error logging "query" properties: ' + err.toString() + '- ' + JSON.stringify(req.query));
						}
					}
				}
			}

			//Log body parameters
			if (!uautils.isEmptyObject(req.body)) {
				for (sParam in req.body) {
					if (req.body.hasOwnProperty(sParam)) {
						if (sParam === 'authToken') {continue;}
						try {
							sValueTmp = req.body[sParam];
							if (typeof(sValueTmp) === 'object') {       //
								oSubDoc = {};
								oTmp = sValueTmp;
								for (sName in oTmp) {
									if (oTmp.hasOwnProperty(sName)) {
										if (sName === 'authToken') {continue;}                          //there is no value in keeping this
										oSubDoc[sName] = oTmp[sName];
									}
								}
								oInsert.body[sParam] = oSubDoc;
							}
							else {
								if (sValueTmp.charAt(0) === '{') {        //this is an object
									oSubDoc = {json: sValueTmp};            //we still want this string
									oTmp = JSON.parse(sValueTmp);           //parse the object
									for (sName in oTmp) {
										if (oTmp.hasOwnProperty(sName)) {
											if (sName === 'authToken') {continue;}
											oSubDoc[sName] = oTmp[sName];
										}
									}
									oInsert.body[sParam] = oSubDoc;
								}
								else {
									oInsert.body[sParam] = sValueTmp;
								}
							}
						}
						catch (err) {
							logger.error('error logging "body" properties: ' + JSON.stringify(err) + '- ' + JSON.stringify(req.body));
						}
					}
				}
			}

			//log headers
			if (!uautils.isEmptyObject(req.headers)) {
				for (sParam in req.headers) {
					if (req.headers.hasOwnProperty(sParam)) {
						if (sParam === 'authToken') {continue;}
						try {
							oInsert.headers[sParam] = req.headers[sParam];
						}
						catch (err) {
							logger.error('error logging "headers" properties: ' + JSON.stringify(err) + '- ' + JSON.stringify(req.headers));
						}
					}
				}
			}

			// log params
			if (!uautils.isEmptyObject(req.params)) {
				for (sParam in req.params) {
					if (req.params.hasOwnProperty(sParam)) {
						try {
							oInsert.params[sParam] = req.params[sParam];
						}
						catch (err) {
							logger.error('error logging "params" properties: ' + JSON.stringify(err) + '- ' + JSON.stringify(req.params));
						}
					}
				}
			}


			collLogs.insert(oInsert,
					function (err, result) {
						if (err) {
							logger.error(JSON.stringify(err));
						}
					}
			);
		}
		catch (err) {
			logger.error(JSON.stringify(err));
		}

		return next();                                    //we must ALWAYS do this!
	};
}

/**
 * Not middleware
 */
function logCoreApiMsg(msg){
	var sRoutingKey = msg.fields.routingKey;
	logger.info('logCoreApiMsg - routingKey: ' + sRoutingKey);
	var sServiceName = sRoutingKey.substr(sRoutingKey.lastIndexOf('.')+1);
	var apiSpec = JSON.parse(msg.content) || {};
	var sMethod = apiSpec.method || '';
	var oParams = apiSpec.params || {};
	var oInsert = {
		timestamp: new Date().toISOString(),
		routingKey: sRoutingKey,
		methodName: sMethod,
		params: oParams,
		msgFields: msg.fields,
		msgProperties: msg.properties
	};

	model.insertMsgLog(sServiceName, oInsert,
			function(err, data){
				if (err) {
					logger.error(err);
				}
				else {
					logger.info('MESSAGE logged successfully: ' + sRoutingKey)
				}
			}
	);

}

function logCoreService(msg){
	var sRoutingKey = msg.fields.routingKey;
	logger.info('logCoreApiMsg - routingKey: ' + sRoutingKey);
	var sServiceName = sRoutingKey.substr(sRoutingKey.lastIndexOf('.')+1);
	var apiSpec = JSON.parse(msg.content) || {};
	var sMethod = apiSpec.method || '';
	var oParams = apiSpec.params || {};
	var oInsert = {
		timestamp: new Date().toISOString(),
		routingKey: sRoutingKey,
		statusRresponse: JSON.parse(msg.content),
		msgFields: msg.fields,
		msgProperties: msg.properties
	};

	model.insertServiceLog(sServiceName, oInsert,
			function(err, data){
				if (err) {
					logger.error(err);
				}
				else {
					logger.info('MESSAGE logged successfully: ' + sRoutingKey)
				}
			}
	);

}//logCoreSvcAction

function listLogs(oFilter, oFields, oSort, callback){
	logger.info('auditLoger.listLogs');
	logger.info(JSON.stringify(oFilter));
	logger.info(JSON.stringify(oFields));
	logger.info(JSON.stringify(oSort));
	collLogs.find(oFilter, oFields).sort(oSort).toArray(callback);
}



exports.isAlive = isAlive;
exports.logRequest = logRequest;
exports.logCoreApiMsg = logCoreApiMsg;
exports.logCoreService = logCoreService;
exports.listLogs = listLogs;



