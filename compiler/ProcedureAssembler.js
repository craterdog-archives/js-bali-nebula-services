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
var BaliProcedure = require('bali-instruction-set/BaliProcedure');
var types = require('bali-instruction-set/Types');
var collections = require('bali-collection-types/collections');
var utilities = require('../utilities/BytecodeUtilities');
var intrinsics = require('../intrinsics/IntrinsicFunctions');

/**
 * This library provides functions that assemble and disassemble instructions
 * for the Bali Virtual Machine™.
 */


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure containing assembly
 * instructions and extracts label information that will be needed by the
 * assembler to generate the bytecode.
 * 
 * @param {String} instructions The assembly code for the procedure to be analyzed.
 * @returns {object} The symbol table for the procedure.
 */
exports.extractSymbols = function(instructions) {
    var procedure = BaliProcedure.fromSource(instructions);
    var visitor = new AnalyzingVisitor();
    procedure.accept(visitor);
    return visitor.symbols;
};


/**
 * This function traverses a parse tree structure containing assembly
 * instructions and generates the corresponding bytecode instructions.
 * 
 * @param {String} instructions The assembly code for the procedure to be assembled.
 * @returns {String} The bytecode string containing base 16 encoded instructions.
 */
exports.assembleProcedure = function(instructions) {
    var procedure = BaliProcedure.fromSource(instructions);
    var visitor = new AnalyzingVisitor();
    procedure.accept(visitor);
    var symbols = visitor.symbols;
    visitor = new AssemblingVisitor(symbols);
    procedure.accept(visitor);
    return visitor.bytecode;
};


/**
 * This function analyzes bytecode and regenerates the assembly instructions
 * in the procedure that was used to generate the bytecode.
 * 
 * @param {String} bytecode The bytecode string containing base 16 encoded instructions.
 * @param {Object} symbols The symbol table for the instructions.
 * @returns {String} The regenerated assembly code for the procedure.
 */
exports.disassembleBytecode = function(bytecode, symbols) {
    var procedure = '';
    var address = 1;  // bali VM unit based addressing
    while(address * 4 <= bytecode.length) {
        // check for a label at this address
        var label = lookupLabel(symbols, address);
        if (label) {
            procedure += '\n' + label + ':\n';
        }

        // decode the instruction
        var instruction = utilities.getInstruction(bytecode, address);
        var operation = utilities.decodeOperation(instruction);
        var modifier = utilities.decodeModifier(instruction);
        var operand = utilities.decodeOperand(instruction);
        if (utilities.operandIsAddress(instruction)) {
            operand = lookupLabel(symbols, operand);
        } else if (utilities.operandIsIndex(instruction)) {
            operand = lookupSymbol(symbols, operation, modifier, operand);
        } else {
            operand = undefined;
        }

        // format the instruction
        procedure += utilities.instructionAsString(instruction, operand);
        procedure += '\n';

        // increment the address
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
    var type;
    switch (operation) {
        case types.PUSH:
            switch (modifier) {
                case types.ELEMENT:
                case types.CODE:
                    type = 'literals';
                    break;
            }
            break;
        case types.LOAD:
            switch (modifier) {
                case types.PARAMETER:
                    type = 'parameters';
                    break;
                case types.VARIABLE:
                case types.DOCUMENT:
                case types.MESSAGE:
                    type = 'variables';
                    break;
            }
            break;
        case types.STORE:
            type = 'variables';
            break;
        case types.INVOKE:
            return intrinsics.intrinsicNames[index - 1];  // javascript zero based indexing
        case types.EXECUTE:
            type = 'procedures';
            break;
    }
    return symbols[type][index - 1];  // javascript zero based indexing
}


// PRIVATE CLASSES

function AnalyzingVisitor() {
    this.symbols = {
        addresses: {},
        parameters: [],
        literals: [],
        variables: [],
        procedures: []
    };
    this.address = 1;  // bali VM unit based addressing
    return this;
}
AnalyzingVisitor.prototype.constructor = AnalyzingVisitor;


// procedure: NEWLINE* step* NEWLINE* EOF;
AnalyzingVisitor.prototype.visitProcedure = function(procedure) {
    var steps = procedure.steps;
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        step.accept(this);
    }
};


// step: label? instruction NEWLINE;
AnalyzingVisitor.prototype.visitStep = function(step) {
    var label = step.label;
    if (label) {
        this.symbols.addresses[label] = this.address;
    }
    step.instruction.accept(this);
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'TRUE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE'
AnalyzingVisitor.prototype.visitJumpInstruction = function(instruction) {
    this.address++;
};


// pushInstruction:
//     'PUSH' 'HANDLER' LABEL |
//     'PUSH' 'ELEMENT' LITERAL |
//     'PUSH' 'CODE' LITERAL
AnalyzingVisitor.prototype.visitPushInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.operand;
    switch (modifier) {
        case types.ELEMENT:
        case types.CODE:
            if (!this.symbols.literals.includes(value)) {
                this.symbols.literals.push(value);
            }
            break;
    }
    this.address++;
};


// popInstruction:
//     'POP' 'HANDLER' |
//     'POP' 'COMPONENT'
AnalyzingVisitor.prototype.visitPopInstruction = function(instruction) {
    this.address++;
};


// loadInstruction:
//     'LOAD' 'VARIABLE' SYMBOL |
//     'LOAD' 'PARAMETER' SYMBOL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL
AnalyzingVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var type;
    switch(modifier) {
        case types.PARAMETER:
            type = 'parameters';
            break;
        case types.VARIABLE:
        case types.DOCUMENT:
        case types.MESSAGE:
            type = 'variables';
            break;
    }
    if (!this.symbols[type].includes(symbol)) {
        this.symbols[type].push(symbol);
    }
    this.address++;
};


// storeInstruction:
//     'STORE' 'VARIABLE' SYMBOL |
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL
AnalyzingVisitor.prototype.visitStoreInstruction = function(instruction) {
    var symbol = instruction.operand;
    if (!this.symbols.variables.includes(symbol)) {
        this.symbols.variables.push(symbol);
    }
    this.address++;
};


// invokeInstruction:
//     'INVOKE' SYMBOL |
//     'INVOKE' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AnalyzingVisitor.prototype.visitInvokeInstruction = function(instruction) {
    this.address++;
};


// executeInstruction:
//     'EXECUTE' SYMBOL |
//     'EXECUTE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' 'WITH' 'PARAMETERS'
AnalyzingVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var symbol = instruction.operand;
    if (!this.symbols.procedures.includes(symbol)) {
        this.symbols.procedures.push(symbol);
    }
    this.address++;
};


// handleInstruction:
//     'HANDLE' 'EXCEPTION' |
//     'HANDLE' 'RESULT'
AnalyzingVisitor.prototype.visitHandleInstruction = function(instruction) {
    this.address++;
};


function AssemblingVisitor(symbols) {
    this.symbols = symbols;
    this.bytecode = '';
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
// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'TRUE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE'
AssemblingVisitor.prototype.visitJumpInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var label = instruction.operand;
    var address = 0;
    if (label && label !== 0) {
        address = this.symbols.addresses[label];
    }
    var word = utilities.encodeInstruction(types.JUMP, modifier, address);
    this.bytecode += utilities.instructionToBase16(word);
};


// pushInstruction:
//     'PUSH' 'HANDLER' LABEL |
//     'PUSH' 'ELEMENT' LITERAL |
//     'PUSH' 'CODE' LITERAL
AssemblingVisitor.prototype.visitPushInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.operand;
    switch(modifier) {
        case types.HANDLER:
            value = this.symbols.addresses[value];
            break;
        case types.ELEMENT:
        case types.CODE:
            value = this.symbols.literals.indexOf(value) + 1;  // unit based indexing
            break;
    }
    var word = utilities.encodeInstruction(types.PUSH, modifier, value);
    this.bytecode += utilities.instructionToBase16(word);
};


// popInstruction:
//     'POP' 'HANDLER' |
//     'POP' 'COMPONENT'
AssemblingVisitor.prototype.visitPopInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var word = utilities.encodeInstruction(types.POP, modifier);
    this.bytecode += utilities.instructionToBase16(word);
};


// loadInstruction:
//     'LOAD' 'VARIABLE' SYMBOL |
//     'LOAD' 'PARAMETER' SYMBOL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL
AssemblingVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var type;
    switch(modifier) {
        case types.PARAMETER:
            type = 'parameters';
            break;
        case types.VARIABLE:
        case types.DOCUMENT:
        case types.MESSAGE:
            type = 'variables';
            break;
    }
    var index = this.symbols[type].indexOf(symbol) + 1;  // unit based indexing
    var word = utilities.encodeInstruction(types.LOAD, modifier, index);
    this.bytecode += utilities.instructionToBase16(word);
};


// storeInstruction:
//     'STORE' 'VARIABLE' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL
AssemblingVisitor.prototype.visitStoreInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var index = this.symbols.variables.indexOf(symbol) + 1;  // unit based indexing
    var word = utilities.encodeInstruction(types.STORE, modifier, index);
    this.bytecode += utilities.instructionToBase16(word);
};


// invokeInstruction:
//     'INVOKE' SYMBOL |
//     'INVOKE' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AssemblingVisitor.prototype.visitInvokeInstruction = function(instruction) {
    var count = instruction.modifier;
    var symbol = instruction.operand;
    var index = intrinsics.intrinsicNames.indexOf(symbol) + 1;  // bali VM unit based indexing
    var word = utilities.encodeInstruction(types.INVOKE, count, index);
    this.bytecode += utilities.instructionToBase16(word);
};


// executeInstruction:
//     'EXECUTE' SYMBOL |
//     'EXECUTE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' 'WITH' 'PARAMETERS'
AssemblingVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var index = this.symbols.procedures.indexOf(symbol) + 1;  // bali VM unit based indexing
    var word = utilities.encodeInstruction(types.EXECUTE, modifier, index);
    this.bytecode += utilities.instructionToBase16(word);
};


// handleInstruction:
//     'HANDLE' 'EXCEPTION' |
//     'HANDLE' 'RESULT'
AssemblingVisitor.prototype.visitHandleInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var word = utilities.encodeInstruction(types.HANDLE, modifier);
    this.bytecode += utilities.instructionToBase16(word);
};
