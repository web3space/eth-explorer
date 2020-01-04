'use strict';

var E = module.exports;

E.NO_SUITABLE_CHALLENGE = function(domain, challenges, presenters) {
	// Bail with a descriptive message if no usable challenge could be selected
	// For example, wildcards require dns-01 and, if we don't have that, we have to bail
	var enabled = presenters.join(', ') || 'none';
	var suitable =
		challenges
			.map(function(r) {
				return r.type;
			})
			.join(', ') || 'none';
	return new Error(
		"None of the challenge types that you've enabled ( " +
			enabled +
			' )' +
			" are suitable for validating the domain you've selected (" +
			domain +
			').' +
			' You must enable one of ( ' +
			suitable +
			' ).'
	);
};
E.UNHANDLED_ORDER_STATUS = function(options, domains, resp) {
	return new Error(
		"Didn't finalize order: Unhandled status '" +
			resp.body.status +
			"'." +
			' This is not one of the known statuses...\n' +
			"Requested: '" +
			options.domains.join(', ') +
			"'\n" +
			"Validated: '" +
			domains.join(', ') +
			"'\n" +
			JSON.stringify(resp.body, null, 2) +
			'\n\n' +
			'Please open an issue at https://git.rootprojects.org/root/acme.js'
	);
};
E.DOUBLE_READY_ORDER = function(options, domains, resp) {
	return new Error(
		"Did not finalize order: status 'ready'." +
			" Hmmm... this state shouldn't be possible here. That was the last state." +
			" This one should at least be 'processing'.\n" +
			"Requested: '" +
			options.domains.join(', ') +
			"'\n" +
			"Validated: '" +
			domains.join(', ') +
			"'\n" +
			JSON.stringify(resp.body, null, 2) +
			'\n\n' +
			'Please open an issue at https://git.rootprojects.org/root/acme.js'
	);
};
E.ORDER_INVALID = function(options, domains, resp) {
	return new Error(
		"Did not finalize order: status 'invalid'." +
			' Best guess: One or more of the domain challenges could not be verified' +
			' (or the order was canceled).\n' +
			"Requested: '" +
			options.domains.join(', ') +
			"'\n" +
			"Validated: '" +
			domains.join(', ') +
			"'\n" +
			JSON.stringify(resp.body, null, 2)
	);
};
E.NO_AUTHORIZATIONS = function(options, resp) {
	return new Error(
		"[acme-v2.js] authorizations were not fetched for '" +
			options.domains.join() +
			"':\n" +
			JSON.stringify(resp.body)
	);
};
