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
var BaliInstructionSetVisitor = require('bali-instruction-set/src/grammar/BaliInstructionSetVisitor').BaliInstructionSetVisitor;
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
 * @param {object} context The method context for the instructions being
 * assembled. 
 * @returns {InstructionSetAssembler} The new assembler.
 */
function InstructionSetAssembler(context) {
    this.context = context;
    return this;
}
InstructionSetAssembler.prototype.constructor = InstructionSetAssembler;
exports.InstructionSetAssembler = InstructionSetAssembler;


/**
 * This method walks a parse tree structure containing instructions
 * and generates the corresponding bytecode for the BaliVM.
 * 
 * @param {object} instructions The parse tree structure to be assembled.
 * @returns {array} The assembled bytecode array.
 */
InstructionSetAssembler.prototype.assembleInstructions = function(instructions) {
    var visitor = new AssemblerVisitor(this.context);
    instructions.accept(visitor);
    return visitor.bytecode;
};


/**
 * This method analyzes bytecode and regenerates the source code
 * that was used to assemble the bytecode.
 * 
 * @param {array} bytecode The bytecode array containing the instructions
 * to be disassembled.
 * @returns {string} The regenerated source code.
 */
InstructionSetAssembler.prototype.disassembleBytecode = function(bytecode) {
    var instructions = '';
    var address = 1;  // bali VM unit based addressing
    while (address <= bytecode.length) {
        // check for a label at this address
        var label = lookupLabel(this.context, address);
        if (label) {
            instructions += '\n' + label + ':\n';
        }

        // decode the instruction
        var instruction = bytecode[address - 1];  // javascript zero based indexing
        var operation = utilities.decodeOperation(instruction);
        var modifier = utilities.decodeModifier(instruction);
        var operand = utilities.decodeOperand(instruction);
        if (utilities.operandIsAddress(instruction)) {
            operand = lookupLabel(this.context, operand);
        } else {
            operand = lookupSymbol(this.context, operation, modifier, operand);
        }

        // format the instruction
        instructions += utilities.instructionAsString(operation, modifier, operand);
        instructions += '\n';

        address++;
    }
    return instructions;
};


// PRIVATE FUNCTIONS

/*
 * This function returns, from the context, the label corresponding
 * to the specified address.
 */
function lookupLabel(context, address) {
    var entries = Object.entries(context.addresses);
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (address === entry[1]) return entry[0];
    }
    return null;
}


/*
 * This function returns, from the context, the symbol corresponding
 * to the specified index.
 */
function lookupSymbol(context, operation, modifier, index) {
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
            return context[key][index - 1];  // zero based indexing
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
            return context[key][index - 1];  // zero based indexing
        case 'INVOKE':
            return context.intrinsics[index - 1];  // zero based indexing
        case 'EXECUTE':
            return context.methods[index - 1];  // zero based indexing
        default:
            throw new Error('ASSEMBLER: Invalid operation with an index: ' + operation);
    }
    
}


// PRIVATE CLASSES

function AssemblerVisitor(context) {
    BaliInstructionSetVisitor.call(this);
    this.context = context;
    this.bytecode = [];  // array of bytecode instructions
    return this;
}
AssemblerVisitor.prototype = Object.create(BaliInstructionSetVisitor.prototype);
AssemblerVisitor.prototype.constructor = AssemblerVisitor;


// instructions: (prefix? instruction NEWLINE)*
AssemblerVisitor.prototype.visitInstructions = function(ctx) {
    this.visitChildren(ctx);
};


// prefix: NEWLINE LABEL ':' NEWLINE
AssemblerVisitor.prototype.visitPrefix = function(ctx) {
};


// instruction:
//     skipInstruction |
//     jumpInstruction |
//     loadInstruction |
//     storeInstruction |
//     invokeInstruction |
//     executeInstruction
AssemblerVisitor.prototype.visitInstruction = function(ctx) {
    ctx.children[0].accept(this);
};


// skipInstruction: 'SKIP' 'INSTRUCTION'
AssemblerVisitor.prototype.visitSkipInstruction = function(ctx) {
    var instruction = utilities.encodeInstruction('JUMP', '', 0);
    this.bytecode.push(instruction);
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE' |
//     'JUMP' 'TO' LABEL 'ON' 'ZERO'
AssemblerVisitor.prototype.visitJumpInstruction = function(ctx) {
    var label = ctx.LABEL().getText();
    var address = this.context.addresses[label];
    var modifier = '';
    if (ctx.children.length > 3) {
        modifier = 'ON ' + ctx.children[4].getText();
    }
    var instruction = utilities.encodeInstruction('JUMP', modifier, address);
    this.bytecode.push(instruction);
};


// loadInstruction:
//     'LOAD' 'LITERAL' LITERAL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL |
//     'LOAD' 'VARIABLE' SYMBOL
AssemblerVisitor.prototype.visitLoadInstruction = function(ctx) {
    var modifier = ctx.children[1].getText();
    var value = ctx.children[2].getText();  // get symbol or literal
    var index;
    switch(modifier) {
        case 'LITERAL':
            index = this.context.literals.indexOf(value) + 1;  // unit based indexing
            break;
        case 'DOCUMENT':
        case 'MESSAGE':
            index = this.context.references.indexOf(value) + 1;  // unit based indexing
            break;
        case 'VARIABLE':
            index = this.context.variables.indexOf(value) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the LOAD instruction: ' + modifier);
    }
    var instruction = utilities.encodeInstruction('LOAD', modifier, index);
    this.bytecode.push(instruction);
};


// storeInstruction:
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL |
//     'STORE' 'VARIABLE' SYMBOL
AssemblerVisitor.prototype.visitStoreInstruction = function(ctx) {
    var modifier = ctx.children[1].getText();
    var symbol = ctx.SYMBOL().getText();
    var index;
    switch(modifier) {
        case 'DRAFT':
        case 'DOCUMENT':
        case 'MESSAGE':
            index = this.context.references.indexOf(symbol) + 1;  // unit based indexing
            break;
        case 'VARIABLE':
            index = this.context.variables.indexOf(symbol) + 1;  // unit based indexing
            break;
        default:
            throw new Error('ASSEMBLER: Illegal modifier for the STORE instruction: ' + modifier);
    }
    var instruction = utilities.encodeInstruction('STORE', modifier, index);
    this.bytecode.push(instruction);
};


// invokeInstruction:
//     'INVOKE' 'INTRINSIC' SYMBOL |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AssemblerVisitor.prototype.visitInvokeInstruction = function(ctx) {
    var symbol = ctx.SYMBOL().getText();
    var index = this.context.intrinsics.indexOf(symbol) + 1;  // bali VM unit based indexing
    var number;
    switch(ctx.children.length) {
        case 3:
            number = 0;
            break;
        case 5:
            number = 1;
            break;
        case 6:
            number = ctx.NUMBER().getText();
            break;
        default:
            throw new Error('ASSEMBLER: Malformed INVOKE instruction.');
    }
    var instruction = utilities.encodeInstruction('INVOKE', number, index);
    this.bytecode.push(instruction);
};


// executeInstruction:
//     'EXECUTE' 'METHOD' SYMBOL |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'TARGET' |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'TARGET' 'AND' 'PARAMETERS'
AssemblerVisitor.prototype.visitExecuteInstruction = function(ctx) {
    var symbol = ctx.SYMBOL().getText();
    var index = this.context.methods.indexOf(symbol) + 1;  // bali VM unit based indexing
    var modifier;
    var count = ctx.children.length;
    switch (count) {
        case 3:
            modifier = '';
            break;
        case 5:
            if (ctx.children[4].getText() === 'PARAMETERS') {
                modifier = 'WITH PARAMETERS';
            } else {
                modifier = 'WITH TARGET';
            }
            break;
        case 7:
            modifier = 'WITH TARGET AND PARAMETERS';
            break;
        default:
    }
    var instruction = utilities.encodeInstruction('EXECUTE', modifier, index);
    this.bytecode.push(instruction);
};
