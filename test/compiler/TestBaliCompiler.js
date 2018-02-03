/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

var fs = require('fs');
var tools = require('../../BaliVM');
var testCase = require('nodeunit').testCase;

var source = [
    'test/compiler/main',
    'test/compiler/mainWithFinal',
    'test/compiler/mainWithExceptions',
    'test/compiler/mainWithExceptionsAndFinal',
    'test/compiler/evaluateExpression',
    'test/compiler/evaluateExpressionWithResult',
    'test/compiler/lifecycle',
    'test/compiler/ifThen',
    'test/compiler/ifThenElse',
    'test/compiler/ifThenElseIf',
    'test/compiler/ifThenElseIfElse',
    'test/compiler/selectOption',
    'test/compiler/selectOptionElse',
    'test/compiler/whileLoop',
    'test/compiler/whileLoopWithLabel',
    'test/compiler/withLoop',
    'test/compiler/withLoopWithLabel',
    'test/compiler/withEachLoop',
    'test/compiler/withEachLoopWithLabel',
    'test/compiler/queueMessage',
    'test/compiler/waitForMessage',
    'test/compiler/publishEvent',
    'test/compiler/comprehensive'
];

module.exports = testCase({
    'Test Compiler': function(test) {
        test.expect(4 * source.length);
        for (var i = 0; i < source.length; i++) {
            var context = {
                addresses: {},
                intrinsics: [],
                procedures: [],
                references: [],
                variables: [],
                literals: []
            };
            var baliFile = source[i] + '.bali';
            var basmFile = source[i] + '.basm';
            var codeFile = source[i] + '.code';
            var block = fs.readFileSync(baliFile, 'utf8');
            var tree = tools.parseBlock(block);
            test.notEqual(tree, null, 'The language parser returned a null tree.');
            var procedure = tools.compileBlock(tree);
            fs.writeFileSync(basmFile, procedure, 'utf8');
            var expected = fs.readFileSync(basmFile, 'utf8');
            test.strictEqual(procedure, expected, 'The compiled procedure does not match the expected output.');
            tree = tools.parseProcedure(procedure);
            test.notEqual(tree, null, 'The procedure parser returned a null tree.');
            var bytecode = tools.assembleProcedure(context, tree);
            var formatted = tools.formatBytecode(bytecode);
            fs.writeFileSync(codeFile, formatted, 'utf8');
            expected = fs.readFileSync(codeFile, 'utf8');
            test.strictEqual(formatted, expected, 'The formatted bytecode does not match the expected output.');
        }
        test.done();
    },

    'Test Assembler and Disassembler': function(test) {
        var context = {
            addresses: {},
            intrinsics: [],
            procedures: [],
            references: [],
            variables: [],
            literals: []
        };
        test.expect(3);
        var source = fs.readFileSync('test/compiler/procedure.basm', 'utf8');
        var procedure = tools.parseProcedure(source);
        test.notEqual(procedure, null, 'The parser returned a null list.');
        var bytecode = tools.assembleProcedure(context, procedure);
        var formatted = tools.formatBytecode(bytecode);
        test.strictEqual(formatted, EXPECTED_INSTRUCTIONS, 'The formatter returned different procedure.');
        //console.log('\nEXPECTED_INSTRUCTIONS:\n' + formatted);
        var disassembled = tools.disassembleBytecode(context, bytecode);
        test.strictEqual(disassembled, source, 'The disassembler returned different source.');
        //console.log('\nDISASSEMBLED:\n' + disassembled);
        test.done();
    }

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
