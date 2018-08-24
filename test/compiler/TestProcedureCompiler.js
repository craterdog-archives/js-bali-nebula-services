/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var documents = require('bali-document-notation/BaliDocuments');
var analyzer = require('../../compiler/TypeAnalyzer');
var compiler = require('../../compiler/ProcedureCompiler');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {

    describe('Test the compiler.', function() {

        it('should compile source documents into assembly instructions.', function() {
            var testFolder = 'test/source/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + prefix + '.bali';
                var basmFile = testFolder + prefix + '.basm';
                var source = fs.readFileSync(baliFile, 'utf8');
                expect(source).to.exist;  // jshint ignore:line
                var tree = documents.parseProcedure(source);
                expect(tree).to.exist;  // jshint ignore:line
                var type = {};
                var instructions = compiler.compileProcedure(tree, type);
                expect(instructions).to.exist;  // jshint ignore:line
                fs.writeFileSync(basmFile, instructions, 'utf8');
                var expected = fs.readFileSync(basmFile, 'utf8');
                expect(expected).to.exist;  // jshint ignore:line
                expect(instructions).to.equal(expected);
            }
        });

    });

});
