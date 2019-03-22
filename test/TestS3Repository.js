/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

const debug = true;  // set to true for error logging
const mocha = require('mocha');
const assert = require('chai').assert;
const expect = require('chai').expect;
const repository = require('../src/s3/S3Repository').repository(debug);

const source =
    '[\n' +
    '    $date: <2018-04-01>\n' +
    '    $product: "Snickers Bar"\n' +
    '    $quantity: 10\n' +
    '    $price: 1.25(USD)\n' +
    '    $tax: 1.07(USD)\n' +
    '    $total: 13.57(USD)\n' +
    ']';

describe('Bali Nebula API™', function() {

    describe('Test Local Repository', function() {

        it('should initialize the API once and only once', async function() {
            await repository.initializeAPI();
            try {
                await repository.initializeAPI();
                assert.fail('The second attempt to initialize the API should have failed.');
            } catch(error) {
                // expected
            };
        });

        it('should perform a notary certificate lifecycle', async function() {
            const identifier = 'VRYA45CS3K1QL7AGY9TSAAHQK4Y2BJRXv3';

            // store a new certificate in the repository
            await repository.createCertificate(identifier, source);

            // make sure the new certificate exists in the repository
            exists = await repository.certificateExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // fetch the new certificate from the repository
            const certificate = await repository.fetchCertificate(identifier);
            expect(certificate).to.equal(source);

            // make sure the new certificate still exists in the repository
            exists = await repository.certificateExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // attempt to store the same certificate in the repository
            try {
                await repository.createCertificate(identifier, source);
                assert.fail('The attempt to store the same certificate should have failed.');
            } catch (error) {
                // expected
            };

        });

        it('should perform a component type lifecycle', async function() {
            const identifier = '8M5H4ZA99FB6XAK2BZ13JGL7TGZZ69N2v1';

            // store a new type in the repository
            await repository.createType(identifier, source);

            // make sure the new type exists in the repository
            exists = await repository.typeExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // fetch the new type from the repository
            const type = await repository.fetchType(identifier);
            expect(type).to.equal(source);

            // make sure the new type still exists in the repository
            exists = await repository.typeExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // attempt to store the same type in the repository
            try {
                await repository.createType(identifier, source);
                assert.fail('The attempt to store the same type should have failed.');
            } catch (error) {
                // expected
            };

        });

        it('should perform a draft document lifecycle', async function() {
            const identifier = 'BXC15F9H0V4AJVTHJHN1B6VA8PZP4S51v1.2.3';

            // store a new draft in the repository
            await repository.saveDraft(identifier, source);

            // make sure the new draft exists in the repository
            var exists = await repository.draftExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // make sure the same document does not exist in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.false;  // jshint ignore:line

            // fetch the new draft from the repository
            const draft = await repository.fetchDraft(identifier);
            expect(draft).to.equal(source);

            // delete the new draft from the repository
            await repository.deleteDraft(identifier);

            // make sure the new draft no longer exists in the repository
            exists = await repository.draftExists(identifier);
            expect(exists).is.false;  // jshint ignore:line

            // delete a non-existent draft from the repository
            await repository.deleteDraft(identifier);

        });

        it('should perform a committed document lifecycle', async function() {
            const identifier = '454J79TXY3799ZL8VNG2G4SBMVDFVPBVv3.4';

            // store a new document in the repository
            await repository.createDocument(identifier, source);

            // make sure the same draft does not exist in the repository
            var exists = await repository.draftExists(identifier);
            expect(exists).is.false;  // jshint ignore:line

            // make sure the new document exists in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // fetch the new document from the repository
            const document = await repository.fetchDocument(identifier);
            expect(document).to.equal(source);

            // make sure the new document still exists in the repository
            exists = await repository.documentExists(identifier);
            expect(exists).is.true;  // jshint ignore:line

            // attempt to store the same document in the repository
            try {
                await repository.createDocument(identifier, source);
                assert.fail('The attempt to store the same document should have failed.');
            } catch (error) {
                // expected
            };

        });

        it('should perform a message queue lifecycle', async function() {
            const queueId = 'TGKQJ6B4Y5KPCQGRXB1817MLN2WSV6FM';

            // make sure the message queue is empty
            var none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;  // jshint ignore:line

            // queue up some messages
            await repository.queueMessage(queueId, "$first");
            await repository.queueMessage(queueId, "$second");
            await repository.queueMessage(queueId, "$third");

            // dequeue the messages
            await repository.dequeueMessage(queueId);
            await repository.dequeueMessage(queueId);
            await repository.dequeueMessage(queueId);

            // make sure the message queue is empty
            none = await repository.dequeueMessage(queueId);
            expect(none).to.not.exist;  // jshint ignore:line

        });

    });

});
