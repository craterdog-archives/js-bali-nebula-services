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
    url: 'https://bali-nebula.net/repository/',
    citationBucket: 'craterdog-bali-citations-us-west-2',
    draftBucket: 'craterdog-bali-drafts-us-west-2',
    documentBucket: 'craterdog-bali-documents-us-west-2',
    typeBucket: 'craterdog-bali-types-us-west-2',
    queueBucket: 'craterdog-bali-queues-us-west-2'
};

const directory = undefined;
const bali = require('bali-component-framework').api(debug);
const account = bali.tag('K8JD027YN87VA98FGZR5S4RZDFSFA3NX');  // repository service account
const securityModule = require('bali-digital-notary').ssm(directory, debug);
const notary = require('bali-digital-notary').notary(securityModule, account, directory, debug);
const repository = require('bali-document-repository').s3(configuration, debug);

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
        account = validateCredentials(request);
        if (!account) {
            return {
                statusCode: 401,  // Unauthorized (misnamed, should be Unauthenticated)
                headers: {
                    'WWW-Authenticate': 'Nebula-Credentials'
                }
            };
        }

        attributes = extractAttributes(request);
        if (!attributes) {
            return {
                statusCode: 400  // Bad Request
            };
        }
        if (debug > 2) console.log('Executing the "Bali Nebula™ Repository Service" lambda function for ' + request.httpMethod + ': ' + request.path);

        if (await notAuthorized(account, attributes)) {
            return {
                statusCode: 403  // Forbidden
            };
        }

        return await handleRequest(attributes);

    } catch (cause) {
        if (debug > 0) {
            const exception = bali.exception({
                $module: '/bali/services/Repository',
                $procedure: '$handler',
                $exception: '$processingFailed',
                $account: account,
                $method: attributes.method,
                $type: attributes.type,
                $identifier: attributes.identifier,
                $body: bali.text(request.body),
                $text: 'The processing of the HTTP request failed.'
            }, cause);
            console.error(exception.toString());
        }
        return {
            statusCode: 503  // Service Unavailable
        };
    }
};


// PRIVATE FUNCTIONS

const validateCredentials = async function(request) {
    var account;
    try {
        var credentials = request.headers['Nebula-Credentials'];
        credentials = bali.component(decodeURI(credentials).slice(2, -2));  // strip off double quote delimiters
        const citation = credentials.getValue('$content');
        const certificateId = citation.getValue('$tag').getValue() + '/' + citation.getValue('$version');
        const document = (await repository.fetchDocument(certificateId)) || bali.component(request.body);  // may be self-signed
        const certificate = document.getValue('$content');
        if (await notary.validDocument(credentials, certificate)) {
            account = certificate.getValue('$account');
        }
    } catch (cause) {
        if (debug > 2) console.log('The credentials passed in the HTTP header are not valid: ' + credentials);
        return account;  // the credentials are invalid
    }
};


const extractAttributes = function(request) {
    try {
        const method = request.httpMethod.toUpperCase();
        var path = request.path.slice(1);  // remove the leading '/'
        path = path.slice(path.slice(0).indexOf('/') + 1);  // remove leading '/repository/'
        const type = path.slice(0, path.indexOf('/'));
        const identifier = path.slice(path.indexOf('/') + 1);
        const document = request.body ? bali.component(request.body) : undefined;
        return {
            method: method,
            type: type,
            identifier: identifier,
            document: document
        };
    } catch (cause) {
        if (debug > 2) console.log('The HTTP request was not valid: ' + request);
        return {
            statusCode: 400  // Bad Request
        };
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
    const document = attributes.document;
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
            return {
                statusCode: 400  // Bad Request
            };
    }
};


const citationRequest = async function(method, identifier, document) {
    identifier = '/' + identifier;  // names must begin with a slash
    switch (method) {
        case HEAD:
            if (await repository.citationExists(identifier)) {
                if (debug > 2) console.log('The following citation exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following citation does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.citationExists(identifier)) {
                if (debug > 2) console.log('The following citation already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createCitation(identifier, document);
            if (debug > 2) console.log('The following citation was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchCitation(identifier);
            if (document) {
                if (debug > 2) console.log('Fetched the following citation: ' + document);
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
            if (debug > 2) console.log('The following citation does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following citation method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const draftRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.draftExists(identifier)) {
                if (debug > 2) console.log('The following draft exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following draft does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case PUT:
            const updated = await repository.draftExists(identifier);
            await repository.saveDraft(identifier, document);
            if (debug > 2) console.log('The following draft was saved: ' + identifier);
            return {
                statusCode: updated ? 204 : 201  // Updated or Created
            };
        case GET:
            document = await repository.fetchDraft(identifier);
            if (document) {
                if (debug > 2) console.log('Fetched the following draft: ' + document);
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
            if (debug > 2) console.log('The following draft method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const documentRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.documentExists(identifier)) {
                if (debug > 2) console.log('The following document exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following document does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.documentExists(identifier)) {
                if (debug > 2) console.log('The following document already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createDocument(identifier, document);
            if (debug > 2) console.log('The following document was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchDocument(identifier);
            if (document) {
                if (debug > 2) console.log('Fetched the following document: ' + document);
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
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following document method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const typeRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await repository.typeExists(identifier)) {
                if (debug > 2) console.log('The following type exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following type does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await repository.typeExists(identifier)) {
                if (debug > 2) console.log('The following type already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await repository.createType(identifier, document);
            if (debug > 2) console.log('The following type was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.fetchType(identifier);
            if (document) {
                if (debug > 2) console.log('Fetched the following type: ' + document);
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
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following type method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const queueRequest = async function(method, identifier, document) {
    switch (method) {
        case PUT:
            await repository.queueMessage(identifier, document);
            if (debug > 2) console.log('Queued up the following message: ' + document);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await repository.dequeueMessage(identifier);
            if (document) {
                if (debug > 2) console.log('Fetched the following message: ' + document);
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
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following queue method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};

