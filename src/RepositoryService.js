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

const debug = 1;  // logging level in range [0..3]
const configuration = {
    uri: 'https://bali-nebula.net/repository/',
    citations: 'craterdog-bali-citations-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    types: 'craterdog-bali-types-us-west-2',
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
    var attributes;
    try {
        if (debug > 0) console.log('Request ' + request.httpMethod + ': ' + request.path);
        attributes = extractAttributes(request);
        if (!attributes) {
            return encodeResponse(400, 'Bad Request');
        }
        if (debug > 2) console.log('Request Attributes: ' + bali.catalog(attributes));

        if (await invalidCredentials(attributes)) {
            const response = encodeResponse(401, 'Not Authenticated');
            response.headers['WWW-Authenticate'] = 'Nebula-Credentials';
            return response;
        }

        if (await notAuthorized(attributes)) {
            return encodeResponse(403, 'Not Authorized');
        }

        return await handleRequest(attributes);

    } catch (cause) {
        if (debug > 0) {
            const exception = bali.exception({
                $module: '/bali/services/Repository',
                $procedure: '$handler',
                $exception: '$processingFailed',
                $attributes: attributes,
                $text: 'The processing of the HTTP request failed.'
            }, cause);
            console.log(exception.toString());
            console.log('Response: 503 (Service Unavailable)');
        }
        return encodeResponse(503, 'Service Unavailable');
    }
};


// PRIVATE FUNCTIONS

const extractAttributes = function(request) {
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
        const document = request.body ? bali.component(request.body) : undefined;
        const attributes = {
            responseType: responseType,
            credentials: credentials,
            method: method,
            type: type,
            identifier: identifier,
            document: document
        };
        if (debug > 2) console.log('The request attributes: ' + attributes);
        return attributes;
    } catch (cause) {
        if (debug > 2) console.log('The HTTP request was not valid: ' + request);
    }
};

    
const invalidCredentials = async function(attributes) {
    try {
        const credentials = attributes.credentials;
        if (credentials) {
            const citation = credentials.getValue('$certificate');
            const tag = citation.getValue('$tag');
            const version = citation.getValue('$version');
            var certificate = await repository.fetchDocument(tag, version);
            if (!certificate) {
                certificate = attributes.document;  // likely a self-signed certificate
            }
            if (certificate && await notary.validDocument(credentials, certificate)) {
                attributes.account = certificate.getValue('$account');
                return false;  // not invalid
            }
            return true;  // is invalid
        } else {
            if ([HEAD, GET].includes(attributes.method)) {
                var document;
                switch (attributes.type) {
                    case 'citations':
                        const citation = await repository.fetchCitation(name);
                        break;
                    case 'drafts':
                        document = await repository.fetchDraft(tag, version);
                        break;
                    case 'documents':
                        document = await repository.fetchDocument(tag, version);
                        break;
                    case 'types':
                        document = await repository.fetchType(tag, version);
                        break;
                }
                attributes.document = document;
            }
            return true;  // not valid
        }
    } catch (cause) {
        if (debug > 2) console.log('The credentials passed in the HTTP header are not valid: ' + credentials);
    }
};


const notAuthorized = async function(attributes) {
    // TODO: implement ACLs
    return false;
};

    
const handleRequest = async function(attributes) {
    const method = attributes.method;
    const type = attributes.type;
    const identifier = attributes.identifier;
    const responseType = attributes.responseType;
    const document = attributes.document;
    switch (type) {
        case 'citations':
            return await citationRequest(method, identifier, responseType, document);
        case 'drafts':
            return await draftRequest(method, identifier, responseType, document);
        case 'documents':
            return await documentRequest(method, identifier, responseType, document);
        case 'types':
            return await typeRequest(method, identifier, responseType, document);
        case 'queues':
            return await queueRequest(method, identifier, responseType, document);
        default:
            if (debug > 2) console.log('The HTTP request contained an invalid type: ' + type);
            return encodeResponse(400, 'Bad Request');
    }
};


const encodeResponse = function(statusCode, statusString, responseType, body, cacheControl) {
    cacheControl = cacheControl || 'no-store';
    if (debug > 0) console.log('Response ' + statusCode + ': ' + statusString);
    return {
        headers: {
            'Content-Type': responseType,
            'Content-Length': body ? body.length : 0,
            'Cache-Control': cacheControl,
            'Access-Control-Allow-Origin': 'bali-nebula.net'
        },
        statusCode: statusCode,
        body: body
    };
};


const citationRequest = async function(method, identifier, responseType, document) {
    const name = bali.component('/' + identifier);
    switch (method) {
        case HEAD:
            if (await repository.citationExists(name)) {
                if (debug > 2) console.log('The following citation exists: ' + name);
                return encodeResponse(200, 'Resource Exists');
            }
            if (debug > 2) console.log('The following citation does not exist: ' + name);
            return encodeResponse(404, 'Resource Not Found');
        case GET:
            document = await repository.fetchCitation(name);
            if (document) {
                if (debug > 2) console.log('Fetched the following citation: ' + document);
                var body;
                switch (responseType) {
                    case 'application/bali':
                        body = document.toBDN();
                        break;
                    default:
                        responseType = 'text/html';
                        body = document.toHTML(style);
                }
                return encodeResponse(200, 'Resource Retrieved', responseType, body, 'immutable');
            }
            if (debug > 2) console.log('The following citation does not exist: ' + name);
            return encodeResponse(404, 'Resource Not Found');
        case POST:
            if (await repository.citationExists(name)) {
                if (debug > 2) console.log('The following citation already exists: ' + name);
                return encodeResponse(409, 'Resource Conflict');
            }
            await repository.createCitation(name, document);
            if (debug > 2) console.log('The following citation was created: ' + name);
            return encodeResponse(201, 'Resource Created');
        default:
            if (debug > 2) console.log('The following citation method is not allowed: ' + method);
            return encodeResponse(405, 'Method Not Allowed');
    }
};


const draftRequest = async function(method, identifier, responseType, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.draftExists(tag, version)) {
                if (debug > 2) console.log('The following draft exists: ' + identifier);
                return encodeResponse(200, 'Resource Exists');
            }
            if (debug > 2) console.log('The following draft does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case GET:
            document = await repository.fetchDraft(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following draft: ' + document);
                var body;
                switch (responseType) {
                    case 'application/bali':
                        body = document.toBDN();
                        break;
                    default:
                        responseType = 'text/html';
                        body = document.toHTML(style);
                }
                return encodeResponse(200, 'Resource Retrieved', responseType, body, 'no-store');
            }
            if (debug > 2) console.log('The following draft does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case PUT:
            const updated = await repository.draftExists(tag, version);
            await repository.saveDraft(document);
            if (debug > 2) console.log('The following draft was saved: ' + identifier);
            if (updated) {
                return encodeResponse(204, 'Resource Updated');
            } else {
                return encodeResponse(201, 'Resource Created');
            }
        case DELETE:
            if (await repository.deleteDraft(tag, version)) {
                if (debug > 2) console.log('The following draft was deleted: ' + identifier);
                return encodeResponse(200, 'Resource Deleted');
            }
            if (debug > 2) console.log('The following draft did not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        default:
            if (debug > 2) console.log('The following draft method is not allowed: ' + method);
            return encodeResponse(405, 'Method Not Allowed');
    }
};


const documentRequest = async function(method, identifier, responseType, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.documentExists(tag, version)) {
                if (debug > 2) console.log('The following document exists: ' + identifier);
                return encodeResponse(200, 'Resource Exists');
            }
            if (debug > 2) console.log('The following document does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case GET:
            document = await repository.fetchDocument(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following document: ' + document);
                var body;
                switch (responseType) {
                    case 'application/bali':
                        body = document.toBDN();
                        break;
                    default:
                        responseType = 'text/html';
                        body = document.toHTML(style);
                }
                return encodeResponse(200, 'Resource Retrieved', responseType, body, 'immutable');
            }
            if (debug > 2) console.log('The following document does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case POST:
            if (await repository.documentExists(tag, version)) {
                if (debug > 2) console.log('The following document already exists: ' + identifier);
                return encodeResponse(409, 'Resource Conflict');
            }
            await repository.createDocument(document);
            if (debug > 2) console.log('The following document was created: ' + identifier);
            return encodeResponse(201, 'Resource Created');
        default:
            if (debug > 2) console.log('The following document method is not allowed: ' + method);
            return encodeResponse(405, 'Method Not Allowed');
    }
};


const typeRequest = async function(method, identifier, responseType, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.typeExists(tag, version)) {
                if (debug > 2) console.log('The following type exists: ' + identifier);
                return encodeResponse(200, 'Resource Exists');
            }
            if (debug > 2) console.log('The following type does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case GET:
            document = await repository.fetchType(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following type: ' + document);
                var body;
                switch (responseType) {
                    case 'application/bali':
                        body = document.toBDN();
                        break;
                    default:
                        responseType = 'text/html';
                        body = document.toHTML(style);
                }
                return encodeResponse(200, 'Resource Retrieved', responseType, body, 'immutable');
            }
            if (debug > 2) console.log('The following type does not exist: ' + identifier);
            return encodeResponse(404, 'Resource Not Found');
        case POST:
            if (await repository.typeExists(tag, version)) {
                if (debug > 2) console.log('The following type already exists: ' + identifier);
                return encodeResponse(409, 'Resource Conflict');
            }
            await repository.createType(document);
            if (debug > 2) console.log('The following type was created: ' + identifier);
            return encodeResponse(201, 'Resource Created');
        default:
            if (debug > 2) console.log('The following type method is not allowed: ' + method);
            return encodeResponse(405, 'Method Not Allowed');
    }
};


const queueRequest = async function(method, identifier, responseType, document) {
    const queue = bali.component('#' + identifier);
    switch (method) {
        case PUT:
            await repository.queueMessage(queue, document);
            if (debug > 2) console.log('Added the following message to the queue: ' + document);
            return encodeResponse(201, 'Resource Created');
        case DELETE:
            document = await repository.dequeueMessage(queue);
            if (document) {
                if (debug > 2) console.log('Fetched the following message from the queue: ' + document);
                var body;
                switch (responseType) {
                    case 'application/bali':
                        body = document.toBDN();
                        break;
                    default:
                        responseType = 'text/html';
                        body = document.toHTML(style);
                }
                return encodeResponse(200, 'Resource Deleted', responseType, body, 'no-store');
            }
            if (debug > 2) console.log('The following queue is empty: ' + identifier);
            return encodeResponse(204, 'No Content');
        default:
            if (debug > 2) console.log('The following queue method is not allowed: ' + method);
            return encodeResponse(405, 'Method Not Allowed');
    }
};

