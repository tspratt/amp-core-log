// © 2013 Triton Digital, Inc.
"use strict";
var SvcConfig = require('./config/config').SvcConfig;
var config = new SvcConfig();
var winston = require('winston');
var logger = new (winston.Logger)({
	transports:[
		new (winston.transports.Console)({'timestamp':true, level:config.loggingLevel})
	]
});

var async = require('async');
var amqp = require('amqplib/callback_api');
var business = require('./business');
var mqConn;
var mqChannel;
var exNameEvent = 'x_event';

var aExchangeDefs = [
	{name: 'x_event', type: 'topic', options: {}},
	{name: 'x_core_log', type: 'topic', options: {}}
];
var aQueueDefs = [
	{name: 'q_log_api_events', options: {}},
	{name: 'q_log_svc_events', options: {}},
	{name: 'q_core_log', options: {}}
];
var aBindDefs = [
	{qName: 'q_log_api_events', xName: 'x_event', pattern: 'core.api.#', args: {}},
	{qName: 'q_log_svc_events', xName: 'x_event', pattern: 'event.#', args: {}},
	{qName: 'q_core_log', xName: 'x_core_log', pattern: 'log.#', args: {}}
];
var aConsumerDefs = [
		{qName: 'q_log_api_events', handler: handleApiEvent, handlerName: 'handleApiEvent',options: {noAck: true}},
		{qName: 'q_log_svc_events', handler: handleSvcEvent, handlerName: 'handleSvcEvent', options: {noAck: true}},
		{qName: 'q_core_log', handler: handleCoreLog, handlerName: 'handleCoreLog',options: {noAck: true}}
];


function initMQ(callback){
	var url = config.mqProtocol + config.mqUser + ':' + config.mqPassword + '@' + config.mqHost; //'amqp://tracy.spratt:darkwing@rabbit1.dev.internal';
	if (!mqConn) {
		amqp.connect(url, null,
				function (err, conn) {
					if(!err) {
						logger.info('Service Bus Client: Connected to MQ');
						mqConn = conn;
						initChannel();
					}
					else {
						logger.error('Connection ERROR:' + err);
						bail(err, conn);
					}
					if (callback) {
						callback(err, conn);
					}
				}
		);
	}
	else {
		callback(null, mqConn);
	}


}

function bail(err, conn) {
	console.error(err);
	if (conn) {
		conn.close(function() { process.exit(1); });
	}
}



function setupExchanges(ch) {
	logger.info(' Setup Exchanges:');
	async.forEach(
			aExchangeDefs,
			function (exDef, asyncCallback) {
				ch.assertExchange(exDef.name, exDef.type, exDef.options,
						function(err, ok){
							logger.info(' ..' + exDef.name + '(' + exDef.type + ')');
							asyncCallback(err, ok);
						}
				);
			},
			function (err) {
				if (err) {
					return bail(err, mqConn);
				}
				else {
					setupQueues(ch);
				}
			}
	);
}

function setupQueues(ch){
	logger.info(' Setup Queues:');
	async.forEach(
			aQueueDefs,
			function (qDef, asyncCallback) {
				ch.assertQueue(qDef.name, qDef.options,
						function(err, ok){
							logger.info(' ..' + qDef.name );
							asyncCallback(err, ok);
						}
				);
			},
			function (err) {
				if (err) {
					return bail(err, mqConn);
				}
				else {
					bindQueues(ch);
				}
			}
	);
}//setupQueues

function bindQueues(ch){
	logger.info(' Setup Queue Bindings:');
	async.forEach(
			aBindDefs,
			function (bindDef, asyncCallback) {
				ch.bindQueue(bindDef.qName, bindDef.xName, bindDef.pattern, bindDef.args,
						function(err, ok){
							logger.info(' ..' + bindDef.qName + ' bound to ' + bindDef.xName + ' on: "' + bindDef.pattern + '"')
							asyncCallback(err, ok);
						}
				);
			},
			function (err) {
				if (err) {
					return bail(err, mqConn);
				}
				else {
					setupConsumers(ch);
				}
			}
	);
}

function setupConsumers(ch){
	logger.info(' Setup Consumers:');
	async.forEach(
			aConsumerDefs,
			function (consumerDef, asyncCallback) {
				ch.consume(consumerDef.qName, consumerDef.handler, consumerDef.options,
						function(err, ok) {
							logger.info(' ..' + consumerDef.qName + ' consumed by ' + consumerDef.handlerName);
							asyncCallback(err, ok);
						});
			},
			function (err) {
				if (err) {
					return bail(err, mqConn);
				}
				else {
					logger.info('Service Bus Client Ready')
				}
			}
	);

}//setupConsumers


/**
 * Logs Api events
 * @param msg
 */
function handleApiEvent(msg) {

	business.logCoreApiMsg(msg);

}//

/**
 * Generic, non API event handler
 * @param msg
 */
function handleSvcEvent(msg) {
	var jsonContent = JSON.parse(msg.content) || {};


}//

/**
 * Generic, handler for core_log messages
 * @param msg
 */
function handleCoreLog(msg) {
	business.logCoreService(msg);
	var jsonContent = JSON.parse(msg.content) || {};
logger.info('handleCoreLog: ' + msg.fields.routingKey);

}//


function initChannel() {
	process.once('SIGINT', function() { mqConn.close(); });
	mqConn.createChannel(function(err, ch) {
		if (err) {
			bail(err, mqConn);
		}
		else {
			mqChannel = ch;
			setupExchanges(ch);
		}
	});
}


exports.initMQ = initMQ;

