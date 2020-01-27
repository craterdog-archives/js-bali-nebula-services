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

const HTTPEngine = function(notary, repository, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off
    const bali = require('bali-component-framework').api(debug);

    // PRIVATE ASPECTS

    const PUT = 'PUT';
    const POST = 'POST';
    const HEAD = 'HEAD';
    const GET = 'GET';
    const DELETE = 'DELETE';

    const STYLE = 'https://bali-nebula.net/static/styles/BDN.css';


    const isAuthenticated = function(parameters) {
        return !!parameters.account;
    };


    const isAuthorized = async function(parameters, component) {
        if (component && component.isComponent) {
            // check for a element type
            if (component.isType('/bali/abstractions/Element')) return true;  // elemental types are always authorized

            if (component.isType('/bali/collections/Catalog')) {
                // check the owner of the component
                const owner = component.getValue('$account');
                if (owner && owner.isEqualTo(parameters.account)) return true;  // the component owner is always authorized

                // check for a citation rather than a notarized document
                const content = component.getValue('$content');
                if (!content) return true;  // all citations are public by default

                // check the permissions on the notarized document
                const permissions = content.getParameter('$permissions');
                if (permissions.toString() === '/bali/permissions/public/v1') return true;  // publicly available
                // TODO: load in the real permissions and check them
            }
        }
        return false;  // otherwise the account is not authorized to access the component
    };


    const encodeSuccess = function(status, responseType, component, cacheControl) {
        const response = {
            headers: {
            },
            statusCode: status
        };
        response.body = (responseType === 'text/html') ? component.toHTML(STYLE) : component.toBDN();
        response.headers['Content-Length'] = response.body.length;
        response.headers['Content-Type'] = responseType;
        response.headers['Cache-Control'] = cacheControl;
        return response;
    };


    const citeComponent = async function(component) {
        if (component.isType('/bali/collections/Catalog') && component.getValue('$content')) {
            component = await notary.citeDocument(component);
        }
        return component;
    };


    // PUBLIC ASPECTS

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
            const tokens = request.path.split('/');
            const service = tokens[1];
            const type = tokens[2];
            const identifier = tokens.slice(3).join('/');
            const body = request.body ? bali.component(request.body) : undefined;
            const parameters = {
                responseType: responseType,
                credentials: credentials,
                method: method,
                service: service,
                type: type,
                identifier: identifier,
                body: body
            };
            if (debug > 2) console.log('Parameters: ' + bali.catalog(parameters));
            return parameters;
        } catch (cause) {
            if (debug > 2) console.log('An error occurred while attempting to extract the request parameters: ' + cause);
        }
    };


    this.validCredentials = async function(parameters) {
        try {
            const credentials = parameters.credentials;
            if (credentials) {
                if (credentials.isType('/bali/collections/Catalog')) {
                    const citation = credentials.getValue('$certificate');
                    const tag = citation.getValue('$tag');
                    const version = citation.getValue('$version');
                    // if the certificate doesn't yet exist, there is a self-signed certificate in the body
                    var certificate = (await repository.readDocument(tag, version)) || parameters.body;
                    if (await notary.validDocument(credentials, certificate)) {
                        parameters.account = certificate.getValue('$account');
                        return true;  // the credentials are valid
                    }
                }
                return false;  // the credentials are invalid
            }
            return true;  // no credentials were passed in, proceed anonymously
        } catch (cause) {
            if (debug > 2) console.log('An error occurred while attempting to extract the request credentials: ' + cause);
            return false;  // the credentials were badly formed
        }
    };


    this.encodeError = function(status, responseType, message) {
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
        response.headers['Cache-Control'] = 'no-store';
        if (status === 401) {
            response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
        }
        return response;
    };


    /*
     * This method enforces strict symantics on the five methods supported by all resources that
     * are managed by the Bali Nebula™ services.  For details on the symantics see this page:
     * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
     */
    this.encodeResponse = async function(parameters, existing, isMutable) {
        const exists = !!existing;
        const authenticated = isAuthenticated(parameters);
        const authorized = await isAuthorized(parameters, existing);
        const method = parameters.method;
        const responseType = parameters.responseType || 'application/bali';
        const document = parameters.body;
        var citation;
        if (![PUT, POST, HEAD, GET, DELETE].includes(method)) {
            // Unsupported Method
            return this.encodeError(405, responseType, 'The requested method is not supported by this service.');
        }
        if (!authenticated) {
            if (!exists || !authorized || ![HEAD, GET].includes(method)) {
                // Not Authenticated
                const error = this.encodeError(401, responseType, 'The client must be authenticated to perform the requested method.');
                return error;
            }
            // Existing Public Resource
            switch (method) {
                case HEAD:
                    const response = encodeSuccess(200, responseType, existing, 'public, immutable');
                    response.body = undefined;
                    return response;
                case GET:
                    return encodeSuccess(200, responseType, existing, 'public, immutable');
            }
        }
        if (!exists) {
            switch (method) {
                // Authenticated and no Existing Resource
                case PUT:
                    citation = await citeComponent(document);
                    const service = parameters.service;
                    const type = parameters.type;
                    const tag = citation.getValue('$tag').toString().slice(1);  // remove leading '#'
                    const version = citation.getValue('$version');
                    const response = encodeSuccess(201, responseType, citation, 'no-store');
                    response.headers['Location'] = 'https://bali-nebula.net/' + service + '/' + type + '/' + tag + '/' + version;
                    return response;
                default:
                    return this.encodeError(404, responseType, 'The specified resource does not exist.');
            }
        }
        if (!authorized) {
            // Authenticated, Existing Resource, but not Authorized
            return this.encodeError(403, responseType, 'The client is not authorized to access the specified resource.');
        }
        // Authenticated, Existing Resource, and Authorized
        const cacheControl = isMutable ? 'no-store' : 'private, immutable';
        switch (method) {
            case PUT:
                if (isMutable) {
                    citation = await citeComponent(document);
                    return encodeSuccess(200, responseType, citation, 'no-store');
                }
                return this.encodeError(409, responseType, 'The specified resource already exists.');
            case POST:
                // post a new document to the parent resource specified by the URI
                citation = await citeComponent(document);
                const service = parameters.service;
                const type = parameters.type;
                const tag = citation.getValue('$tag').toString().slice(1);  // remove leading '#'
                const version = citation.getValue('$version');
                var response = encodeSuccess(201, responseType, citation, 'no-store');
                response.headers['Location'] = 'https://bali-nebula.net/' + service + '/' + type + '/' + tag + '/' + version;
                return response;
            case HEAD:
                response = encodeSuccess(200, responseType, existing, cacheControl);
                response.body = undefined;
                return response;
            case GET:
                return encodeSuccess(200, responseType, existing, cacheControl);
            case DELETE:
                return encodeSuccess(200, responseType, existing, 'no-store');
        }
    };

    return this;

};
HTTPEngine.prototype.constructor = HTTPEngine;
exports.HTTPEngine = HTTPEngine;
