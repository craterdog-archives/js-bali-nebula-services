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
const ledger = require('../s3/S3Ledger').ledger();
const bali = require('bali-component-framework');
const securityModule = require('bali-digital-notary').ssm(undefined, debug);
const notary = require('bali-digital-notary').api(securityModule, undefined, undefined, debug);

// SUPPORTED HTTP METHODS
const HEAD = 'HEAD';
const POST = 'POST';
const GET = 'GET';
const PUT = 'PUT';
const DELETE = 'DELETE';

if (debug) console.log('Loading the "Nebula Ledger Service" lambda function');
 
exports.handleRequest = async function(request, context) {
    if (debug) console.log('Executing the "Nebula Ledger Service" lambda function for ' + request.httpMethod + ': ' + request.path);

    // validate the security credentials
    try {
        const header = request.headers['Nebula-Credentials'];
        const credentials = bali.parse(header);
        const citation = credentials.getValue('$component');
        const certificateId = citation.getValue('$tag').getValue() + citation.getValue('$version');
        const source = await repository.fetchDocument(certificateId);
        const certificate = bali.parse(source);
        const isValid = notary.documentIsValid(credentials, certificate);
        if (!isValid) throw Error('Invalid credentials were passed with the request.');
    } catch (cause) {
        if (debug) {
            const exception = bali.exception({
                $module: '/bali/services/Ledger',
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
        if (request.body) {
            document = bali.parse(request.body);
        } else if (request.queryStringParameters) {
            document = bali.catalog(request.queryStringParameters);
        }
    } catch (cause) {
        if (debug) {
            const exception = bali.exception({
                $module: '/bali/services/Ledger',
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
            case 'account':
                return await accountRequest(method, identifier, document);
            case 'transaction':
                return await transactionRequest(method, identifier, document);
            case 'ledger':
                return await ledgerRequest(method, identifier, document);
            default:
                if (debug) {
                    const exception = bali.exception({
                        $module: '/bali/services/Ledger',
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
                $module: '/bali/services/Ledger',
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


const accountRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await ledger.accountExists(identifier)) {
                if (debug) console.log('The following account exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following account does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await ledger.accountExists(identifier)) {
                if (debug) console.log('The following account already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await ledger.createAccount(identifier, document);
            if (debug) console.log('The following account was created: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await ledger.fetchBalance(identifier);
            if (document) {
                if (debug) console.log('Fetched the following account balance: ' + document);
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
            if (debug) console.log('The following account does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following account method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const transactionRequest = async function(method, identifier, document) {
    switch (method) {
        case HEAD:
            if (await ledger.transactionExists(identifier)) {
                if (debug) console.log('The following transaction exists: ' + identifier);
                return {
                    statusCode: 200  // OK
                };
            }
            if (debug) console.log('The following transaction does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        case POST:
            if (await ledger.transactionExists(identifier)) {
                if (debug) console.log('The following transaction already exists: ' + identifier);
                return {
                    statusCode: 409  // Conflict
                };
            }
            await ledger.executeTransaction(identifier, document);
            if (debug) console.log('The following transaction was executed: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            document = await ledger.fetchTransaction(identifier);
            if (document) {
                if (debug) console.log('Fetched the following transaction: ' + document);
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
            if (debug) console.log('The following transaction does not exists: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following transaction method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};


const ledgerRequest = async function(method, identifier, document) {
    switch (method) {
        case PUT:
            await ledger.postTransaction(identifier, document);
            if (debug) console.log('The following transaction was posted: ' + identifier);
            return {
                statusCode: 201  // Created
            };
        case GET:
            const transactions = await ledger.fetchTransactions(identifier, document);
            if (transactions) {
                if (debug) console.log('Fetched the following transactions: ' + transactions);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Length': transactions.length,
                        'Content-Type': 'application/bali',
                        'Cache-Control': 'no-store'
                    },
                    body: transactions
                };
            }
            if (debug) console.log('The following ledger does not contain any transactions: ' + identifier);
            return {
                statusCode: 404  // Not Found
            };
        default:
            if (debug) console.log('The following ledger method is not allowed: ' + method);
            return {
                statusCode: 405  // Method Not Allowed
            };
    }
};
