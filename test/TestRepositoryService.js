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


const extractId = function(citation) {
    var tag, version;
    tag = citation.getAttribute('$tag');
    version = citation.getAttribute('$version');
    const id = tag.getValue() + '/' + version;
    return id;
};

const generateCredentials = async function() {
    const decoder = bali.decoder(0, debug);
    var credentials = bali.document(await notary.generateCredentials());
    credentials = decoder.base32Encode(Buffer.from(credentials, 'utf8')).replace(/\s+/g, '');
    return credentials;
};

const generateDigest = function(citation) {
    const digest = bali.source(citation.getAttribute('$digest')).slice(1, -1).replace(/\s+/g, '');
    return digest;
};

const RepositoryClient = function(service, debug) {
    this.debug = debug || 0;  // default is off

    this.nameExists = async function(name) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'accept': 'application/bali'
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
                'nebula-credentials': await generateCredentials(),
                'accept': 'application/bali'
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
                'nebula-credentials': await generateCredentials(),
                'content-type': 'application/bali',
                'accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/names' + name,
            body: bali.document(citation)
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the named citation: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the named contract
    };


    this.documentExists = async function(citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/documents/' + extractId(citation),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.readDocument = async function(citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/documents/' + extractId(citation),
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
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'content-type': 'application/bali',
                'accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/documents/' + extractId(citation),
            body: bali.document(document)
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to save the document: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new document
    };

    this.deleteDocument = async function(citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/documents/' + extractId(citation),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);  // return the deleted document
        }
    };


    this.contractExists = async function(citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/contracts/' + extractId(citation),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.readContract = async function(citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/contracts/' + extractId(citation),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);
        }
    };

    this.writeContract = async function(contract) {
        const document = contract.getAttribute('$document');
        const citation = await notary.citeDocument(document);
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(citation),
                'content-type': 'application/bali',
                'accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/contracts/' + extractId(citation),
            body: bali.document(contract)
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to create the contract: ' + response.statusCode);
        const source = response.body.toString('utf8');
        return bali.component(source);  // return a citation to the new contract
    };

    this.messageAvailable = async function(bag) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'accept': 'application/bali'
            },
            httpMethod: 'HEAD',
            path: '/repository/messages/' + extractId(bag),
            body: undefined
        };
        const response = await service.handler(request);
        return response.statusCode === 200;
    };

    this.messageCount = async function(bag) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'accept': 'application/bali'
            },
            httpMethod: 'GET',
            path: '/repository/messages/' + extractId(bag),
            body: undefined
        };
        const response = await service.handler(request);
        return Number(response.body.toString('utf8'));
    };

    this.addMessage = async function(bag, message) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'content-type': 'application/bali',
                'accept': 'application/bali'
            },
            httpMethod: 'POST',
            path: '/repository/messages/' + extractId(bag),
            body: bali.document(message)
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to add the message: ' + response.statusCode);
    };

    this.removeMessage = async function(bag) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/messages/' + extractId(bag),
            body: undefined
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);  // return a message
        }
    };

    this.returnMessage = async function(bag, message) {
        const citation = await notary.citeDocument(message);
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'content-type': 'application/bali',
                'accept': 'application/bali'
            },
            httpMethod: 'PUT',
            path: '/repository/messages/' + extractId(bag) + '/' + extractId(citation),
            body: bali.document(message)
        };
        const response = await service.handler(request);
        if (response.statusCode > 299) throw Error('Unable to return the message: ' + response.statusCode);
    };

    this.deleteMessage = async function(bag, citation) {
        const request = {
            headers: {
                'nebula-credentials': await generateCredentials(),
                'nebula-digest': await generateDigest(bag),
                'accept': 'application/bali'
            },
            httpMethod: 'DELETE',
            path: '/repository/messages/' + extractId(bag) + '/' + extractId(citation),
            body: bali.document(citation)
        };
        const response = await service.handler(request);
        if (response.statusCode === 200) {
            const source = response.body.toString('utf8');
            return bali.component(source);  // return the deleted message
        }
    };

    return this;
};
RepositoryClient.prototype.constructor = RepositoryClient;


describe('Bali Nebula™ Storage Service', function() {

    const storage = new RepositoryClient(service, debug);

    const transaction = bali.instance('/bali/examples/Transaction/v1', {
        $timestamp: bali.moment(),
        $product: 'Snickers Bar',
        $quantity: 10,
        $price: '1.25($currency: $USD)',
        $tax: '1.07($currency: $USD)',
        $total: '13.57($currency: $USD)'
    });

    describe('Test Storage Service', function() {
        var citation;
        var certificate;

        it('should create a self-signed certificate', async function() {
            const publicKey = await notary.generateKey();
            certificate = await notary.notarizeDocument(publicKey);
            citation = await notary.activateKey(certificate);
            expect(bali.areEqual(citation, await storage.writeContract(certificate))).is.true;
        });

        it('should perform a named contract lifecycle', async function() {
            const tag = citation.getAttribute('$tag');
            const name = bali.component('/nebula/certificates/' + tag.getValue() + '/v1');

            // make sure the new name does not yet exist in the repository
            expect(await storage.nameExists(name)).is.false;
            expect(await storage.readName(name)).to.not.exist;

            // create a new name in the repository
            expect(bali.areEqual(citation, await storage.writeName(name, citation))).is.true;

            // make sure the new name exists in the repository
            expect(await storage.nameExists(name)).is.true;

            // fetch the named contract from the repository
            expect(bali.areEqual(citation, await storage.readName(name))).is.true;

            // attempt to create the same name in the repository
            await assert.rejects(async function() {
                await storage.writeName(name, citation);
            });
        });

        it('should perform a document lifecycle', async function() {
            const document = transaction;
            citation = await notary.citeDocument(document);

            // create a new document in the repository
            expect(bali.areEqual(citation, await storage.writeDocument(document))).is.true;

            // make sure the new document exists in the repository
            expect(await storage.documentExists(citation)).is.true;

            // make sure the same contract does not exist in the repository
            expect(await storage.contractExists(citation)).is.false;

            // fetch the new document from the repository
            expect(bali.areEqual(document, await storage.readDocument(citation))).is.true;

            // update the existing document in the repository
            expect(bali.areEqual(citation, await storage.writeDocument(document))).is.true;

            // make sure the updated document exists in the repository
            expect(await storage.documentExists(citation)).is.true;

            // delete the document from the repository
            expect(bali.areEqual(document, await storage.deleteDocument(citation))).is.true;

            // make sure the document no longer exists in the repository
            expect(await storage.documentExists(citation)).is.false;
            expect(await storage.readDocument(citation)).to.not.exist;

            // delete a non-existent document from the repository
            expect(await storage.deleteDocument(citation)).to.not.exist;
        });

        it('should perform a signed contract lifecycle', async function() {
            const document = transaction;
            citation = await notary.citeDocument(document);
            const contract = await notary.notarizeDocument(document);

            // make sure the new contract does not already exists in the repository
            expect(await storage.contractExists(citation)).is.false;
            expect(await storage.readContract(citation)).to.not.exist;

            // create a new contract in the repository
            expect(bali.areEqual(citation, await storage.writeContract(contract))).is.true;

            // make sure the same document does not exist in the repository
            expect(await storage.documentExists(citation)).is.false;
            expect(await storage.readDocument(citation)).to.not.exist;

            // make sure the new contract exists in the repository
            expect(await storage.contractExists(citation)).is.true;

            // fetch the new contract from the repository
            expect(bali.areEqual(contract, await storage.readContract(citation))).is.true;

            // make sure the new contract still exists in the repository
            expect(await storage.contractExists(citation)).is.true;

            // attempt to create the same contract in the repository
            await assert.rejects(async function() {
                await storage.writeContract(contract);
            });
        });

        it('should perform a message bag lifecycle', async function() {
            // create the bag
            const contract = await notary.notarizeDocument(bali.instance('/nebula/examples/Bag/v1', {
                $description: '"This is an example bag."'
            }), debug);
            const bag = await storage.writeContract(contract);

            // name the bag
            const name = bali.component('/nebula/examples/' + bag.getAttribute('$tag').toString().slice(1) + '/v1');
            expect(bali.areEqual(bag, await storage.writeName(name, bag))).is.true;

            // make sure the message bag is empty
            expect(await storage.messageAvailable(bag)).is.false;
            expect(await storage.removeMessage(bag)).to.not.exist;

            // add some messages to the bag
            const generateMessage = function(count) {
                const result = bali.instance('/nebula/examples/Message/v1', {
                    $description: '"This is an example message."',
                    $count: count
                }, debug);
                return result;
            };

            var message = generateMessage(1);
            await storage.addMessage(bag, message);
            expect(await storage.messageCount(bag)).to.equal(1);
            expect(await storage.messageAvailable(bag)).is.true;
            await assert.rejects(async function() {
                await storage.addMessage(bag, message);
            });

            message = generateMessage(2);
            await storage.addMessage(bag, message);
            expect(await storage.messageCount(bag)).to.equal(2);
            expect(await storage.messageAvailable(bag)).is.true;

            message = generateMessage(3);
            await storage.addMessage(bag, message);
            expect(await storage.messageCount(bag)).to.equal(3);
            expect(await storage.messageAvailable(bag)).is.true;

            // remove the messages from the bag
            message = await storage.removeMessage(bag);
            expect(message).to.exist;
            expect(await storage.messageCount(bag)).to.equal(2);
            await storage.returnMessage(bag, message);
            expect(await storage.messageCount(bag)).to.equal(3);

            message = await storage.removeMessage(bag);
            expect(message).to.exist;
            expect(await storage.messageCount(bag)).to.equal(2);
            var citation = await notary.citeDocument(message);
            expect(bali.areEqual(message, await storage.deleteMessage(bag, citation))).is.true;
            expect(await storage.messageCount(bag)).to.equal(2);
            expect(await storage.messageAvailable(bag)).is.true;

            message = await storage.removeMessage(bag);
            expect(message).to.exist;
            expect(await storage.messageCount(bag)).to.equal(1);
            citation = await notary.citeDocument(message);
            expect(bali.areEqual(message, await storage.deleteMessage(bag, citation))).is.true;
            expect(await storage.messageCount(bag)).to.equal(1);
            expect(await storage.messageAvailable(bag)).is.true;

            message = await storage.removeMessage(bag);
            expect(message).to.exist;
            expect(await storage.messageCount(bag)).to.equal(0);
            citation = await notary.citeDocument(message);
            expect(bali.areEqual(message, await storage.deleteMessage(bag, citation))).is.true;
            expect(await storage.messageCount(bag)).to.equal(0);
            expect(await storage.messageAvailable(bag)).is.false;

            // make sure the message bag is empty
            message = await storage.removeMessage(bag);
            expect(message).to.not.exist;
        });

        it('should reset the notary', async function() {
            await notary.forgetKey();
        });

    });

});
