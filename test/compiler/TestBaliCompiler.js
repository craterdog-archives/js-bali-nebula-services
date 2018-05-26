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
var tools = require('../../BaliVM');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test compiler and assembler', function() {

        it('should compile and assemble source documents', function() {
            var testFolder = 'test/compiler/';
            var files = fs.readdirSync(testFolder);
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (!file.endsWith('.bali')) continue;
                //console.log('      ' + file);
                var context = {
                    addresses: {},
                    intrinsics: [],
                    procedures: [],
                    references: [],
                    variables: [],
                    literals: []
                };
                var prefix = file.split('.').slice(0, 1);
                var baliFile = testFolder + file;
                var basmFile = testFolder + prefix + '.basm';
                var codeFile = testFolder + prefix + '.code';
                var block = fs.readFileSync(baliFile, 'utf8');
                expect(block).to.exist;  // jshint ignore:line
                var tree = tools.parseBlock(block);
                expect(tree).to.exist;  // jshint ignore:line
                var procedure = tools.compileBlock(tree);
                expect(procedure).to.exist;  // jshint ignore:line
                //fs.writeFileSync(basmFile, procedure, 'utf8');
                var expected = fs.readFileSync(basmFile, 'utf8');
                expect(expected).to.exist;  // jshint ignore:line
                expect(procedure).to.equal(expected);
                tree = tools.parseProcedure(procedure);
                expect(tree).to.exist;  // jshint ignore:line
                var bytecode = tools.assembleProcedure(context, tree);
                expect(bytecode).to.exist;  // jshint ignore:line
                var formatted = tools.formatBytecode(bytecode);
                expect(formatted).to.exist;  // jshint ignore:line
                //fs.writeFileSync(codeFile, formatted, 'utf8');
                expected = fs.readFileSync(codeFile, 'utf8');
                expect(expected).to.exist;  // jshint ignore:line
                expect(formatted).to.equal(expected);
            }
        });

        it('should assemble and disassemble procedures', function() {
            var context = {
                addresses: {},
                intrinsics: [],
                procedures: [],
                references: [],
                variables: [],
                literals: []
            };
            var source = fs.readFileSync('test/compiler/procedure.basm', 'utf8');
            expect(source).to.exist;  // jshint ignore:line
            var procedure = tools.parseProcedure(source);
            expect(procedure).to.exist;  // jshint ignore:line
            var bytecode = tools.assembleProcedure(context, procedure);
            expect(bytecode).to.exist;  // jshint ignore:line
            var formatted = tools.formatBytecode(bytecode);
            expect(formatted).to.exist;  // jshint ignore:line
            expect(formatted).to.equal(EXPECTED_INSTRUCTIONS);
            //console.log('\nEXPECTED_INSTRUCTIONS:\n' + formatted);
            var disassembled = tools.disassembleBytecode(context, bytecode);
            expect(disassembled).to.exist;  // jshint ignore:line
            expect(disassembled).to.equal(source);
            //console.log('\nDISASSEMBLED:\n' + disassembled);
        });

    });

});

var EXPECTED_INSTRUCTIONS =
' Addr     Bytes   Bytecode                  Instruction\n' +
'----------------------------------------------------------------------\n' +
'[001]:    0000    00 [000]    SKIP INSTRUCTION\n' +
'[002]:    0006    00 [006]    JUMP TO [006]\n' +
'[003]:    080A    01 [00A]    JUMP TO [00A] ON NONE\n' +
'[004]:    100E    02 [00E]    JUMP TO [00E] ON TRUE\n' +
'[005]:    1812    03 [012]    JUMP TO [012] ON FALSE\n' +
'[006]:    2001    10     1    LOAD LITERAL 1\n' +
'[007]:    2801    11     1    LOAD DOCUMENT 1\n' +
'[008]:    3002    12     2    LOAD MESSAGE 2\n' +
'[009]:    3801    13     1    LOAD VARIABLE 1\n' +
'[00A]:    4001    20     1    STORE DRAFT 1\n' +
'[00B]:    4801    21     1    STORE DOCUMENT 1\n' +
'[00C]:    5002    22     2    STORE MESSAGE 2\n' +
'[00D]:    5801    23     1    STORE VARIABLE 1\n' +
'[00E]:    6001    30     1    INVOKE INTRINSIC 1\n' +
'[00F]:    6802    31     2    INVOKE INTRINSIC 2 WITH PARAMETER\n' +
'[010]:    7003    32     3    INVOKE INTRINSIC 3 WITH 2 PARAMETERS\n' +
'[011]:    7804    33     4    INVOKE INTRINSIC 4 WITH 3 PARAMETERS\n' +
'[012]:    8001    40     1    EXECUTE PROCEDURE 1\n' +
'[013]:    8802    41     2    EXECUTE PROCEDURE 2 WITH PARAMETERS\n' +
'[014]:    9003    42     3    EXECUTE PROCEDURE 3 ON TARGET\n' +
'[015]:    9804    43     4    EXECUTE PROCEDURE 4 ON TARGET WITH PARAMETERS\n';

