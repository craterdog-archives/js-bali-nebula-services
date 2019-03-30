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

const debug = true;
const repository = require('../s3/S3Repository').repository(debug);
const bali = require('bali-component-framework');
const notary = require('bali-digital-notary').publicAPI(debug);

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';

if (debug) console.log('Loading the "Nebula Repository API" lambda function');
 
exports.handleRequest = async function(request, context) {
    if (debug) console.log('Executing the "Nebula Repository API" lambda function for ' + request.httpMethod + ': ' + request.path);

    // initialize the APIs as needed
    if (repository.initializeAPI) await repository.initializeAPI();
    if (notary.initializeAPI) await notary.initializeAPI();

    // validate the security credentials
/*
    try {
        const credentials = bali.parse(request.headers['Nebula-Credentials']);
        const citation = credentials.getValue('$document');
        const certificateId = citation.getValue('$tag').getValue() + citation.getValue('$version');
        const certificate = await repository.fetchCertificate(certificateId);
        const isValid = notary.documentIsValid(credentials, certificate);
        if (!isValid) throw Error('Invalid credentials were passed with the request.');
    } catch (exception) {
        return {
            statusCode: 403  // Forbidden
        };
    }
*/

    // extract the request parameters
    var method;
    var type;
    var identifier;
    var document;
    try {
        method = request.httpMethod.toUpperCase();
        const tokens = request.pathParameters.proxy.split('/');  // "<type>/<identifier>"
        type = tokens[0];
        identifier = tokens[1];
        if (request.body) document = bali.parse(request.body);
    } catch (exception) {
        if (debug) console.log('Received an invalid request: ' + exception);
        return {
            statusCode: 400  // Bad Request
        };
    }
    
    // execute the request
    try {
        switch (type) {
            case 'certificate':
                return await certificateRequest(method, identifier, document);
            case 'type':
                return await typeRequest(method, identifier, document);
            case 'draft':
                return await draftRequest(method, identifier, document);
            case 'document':
                return await documentRequest(method, identifier, document);
            case 'queue':
                return await queueRequest(method, identifier, document);
            default:
                if (debug) console.log('Received an invalid type: ' + type);
                return {
                    statusCode: 400  // Bad Request
                };
        }
    } catch (exception) {
        if (debug) console.log('An error occurred while processing the request: ' + exception);
        return {
            statusCode: 503  // Service Unavailable
        };
    }
};


const certificateRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.certificateExists(identifier)) {
                if (debug) console.log('The following certificate exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following certificate does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.certificateExists(identifier)) {
                if (debug) console.log('The following certificate already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createCertificate(identifier, document);
            if (debug) console.log('The following certificate was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchCertificate(identifier);
            if (document) {
                if (debug) console.log('Fetched the following certificate: ' + document);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document
                };
            }
            if (debug) console.log('The following certificate does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following certificate method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const typeRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.typeExists(identifier)) {
                if (debug) console.log('The following type exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following type does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.typeExists(identifier)) {
                if (debug) console.log('The following type already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createType(identifier, document);
            if (debug) console.log('The following type was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchType(identifier);
            if (document) {
                if (debug) console.log('Fetched the following type: ' + document);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document
                };
            }
            if (debug) console.log('The following type does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following type method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const draftRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.draftExists(identifier)) {
                if (debug) console.log('The following draft exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following draft does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case PUT:
            await repository.saveDraft(identifier, document);
            if (debug) console.log('The following draft was saved: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchDraft(identifier);
            if (document) {
                if (debug) console.log('Fetched the following draft: ' + document);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: document
                };
            }
            if (debug) console.log('The following draft does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case DELETE:
            if (await repository.draftExists(identifier)) {
                await repository.deleteDraft(identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following draft method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const documentRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.documentExists(identifier)) {
                if (debug) console.log('The following document exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following document does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.documentExists(identifier)) {
                if (debug) console.log('The following document already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createDocument(identifier, document);
            if (debug) console.log('The following document was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchDocument(identifier);
            if (document) {
                if (debug) console.log('Fetched the following document: ' + document);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: document
                };
            }
            if (debug) console.log('The following document does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following document method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const queueRequest = async function(method, identifier, document) {
    switch (method) {
        case PUT:
            await repository.queueMessage(identifier, document);
            if (debug) console.log('Queued up the following message: ' + document);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.dequeueMessage(identifier);
            if (document) {
                if (debug) console.log('Fetched the following message: ' + document);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': document.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: document
                };
            }
            if (debug) console.log('The following queue is empty: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following queue method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};

