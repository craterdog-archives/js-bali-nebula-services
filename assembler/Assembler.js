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
var utilities = require('../utilities/BytecodeUtilities');

/**
 * This library provides functions that assemble and disassemble instructions
 * for the Bali Virtual Machine™.
 */


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure containing assembly
 * instructions and generates the corresponding bytecode.
 * 
 * @param {object} procedure The parse tree structure to be traversed.
 * @param {object} symbols The symbol table for the procedure.
 * @returns {array} The corresponding bytecode array.
 */
exports.assembleBytecode = function(procedure, symbols) {
    var visitor = new AssemblingVisitor(symbols);
    procedure.accept(visitor);
    return visitor.bytecode;
};


/**
 * This function analyzes bytecode and regenerates the assembly instructions
 * in the procedure that was used to generate the bytecode.
 * 
 * @param {array} bytecode The bytecode array.
 * @param {object} symbols The symbol table for the instructions.
 * @returns {string} The regenerated procedure.
 */
exports.disassembleBytecode = function(bytecode, symbols) {
    var procedure = '';
    var address = 1;  // bali VM unit based addressing
    while (address <= bytecode.length) {
        // check for a label at this address
        var label = lookupLabel(symbols, address);
        if (label) {
            procedure += '\n' + label + ':\n';
        }

        // decode the instruction
        var bytes = bytecode[address - 1];  // javascript zero based indexing
        var operation = utilities.decodeOperation(bytes);
        var modifier = utilities.decodeModifier(bytes);
        var operand = utilities.decodeOperand(bytes);
        if (utilities.operandIsAddress(bytes)) {
            operand = lookupLabel(symbols, operand);
        } else if (utilities.operandIsIndex(bytes)) {
            operand = lookupSymbol(symbols, operation, modifier, operand);
        } else {
            operand = 0;
        }

        // format the instruction
        procedure += utilities.instructionAsString(operation, modifier, operand);
        procedure += '\n';

        address++;
    }
    procedure += '\n';
    return procedure;
};


// PRIVATE FUNCTIONS

/*
 * This function returns, from the symbol catalogs, the label corresponding
 * to the specified address.
 */
function lookupLabel(symbols, address) {
    var entries = Object.entries(symbols.addresses);
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (address === entry[1]) return entry[0];
    }
    return null;
}


/*
 * This function returns, from the symbol catalogs, the symbol corresponding
 * to the specified index.
 */
function lookupSymbol(symbols, operation, modifier, index) {
    index--;  // zero based indexing
    var key;
    switch (operation) {
        case 'PUSH':
            switch (modifier) {
                case 'ELEMENT':
                    key = 'elements';
                    break;
                case 'CODE':
                    key = 'code';
                    break;
            }
            return symbols[key][index];
        case 'LOAD':
        case 'STORE':
            switch (modifier) {
                case 'VARIABLE':
                    key = 'variables';
                    break;
                case 'DOCUMENT':
                case 'DRAFT':
                case 'MESSAGE':
                    key = 'references';
                    break;
            }
            return symbols[key][index];
        case 'INVOKE':
            return symbols.intrinsics[index];
        case 'EXECUTE':
            return symbols.procedures[index];
        default:
            throw new Error('ASSEMBLER: Invalid operation with an index: ' + operation);
    }
    
}


// PRIVATE CLASSES

function AssemblingVisitor(symbols) {
    this.symbols = symbols;
    this.bytecode = [];  // array of bytecode instructions
    return this;
}
AssemblingVisitor.prototype.constructor = AssemblingVisitor;


// procedure: NEWLINE* step* NEWLINE* EOF;
AssemblingVisitor.prototype.visitProcedure = function(procedure) {
    var steps = procedure.steps;
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        step.accept(this);
    }
};


// step: label? instruction NEWLINE
AssemblingVisitor.prototype.visitStep = function(step) {
    // can ignore the label at this stage since they don't show up in the bytecode
    step.instruction.accept(this);
};


// skipInstruction: 'SKIP' 'INSTRUCTION'
AssemblingVisitor.prototype.visitSkipInstruction = function(instruction) {
    var bytes = utilities.encodeInstruction('JUMP', '');
    this.bytecode.push(bytes);
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'TRUE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE'
AssemblingVisitor.prototype.visitJumpInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var label = instruction.label;
    var address = this.symbols.addresses[label];
    var bytes = utilities.encodeInstruction('JUMP', modifier, address);
    this.bytecode.push(bytes);
};


// pushInstruction:
//     'PUSH' 'ADDRESS' LABEL |
//     'PUSH' 'ELEMENT' LITERAL |
//     'PUSH' 'STRUCTURE' |
//     'PUSH' 'CODE' LITERAL
AssemblingVisitor.prototype.visitPushInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.value;
    switch(modifier) {
        case 'ADDRESS':
            value = this.symbols.addresses[value];
            break;
        case 'ELEMENT':
            value = this.symbols.elements.indexOf(value) + 1;  // unit based indexing
            break;
        case 'STRUCTURE':
            // no value
            break;
        case 'CODE':
            value = this.symbols.code.indexOf(value) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the LOAD instruction: ' + modifier);
    }
    var bytes = utilities.encodeInstruction('PUSH', modifier, value);
    this.bytecode.push(bytes);
};


// popInstruction:
//     'POP' 'ADDRESS' |
//     'POP' 'COMPONENT'
AssemblingVisitor.prototype.visitPopInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var bytes = utilities.encodeInstruction('POP', modifier);
    this.bytecode.push(bytes);
};


// loadInstruction:
//     'LOAD' 'VARIABLE' SYMBOL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'DRAFT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL
AssemblingVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
    var index;
    switch(modifier) {
        case 'VARIABLE':
            index = this.symbols.variables.indexOf(symbol) + 1;  // unit based indexing
            break;
        case 'DOCUMENT':
        case 'DRAFT':
        case 'MESSAGE':
            index = this.symbols.references.indexOf(symbol) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the LOAD instruction: ' + modifier);
    }
    var bytes = utilities.encodeInstruction('LOAD', modifier, index);
    this.bytecode.push(bytes);
};


// storeInstruction:
//     'STORE' 'VARIABLE' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL
AssemblingVisitor.prototype.visitStoreInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
    var index;
    switch(modifier) {
        case 'VARIABLE':
            index = this.symbols.variables.indexOf(symbol) + 1;  // unit based indexing
            break;
        case 'DOCUMENT':
        case 'DRAFT':
        case 'MESSAGE':
            index = this.symbols.references.indexOf(symbol) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the STORE instruction: ' + modifier);
    }
    var bytes = utilities.encodeInstruction('STORE', modifier, index);
    this.bytecode.push(bytes);
};


// invokeInstruction:
//     'INVOKE' SYMBOL |
//     'INVOKE' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AssemblingVisitor.prototype.visitInvokeInstruction = function(instruction) {
    var count = instruction.count;
    var symbol = instruction.symbol;
    var index = this.symbols.intrinsics.indexOf(symbol) + 1;  // bali VM unit based indexing
    var bytes = utilities.encodeInstruction('INVOKE', count, index);
    this.bytecode.push(bytes);
};


// executeInstruction:
//     'EXECUTE' SYMBOL |
//     'EXECUTE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' 'WITH' 'PARAMETERS'
AssemblingVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
    var index = this.symbols.procedures.indexOf(symbol) + 1;  // bali VM unit based indexing
    var bytes = utilities.encodeInstruction('EXECUTE', modifier, index);
    this.bytecode.push(bytes);
};


// handleInstruction:
//     'HANDLE' 'EXCEPTION' |
//     'HANDLE' 'RESULT'
AssemblingVisitor.prototype.visitHandleInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var bytes = utilities.encodeInstruction('HANDLE', modifier);
    this.bytecode.push(bytes);
};
