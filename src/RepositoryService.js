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
const engine = require('./utilities/HTTPEngine').HTTPEngine(notary, repository, debug);
const style = 'https://bali-nebula.net/static/styles/BDN.css';


// PUBLIC FUNCTIONS

if (debug > 2) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');
exports.handler = async function(request) {
    var parameters;
    try {
        // extract the request parameters
        parameters = engine.decodeRequest(request);
        if (!parameters) {
            if (debug > 2) console.log('The service received a badly formed request.');
            return engine.encodeError(400, 'text/html', 'Bad Request');
        }

        // validate the request type
        if (!handleRequest[parameters.type]) {
            if (debug > 2) console.log('The service received an invalid request type: ' + parameters.type);
            return engine.encodeError(400, parameters.responseType, 'Bad Request');
        }

        // validate the request method
        if (!handleRequest[parameters.type][parameters.method]) {
            if (debug > 2) console.log('The service received an invalid request method: ' + parameters.method);
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }

        // validate any credentials that were passed with the request (there may not be any)
        if (!(await engine.validCredentials(parameters))) {
            if (debug > 2) console.log('Invalid credentials were passed with the request.');
            return engine.encodeError(401, parameters.responseType, 'Invalid Credentials');
        }

        // handle the request
        return handleRequest[parameters.type][parameters.method](parameters);

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

const handleRequest = {

    citations: {
        HEAD: async function(parameters) {
            const name = bali.component('/' + parameters.identifier);
            const existing = await repository.fetchCitation(name);
            return await engine.encodeResponse(parameters, existing);
        },

        GET: async function(parameters) {
            const name = bali.component('/' + parameters.identifier);
            const existing = await repository.fetchCitation(name);
            return await engine.encodeResponse(parameters, existing);
        },

        POST: async function(parameters) {
            const name = bali.component('/' + parameters.identifier);
            const citation = parameters.body;
            const existing = await repository.fetchCitation(name);
            const response = await engine.encodeResponse(parameters, existing);
            if (response.statusCode === 201) await repository.createCitation(name, citation);
            return response;
        },

        PUT: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        DELETE: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }
    },

    drafts: {
        HEAD: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            return await engine.encodeResponse(parameters, existing);
        },

        GET: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            return await engine.encodeResponse(parameters, existing);
        },

        POST: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        PUT: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const draft = parameters.body;
            const existing = await repository.fetchDraft(tag, version);
            const response = await engine.encodeResponse(parameters, existing);
            if (response.statusCode < 299) await repository.saveDraft(draft);
            return response;
        },

        DELETE: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDraft(tag, version);
            const response = await engine.encodeResponse(parameters, existing);
            if (response.statusCode === 200) await repository.deleteDraft(tag, version);
            return response;
        }
    },

    documents: {
        HEAD: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDocument(tag, version);
            return await engine.encodeResponse(parameters, existing);
        },

        GET: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const existing = await repository.fetchDocument(tag, version);
            return await engine.encodeResponse(parameters, existing);
        },

        POST: async function(parameters) {
            const tokens = parameters.identifier.split('/');
            const tag = bali.component('#' + tokens[0]);
            const version = bali.component(tokens[1]);
            const document = parameters.body;
            const existing = await repository.fetchDocument(tag, version);
            const response = await engine.encodeResponse(parameters, existing);
            if (response.statusCode === 201) {
                await repository.createDocument(document);
                await repository.deleteDraft(tag, version);
            }
            return response;
        },

        PUT: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        DELETE: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        }
    },

    queues: {
        HEAD: async function(parameters) {
            const queue = bali.component('#' + parameters.identifier);
            var exists = bali.probability(await repository.queueExists(queue));
            return await engine.encodeResponse(parameters, exists);
        },

        GET: async function(parameters) {
            const queue = bali.component('#' + parameters.identifier);
            const count = bali.number(await repository.messageCount(queue));
            return await engine.encodeResponse(parameters, count);
        },

        POST: async function(parameters) {
            return engine.encodeError(405, parameters.responseType, 'Method Not Allowed');
        },

        PUT: async function(parameters) {
            const queue = bali.component('#' + parameters.identifier);
            const exists = bali.probability(await repository.queueExists(queue));
            const message = parameters.body;
            const response = await engine.encodeResponse(parameters, exists);
            await repository.queueMessage(queue, message);
            return response;
        },

        DELETE: async function(parameters) {
            const queue = bali.component('#' + parameters.identifier);
            const message = await repository.dequeueMessage(queue);
            return await engine.encodeResponse(parameters, message);
        }
    }

};
