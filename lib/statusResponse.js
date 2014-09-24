/**
 * All API calls will result in a JSON object with predictable properties:
 {status:[‘fail’,’success’], statusCode:99999, statusMessage:’my status message’, data:{}}
 (1)	status: ‘success’ or ‘fail’.  Used internally for simple flow control
 (2)	statusCode: Well known code, TBD. Used for language localization or complex response handling.
 (3)	statusMessage: Used for simple notification and for debugging.
 (4)  source: Name of the function the emits this response.  Can be overridden in constructor
 (4)	data:  {JSON object}: Data payload.  May be empty if status is ‘fail’.

	Note: we explicitly do NOT use strict in this module
 */
'use strict';
function StatusResponse (status, message, code, source, data){
	this.status = status || 'success';
	this.statusMessage = message || '';
	this.statusCode = code || '';
	this.source = source;
	this.data = data || '';
}

exports.StatusResponse = StatusResponse;