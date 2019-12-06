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
const repository = require('bali-document-repository').service(configuration, debug);

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';


// PUBLIC FUNCTIONS

if (debug > 2) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');
exports.handler = async function(request, context) {
    var account;
    var attributes;
    try {
        if (debug > 0) console.log('Request: ' + request.httpMethod + ' ' + request.path);
        attributes = extractAttributes(request);
        if (!attributes) {
            if (debug > 0) console.log('Response: 400 (Bad Request)');
            return {
                statusCode: 400  // Bad Request
            };
        }
        if (debug > 2) console.log('Request Attributes: ' + attributes);

        account = validateCredentials(attributes);
        if (!account) {
            if (debug > 0) console.log('Response: 401 (Not Authenticated)');
            return {
                statusCode: 401,  // Unauthorized (misnamed, should be Unauthenticated)
                headers: {
                    'WWW-Authenticate': 'Nebula-Credentials'
                }
            };
        }

        if (await notAuthorized(account, attributes)) {
            if (debug > 0) console.log('Response: 403 (Not Authorized)');
            return {
                statusCode: 403  // Forbidden
            };
        }

        return await handleRequest(attributes);

    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/services/Repository',
            $procedure: '$handler',
            $exception: '$processingFailed',
            $account: account,
            $attributes: attributes,
            $text: 'The processing of the HTTP request failed.'
        }, cause);
        if (debug > 2) console.error(exception.toString());
        if (debug > 0) console.error('Response: 503 (Service Unavailable)');
        return {
            statusCode: 503  // Service Unavailable
        };
    }
};


// PRIVATE FUNCTIONS

const extractAttributes = function(request) {
    try {
        var credentials = request.headers['Nebula-Credentials'];
        credentials = bali.component(decodeURI(credentials).slice(2, -2));  // strip off double quote delimiters
        const method = request.httpMethod.toUpperCase();
        var path = request.path.slice(1);  // remove the leading '/'
        path = path.slice(path.slice(0).indexOf('/') + 1);  // remove leading '/repository/'
        const type = path.slice(0, path.indexOf('/'));
        const identifier = path.slice(path.indexOf('/') + 1);
        const document = request.body ? bali.component(request.body) : undefined;
        return bali.catalog({
            $credentials: credentials,
            $method: method,
            $type: type,
            $identifier: identifier,
            $document: document
        });
    } catch (cause) {
        if (debug > 2) console.log('The HTTP request was not valid: ' + request);
    }
};

    
const validateCredentials = async function(attributes) {
    try {
        const credentials = attributes.getValue('$credentials');
        const citation = credentials.getValue('$content');
        const tag = citation.getValue('$tag');
        const version = citation.getValue('$version');
        const document = (await repository.fetchDocument(tag, version)) || bali.component(request.body);  // may be self-signed
        const certificate = document.getValue('$content');
        if (await notary.validDocument(credentials, certificate)) {
            const account = certificate.getValue('$account');
            return account;
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
    const method = attributes.getValue('$method').getValue();
    const type = attributes.getValue('$type').getValue();
    const identifier = attributes.getValue('$identifier').getValue();
    const document = attributes.getValue('$document');
    switch (type) {
        case 'citations':
            return await citationRequest(method, identifier, document);
        case 'drafts':
            return await draftRequest(method, identifier, document);
        case 'documents':
            return await documentRequest(method, identifier, document);
        case 'types':
            return await typeRequest(method, identifier, document);
        case 'queues':
            return await queueRequest(method, identifier, document);
        default:
            if (debug > 2) console.log('The HTTP request contained an invalid type: ' + type);
            if (debug > 0) console.log('Response: 400 (Bad Request)');
            return {
                statusCode: 400  // Bad Request
            };
    }
};


const citationRequest = async function(method, identifier, document) {
    const name = bali.component('/' + identifier);
    switch (method) {
        case HEAD:
            if (await repository.citationExists(name)) {
                if (debug > 2) console.log('The following citation exists: ' + name);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following citation does not exists: ' + name);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.citationExists(name)) {
                if (debug > 2) console.log('The following citation already exists: ' + name);
                if (debug > 0) console.log('Response: 409 (Conflict)');
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createCitation(name, document);
            if (debug > 2) console.log('The following citation was created: ' + name);
            if (debug > 0) console.log('Response: 201 (Resource Created)');
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchCitation(name);
            if (document) {
                if (debug > 2) console.log('Fetched the following citation: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document.toString()
                };
            }
            if (debug > 2) console.log('The following citation does not exists: ' + name);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following citation method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const draftRequest = async function(method, identifier, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.draftExists(tag, version)) {
                if (debug > 2) console.log('The following draft exists: ' + identifier);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following draft does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case PUT:
            const updated = await repository.draftExists(tag, version);
            await repository.saveDraft(tag, version, document);
            if (debug > 2) console.log('The following draft was saved: ' + identifier);
            if (updated) {
                if (debug > 0) console.log('Response: 204 (Resource Updated)');
                return {
                    statusCode: 204  // Updated
                };
            } else {
                if (debug > 0) console.log('Response: 201 (Resource Created)');
                return {
                    statusCode: 201  // Created
                };
            }
        case GET:
            document = await repository.fetchDraft(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following draft: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: document.toString()
                };
            }
            if (debug > 2) console.log('The following draft does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case DELETE:
            await repository.deleteDraft(tag, version);
            if (debug > 0) console.log('Response: 200 (Success)');
            return {
                statusCode: 200  // OK
            };
        default:
            if (debug > 2) console.log('The following draft method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const documentRequest = async function(method, identifier, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.documentExists(tag, version)) {
                if (debug > 2) console.log('The following document exists: ' + identifier);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following document does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.documentExists(tag, version)) {
                if (debug > 2) console.log('The following document already exists: ' + identifier);
                if (debug > 0) console.log('Response: 409 (Conflict)');
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createDocument(tag, version, document);
            if (debug > 2) console.log('The following document was created: ' + identifier);
            if (debug > 0) console.log('Response: 201 (Resource Created)');
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchDocument(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following document: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document.toString()
                };
            }
            if (debug > 2) console.log('The following document does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following document method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const typeRequest = async function(method, identifier, document) {
    const tokens = identifier.split('/');
    const tag = bali.component('#' + tokens[0]);
    const version = bali.component(tokens[1]);
    switch (method) {
        case HEAD:
            if (await repository.typeExists(tag, version)) {
                if (debug > 2) console.log('The following type exists: ' + identifier);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following type does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.typeExists(tag, version)) {
                if (debug > 2) console.log('The following type already exists: ' + identifier);
                if (debug > 0) console.log('Response: 409 (Conflict)');
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createType(tag, version, document);
            if (debug > 2) console.log('The following type was created: ' + identifier);
            if (debug > 0) console.log('Response: 201 (Resource Created)');
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchType(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following type: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document.toString()
                };
            }
            if (debug > 2) console.log('The following type does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following type method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const queueRequest = async function(method, identifier, document) {
    const queue = bali.component('#' + identifier);
    switch (method) {
        case PUT:
            await repository.queueMessage(queue, document);
            if (debug > 2) console.log('Added the following message to the queue: ' + document);
            if (debug > 0) console.log('Response: 201 (Resource Created)');
            return {
                statusCode: 201  // Created
            };
        case DELETE:
            document = await repository.dequeueMessage(queue);
            if (document) {
                if (debug > 2) console.log('Fetched the following message from the queue: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: document.toString()
                };
            }
            if (debug > 2) console.log('The following queue is empty: ' + identifier);
            if (debug > 0) console.log('Response: 204 (No Content)');
            return {
                statusCode: 204,  // No Content
                    headers: {
                        'Cache-Control': 'no-store'
                    }
            };
        default:
            if (debug > 2) console.log('The following queue method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};

