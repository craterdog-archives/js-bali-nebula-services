/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;
var documents = require('bali-document-notation/BaliDocument');
var codex = require('bali-document-notation/utilities/EncodingUtilities');

var testDirectory = 'test/config/';
var notaryKey = require('bali-digital-notary/BaliNotary').notaryKey(testDirectory);
var repository = require('bali-cloud-api/LocalRepository').repository(testDirectory);
var cloud = require('bali-cloud-api/BaliAPI').cloud(notaryKey, repository);
var environment = require('../BaliEnvironment').environment(cloud);

describe('Bali Cloud Environment™', function() {

    describe('Test the analysis and compilation of an example type.', function() {

        it('should compile source documents into assembly instructions.', function() {
            var testFolder = 'test/examples/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + prefix + '.bali';
                var source = fs.readFileSync(baliFile, 'utf8');
                expect(source).to.exist;  // jshint ignore:line
                var type = documents.fromSource(source);
                var tag = codex.randomTag();
                var version = 'v1';
                var reference = cloud.getReference(tag, version);
                var typeCitation = cloud.commitDocument(reference, type);
                var expected = environment.compileType(typeCitation);
                expect(expected).to.exist;  // jshint ignore:line
                var compiled = cloud.retrieveType(typeCitation);
                expect(compiled.toSource()).to.equal(expected.toSource());
            }
        });

    });

});
