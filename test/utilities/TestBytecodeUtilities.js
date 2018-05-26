/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var utilities = require('../../utilities/BytecodeUtilities');
var mocha = require('mocha');
var expect = require('chai').expect;

describe('Bali Virtual Machine™', function() {

    describe('Test bytecode utilities on instructions', function() {

        it('should construct and compare instructions without operands', function() {
            for (var i = 0; i < 32; i++) {
                var instruction = i << 11;  // no operand
                var opcode = instruction & OPCODE_MASK;
                var modcode = instruction & MODCODE_MASK;
                var operand = instruction & OPERAND_MASK;
                var encoded = opcode | modcode | operand;
                expect(instruction).to.equal(encoded);
            }
        });

        it('should construct and compare instructions with operands', function() {
            var bytecode = [];
            // handle the SKIP INSTRUCTION specifically
            var instruction = utilities.encodeInstruction('JUMP', '', 0);
            bytecode.push(instruction);
            for (var i = 0; i < 32; i++) {
                instruction = i << 11 | (i + 1);
                var operation = utilities.decodeOperation(instruction);
                var modifier = utilities.decodeModifier(instruction);
                var encoded = utilities.encodeInstruction(operation, modifier, i + 1);
                expect(instruction).to.equal(encoded);
                if (utilities.instructionIsValid(instruction)) {
                    bytecode.push(instruction);
                }
            }
            var formattedInstructions = utilities.bytecodeAsString(bytecode);
            //console.log('\nValid Instructions:\n' + formattedInstructions);
            expect(formattedInstructions).to.equal(EXPECTED_INSTRUCTIONS);
        });

    });

});

// masks
var OPCODE_MASK = 0xE000;
var MODCODE_MASK = 0x1800;
var OPERAND_MASK = 0x07FF;

var EXPECTED_INSTRUCTIONS =
' Addr     Bytes   Bytecode                  Instruction\n' +
'----------------------------------------------------------------------\n' +
'[001]:    0000    00 [000]    SKIP INSTRUCTION\n' +
'[002]:    0001    00 [001]    JUMP TO [001]\n' +
'[003]:    0802    01 [002]    JUMP TO [002] ON NONE\n' +
'[004]:    1003    02 [003]    JUMP TO [003] ON TRUE\n' +
'[005]:    1804    03 [004]    JUMP TO [004] ON FALSE\n' +
'[006]:    2005    10     5    LOAD LITERAL 5\n' +
'[007]:    2806    11     6    LOAD DOCUMENT 6\n' +
'[008]:    3007    12     7    LOAD MESSAGE 7\n' +
'[009]:    3808    13     8    LOAD VARIABLE 8\n' +
'[00A]:    4009    20     9    STORE DRAFT 9\n' +
'[00B]:    480A    21    10    STORE DOCUMENT 10\n' +
'[00C]:    500B    22    11    STORE MESSAGE 11\n' +
'[00D]:    580C    23    12    STORE VARIABLE 12\n' +
'[00E]:    600D    30    13    INVOKE INTRINSIC 13\n' +
'[00F]:    680E    31    14    INVOKE INTRINSIC 14 WITH PARAMETER\n' +
'[010]:    700F    32    15    INVOKE INTRINSIC 15 WITH 2 PARAMETERS\n' +
'[011]:    7810    33    16    INVOKE INTRINSIC 16 WITH 3 PARAMETERS\n' +
'[012]:    8011    40    17    EXECUTE PROCEDURE 17\n' +
'[013]:    8812    41    18    EXECUTE PROCEDURE 18 WITH PARAMETERS\n' +
'[014]:    9013    42    19    EXECUTE PROCEDURE 19 ON TARGET\n' +
'[015]:    9814    43    20    EXECUTE PROCEDURE 20 ON TARGET WITH PARAMETERS\n';
