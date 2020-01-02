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

const debug = 2;  // logging level in range [0..3]
const configuration = {
    uri: 'https://bali-nebula.net/repository/',
    citations: 'craterdog-bali-citations-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    queues: 'craterdog-bali-queues-us-west-2'
};

const bali = require('bali-component-framework').api(debug);
const notary = require('bali-digital-notary').service(debug);
const repository = require('bali-document-repository').service(notary, configuration, debug);
const style = 'https://bali-nebula.net/static/styles/BDN.css';

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';


// PUBLIC FUNCTIONS

if (debug > 2) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');
exports.handler = async function(request) {
    var parameters;
    try {
        if (debug > 0) console.log('Request ' + request.httpMethod + ': ' + request.path);

        // extract the request parameters
        parameters = decodeRequest(request);
        if (!parameters) {
            if (debug > 2) console.log('The service received a badly formed request.');
            return encodeError(400, 'Bad Request');
        }
        if (debug > 2) console.log('The request parameters: ' + bali.catalog(parameters).toString());

        // validate any credentials that were passed with the request (there may not be any)
        if (!(await validCredentials(parameters))) {
            if (debug > 2) console.log('Invalid credentials were passed with the request: ' + bali.catalog(parameters).toString());
            const response = encodeError(401, 'Invalid Credentials');
            response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
            return response;
        }

        // handle the request
        switch (parameters.type) {
            case 'citations':
                return await citationRequest(parameters);
            case 'drafts':
                return await draftRequest(parameters);
            case 'documents':
                return await documentRequest(parameters);
            case 'queues':
                return await queueRequest(parameters);
            default:
                if (debug > 2) console.log('The service received an invalid request type: ' + bali.catalog(parameters).toString());
                return encodeError(400, 'Bad Request');
        }

    } catch (cause) {
        if (debug > 0) {
            const exception = bali.exception({
                $module: '/bali/services/Repository',
                $procedure: '$handler',
                $exception: '$processingFailed',
                $parameters: parameters,
                $text: 'The processing of the HTTP request failed.'
            }, cause);
            console.log(exception.toString());
            console.log('Response: 503 (Service Unavailable)');
        }
        return encodeError(503, 'Service Unavailable');
    }
};


// PRIVATE FUNCTIONS

const decodeRequest = function(request) {
    try {
        var responseType = request.headers['Accept'] || request.headers['accept'];
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
        return parameters;
    } catch (cause) {
        if (debug > 2) console.log('An error occurred while attempting to extract the request parameters: ' + cause);
    }
};


const validCredentials = async function(parameters) {
    try {
        const credentials = parameters.credentials;
        if (credentials) {
            const citation = credentials.getValue('$certificate');
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            // if the certificate doesn't yet exist, there is a self-signed certificate in the body
            var certificate = (await repository.fetchDocument(tag, version)) || parameters.body;
            if (await notary.validDocument(credentials, certificate)) {
                parameters.account = certificate.getValue('$account');
                return true;  // the credentials are valid
            }
            return false;  // the credentials are invalid
        }
        return true;  // no credentials were passed in, proceed anonymously
    } catch (cause) {
        if (debug > 2) console.log('An error occurred while attempting to extract the request credentials: ' + cause);
        return false;  // the credentials were badly formed
    }
};


const isAuthorized = function(account, document) {
    if (document) {
        // check the owner of the document
        const owner = document.getValue('$account');
        if (owner && owner.isEqualTo(account)) return true;  // the document owner is always authorized

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


const encodeError = function(statusCode, statusString) {
    const response = {
        headers: {
            'Content-Type': undefined,
            'Content-Length': 0,
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': 'bali-nebula.net'
        },
        statusCode: statusCode,
        body: undefined
    };
    if (debug > 0) console.log('Response ' + statusCode + ': ' + statusString);
    return response;
};


/*
 * This method enforces strict symantics on the five methods supported by all resources that
 * are managed by the Bali Nebula™ services.  For details on the symantics see here:
 * https://github.com/craterdog-bali/js-bali-nebula-services/wiki/HTTP-Method-Semantics
 */
const encodeResponse = function(account, method, responseType, body, cacheControl) {
    const authenticated = !!account;
    const exists = !!body;
    const authorized = isAuthorized(account, body);
    responseType = responseType || 'text/html';
    var statusString;
    const response = {
        headers: {
            'Content-Type': responseType,
            'Content-Length': 0,
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': 'bali-nebula.net'
        }
    };
    if (authenticated) {
        if (exists) {
            if (authorized) {
                switch (method) {
                    case HEAD:
                        response.statusCode = 200;
                        statusString = 'Resource Exists';
                        break;
                    case GET:
                        switch (responseType) {
                            case 'application/bali':
                                response.body = body.toBDN();
                                break;
                            default:
                                response.headers['Content-Type'] = 'text/html';
                                response.body = body.toHTML(style);
                        }
                        response.headers['Content-Length'] = response.body.length;
                        response.headers['Cache-Control'] = cacheControl;
                        response.statusCode = 200;
                        statusString = 'Resource Retrieved';
                        break;
                    case POST:
                        response.statusCode = 409;
                        statusString = 'Resource Already Exists';
                        break;
                    case PUT:
                        response.statusCode = 204;
                        statusString = 'Resource Updated';
                        break;
                    case DELETE:
                        // only a mutable resource may be deleted
                        if (cacheControl === 'no-store') {
                            switch (responseType) {
                                case 'application/bali':
                                    response.body = body.toBDN();
                                    break;
                                default:
                                    response.headers['Content-Type'] = 'text/html';
                                    response.body = body.toHTML(style);
                            }
                            response.headers['Content-Length'] = response.body.length;
                            response.headers['Cache-Control'] = cacheControl;
                            response.statusCode = 200;
                            statusString = 'Resource Deleted';
                        } else {
                            response.statusCode = 403;
                            statusString = 'Not Authorized';
                        }
                        break;
                    default:
                        if (debug > 2) console.log('An invalid request method was attempted: ' + method);
                        response.statusCode = 405;
                        statusString = 'Method Not Allowed';
                }
            } else {
                // not authorized
                response.statusCode = 403;
                statusString = 'Not Authorized';
            }
        } else {
            // doesn't exist
            switch (method) {
                case HEAD:
                case GET:
                case DELETE:
                    response.statusCode = 404;
                    statusString = 'Resource Not Found';
                    break;
                case POST:
                case PUT:
                    response.statusCode = 201;
                    statusString = 'Resource Created';
                    break;
                default:
                    if (debug > 2) console.log('An invalid request method was attempted: ' + method);
                    response.statusCode = 405;
                    statusString = 'Method Not Allowed';
            }
        }
    } else {
        // not authenticated
        if (exists) {
            if (authorized) {
                switch (method) {
                    case HEAD:
                        response.statusCode = 200;
                        statusString = 'Resource Exists';
                        break;
                    case GET:
                        switch (responseType) {
                            case 'application/bali':
                                response.body = body.toBDN();
                                break;
                            default:
                                response.headers['Content-Type'] = 'text/html';
                                response.body = body.toHTML(style);
                        }
                        response.headers['Content-Length'] = response.body.length;
                        response.headers['Cache-Control'] = cacheControl;
                        response.statusCode = 200;
                        statusString = 'Resource Retrieved';
                        break;
                    default:
                        // must be authenticated create, update or delete a resource
                        response.statusCode = 401;
                        statusString = 'Not Authenticated';
                        response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
                        break;
                }
            } else {
                // not authorized
                response.statusCode = 401;
                statusString = 'Not Authenticated';
                response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
            }
        } else {
            // doesn't exist
            response.statusCode = 401;
            statusString = 'Not Authenticated';
            response.headers['WWW-Authenticate'] = 'Nebula-Credentials realm="The Bali Nebula™", charset="UTF-8"';
        }
    }
    if (debug > 0) console.log('Response ' + response.statusCode + ': ' + statusString);
    if (debug > 2 && response.body) console.log('  body: ' + response.body);
    return response;
};


const citationRequest = async function(parameters) {
    const method = parameters.method;
    const identifier = parameters.identifier;
    const responseType = parameters.responseType;
    const citation = parameters.body;
    const name = bali.component('/' + identifier);
    const existing = await repository.fetchCitation(name);
    var response = encodeResponse(parameters.account, method, responseType, existing, 'immutable');
    switch (method) {
        case HEAD:
        case GET:
            break;
        case POST:
            if (response.statusCode < 300) {
                const tag = citation.getValue('$tag');
                const version = citation.getValue('$version');
                if (await repository.documentExists(tag, version)) {
                    await repository.createCitation(name, citation);
                } else {
                    response = encodeError(409, 'Cited Must Exist');
                }
            }
            break;
        default:
            response = encodeError(405, 'Method Not Allowed');
    }
    return response;
};


const draftRequest = async function(parameters) {
    const method = parameters.method;
    const identifier = parameters.identifier;
    const responseType = parameters.responseType;
    const draft = parameters.body;
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    const existing = await repository.fetchDraft(tag, version);
    var response = encodeResponse(parameters.account, method, responseType, existing, 'no-store');
    switch (method) {
        case HEAD:
        case GET:
            break;
        case PUT:
            if (response.statusCode < 300) await repository.saveDraft(draft);
            break;
        case DELETE:
            if (response.statusCode < 300) await repository.deleteDraft(tag, version);
            break;
        default:
            response = encodeError(405, 'Method Not Allowed');
    }
    return response;
};


const documentRequest = async function(parameters) {
    const method = parameters.method;
    const identifier = parameters.identifier;
    const responseType = parameters.responseType;
    const document = parameters.body;
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    const existing = await repository.fetchDocument(tag, version);
    var response = encodeResponse(parameters.account, method, responseType, existing, 'immutable');
    switch (method) {
        case HEAD:
        case GET:
            break;
        case POST:
            if (response.statusCode < 300) {
                await repository.createDocument(document);
                const content = document.getValue('$content');
                const tag = content.getParameter('$tag');
                const version = content.getParameter('$version');
                await repository.deleteDraft(tag, version);
            }
            break;
        default:
            response = encodeError(405, 'Method Not Allowed');
    }
    return response;
};


const queueRequest = async function(parameters) {
    const method = parameters.method;
    const identifier = parameters.identifier;
    const responseType = parameters.responseType;
    var message = parameters.body;
    const queue = bali.component('#' + identifier);
    var response;
    switch (method) {
        case HEAD:
            // since a queue is not a document with an owner we must do this manually
            const exists = await repository.queueExists(queue);
            response = {
                headers: {
                    'Content-Type': responseType,
                    'Content-Length': 0,
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': 'bali-nebula.net'
                },
                statusCode: exists ? 200 : 404
            };
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + (exists ? 'Resource Exists' : 'Resource Not Found'));
            break;
        case GET:
            // since a queue is not a document with an owner we must do this manually
            const count = await repository.messageCount(queue);
            response = {
                headers: {
                    'Content-Type': responseType,
                    'Content-Length': 0,
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': 'bali-nebula.net'
                },
                statusCode: 200,
                body: count.toString()
            };
            if (debug > 0) console.log('Response ' + response.statusCode + ': ' + (count ? 'Resource Retrieved' : 'Resource Not Found'));
            break;
        case PUT:
            response = encodeResponse(parameters.account, method, responseType, undefined, 'no-store');
            if (response.statusCode < 300) await repository.queueMessage(queue, message);
            break;
        case DELETE:
            const existing = parameters.account ? await repository.dequeueMessage(queue) : undefined;
            response = encodeResponse(parameters.account, method, responseType, existing, 'no-store');
            break;
        default:
            response = encodeError(405, 'Method Not Allowed');
    }
    return response;
};

