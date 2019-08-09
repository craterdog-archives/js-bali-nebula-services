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
const repository = require('../s3/S3Repository').repository();
const bali = require('bali-component-framework');
//const securityModule = require('bali-digital-notary').ssm(undefined, debug);
//const notary = require('bali-digital-notary').api(securityModule, undefined, undefined, debug);

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';

if (debug) console.log('Loading the "Nebula Repository API" lambda function');
 
exports.handleRequest = async function(request, context) {
    if (debug) console.log('Executing the "Nebula Repository API" lambda function for ' + request.httpMethod + ': ' + request.path);

    // validate the security credentials
/* Commented out until a new AccountAPI is created that pushes out the account certificate first.
    try {
        const header = request.headers['Nebula-Credentials'];
        const credentials = bali.parse(header);
        const citation = credentials.getValue('$component');
        const certificateId = citation.getValue('$tag').getValue() + citation.getValue('$version');
        const certificate = await repository.fetchCertificate(certificateId);
        const isValid = notary.documentIsValid(credentials, certificate);
        if (!isValid) throw Error('Invalid credentials were passed with the request.');
    } catch (cause) {
        if (debug) {
            const exception = bali.exception({
                $module: '/bali/services/RepositoryAPI',
                $procedure: '$handleRequest',
                $exception: '$invalidCredentials',
                $credentials: bali.text(header),
                $text: bali.text('The credentials passed in the HTTP header are not valid.')
            }, cause);
            console.error(exception.toString());
        }
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
    } catch (cause) {
        if (debug) {
            const exception = bali.exception({
                $module: '/bali/services/RepositoryAPI',
                $procedure: '$handleRequest',
                $exception: '$invalidRequest',
                $method: bali.text(method),
                $type: bali.text(type),
                $identifier: bali.text(identifier),
                $body: bali.text(request.body),
                $text: bali.text('The HTTP request was not valid.')
            }, cause);
            console.error(exception.toString());
        }
        return {
            statusCode: 400  // Bad Request
        };
    }
    
    // execute the request
    try {
        switch (type) {
            case 'citation':
                return await citationRequest(method, identifier, document);
            case 'draft':
                return await draftRequest(method, identifier, document);
            case 'document':
                return await documentRequest(method, identifier, document);
            case 'queue':
                return await queueRequest(method, identifier, document);
            default:
                if (debug) {
                    const exception = bali.exception({
                        $module: '/bali/services/RepositoryAPI',
                        $procedure: '$handleRequest',
                        $exception: '$processingFailed',
                        $method: bali.text(method),
                        $type: bali.text(type),
                        $text: bali.text('The HTTP request contained an invalid type.')
                    });
                    console.error(exception.toString());
                }
                return {
                    statusCode: 400  // Bad Request
                };
        }
    } catch (cause) {
        if (debug) {
            const exception = bali.exception({
                $module: '/bali/services/RepositoryAPI',
                $procedure: '$handleRequest',
                $exception: '$processingFailed',
                $method: bali.text(method),
                $type: bali.text(type),
                $identifier: bali.text(identifier),
                $body: bali.text(request.body),
                $text: bali.text('The processing of the HTTP request failed.')
            }, cause);
            console.error(exception.toString());
        }
        return {
            statusCode: 503  // Service Unavailable
        };
    }
};


const citationRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.citationExists(identifier)) {
                if (debug) console.log('The following citation exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following citation does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.citationExists(identifier)) {
                if (debug) console.log('The following citation already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createCertificate(identifier, document);
            if (debug) console.log('The following citation was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchCertificate(identifier);
            if (document) {
                if (debug) console.log('Fetched the following citation: ' + document);
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
            if (debug) console.log('The following citation does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following citation method is not allowed: ' + method);
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

