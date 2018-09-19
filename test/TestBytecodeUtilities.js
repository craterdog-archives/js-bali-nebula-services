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
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var utilities = require('../utilities/BytecodeUtilities');

describe('Bali Cloud Environment™', function() {

    describe('Test bytecode utilities on words', function() {

        it('should round trip conversions from bytes to bytecodes', function() {
            var bytes = codex.randomBytes(16);
            var bytecode = utilities.bytesToBytecode(bytes);
            var bytes2 = utilities.bytecodeToBytes(bytecode);
            expect(bytes2.toString('hex')).to.equal(bytes.toString('hex'));
            var bytecode2 = utilities.bytesToBytecode(bytes2);
            expect(JSON.stringify(bytecode2, null, 2)).to.equal(JSON.stringify(bytecode, null, 2));
        });

        it('should round trip conversions from bytecodes to bytes', function() {
            var bytecode = [0, 10241, 6164];
            var bytes = utilities.bytecodeToBytes(bytecode);
            expect(bytes.toString('hex')).to.equal('000028011814');
        });

    });

    describe('Test bytecode utilities on instructions', function() {

        it('should construct and compare instructions with and without operands', function() {
            var bytecode = '';
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
                    bytecode += utilities.instructionToBase16(instruction);
                }
                // test with operand
                operand = i + 1;
                instruction = i << 11 | operand;
                operation = utilities.decodeOperation(instruction);
                modifier = utilities.decodeModifier(instruction);
                encoded = utilities.encodeInstruction(operation, modifier, operand);
                if (utilities.instructionIsValid(instruction)) {
                    expect(instruction).to.equal(encoded);
                    bytecode += utilities.instructionToBase16(instruction);
                }
            }

            var formattedInstructions = utilities.bytecodeAsString(bytecode);
            //fs.writeFileSync('test/compiler/instructions.code', formattedInstructions, 'utf8');
            var expected = fs.readFileSync('test/compiler/instructions.code', 'utf8');
            expect(formattedInstructions).to.equal(expected);
        });

    });

});
