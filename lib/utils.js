/**
 * General shared utility functions
 */
'use strict';
var uuid = require('node-uuid');
var crypto = require('crypto');
var SvcConfig = require('../config/config').SvcConfig;
var config = new SvcConfig();
var winston = require('winston');
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({'timestamp': true, level: config.loggingLevel})
	]
});

function getGUID(){
	return uuid.v1();
}

/**
 * searches array of field items {name:'',label:''value:''} for match on value of "name" property,
 * return value of "value" property
 * @param sName: field item property name
 * @param aInfo: array of field items, eg adminInfo, orgInfo, etc.
 * @return {String}
 */
function getFieldItemValueByName(sName,aInfo){
	var sReturn = '';
	var item;
	for(var i=0;i<aInfo.length;i++){
		item = aInfo[i];
		if (item.name.toLowerCase() === sName.toLowerCase()){
			sReturn = item.value;
			break;
		}
	}
	return sReturn;
}

/**
 * searches array of field items {name:'',label:''value:''} for match on value of "name" property,
 * sets the value of "value" property to the passed in value
 * @param sName: field item property name
 * @param aInfo: array of field items, eg adminInfo, orgInfo, etc.
 * @return {String}
 */
function setFieldItemValueByName(sName,value, aInfo){
	var iReturn = -1;
	var item;
	for(var i=0;i<aInfo.length;i++){
		item = aInfo[i];
		if (item.name.toLowerCase() === sName.toLowerCase()){
			item.value = value;
			iReturn = i;
			break;
		}
	}
	return iReturn;
}

/**
 * Return true if passed in object has
 * @param obj
 * @return {Boolean}
 */
var isEmptyObject = function(obj) {
	return Object.keys(obj).length === 0;
};

/**
 * Executes the assertions in the passed in function, and calls done().
 * If the function errors, done is called immeditely
 * @param done
 * @param f
 */
function asyncAssertionCheck(done, f) {
    try {
        f();
        done();
    } catch(e) {
        done(e);
    }
}

function isNullOrUndefined(value) {
	return (value === null || (typeof value === "undefined"));
}

/**
 * creates a hash using plain text string in salt string
 * @param sPwd
 * @param sSalt
 * @return {*}
 */
function buildHash(sPwd,sSalt){
	var sReturn;
	if (!sPwd || !sSalt || sPwd.length === 0 || sSalt.length === 0) {
		sReturn = undefined;
	}
	else {
		sSalt = sSalt.toLowerCase();
		var sha256 = crypto.createHash('sha256');
		var bytBuf = new Buffer(sPwd + sSalt, 'utf16le');
		sha256.update(bytBuf);
		sReturn = sha256.digest('hex');
	}
	return sReturn;
}//buildHash

/**
 * Compares plain text password + has to stored hash, returns true if they match
 * @param sPwd
 * @param sSalt
 * @param sHash
 * @return {Boolean}
 */
function compareHash(sPwd,sSalt,sHash){
	//logger.debug('sPwd:' + sPwd + ', sSalt:' + sSalt + ', sHash:' + sHash)
	var bReturn;
	if (!sPwd || !sSalt || !sHash || sPwd.length === 0 || sSalt.length === 0 || sHash.length === 0) {
		bReturn = false;
	}
	else {
		sHash = sHash.toLowerCase();
		var hashTest = buildHash(sPwd,sSalt);
		//logger.debug('hashTest: ' + hashTest);
		bReturn = (hashTest === sHash);
	}
	return bReturn;
}//compareHash

function getUAShellUrl(request){
	if (request.query.hasOwnProperty('shellHost')) {
		return request.query.shellHost;
	}
	else if (request.body.hasOwnProperty('shellHost')) {
		return request.body.shellHost;
	}
	else {
		return request.headers.referer;
	}
}

function getNowISOString(){
	return new Date().toISOString();
}


function roleType_NameCompareFn(r1, r2) {
	try {
		var roleType1 = r1.roleType.toLowerCase();
		var roleType2 = r2.roleType.toLowerCase();

		var roleName1 = r1.roleName.value.toLowerCase();
		var roleName2 = r2.roleName.value.toLowerCase();
		if (roleType1 < roleType2) {
			return -1;
		}
		else if (roleType1 > roleType2) {
			return 1;
		}
		else {
			if (roleName1 < roleName2) {
				return -1;
			}
			else if (roleName1 > roleName2) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
	catch (err) {
		logger.error('roleType_NameCompareFn: ERROR: ' + err.toString());
		return 0;
	}
}//


function orgAncestorsCompareFn(o1, o2) {
	try {
		var anc1 = o1.ancestors.join('.').toLowerCase();
		var anc2 = o2.ancestors.join('.').toLowerCase();

		var orgName1 = o1.orgName.value.toLowerCase();
		var orgName2 = o2.orgName.value.toLowerCase();
		if (anc1 < anc2) {
			return -1;
		}
		else if (anc1 > anc2) {
			return 1;
		}
		else {
			if (orgName1 < orgName2) {
				return -1;
			}
			else if (orgName1 > orgName2) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
	catch (err) {
		logger.error('roleType_NameCompareFn: ERROR: ' + err.toString());
		return 0;
	}
}


/**
 * Processes passed in Org array into tree and hashtable lookup.
 * Requires that objects have a "parent" id reference,
 * and that the list is sorted by ancestor path
 * @param aOrgSelect
 * @returns {{trees: Array, dict: {}}}
 */
function buildOrgsTree(aOrgs) {
	var aOrgTree = [];
	var oNodeDict = {};
	var oNode;
	var sParentId;
	var oReturn = {tree: aOrgTree, dict: oNodeDict};

	for (var i = 0, len = aOrgs.length; i < len; i++) {                         //loop over all the org select objects
		var oOrg = aOrgs[i];
		if (!oOrg.children) {                                                     //add the children property if it does not exist, or we get binding errors
			oOrg.children = [];
		}

		oNodeDict[oOrg._id] = oOrg;                                               //put the object in a hash list for later quick reference
		sParentId = oOrg.ancestors[oOrg.ancestors.length - 1];                    //get the parent id of the current object

		if (oNodeDict.hasOwnProperty(sParentId)) {                                //if the parent is already in our hash list
			oNode = oNodeDict[sParentId];
			oNode.children.push(oOrg);                                              //push the current object onto its children array
			oNode.isFolder = true;
		}
		else {                                                                    //otherwise, it must be a root or single org
			aOrgTree.push(oOrg);                                                    //so add it to our return array
		}
	}
	return oReturn;
}

function trimISO(sISODateString) {
	return sISODateString.substr(0,10);
}

exports.setFieldItemValueByName = setFieldItemValueByName;
exports.getFieldItemValueByName = getFieldItemValueByName;
exports.isEmptyObject = isEmptyObject;
exports.asyncAssertionCheck = asyncAssertionCheck;
exports.isNullOrUndefined = isNullOrUndefined;
exports.buildHash = buildHash;
exports.compareHash = compareHash;
exports.getUAShellUrl = getUAShellUrl;
exports.getGUID = getGUID;
exports.getNowISOString = getNowISOString;
exports.roleType_NameCompareFn = roleType_NameCompareFn;
exports.buildOrgsTree = buildOrgsTree;
exports.orgAncestorsCompareFn = orgAncestorsCompareFn;
exports.trimISO = trimISO;

