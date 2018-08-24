/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var parser = require('bali-instruction-set/BaliInstructionSet');
var analyzer = require('../../assembler/ProcedureAnalyzer');
var assembler = require('../../assembler/ProcedureAssembler');
var utilities = require('../../utilities/BytecodeUtilities');
var fs = require('fs');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {

    describe('Test the assember and disassembler.', function() {

        it('should assemble procedures and disassemble bytecode', function() {
            var testFolder = 'test/source/';
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
                var symbols = analyzer.extractSymbols(procedure);
                var bytecode = assembler.assembleProcedure(procedure, symbols);
                expect(bytecode).to.exist;  // jshint ignore:line
                var formatted = utilities.bytecodeAsString(bytecode);
                expect(formatted).to.exist;  // jshint ignore:line
                fs.writeFileSync(codeFile, formatted, 'utf8');
                var expected = fs.readFileSync(codeFile, 'utf8');
                expect(expected).to.exist;  // jshint ignore:line
                expect(formatted).to.equal(expected);
                var disassembled = assembler.disassembleBytecode(bytecode, symbols);
                expect(disassembled).to.exist;  // jshint ignore:line
                expect(disassembled).to.equal(source);
            }
        });

    });

});
