/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 0;  // [0..3]
const directory = 'test/config/';
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');
const bali = require('bali-component-framework').api(debug);
const account = bali.tag();
const api = require('bali-digital-notary');
const securityModule = api.ssm(directory, debug);
const notary = api.notary(securityModule, account, directory, debug);
const service = require('../src/RepositoryService');

// the POSIX end of line character
const EOL = '\n';


const extractId = function(catalog) {
    var tag, version;
    const component = catalog.getValue('$content');
    if (component) {
        tag = component.getParameter('$tag');
        version = component.getParameter('$version');
    } else {
        tag = catalog.getValue('$tag');
        version = catalog.getValue('$version');
    }
    const id = tag.getValue() + '/' + version;
    return id;
};

const generateCredentials = async function() {
    const citation = await notary.getCitation();
    const document = citation.duplicate();
    document.setParameter('$type', '/bali/notary/Citation/v1');
    document.setParameter('$tag', bali.tag());
    document.setParameter('$version', bali.version());
    document.setParameter('$permissions', '/bali/permissions/private/v1');
    document.setParameter('$previous', bali.pattern.NONE);
    var credentials = await notary.notarizeDocument(document);
    credentials = encodeURI('"' + EOL + credentials + EOL + '"');
    return credentials;
};

const RepositoryClient = function(service, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off

    this.citationExists = async function(name) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'HEAD',
            path: '/repository/citations' + name,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchCitation = async function(name) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'GET',
            path: '/repository/citations' + name,
            body: undefined
        };
        const response = await service.handler(request);
        const citation = response.body;
        if (citation) return bali.component(citation);
    };

    this.createCitation = async function(name, citation) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'POST',
            path: '/repository/citations' + name,
            body: citation.toString()
        };
        const response = await service.handler(request);
        if (response.statusCode !== 201) throw Error('Unable to create the named citation: ' + response.statusCode);
    };


    this.draftExists = async function(draftId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'HEAD',
            path: '/repository/drafts/' + draftId,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchDraft = async function(draftId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'GET',
            path: '/repository/drafts/' + draftId,
            body: undefined
        };
        const response = await service.handler(request);
        const draft = response.body;
        if (draft) return bali.component(draft);
    };

    this.saveDraft = async function(draftId, draft) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'PUT',
            path: '/repository/drafts/' + draftId,
            body: draft.toString()
        };
        const response = await service.handler(request);
        if (response.statusCode !== 201) throw Error('Unable to save the draft: ' + response.statusCode);
    };

    this.deleteDraft = async function(draftId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'DELETE',
            path: '/repository/drafts/' + draftId,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode !== 200 && response.statusCode !== 404) throw Error('Unable to delete the draft: ' + response.statusCode);
    };


    this.documentExists = async function(documentId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'HEAD',
            path: '/repository/documents/' + documentId,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchDocument = async function(documentId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'GET',
            path: '/repository/documents/' + documentId,
            body: undefined
        };
        const response = await service.handler(request);
        const document = response.body;
        if (document) return bali.component(document);
    };

    this.createDocument = async function(documentId, document) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'POST',
            path: '/repository/documents/' + documentId,
            body: document.toString()
        };
        const response = await service.handler(request);
        if (response.statusCode !== 201) throw Error('Unable to create the document: ' + response.statusCode);
    };


    this.typeExists = async function(typeId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'HEAD',
            path: '/repository/types/' + typeId,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchType = async function(typeId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'GET',
            path: '/repository/types/' + typeId,
            body: undefined
        };
        const response = await service.handler(request);
        const type = response.body;
        if (type) return bali.component(type);
    };

    this.createType = async function(typeId, type) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'POST',
            path: '/repository/types/' + typeId,
            body: type.toString()
        };
        const response = await service.handler(request);
        if (response.statusCode !== 201) throw Error('Unable to create the type: ' + response.statusCode);
    };


    this.queueMessage = async function(queueId, message) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'PUT',
            path: '/repository/queues/' + queueId,
            body: message.toString()
        };
        const response = await service.handler(request);
        if (response.statusCode !== 201) throw Error('Unable to queue the message: ' + response.statusCode);
    };

    this.dequeueMessage = async function(queueId) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials()
            },
            httpMethod: 'GET',
            path: '/repository/queues/' + queueId,
            body: undefined
        };
        const response = await service.handler(request);
        const message = response.body;
        if (message) return bali.component(message);
    };

    return this;
};
RepositoryClient.prototype.constructor = RepositoryClient;


describe('Bali Nebula™ Repository Service', function() {

    const repository = new RepositoryClient(service, debug);

    const transaction = bali.catalog({
        $timestamp: bali.moment(),
        $product: 'Snickers Bar',
        $quantity: 10,
        $price: '1.25($currency: $USD)',
        $tax: '1.07($currency: $USD)',
        $total: '13.57($currency: $USD)'
    }, {
        $tag: bali.tag(),
        $version: bali.version(),
        $permissions: '/bali/permissions/public/v1',
        $previous: bali.pattern.NONE
    });

    const code = bali.catalog({
        $source: bali.catalog({
            $protocol: notary.getProtocols()[0],
            $timestamp: bali.moment(),
            $tag: bali.tag(),
            $version: bali.version(),
            $digest: bali.component("'Z41S87YHGGV3BW2WHW72NMN3XQ1G146B1J4QGZF3NBTY1AGVDXHF6KK7YBNB89BZL4GDY2F457LBC7P0BR0T9TNJW4MKYYLC0VV6FC8'")
        }, {
            $type: bali.component('/bali/notary/Citation/v1')
        }),
        $literals: [],
        $constants: {},
        $procedures: {}
    }, {
        $tag: bali.tag(),
        $version: bali.version(),
        $permissions: '/bali/permissions/public/v1',
        $previous: bali.pattern.NONE
    });

    describe('Test Repository Service', function() {
        var tag;
        var certificate;
        var citation;

        it('should create a self-signed certificate', async function() {
            certificate = await notary.generateKey();
            certificate = await notary.notarizeDocument(certificate);
            citation = await notary.activateKey(certificate);
            tag = citation.getValue('$tag');
            const certificateId = extractId(certificate);
            await repository.createDocument(certificateId, certificate);
        });

        it('should perform a citation name lifecycle', async function() {
            const name = '/bali/certificates/' + tag.getValue() + '/v1';

            // make sure the new name does not yet exist in the repository
            var exists = await repository.citationExists(name);
            expect(exists).is.false;

            // create a new name in the repository
            await repository.createCitation(name, citation);

            // make sure the new name exists in the repository
            exists = await repository.citationExists(name);
            expect(exists).is.true;

            // fetch the new citation from the repository
            const result = await repository.fetchCitation(name);
            expect(citation.isEqualTo(result)).is.true;
        });

        it('should perform a draft document lifecycle', async function() {
            const draft = await notary.notarizeDocument(transaction);
            const draftId = extractId(draft);

            // create a new draft in the repository
            await repository.saveDraft(draftId, draft);

            // make sure the new draft exists in the repository
            var exists = await repository.draftExists(draftId);
            expect(exists).is.true;

            // make sure the same document does not exist in the repository
            exists = await repository.documentExists(draftId);
            expect(exists).is.false;

            // fetch the new draft from the repository
            const result = await repository.fetchDraft(draftId);
            expect(draft.isEqualTo(result)).is.true;

            // delete the new draft from the repository
            await repository.deleteDraft(draftId);

            // make sure the new draft no longer exists in the repository
            exists = await repository.draftExists(draftId);
            expect(exists).is.false;

            // delete a non-existent draft from the repository
            await repository.deleteDraft(draftId);

        });

        it('should perform a committed document lifecycle', async function() {
            const document = await notary.notarizeDocument(transaction);
            const documentId = extractId(document);

            // create a new document in the repository
            await repository.createDocument(documentId, document);

            // make sure the same draft does not exist in the repository
            var exists = await repository.draftExists(documentId);
            expect(exists).is.false;

            // make sure the new document exists in the repository
            exists = await repository.documentExists(documentId);
            expect(exists).is.true;

            // fetch the new document from the repository
            const result = await repository.fetchDocument(documentId);
            expect(document.isEqualTo(result)).is.true;

            // make sure the new document still exists in the repository
            exists = await repository.documentExists(documentId);
            expect(exists).is.true;

            // attempt to create the same document in the repository
            await assert.rejects(async function() {
                await repository.createDocument(documentId, document);
            });

        });

        it('should perform a committed type lifecycle', async function() {
            const type = await notary.notarizeDocument(code);
            const typeId = extractId(type);

            // create a new type in the repository
            await repository.createType(typeId, type);

            // make sure the same draft does not exist in the repository
            var exists = await repository.draftExists(typeId);
            expect(exists).is.false;

            // make sure the new type exists in the repository
            exists = await repository.typeExists(typeId);
            expect(exists).is.true;

            // fetch the new type from the repository
            const result = await repository.fetchType(typeId);
            expect(type.isEqualTo(result)).is.true;

            // make sure the new type still exists in the repository
            exists = await repository.typeExists(typeId);
            expect(exists).is.true;

            // attempt to create the same type in the repository
            await assert.rejects(async function() {
                await repository.createType(typeId, type);
            });

        });

        it('should perform a message queue lifecycle', async function() {
            const queueId = bali.tag().getValue();


            // make sure the message queue is empty
            var none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;

            // queue up some messages
            var message = await notary.notarizeDocument(transaction);
            await repository.queueMessage(queueId, message);
            await repository.queueMessage(queueId, message);
            await repository.queueMessage(queueId, message);

            // dequeue the messages
            var result = await repository.dequeueMessage(queueId);
            expect(result).to.exist;
            expect(message.isEqualTo(result)).is.true;
            result = await repository.dequeueMessage(queueId);
            expect(result).to.exist;
            expect(message.isEqualTo(result)).is.true;
            result = await repository.dequeueMessage(queueId);
            expect(result).to.exist;
            expect(message.isEqualTo(result)).is.true;

            // make sure the message queue is empty
            none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;

        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
