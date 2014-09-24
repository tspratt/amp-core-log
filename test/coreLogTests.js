// © 2013 Triton Digital, Inc.
"use strict";
var chai = require("chai");
var expect = chai.expect;
var model = require('../model');

var business = require('../business');
var uautils = require('../lib/utils');

var winston = require('winston');
var logger = new (winston.Logger)({
	transports:[
		new (winston.transports.Console)({ level:'error' })
	]
});
var constants = require('../lib/constants');
var StatusResponse = require('../lib/statusResponse').StatusResponse;

var adminIdTest = '2920f500-e8d5-11e2-a041-5fef9f6bc58c';
var passwordTest = 'password';
var usrIdTest = 'UnitTestAdmin';
var authTokenTest = 'aaa_UnitTest_999';


describe.skip('Shell Functionality', function () {
	this.timeout(0);
	before(function (done) {
		model.initAllModels(
				function (err) {
					if (err) {
						var statusResponse = new StatusResponse(constants.STATUS_ERROR, 'System Error. Please try again', constants.STATUS_CODE_UNSPECIFIED, 'initDb', err);
						logger.debug(JSON.stringify(statusResponse));
						done(err);
					}
					else {
						logger.debug('initDb SUCCESS');
						done();
					}
				}
		);
	});//before

	describe('Test adminLogin (business)',
			function () {
				var authTokenTmp;
//				it('should return one correct admin record for userId and password', function (done) {
//					business.adminLogin(usrIdTest, passwordTest,
//							function (err, statusResponse) {
//								uautils.asyncAssertionCheck(done, function () {
//									expect(err).to.not.exist;
//									expect(statusResponse.data).to.exist;
//									expect(statusResponse.data.usrId.value).to.equal(usrIdTest);
//									expect(statusResponse.data.accountType).to.exist;
//								});
//								authTokenTmp = statusResponse.data.authToken;
//							}
//					);
//				});
//				after(function (done) {
//					business.adminLogout(authTokenTmp,done);
//				});
			}
	);//describe('adminBusiness log in log out tests'



});
