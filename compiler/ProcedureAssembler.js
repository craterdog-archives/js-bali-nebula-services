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

/*
 * This class defines a custom visitor that "walks" a parse tree
 * produced by the BaliInstructionSetParser and generates the
 * associated bytecode.
 */

/**
 * This constructor creates a new visitor.
 * 
 * @constructor
 * @param {object} symbols The set of symbol catalogs for the procedure being
 * assembled. 
 * @returns {ProcedureAssembler} The new assembler.
 */
function ProcedureAssembler(symbols) {
    this.symbols = symbols;
    return this;
}
ProcedureAssembler.prototype.constructor = ProcedureAssembler;
exports.ProcedureAssembler = ProcedureAssembler;


/**
 * This method walks a parse tree structure containing a procedure
 * and generates the corresponding bytecode for the BaliVM.
 * 
 * @param {object} procedure The parse tree structure to be assembled.
 * @returns {array} The assembled bytecode array.
 */
ProcedureAssembler.prototype.assembleProcedure = function(procedure) {
    var visitor = new AssemblerVisitor(this.symbols);
    procedure.accept(visitor);
    return visitor.bytecode;
};


/**
 * This method analyzes bytecode and regenerates the source code
 * that was used to assemble the bytecode.
 * 
 * @param {array} bytecode The bytecode array containing the procedure
 * to be disassembled.
 * @returns {string} The regenerated source code.
 */
ProcedureAssembler.prototype.disassembleBytecode = function(bytecode) {
    var procedure = '';
    var address = 1;  // bali VM unit based addressing
    while (address <= bytecode.length) {
        // check for a label at this address
        var label = lookupLabel(this.symbols, address);
        if (label) {
            procedure += '\n' + label + ':\n';
        }

        // decode the instruction
        var bytes = bytecode[address - 1];  // javascript zero based indexing
        var operation = utilities.decodeOperation(bytes);
        var modifier = utilities.decodeModifier(bytes);
        var operand = utilities.decodeOperand(bytes);
        if (utilities.operandIsAddress(bytes)) {
            operand = lookupLabel(this.symbols, operand);
        } else {
            operand = lookupSymbol(this.symbols, operation, modifier, operand);
        }

        // format the instruction
        procedure += utilities.instructionAsString(operation, modifier, operand);
        procedure += '\n';

        address++;
    }
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
    var key;
    switch (operation) {
        case 'LOAD':
            switch (modifier) {
                case 'LITERAL':
                    key = 'literals';
                    break;
                case 'DOCUMENT':
                case 'MESSAGE':
                    key = 'references';
                    break;
                case 'VARIABLE':
                    key = 'variables';
                    break;
            }
            return symbols[key][index - 1];  // zero based indexing
        case 'STORE':
            switch (modifier) {
                case 'DRAFT':
                case 'DOCUMENT':
                case 'MESSAGE':
                    key = 'references';
                    break;
                case 'VARIABLE':
                    key = 'variables';
                    break;
            }
            return symbols[key][index - 1];  // zero based indexing
        case 'INVOKE':
            return symbols.intrinsics[index - 1];  // zero based indexing
        case 'EXECUTE':
            return symbols.procedures[index - 1];  // zero based indexing
        default:
            throw new Error('ASSEMBLER: Invalid operation with an index: ' + operation);
    }
    
}


// PRIVATE CLASSES

function AssemblerVisitor(symbols) {
    this.symbols = symbols;
    this.bytecode = [];  // array of bytecode instructions
    return this;
}
AssemblerVisitor.prototype.constructor = AssemblerVisitor;


// procedure: NEWLINE* step* NEWLINE* EOF;
AssemblerVisitor.prototype.visitProcedure = function(procedure) {
    var steps = procedure.steps;
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        step.accept(this);
    }
};


// step: label? instruction NEWLINE
AssemblerVisitor.prototype.visitStep = function(step) {
    // can ignore the label at this stage since they don't show up in the bytecode
    step.instruction.accept(this);
};


// skipInstruction: 'SKIP' 'INSTRUCTION'
AssemblerVisitor.prototype.visitSkipInstruction = function(instruction) {
    var bytes = utilities.encodeInstruction('JUMP', '', 0);
    this.bytecode.push(bytes);
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'TRUE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE'
AssemblerVisitor.prototype.visitJumpInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var label = instruction.label;
    var address = this.symbols.addresses[label];
    var bytes = utilities.encodeInstruction('JUMP', modifier, address);
    this.bytecode.push(bytes);
};


// loadInstruction:
//     'LOAD' 'LITERAL' LITERAL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL |
//     'LOAD' 'VARIABLE' SYMBOL
AssemblerVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.value;
    var index;
    switch(modifier) {
        case 'LITERAL':
            index = this.symbols.literals.indexOf(value) + 1;  // unit based indexing
            break;
        case 'DOCUMENT':
        case 'MESSAGE':
            index = this.symbols.references.indexOf(value) + 1;  // unit based indexing
            break;
        case 'VARIABLE':
            index = this.symbols.variables.indexOf(value) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the LOAD instruction: ' + modifier);
    }
    var bytes = utilities.encodeInstruction('LOAD', modifier, index);
    this.bytecode.push(bytes);
};


// storeInstruction:
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL |
//     'STORE' 'VARIABLE' SYMBOL
AssemblerVisitor.prototype.visitStoreInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
    var index;
    switch(modifier) {
        case 'DRAFT':
        case 'DOCUMENT':
        case 'MESSAGE':
            index = this.symbols.references.indexOf(symbol) + 1;  // unit based indexing
            break;
        case 'VARIABLE':
            index = this.symbols.variables.indexOf(symbol) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the STORE instruction: ' + modifier);
    }
    var bytes = utilities.encodeInstruction('STORE', modifier, index);
    this.bytecode.push(bytes);
};


// invokeInstruction:
//     'INVOKE' 'INTRINSIC' SYMBOL |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AssemblerVisitor.prototype.visitInvokeInstruction = function(instruction) {
    var count = instruction.count;
    var symbol = instruction.symbol;
    var index = this.symbols.intrinsics.indexOf(symbol) + 1;  // bali VM unit based indexing
    var bytes = utilities.encodeInstruction('INVOKE', count, index);
    this.bytecode.push(bytes);
};


// executeInstruction:
//     'EXECUTE' 'PROCEDURE' SYMBOL |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'ON' 'TARGET' 'AND' 'PARAMETERS'
AssemblerVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
    var index = this.symbols.procedures.indexOf(symbol) + 1;  // bali VM unit based indexing
    var bytes = utilities.encodeInstruction('EXECUTE', modifier, index);
    this.bytecode.push(bytes);
};
