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

const generateCredentials = async function() {
    const decoder = bali.decoder(0, debug);
    var credentials = (await notary.generateCredentials()).toString();
    credentials = decoder.base32Encode(Buffer.from(credentials, 'utf8')).replace(/\s+/g, '');
    return credentials;
};

const generateDigest = function(citation) {
    const digest = citation.getValue('$digest').toString().slice(1, -1).replace(/\s+/g, '');
    return digest;
};

const RepositoryClient = function(service, debug) {
    if (debug === null || debug === undefined) debug = 0;  // default is off

    this.nameExists = async function(name) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/names' + name,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.readName = async function(name) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/names' + name,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeName = async function(name, citation) {
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/names' + name,
            body: citation.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the named citation: ' + response.statusCode);
    };


    this.draftExists = async function(citation) {
        const identifier = extractId(citation);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/drafts/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.readDraft = async function(citation) {
        const identifier = extractId(citation);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/drafts/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDraft = async function(draft) {
        const citation = await notary.citeDocument(draft);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
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

    this.deleteDraft = async function(citation) {
        const identifier = extractId(citation);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/drafts/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };


    this.documentExists = async function(citation) {
        const identifier = extractId(citation);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/documents/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.readDocument = async function(citation) {
        const identifier = extractId(citation);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/documents/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeDocument = async function(document) {
        const citation = await notary.citeDocument(document);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(citation),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/documents/' + extractId(document),
            body: document.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the document: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.messageCount = async function(bag) {
        const identifier = extractId(bag);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(bag),
                'Accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/messages/' + identifier,
            body: undefined
        };
        const response = await service.handler(request);
        return Number(response.body.toString('utf8'));
    };

    this.addMessage = async function(bag, message) {
        const identifier = extractId(bag);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(bag),
                'Content-Type': 'application/bali',
                'Accept': 'application/bali'
            },
            httpMethod: 'POST',
            path: '/repository/messages/' + identifier,
            body: message.toBDN()
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to add the message: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new message
    };

    this.removeMessage = async function(bag) {
        const identifier = extractId(bag);
        const request = {
            headers: {
                'Nebula-Credentials': await generateCredentials(),
                'Nebula-Digest': await generateDigest(bag),
                'Accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/messages/' + identifier,
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

    const bag = bali.catalog({
        $description: 'This is a test bag.'
    }, {
        $type: '/bali/collections/Bag/v1',
        $tag: bali.tag(),
        $version: bali.version(),
        $permissions: '/bali/permissions/public/v1',
        $previous: bali.pattern.NONE
    });

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
        var citation;
        var certificate;

        it('should create a self-signed certificate', async function() {
            certificate = await notary.generateKey();
            certificate = await notary.notarizeDocument(certificate);
            citation = await notary.activateKey(certificate);
            expect(citation.isEqualTo(await repository.writeDocument(certificate))).is.true;
        });

        it('should perform a named document lifecycle', async function() {
            const tag = citation.getValue('$tag');
            const name = bali.component('/bali/certificates/' + tag.getValue() + '/v1');

            // make sure the new name does not yet exist in the repository
            expect(await repository.nameExists(name)).is.false;
            expect(await repository.readName(name)).to.not.exist;

            // create a new name in the repository
            await repository.writeName(name, citation);

            // make sure the new name exists in the repository
            expect(await repository.nameExists(name)).is.true;

            // fetch the named document from the repository
            expect(certificate.isEqualTo(await repository.readName(name))).is.true;
        });

        it('should perform a draft document lifecycle', async function() {
            const draft = await notary.notarizeDocument(transaction);
            citation = await notary.citeDocument(draft);

            // create a new draft in the repository
            expect(citation.isEqualTo(await repository.writeDraft(draft))).is.true;

            // make sure the new draft exists in the repository
            expect(await repository.draftExists(citation)).is.true;

            // make sure the same document does not exist in the repository
            expect(await repository.documentExists(citation)).is.false;

            // fetch the new draft from the repository
            expect(draft.isEqualTo(await repository.readDraft(citation))).is.true;

            // update the existing draft in the repository
            expect(citation.isEqualTo(await repository.writeDraft(draft))).is.true;

            // make sure the updated draft exists in the repository
            expect(await repository.draftExists(citation)).is.true;

            // delete the draft from the repository
            expect(draft.isEqualTo(await repository.deleteDraft(citation))).is.true;

            // make sure the draft no longer exists in the repository
            expect(await repository.draftExists(citation)).is.false;
            expect(await repository.readDraft(citation)).to.not.exist;

            // delete a non-existent draft from the repository
            expect(await repository.deleteDraft(citation)).to.not.exist;

        });

        it('should perform a committed document lifecycle', async function() {
            const document = await notary.notarizeDocument(transaction);
            citation = await notary.citeDocument(document);

            // make sure the new document does not already exists in the repository
            expect(await repository.documentExists(citation)).is.false;
            expect(await repository.readDocument(citation)).to.not.exist;

            // create a new document in the repository
            expect(citation.isEqualTo(await repository.writeDocument(document))).is.true;

            // make sure the same draft does not exist in the repository
            expect(await repository.draftExists(citation)).is.false;
            expect(await repository.readDraft(citation)).to.not.exist;

            // make sure the new document exists in the repository
            expect(await repository.documentExists(citation)).is.true;

            // fetch the new document from the repository
            expect(document.isEqualTo(await repository.readDocument(citation))).is.true;

            // make sure the new document still exists in the repository
            expect(await repository.documentExists(citation)).is.true;

            // attempt to create the same document in the repository
            await assert.rejects(async function() {
                await repository.writeDocument(document);
            });

        });

        it('should perform a message bag lifecycle', async function() {
            // create the bag
            var bag = await notary.notarizeDocument(bali.catalog({
                    $description: 'This is an example bag.'
                }, {
                    $type: '/bali/examples/Bag/v1',
                    $tag: bali.tag(),
                    $version: bali.version(),
                    $permissions: '/bali/permissions/public/v1',
                    $previous: bali.pattern.NONE
                })
            );
            bag = await repository.writeDocument(bag);

            // make sure the message bag is empty
            expect(await repository.messageCount(bag)).to.equal(0);
            expect(await repository.removeMessage(bag)).to.not.exist;

            // add some messages to the bag
            const generateMessage = async function(count) {
                const content = bali.catalog({
                    $count: count
                }, {
                    $type: '/bali/examples/Message/v1',
                    $tag: bali.tag(),
                    $version: bali.version(),
                    $permissions: '/bali/permissions/public/v1',
                    $previous: bali.pattern.NONE
                });
                return await notary.notarizeDocument(content);
            };

            var message = await generateMessage(1);
            citation = await notary.citeDocument(message);
            expect(citation.isEqualTo(await repository.addMessage(bag, message))).is.true;
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await generateMessage(2);
            citation = await notary.citeDocument(message);
            expect(citation.isEqualTo(await repository.addMessage(bag, message))).is.true;
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await generateMessage(3);
            citation = await notary.citeDocument(message);
            expect(citation.isEqualTo(await repository.addMessage(bag, message))).is.true;
            expect(await repository.messageCount(bag)).to.equal(3);

            // remove the messages from the bag
            message = await repository.removeMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(2);

            message = await repository.removeMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(1);

            message = await repository.removeMessage(bag);
            expect(await repository.messageCount(bag)).to.equal(0);

            // make sure the message bag is empty
            expect(await repository.removeMessage(bag)).to.not.exist;

        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
