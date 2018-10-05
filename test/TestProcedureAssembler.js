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
var parser = require('bali-instruction-set/transformers/ProcedureParser');
var assembler = require('../compiler/ProcedureAssembler');
var utilities = require('../utilities/BytecodeUtilities');


describe('Bali Cloud Environment™', function() {

    describe('Test the assember.', function() {

        it('should assemble procedures', function() {
            var testFolder = 'test/compiler/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.basm')) continue;
                console.log('      ' + file);
                var prefix = file.split('.').slice(0, 1);
                var basmFile = testFolder + prefix + '.basm';
                var codeFile = testFolder + prefix + '.code';
                var source = fs.readFileSync(basmFile, 'utf8');
                expect(source).to.exist;  // jshint ignore:line
                var procedure = parser.parseProcedure(source);
                expect(procedure).to.exist;  // jshint ignore:line
                var context = {
                    literals: [],
                    names: []
                };
                assembler.analyzeProcedure(procedure, context);
                var bytecode = assembler.assembleProcedure(procedure, context);
                expect(bytecode).to.exist;  // jshint ignore:line
                var formatted = utilities.bytecodeToString(bytecode);
                expect(formatted).to.exist;  // jshint ignore:line
                //fs.writeFileSync(codeFile, formatted, 'utf8');
                var expected = fs.readFileSync(codeFile, 'utf8');
                expect(expected).to.exist;  // jshint ignore:line
                expect(formatted).to.equal(expected);
            }
        });

    });

});
