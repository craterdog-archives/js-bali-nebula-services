/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = 1;  // [0..3]
const mocha = require('mocha');
const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');
const bali = require('bali-component-framework').api(debug);
const account = bali.tag();
const directory = 'test/config/';
const notary = require('bali-digital-notary').test(account, directory, debug);
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

const getPath = function(tag, version) {
    return tag.getValue() + (version ? '/' + version : '');
};

const generateCredentials = async function() {
    var credentials = await notary.generateCredentials();
    credentials = encodeURI('"' + EOL + credentials + EOL + '"');
    return credentials;
};

const RepositoryClient = function(service, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off

    this.citationExists = async function(name) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
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
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/citations' + name,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.createCitation = async function(name, citation) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'POST',
            path: '/repository/citations' + name,
            body: citation.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the named citation: ' + response.statusCode);
    };


    this.draftExists = async function(tag, version) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/drafts/' + getPath(tag, version),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchDraft = async function(tag, version) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/drafts/' + getPath(tag, version),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.saveDraft = async function(draft) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/drafts/' + extractId(draft),
            body: draft.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to save the draft: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.deleteDraft = async function(tag, version) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/drafts/' + getPath(tag, version),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };


    this.documentExists = async function(tag, version) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/documents/' + getPath(tag, version),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.fetchDocument = async function(tag, version) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/documents/' + getPath(tag, version),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.createDocument = async function(document) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'POST',
            path: '/repository/documents/' + extractId(document),
            body: document.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the document: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.queueExists = async function(queue) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/queues/' + getPath(queue),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.messageCount = async function(queue) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/queues/' + getPath(queue),
            body: undefined
        };
        const response = await service.handler(request);
        return Number(response.body.toString('utf8'));
    };

    this.queueMessage = async function(queue, message) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/queues/' + getPath(queue),
            body: message.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to queue the message: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new message
    };

    this.dequeueMessage = async function(queue) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/queues/' + getPath(queue),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
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
        $type: '/bali/examples/Transaction/v1',
        $tag: bali.tag(),
        $version: bali.version(),
        $permissions: '/bali/permissions/public/v1',
        $previous: bali.pattern.NONE
    });

    describe('Test Repository Service', function() {
        var tag;
        var version;
        var citation;
        var certificate;

        it('should create a self-signed certificate', async function() {
            certificate = await notary.generateKey();
            tag = certificate.getParameter('$tag');
            version = certificate.getParameter('$version');
            certificate = await notary.notarizeDocument(certificate);
            citation = await notary.activateKey(certificate);
            expect(citation.isEqualTo(await repository.createDocument(certificate))).is.true;
        });

        it('should perform a citation name lifecycle', async function() {
            const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

            // make sure the new name does not yet exist in the repository
            expect(await repository.citationExists(name)).is.false;
            expect(await repository.fetchCitation(name)).to.not.exist;

            // create a new name in the repository
            await repository.createCitation(name, citation);

            // make sure the new name exists in the repository
            expect(await repository.citationExists(name)).is.true;

            // fetch the new citation from the repository
            expect(citation.isEqualTo(await repository.fetchCitation(name))).is.true;
        });

        it('should perform a draft document lifecycle', async function() {
            tag = transaction.getParameter('$tag');
            version = transaction.getParameter('$version');
            const draft = await notary.notarizeDocument(transaction);
            citation = await notary.citeDocument(draft);

            // create a new draft in the repository
            expect(citation.isEqualTo(await repository.saveDraft(draft))).is.true;

            // make sure the new draft exists in the repository
            expect(await repository.draftExists(tag, version)).is.true;

            // make sure the same document does not exist in the repository
            expect(await repository.documentExists(tag, version)).is.false;

            // fetch the new draft from the repository
            expect(draft.isEqualTo(await repository.fetchDraft(tag, version))).is.true;

            // update the existing draft in the repository
            expect(citation.isEqualTo(await repository.saveDraft(draft))).is.true;

            // make sure the updated draft exists in the repository
            expect(await repository.draftExists(tag, version)).is.true;

            // delete the draft from the repository
            expect(draft.isEqualTo(await repository.deleteDraft(tag, version))).is.true;

            // make sure the draft no longer exists in the repository
            expect(await repository.draftExists(tag, version)).is.false;
            expect(await repository.fetchDraft(tag, version)).to.not.exist;

            // delete a non-existent draft from the repository
            expect(await repository.deleteDraft(tag, version)).to.not.exist;

        });

        it('should perform a committed document lifecycle', async function() {
            tag = transaction.getParameter('$tag');
            version = transaction.getParameter('$version');
            const document = await notary.notarizeDocument(transaction);
            citation = await notary.citeDocument(document);

            // make sure the new document does not already exists in the repository
            expect(await repository.documentExists(tag, version)).is.false;
            expect(await repository.fetchDocument(tag, version)).to.not.exist;

            // create a new document in the repository
            expect(citation.isEqualTo(await repository.createDocument(document))).is.true;

            // make sure the same draft does not exist in the repository
            expect(await repository.draftExists(tag, version)).is.false;
            expect(await repository.fetchDraft(tag, version)).to.not.exist;

            // make sure the new document exists in the repository
            expect(await repository.documentExists(tag, version)).is.true;

            // fetch the new document from the repository
            expect(document.isEqualTo(await repository.fetchDocument(tag, version))).is.true;

            // make sure the new document still exists in the repository
            expect(await repository.documentExists(tag, version)).is.true;

            // attempt to create the same document in the repository
            await assert.rejects(async function() {
                await repository.createDocument(document);
            });

        });

        it('should perform a message queue lifecycle', async function() {
            const queue = bali.tag();
            var message = await notary.notarizeDocument(transaction);
            citation = await notary.citeDocument(message);

            // make sure the queue does not exist
            expect(await repository.queueExists(queue)).is.false;

            // make sure the message queue is empty
            expect(await repository.messageCount(queue)).to.equal(0);
            expect(await repository.dequeueMessage(queue)).to.not.exist;

            // queue up some messages
            expect(citation.isEqualTo(await repository.queueMessage(queue, message))).is.true;
            expect(await repository.messageCount(queue)).to.equal(1);
            expect(citation.isEqualTo(await repository.queueMessage(queue, message))).is.true;
            expect(await repository.messageCount(queue)).to.equal(2);
            expect(citation.isEqualTo(await repository.queueMessage(queue, message))).is.true;
            expect(await repository.messageCount(queue)).to.equal(3);

            // make sure the queue does exist
            expect(await repository.queueExists(queue)).is.true;

            // dequeue the messages
            expect(message.isEqualTo(await repository.dequeueMessage(queue))).is.true;
            expect(await repository.messageCount(queue)).to.equal(2);
            expect(message.isEqualTo(await repository.dequeueMessage(queue))).is.true;
            expect(await repository.messageCount(queue)).to.equal(1);
            expect(message.isEqualTo(await repository.dequeueMessage(queue))).is.true;
            expect(await repository.messageCount(queue)).to.equal(0);

            // make sure the message queue is empty
            expect(await repository.dequeueMessage(queue)).to.not.exist;

            // make sure the queue does not exist
            expect(await repository.queueExists(queue)).is.false;

        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
