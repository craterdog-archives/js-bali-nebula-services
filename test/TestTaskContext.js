/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var BaliDocument = require('bali-document-notation/BaliDocument');
var TaskContext = require('../bvm/TaskContext');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {

    describe('Test the task context transformations.', function() {

        it('should transform a parse tree into a task context and back.', function() {
            var testFile = 'test/compiler/taskContext.bali';
            var expected = fs.readFileSync(testFile, 'utf8');
            expect(expected).to.exist;  // jshint ignore:line
            var document = BaliDocument.fromSource(expected);
            var context = TaskContext.fromDocument(document);
            expect(context).to.exist;  // jshint ignore:line
            var actual = context.toString() + '\n';
            expect(actual).to.exist;  // jshint ignore:line
            expect(actual).to.equal(expected);
        });

    });

});
