'use strict';
var Server = require('mongodb').Server,
		ReplSetServers = require('mongodb').ReplSetServers;

var SvcConfig = function(){
	this.dbName = "AMP_Core_Log";
	this.replSet = new ReplSetServers([
				new Server('10.1.1.159', 27017, { auto_reconnect:true }),
				new Server('10.1.1.160', 27017, { auto_reconnect:true }),
				new Server('10.1.1.161', 27017, { auto_reconnect:true })
			],
			{rs_name:'rs0'}
	);
	this.loggingLevel = 'info';
	this.mqHost = 'rabbit1.dev.internal';
	this.mqProtocol = 'amqp://';
	this.mqUser = 'tracy.spratt';
	this.mqPassword = 'darkwing';
};

exports.SvcConfig = SvcConfig;