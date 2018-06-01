/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM). All Rights Reserved.    *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.       *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative.(See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
'use strict';

/**
 * This library encapsulates the byte encoding for the Bali virtual machine.
 * Each bytecode instruction is made up of two bytes containing three parts:
 * a three bit opcode that encodes the operation, a two bit modcode that
 * encodes the modifier, and an 11 bit operand that may be an index or
 * instruction address.  The structure of a bytecode instruction is
 * as follows:
 * <pre>
 * | opcode (3 bits) | modcode (2 bits) | operand (11 bits)
 * </pre>
 * An operand is an unsigned 11 bit number [0..2047] representing a unit
 * based index or address. The value zero is reserved for specifying an
 * invalid index or address.
 */


// PUBLIC FUNCTIONS

/**
 * This function takes an operation, a modifier and an operand and
 * encodes them into the corresponding instruction as a two byte number.
 *
 * @param {string} operation The operation for the bytecode.
 * @param {string} modifier The modifier for the bytecode.
 * @param {number} operand The operand associated with the operation.
 * @return {number} The bytecode for the instruction.
 */
exports.encodeInstruction = function(operation, modifier, operand) {
    var instruction = OPCODES[operation] | MODCODES[modifier] | (operand & OPERAND_MASK);
    return instruction;
};


/**
 * This function decodes the operation for an instruction.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {string} The decoded operation.
 */
exports.decodeOperation = function(instruction) {
    var opcode = extractOpcode(instruction);
    var operation = OPERATIONS[opcode >>> 13];
    return operation;
};


/**
 * This function decodes the modifier for an instruction.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {number|string} The decoded modifier.
 */
exports.decodeModifier = function(instruction) {
    var opcode = extractOpcode(instruction);
    var modcode = extractModcode(instruction);
    var number = modcode >>> 11;
    switch (opcode) {
        case JUMP:
            return CONDITIONS[number];
        case LOAD:
            return LOAD_TYPES[number];
        case STORE:
            return STORE_TYPES[number];
        case INVOKE:
        case PUSH:
        case POP:
        case HANDLE:
            return number;
        case EXECUTE:
            return PROCEDURES[number];
        default:
            throw new Error('BYTECODE: Attempted to return the modifier for an invalid opcode: ' + opcode);
    }
};


/**
 * This function determines whether or not the operand of an instruction
 * is an address.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {boolean} Whether or not the operand is an address.
 */
exports.operandIsAddress = function(instruction) {
    var opcode = extractOpcode(instruction);
    switch (opcode) {
        case JUMP:
        case PUSH:
            return true;
        default:
            return false;
    }
};


/**
 * This function determines whether or not the operand of an instruction
 * is an index.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {boolean} Whether or not the operand is an index.
 */
exports.operandIsIndex = function(instruction) {
    var opcode = extractOpcode(instruction);
    switch (opcode) {
        case LOAD:
        case STORE:
        case INVOKE:
        case EXECUTE:
            return true;
        default:
            return false;
    }
};


/**
 * This function decodes the operand for an instruction.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {number} The decoded operand.
 */
exports.decodeOperand = function(instruction) {
    var operand = instruction & OPERAND_MASK;
    return operand;
};


/**
 * This function determines whether or not an instruction
 * is valid.
 *
 * @param {number} instruction The instruction to be decoded.
 * @return {boolean} Whether or not the instruction is valid.
 */
exports.instructionIsValid = function(instruction) {
    var opcode = extractOpcode(instruction);
    var modcode = extractModcode(instruction);
    var operand = exports.decodeOperand(instruction);
    var isValid = true;
    switch (opcode) {
        case JUMP:
            if (modcode !== 0 && operand === 0) isValid = false;
            break;
        case LOAD:
        case STORE:
        case INVOKE:
        case EXECUTE:
        case PUSH:
            if (operand === 0) isValid = false;
            break;
        case POP:
        case HANDLE:
            if (operand !== 0) isValid = false;
            break;
        default:
            isValid = false;
    }
    return isValid;
};


/**
 * This function returns the canonical string format for a Bali virtual
 * machine address in hexidecimal [000..3FF].
 * 
 * @param {number} address The virtual machine address.
 * @returns {string} The canonical string representation of the address.
 */
exports.addressAsString = function(address) {
    if (address === 0) return null;  // invalid address
    var string = address.toString(16).toUpperCase();
    while (string.length < 3) string = '0' + string;
    string = '[' + string + ']';
    return string;
};


/**
 * This function returns a human readable version of a Bali virtual machine
 * 16 bit (word) bytecode instruction.
 * 
 * @param {number} address The address of the instruction.
 * @param {number} instruction The 16 bit bytecode instruction to be formatted.
 * @returns {string} The human readable form of the bytecode instruction.
 */
exports.wordAsString = function(address, instruction) {
    address = exports.addressAsString(address);
    var opcode = extractOpcode(instruction) >>> 13;
    var modcode = extractModcode(instruction) >>> 11;
    var operation = exports.decodeOperation(instruction);
    var modifier = exports.decodeModifier(instruction);
    var operand = exports.decodeOperand(instruction);
    if (exports.operandIsAddress(instruction)) {
        operand = exports.addressAsString(operand);
    } else {
        operand = operand.toString();
    }

    // format the instruction as hexadecimal bytes
    var bytes = instruction.toString(16).toUpperCase();
    while (bytes.length < 4) bytes = '0' + bytes;

    // format the description
    var description = exports.instructionAsString(operation, modifier, operand);

    // format the bytecode
    if (operand === null) operand = '[000]';  // for the SKIP INSTRUCTION
    while (operand.length < 5) operand = ' ' + operand;  // pad operand string with spaces
    var bytecode = '' + opcode + modcode + ' ' + operand;

    // put them all together
    var formatted = address + ':    ' + bytes + '    ' + bytecode + '    ' + description;
    return formatted;
};


/**
 * This function returns a human readable version of Bali virtual machine bytecode.
 * 
 * @param {array} bytecode The bytecode array of 16 bit instructions to be formatted.
 * @returns {string} The human readable form of the bytecode.
 */
exports.bytecodeAsString = function(bytecode) {
    var string = ' Addr     Bytes   Bytecode                  Instruction\n';
    string += '----------------------------------------------------------------------\n';
    var address = 1;  // bali VM unit based addressing
    while (address <= bytecode.length) {
        var instruction = bytecode[address - 1];  // javascript zero based indexing
        string += exports.wordAsString(address, instruction) + '\n';
        address++;  // ready for next instruction
    }
    return string;
};


/**
 * This function takes an operation, a modifier and an operand and
 * formats them into a human readable version of a Bali virtual
 * machine instruction.
 *
 * @param {string} operation The operation for the instruction.
 * @param {string|number} modifier The modifier for the instruction.
 * @param {string} operand The optional operand associated with the instruction.
 * @return {string} The human readable form of the instruction.
 */
exports.instructionAsString = function(operation, modifier, operand) {
    var instruction;
    switch (operation) {
        case 'JUMP':
            if (modifier === '' && operand === null) {
                instruction = 'SKIP INSTRUCTION';
            } else {
                instruction = 'JUMP TO ' + operand;
                if (modifier) instruction += ' ' + modifier;
            }
            break;
        case 'LOAD':
            instruction = 'LOAD ' + modifier + ' ' + operand;
            break;
        case 'STORE':
            instruction = 'STORE ' + modifier + ' ' + operand;
            break;
        case 'INVOKE':
            instruction = 'INVOKE INTRINSIC ' + operand;
            if (modifier === 1) {
                instruction += ' WITH PARAMETER';
            }
            if (modifier > 1) {
                instruction += ' WITH ' + modifier + ' PARAMETERS';
            }
            break;
        case 'EXECUTE':
            instruction = 'EXECUTE PROCEDURE ' + operand;
            if (modifier) instruction += ' ' + modifier;
            break;
        case 'PUSH':
            instruction = 'PUSH HANDLERS ' + operand;
            break;
        case 'POP':
            instruction = 'POP HANDLERS';
            break;
        case 'HANDLE':
            instruction = 'HANDLE EXCEPTION';
            break;
    }
    return instruction;
};


// PRIVATE FUNCTIONS

/*
 * This function takes a bytecode instruction and extracts its opcode.
 */
function extractOpcode(instruction) {
    return instruction & OPCODE_MASK;
}


/*
 * This function takes a bytecode instruction and extracts its modcode.
 */
function extractModcode(instruction) {
    return instruction & MODCODE_MASK;
}


// PRIVATE CONSTANTS

// masks
var OPCODE_MASK = 0xE000;
var MODCODE_MASK = 0x1800;
var OPERAND_MASK = 0x07FF;

// opcodes
var SKIP = 0x0000;
var JUMP = 0x0000;
var LOAD = 0x2000;
var STORE = 0x4000;
var INVOKE = 0x6000;
var EXECUTE = 0x8000;
var PUSH = 0xA000;
var POP = 0xC000;
var HANDLE = 0xE000;

// operations
var OPERATIONS = [
    'JUMP',
    'LOAD',
    'STORE',
    'INVOKE',
    'EXECUTE',
    'PUSH',
    'POP',
    'HANDLE'
];

// opcodes
var OPCODES = {
    'SKIP': SKIP,
    'JUMP': JUMP,
    'LOAD': LOAD,
    'STORE': STORE,
    'INVOKE': INVOKE,
    'EXECUTE': EXECUTE,
    'PUSH': PUSH,
    'POP': POP,
    'HANDLE': HANDLE
};

// types
var LITERAL = 0x0000;
var DRAFT = 0x0000;
var DOCUMENT = 0x0800;
var MESSAGE = 0x1000;
var VARIABLE = 0x1800;

// conditions
var ON_NONE = 0x0800;
var ON_TRUE = 0x1000;
var ON_FALSE = 0x1800;

// procedures
var WITH_PARAMETERS = 0x0800;
var ON_TARGET = 0x1000;
var ON_TARGET_WITH_PARAMETERS = 0x1800;

// modcodes
var MODCODES = {
    // these first four must be first to allow numbers to work in addition to strings
    '0': 0x0000,
    '1': 0x0800,
    '2': 0x1000,
    '3': 0x1800,
    'DRAFT': DRAFT,
    'DOCUMENT': DOCUMENT,
    'MESSAGE': MESSAGE,
    'VARIABLE': VARIABLE,
    'LITERAL': LITERAL,
    'ON NONE': ON_NONE,
    'ON TRUE': ON_TRUE,
    'ON FALSE': ON_FALSE,
    'WITH PARAMETERS': WITH_PARAMETERS,
    'ON TARGET': ON_TARGET,
    'ON TARGET WITH PARAMETERS': ON_TARGET_WITH_PARAMETERS
};

// types
var LOAD_TYPES = [
    'LITERAL',
    'DOCUMENT',
    'MESSAGE',
    'VARIABLE'
];

var STORE_TYPES = [
    'DRAFT',
    'DOCUMENT',
    'MESSAGE',
    'VARIABLE'
];

// conditions
var CONDITIONS = [
    '',
    'ON NONE',
    'ON TRUE',
    'ON FALSE'
];

// procedures
var PROCEDURES = [
    '',
    'WITH PARAMETERS',
    'ON TARGET',
    'ON TARGET WITH PARAMETERS'
];
