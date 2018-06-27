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

        it('should construct and compare instructions with and without operands', function() {
            var bytecode = [];
            var operand;
            var operation;
            var modifier;
            var encoded;

            for (var i = 0; i < 32; i++) {
                // test with no operand
                instruction = i << 11;
                operation = utilities.decodeOperation(instruction);
                modifier = utilities.decodeModifier(instruction);
                encoded = utilities.encodeInstruction(operation, modifier);
                if (utilities.instructionIsValid(instruction)) {
                    expect(instruction).to.equal(encoded);
                    bytecode.push(instruction);
                }
                // test with operand
                operand = i + 1;
                instruction = i << 11 | operand;
                operation = utilities.decodeOperation(instruction);
                modifier = utilities.decodeModifier(instruction);
                encoded = utilities.encodeInstruction(operation, modifier, operand);
                if (utilities.instructionIsValid(instruction)) {
                    expect(instruction).to.equal(encoded);
                    bytecode.push(instruction);
                }
            }

            var formattedInstructions = utilities.bytecodeAsString(bytecode);
            //fs.writeFileSync('test/utilities/instructions.code', formattedInstructions, 'utf8');
            var expected = fs.readFileSync('test/utilities/instructions.code', 'utf8');
            expect(formattedInstructions).to.equal(expected);
        });

    });

});
