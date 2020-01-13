/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

// PUBLIC CLASSES

const HTTPEngine = function(notary, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);

    // PRIVATE ASPECTS

    const POST = 'POST';
    const PUT = 'PUT';
    const HEAD = 'HEAD';
    const GET = 'GET';
    const DELETE = 'DELETE';

    const STYLE = 'https://bali-nebula.net/static/styles/BDN.css';


    const isAuthenticated = function(parameters) {
        return !!parameters.account;
    };


    const isAuthorized = function(parameters, document) {
        if (document) {
            // check the owner of the document
            const owner = document.getValue('$account');
            if (owner && owner.isEqualTo(parameters.account)) return true;  // the document owner is always authorized

            // check for a citation rather than a notarized document
            const content = document.getValue('$content');
            if (!content) return true;  // all citations are public by default

            // check the permissions on the document
            const permissions = content.getParameter('$permissions');
            if (permissions.toString() === '/bali/permissions/public/v1') return true;  // publicly available
            // TODO: load in the real permissions and check them

        }

        return false;  // otherwise the account is not authorized to access the document
    };


    const encodeSuccess = function(status, responseType, document) {
        const response = {
            headers: {
                'Content-Length': 0
            },
            statusCode: status
        };
        if (document) {
            response.body = (responseType === 'text/html') ? document.toHTML(STYLE) : document.toBDN();
            response.headers['Content-Length'] = response.body.length;
            response.headers['Content-Type'] = responseType;
        }
        return response;
    };


    // PUBLIC ASPECTS

    this.encodeError = function(status, message, responseType) {
        const error = bali.catalog(
            {
                $status: status,
                $message: message
            }
        );
        const response = {
            headers: {
            },
            statusCode: status,
            body: (responseType === 'text/html') ? error.toHTML(STYLE) : error.toBDN()
        };
        response.headers['Content-Length'] = response.body.length;
        response.headers['Content-Type'] = responseType;
        return response;
    };


    this.decodeRequest = function(request) {
        try {
            if (debug > 0) console.log('Request ' + request.httpMethod + ': ' + request.path);
            var responseType = request.headers['Accept'] || request.headers['accept'];
            if (responseType !== 'application/bali') responseType = 'text/html';  // for a browser
            var credentials = request.headers['Nebula-Credentials'] || request.headers['nebula-credentials'];
            if (credentials) {
                credentials = decodeURI(credentials).slice(2, -2);  // strip off double quote delimiters
                credentials = bali.component(credentials);
            }
            const method = request.httpMethod.toUpperCase();
            var path = request.path.slice(1);  // remove the leading '/'
            path = path.slice(path.indexOf('/') + 1);  // remove leading 'repository/'
            const type = path.slice(0, path.indexOf('/'));  // extract type from <type>/<identifier>
            const identifier = path.slice(path.indexOf('/') + 1);  // extract identifier from <type>/<identifier>
            const body = request.body ? bali.component(request.body) : undefined;
            const parameters = {
                responseType: responseType,
                credentials: credentials,
                method: method,
                type: type,
                identifier: identifier,
                body: body
            };
            if (debug > 2) console.log('Parameters: ' + bali.catalog(parameters).toString());
            return parameters;
        } catch (cause) {
            if (debug > 2) console.log('An error occurred while attempting to extract the request parameters: ' + cause);
        }
    };


    /*
     * This method enforces strict symantics on the five methods supported by all resources that
     * are managed by the Bali Nebula™ services.  For details on the symantics see this page:
     * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
     */
    this.encodeResponse = function(parameters, existing) {
        const authenticated = isAuthenticated(parameters);
        const authorized = isAuthorized(parameters, existing);
        const method = parameters.method;
        const responseType = parameters.responseType || 'application/bali';
        const body = parameters.body;
        if (![POST, PUT, HEAD, GET, DELETE].includes(method)) {
            // Unsupported Method
            return encodeError(405, responseType, 'The requested method is not supported by this service.');
        }
        if (!authenticated) {
            if (!existing || !authorized || ![HEAD, GET].includes(method)) {
                // Not Authenticated
                const error = encodeError(401, responseType, 'The client must be authenticated to perform the requested method.');
                error.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                return error;
            }
            // Existing Public Document
            switch (method) {
                case HEAD:
                    return encodeSuccess(200, responseType, notary.citeDocument(existing));
                case GET:
                    return encodeSuccess(200, responseType, existing);
            }
        }
        if (!existing) {
            switch (method) {
                // Authenticated and No Existing Document
                case POST:
                case PUT:
                    return encodeSuccess(201, responseType, notary.citeDocument(body));
                default:
                    return encodeError(404, responseType, 'The specified document does not exist.');
            }
        }
        if (!authorized) {
            // Authenticated but Not Authorized
            return encodeError(403, responseType, 'The client is not authorized to access the specified document.');
        }
        // Authenticated and Authorized
        switch (method) {
            case POST:
                return encodeError(409, responseType, 'The specified document already exists.');
            case PUT:
                return encodeSuccess(204, responseType, notary.citeDocument(body));
            case HEAD:
                return encodeSuccess(200, responseType, notary.citeDocument(existing));
            case GET:
            case DELETE:
                return encodeSuccess(200, responseType, existing);
        }
    };

    return this;

};
HTTPEngine.prototype.constructor = HTTPEngine;
exports.HTTPEngine = HTTPEngine;