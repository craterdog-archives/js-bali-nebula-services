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
var tools = require('../../src/BaliCloud');
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Compiler': function(test) {
        var source = [
            'test/compiler/main',
            'test/compiler/mainWithFinal',
            'test/compiler/mainWithExceptions',
            'test/compiler/mainWithExceptionsAndFinal',
            'test/compiler/evaluateExpression',
            'test/compiler/evaluateExpressionWithResult',
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
        test.expect(source.length);
        for (var i = 0; i < source.length; i++) {
            var baliFile = source[i] + '.bali';
            var basmFile = source[i] + '.basm';
            var block = fs.readFileSync(baliFile, 'utf8');
            var tree = tools.parseBlock(block);
            test.notEqual(tree, null, 'The parser returned a null tree.');
            var asmcode = tools.compileBlock(tree);
            fs.writeFileSync(basmFile, asmcode, 'utf8');
            console.log('\n' + basmFile + ':\n' + asmcode);
        }
        test.done();
    },

    'Test Analyzer': function(test) {
        var context = {
            addresses: {},
            intrinsics: [],
            methods: [],
            references: [],
            variables: [],
            literals: []
        };
        test.expect(2);
        var source = fs.readFileSync('test/compiler/instructions.basm', 'utf8');
        var instructions = tools.parseInstructions(source);
        test.notEqual(instructions, null, 'The parser returned a null list.');
        tools.analyzeInstructions(context, instructions);
        var formatted = JSON.stringify(context, null, 4);
        test.strictEqual(formatted, EXPECTED_CONTEXT, 'The analyzer returned a different context.');
        //console.log('\nEXPECTED_CONTEXT:\n' + formatted);
        test.done();
    },

    'Test Assembler and Disassembler': function(test) {
        var context = {
            addresses: {},
            intrinsics: [],
            methods: [],
            references: [],
            variables: [],
            literals: []
        };
        test.expect(3);
        var source = fs.readFileSync('test/compiler/instructions.basm', 'utf8');
        var instructions = tools.parseInstructions(source);
        test.notEqual(instructions, null, 'The parser returned a null list.');
        tools.analyzeInstructions(context, instructions);
        var bytecode = tools.assembleInstructions(context, instructions);
        var formatted = tools.formatBytecode(bytecode);
        test.strictEqual(formatted, EXPECTED_INSTRUCTIONS, 'The formatter returned different instructions.');
        //console.log('\nEXPECTED_INSTRUCTIONS:\n' + formatted);
        var disassembled = tools.disassembleBytecode(context, bytecode);
        test.strictEqual(disassembled, source, 'The disassembler returned different source.');
        //console.log('\nDISASSEMBLED:\n' + disassembled);
        test.done();
    }

});

var EXPECTED_CONTEXT =
'{\n' +
'    "addresses": {\n' +
'        "1.jump": 2,\n' +
'        "2.load": 6,\n' +
'        "3.store": 10,\n' +
'        "4.invoke": 14,\n' +
'        "5.execute": 18\n' +
'    },\n' +
'    "intrinsics": [\n' +
'        "$random",\n' +
'        "$factorial",\n' +
'        "$sum",\n' +
'        "$sort"\n' +
'    ],\n' +
'    "methods": [\n' +
'        "$generateKey",\n' +
'        "$fibonacci",\n' +
'        "$hasNext",\n' +
'        "$addItem"\n' +
'    ],\n' +
'    "references": [\n' +
'        "$reference",\n' +
'        "$queue"\n' +
'    ],\n' +
'    "variables": [\n' +
'        "$variable"\n' +
'    ],\n' +
'    "literals": [\n' +
'        "`\\"This is a literal text string\\ncontaining an \\\\` and spanning multiple lines.\\"`"\n' +
'    ]\n' +
'}';

var EXPECTED_INSTRUCTIONS =
' Addr     Bytes   Bytecode                    Instruction\n' +
'---------------------------------------------------------------------------\n' +
'[001]:    0000    00 [000]    SKIP INSTRUCTION\n' +
'[002]:    0006    00 [006]    JUMP TO [006]\n' +
'[003]:    080A    01 [00A]    JUMP TO [00A] ON NONE\n' +
'[004]:    100E    02 [00E]    JUMP TO [00E] ON FALSE\n' +
'[005]:    1812    03 [012]    JUMP TO [012] ON ZERO\n' +
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
'[012]:    8001    40     1    EXECUTE METHOD 1\n' +
'[013]:    8802    41     2    EXECUTE METHOD 2 WITH PARAMETERS\n' +
'[014]:    9003    42     3    EXECUTE METHOD 3 WITH TARGET\n' +
'[015]:    9804    43     4    EXECUTE METHOD 4 WITH TARGET AND PARAMETERS\n';