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

const debug = 3;  // logging level in range [0..3]
const configuration = {
    uri: 'https://bali-nebula.net/repository/',
    citations: 'craterdog-bali-citations-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    types: 'craterdog-bali-types-us-west-2',
    queues: 'craterdog-bali-queues-us-west-2'  // not used
};

const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework').api(debug);
const repository = require('bali-document-repository').service(configuration, debug);
const style = 'https://bali-nebula.net/web/style/BDN.css';

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const GET = 'GET';


// PUBLIC FUNCTIONS

if (debug > 2) console.log('Loading the "Bali Nebula™ HTML Service" lambda function');
exports.handler = async function(request, context) {
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

        return await handleRequest(attributes);

    } catch (cause) {
        const exception = bali.exception({
            $module: '/bali/services/HTML',
            $procedure: '$handler',
            $exception: '$processingFailed',
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
        const method = request.httpMethod.toUpperCase();
        var path = request.path.slice(1);  // remove the leading '/'
        path = path.slice(path.slice(0).indexOf('/') + 1);  // remove leading '/web/'
        const type = path.slice(0, path.indexOf('/'));
        const identifier = path.slice(path.indexOf('/') + 1);
        return bali.catalog({
            $method: method,
            $type: type,
            $identifier: identifier
        });
    } catch (cause) {
        if (debug > 2) console.log('The HTTP request was not valid: ' + request);
    }
};

    
const handleRequest = async function(attributes) {
    const method = attributes.getValue('$method').getValue();
    const type = attributes.getValue('$type').getValue();
    const identifier = attributes.getValue('$identifier').getValue();
    switch (type) {
        case 'citations':
            return await citationRequest(method, identifier);
        case 'drafts':
            return await draftRequest(method, identifier);
        case 'documents':
            return await documentRequest(method, identifier);
        case 'types':
            return await typeRequest(method, identifier);
        case 'images':
            return await imageRequest(method, identifier);
        case 'style':
            return await styleRequest(method, identifier);
        default:
            if (debug > 2) console.log('The HTTP request contained an invalid type: ' + type);
            if (debug > 0) console.log('Response: 400 (Bad Request)');
            return {
                statusCode: 400  // Bad Request
            };
    }
};


const citationRequest = async function(method, identifier) {
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
        case GET:
            document = await repository.fetchCitation(name);
            if (document) {
                if (debug > 2) console.log('Fetched the following citation: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document.toHTML(style);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: body
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


const draftRequest = async function(method, identifier) {
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
        case GET:
            document = await repository.fetchDraft(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following draft: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document.toHTML(style);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: body
                };
            }
            if (debug > 2) console.log('The following draft does not exists: ' + identifier);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following draft method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const documentRequest = async function(method, identifier) {
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
        case GET:
            document = await repository.fetchDocument(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following document: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document.toHTML(style);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: body
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


const typeRequest = async function(method, identifier) {
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
        case GET:
            document = await repository.fetchType(tag, version);
            if (document) {
                if (debug > 2) console.log('Fetched the following type: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document.toHTML(style);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'immutable'
                    },
                    body: body
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


const imageRequest = async function(method, resource) {
    const bucket = 'craterdog-bali-web-us-west-2';
    resource = 'images/' + resource;
    switch (method) {
        case HEAD:
            if (await doesExist(bucket, resource)) {
                if (debug > 2) console.log('The following resource exists: ' + resource);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following resource does not exists: ' + resource);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case GET:
            const document = await getObject(bucket, resource);
            if (document) {
                if (debug > 2) console.log('Fetched the following resource: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document;
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'image/png',
                        'Cache-Control': 'immutable'
                    },
                    body: body
                };
            }
            if (debug > 2) console.log('The following resource does not exists: ' + resource);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following resource method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const styleRequest = async function(method, resource) {
    const bucket = 'craterdog-bali-web-us-west-2';
    resource = 'style/' + resource;
    switch (method) {
        case HEAD:
            if (await doesExist(bucket, resource)) {
                if (debug > 2) console.log('The following resource exists: ' + resource);
                if (debug > 0) console.log('Response: 200 (Success)');
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug > 2) console.log('The following resource does not exists: ' + resource);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        case GET:
            const document = await getObject(bucket, resource);
            if (document) {
                if (debug > 2) console.log('Fetched the following resource: ' + document);
                if (debug > 0) console.log('Response: 200 (Success)');
                const body = document;
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': body.length,
                        'Content-Type': 'text/css',
                        'Cache-Control': 'immutable'
                    },
                    body: body
                };
            }
            if (debug > 2) console.log('The following resource does not exists: ' + resource);
            if (debug > 0) console.log('Response: 404 (Not Found)');
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug > 2) console.log('The following resource method is not allowed: ' + method);
            if (debug > 0) console.log('Response: 405 (Method Not Allowed)');
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const doesExist = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(undefined);
                } else {
                    resolve(data.Body.toString());
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
