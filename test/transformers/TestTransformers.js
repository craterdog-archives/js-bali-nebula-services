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
var transformers = require('../../transformers/');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test the transformers.', function() {

        it('should transform a parse tree into a task context and back.', function() {
            var testFile = 'test/source/taskContext.bali';
            var expected = fs.readFileSync(testFile, 'utf8');
            expect(expected).to.exist;  // jshint ignore:line
            var tree = documents.parseDocument(expected);
            var context = transformers.TaskContextGenerator.generateTaskContext(tree);
            expect(context).to.exist;  // jshint ignore:line
            tree = transformers.ParseTreeGenerator.generateParseTree(context);
            expect(tree).to.exist;  // jshint ignore:line
            var actual = documents.formatParseTree(tree) + '\n';
            expect(actual).to.exist;  // jshint ignore:line
            expect(actual).to.equal(expected);
        });

    });

});
