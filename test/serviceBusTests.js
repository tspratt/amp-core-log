// © 2013 Triton Digital, Inc.
"use strict";
var chai = require("chai");
var expect = chai.expect;
var uautils = require('../lib/utils');
var winston = require('winston');
var logger = new (winston.Logger)({
	transports:[
		new (winston.transports.Console)({ level:'error' })
	]
});
var constants = require('../lib/constants');
var mqClient = require('../serviceBusClient');
var mqConn;

describe('ServiceBus', function () {
	this.timeout(0);
	before(function (done) {
		mqClient.initMQ( function(err, conn){                        //get a connection, do not close
			if (err) {
				done(err);
			}
			else {
				mqConn = conn;
				done();
			}
		});

	});//before

	describe('coreLog api tests',
			function () {
				it('should call coreLog.isAlivet)', function (done) {
					var sContentIn = '{"apiMethod":"isalive"}';
					mqConn.createChannel(function(err, ch) {
						function handleMsg(msg) {                                     //declare the response handler
							ch.close();                                                   //lets close and create channels but not connections
							var statusResponse = JSON.parse(msg.content);
							uautils.asyncAssertionCheck(done, function () {
								expect(err).to.be.null;
								expect(msg.properties.correlationId).to.equal(correlationId);
								expect(statusResponse.data).to.exist;

							});
						}

						if (err) {
							logger.debug(err);
							done(err);
						}
						else{
							var qNameSub = 'q_admin_sub';
							var qOpts = {exclusive: false, durable: false};
							ch.assertQueue(qNameSub, qOpts);

							//subscribe
							ch.consume(qNameSub, handleMsg, {noAck: true}, function(err) {
								console.log(' [*] queue ' + qNameSub + ' Waiting for message key: ' + routingKey);
							});

							//publish
							var correlationId = uautils.getGUID();
							var exNamePub = 'x_core';
							var routingKey = 'q_admin_api';
							var msgOpts = {
								contentType: 'content/json',
								replyTo: qNameSub,
								correlationId: correlationId
							};

							ch.publish(exNamePub, routingKey, new Buffer(sContentIn), msgOpts);

						}
					});

				});//it

			}//function
	);//describe

});
