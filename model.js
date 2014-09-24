/**
 * this file does the work of communicating with the Mongo database.
 */
'use strict';
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
var util = require('util');
var uautils = require('./lib/utils');

var server = config.replSet;
var mongoDb = require('mongodb').Db;
var BSON = require('mongodb').BSONPure;
var db = new mongoDb(config.dbName, server, {safe: true});

var _isInitialized = false;


function initDb(callback) {
	logger.info('model.initDb');
	var statusResponse;
	if (!_isInitialized) {
		db.open(function (err, db) {
			if (!err) {
				_isInitialized = true;
				callback(err,{modelName:'model',dbName:config.dbName});
			}
			else {
				statusResponse = new StatusResponse(constants.STATUS_ERROR, "System Error, please try again", constants.STATUS_CODE_UNSPECIFIED, null, err);
				logger.error(JSON.stringify(statusResponse));
				callback(err, {modelName:'mgoModel',dbName:config.dbName});
			}
		});
	}
	else {
		callback(null);
	}
}//


function isInitialized() {
	return _isInitialized;
}



function initAllModels(callback){
	async.parallel([
				function(asyncCallback){
					initDb(function(err,data){
						asyncCallback(err, data);
					});
				}
			],
			function(err, aResults){
				var oResult;
				for (var i = 0; i < aResults.length; i++) {
					oResult = aResults[i];
					if (oResult) {
						logger.info('model: ' + oResult.modelName + ', connected to, Mongo Db: ' + oResult.dbName);
					}
				}
				callback(err, aResults);
			}
	);
}

function insertMsgLog(sServiceName, oInsert, callback){
	var collName = 'msgs_' + sServiceName;
	db.collection(collName, {safe: true},
			function (err, collection) {
				if (!err) {
					if (collection) {
						collection.insert(oInsert,
								function (err, result) {
									if (err) {
										logger.error();
										callback(err);
									}
									else {
										callback(err, result);
									}
								}
						);
					}
				}
				else {
					logger.error(err);
					callback(err);
				}
			}
	);
}

function insertServiceLog(sServiceName, oInsert, callback){
	var collName = 'svc_' + sServiceName;
	db.collection(collName, {safe: true},
			function (err, collection) {
				if (!err) {
					if (collection) {
						collection.insert(oInsert,
								function (err, result) {
									if (err) {
										logger.error();
										callback(err);
									}
									else {
										callback(err, result);
									}
								}
						);
					}
				}
				else {
					logger.error(err);
					callback(err);
				}
			}
	);
}

exports.db = db;
exports.initAllModels = initAllModels;
exports.insertMsgLog = insertMsgLog;
exports.insertServiceLog = insertServiceLog;



