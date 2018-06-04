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
var fs = require('fs');
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

            // handle the SKIP instruction specifically
            var instruction = utilities.encodeInstruction('JUMP', '', 0);
            var operand;
            var operation;
            var modifier;
            var encoded;
            bytecode.push(instruction);

            // handle most of the instructions
            for (var i = 0; i < 21; i++) {
                instruction = i << 11 | (i + 1);
                operand = i + 1;
                operation = utilities.decodeOperation(instruction);
                modifier = utilities.decodeModifier(instruction);
                encoded = utilities.encodeInstruction(operation, modifier, operand);
                expect(instruction).to.equal(encoded);
                if (utilities.instructionIsValid(instruction)) {
                    bytecode.push(instruction);
                }
            }
            // handle the POP and HANDLE instructions specifically
            for (var j = 21; j < 32; j++) {
                instruction = j << 11;
                operation = utilities.decodeOperation(instruction);
                modifier = utilities.decodeModifier(instruction);
                encoded = utilities.encodeInstruction(operation, modifier, 0);
                if (utilities.instructionIsValid(instruction)) {
                    bytecode.push(instruction);
                }
            }

            var formattedInstructions = utilities.bytecodeAsString(bytecode);
            //fs.writeFileSync('test/utilities/instructions.basm', formattedInstructions, 'utf8');
            var expected = fs.readFileSync('test/utilities/instructions.basm', 'utf8');
            expect(formattedInstructions).to.equal(expected);
        });

    });

});

// masks
var OPCODE_MASK = 0xE000;
var MODCODE_MASK = 0x1800;
var OPERAND_MASK = 0x07FF;
