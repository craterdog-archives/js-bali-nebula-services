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

/*
 * This class defines a analyzing visitor that "walks" a parse tree
 * produced by the BaliInstructionSetParser and generates a symbol
 * table from the corresponding Bali virtual machine instructions.
 */

/**
 * This constructor creates a new instruction analyzer.
 * 
 * @constructor
 * @param {object} context The method context for the instructions being
 * analyzed. 
 * @returns {InstructionSetAnalyzer} The new analyzer.
 */
function InstructionSetAnalyzer(context) {
    this.context = context;
    return this;
}
InstructionSetAnalyzer.prototype.constructor = InstructionSetAnalyzer;
exports.InstructionSetAnalyzer = InstructionSetAnalyzer;


/**
 * This method analyzes a parse tree structure containing instructions
 * and extracts context information that will be needed by the assembler
 * to generate the bytecode.
 * 
 * @param {object} instructions The parse tree structure to be analyzed.
 */
InstructionSetAnalyzer.prototype.analyzeInstructions = function(instructions) {
    var visitor = new AnalyzerVisitor(this.context);
    instructions.accept(visitor);
};


// PRIVATE CLASSES

function AnalyzerVisitor(context) {
    BaliInstructionSetVisitor.call(this);
    this.context = context;
    this.address = 1;  // bali VM unit based addressing
    return this;
}
AnalyzerVisitor.prototype = Object.create(BaliInstructionSetVisitor.prototype);
AnalyzerVisitor.prototype.constructor = AnalyzerVisitor;


// instructions: (prefix? instruction NEWLINE)*
AnalyzerVisitor.prototype.visitInstructions = function(ctx) {
    this.visitChildren(ctx);
};


// prefix: NEWLINE LABEL ':' NEWLINE
AnalyzerVisitor.prototype.visitPrefix = function(ctx) {
    var label = ctx.LABEL().getText();
    this.context.addresses[label] = this.address;
};


// instruction:
//     skipInstruction |
//     jumpInstruction |
//     loadInstruction |
//     storeInstruction |
//     invokeInstruction |
//     executeInstruction
AnalyzerVisitor.prototype.visitInstruction = function(ctx) {
    ctx.children[0].accept(this);
    this.address++;
};


// skipInstruction: 'SKIP' 'INSTRUCTION'
AnalyzerVisitor.prototype.visitSkipInstruction = function(ctx) {
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE' |
//     'JUMP' 'TO' LABEL 'ON' 'ZERO'
AnalyzerVisitor.prototype.visitJumpInstruction = function(ctx) {
};


// loadInstruction:
//     'LOAD' 'LITERAL' LITERAL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL |
//     'LOAD' 'VARIABLE' SYMBOL
AnalyzerVisitor.prototype.visitLoadInstruction = function(ctx) {
    var modifier = ctx.children[1].getText();
    var value = ctx.children[2].getText();  // get symbol or literal
    var type;
    switch(modifier) {
        case 'LITERAL':
            type = 'literals';
            break;
        case 'DOCUMENT':
        case 'MESSAGE':
            type = 'references';
            break;
        case 'VARIABLE':
            type = 'variables';
            break;
        default:
            throw new Error('ANALYZER: Illegal modifier for the LOAD instruction: ' + modifier);
    }
    if (!this.context[type].includes(value)) {
        this.context[type].push(value);
    }
};


// storeInstruction:
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL |
//     'STORE' 'VARIABLE' SYMBOL
AnalyzerVisitor.prototype.visitStoreInstruction = function(ctx) {
    var modifier = ctx.children[1].getText();
    var symbol = ctx.SYMBOL().getText();
    var type;
    switch(modifier) {
        case 'DRAFT':
        case 'DOCUMENT':
        case 'MESSAGE':
            type = 'references';
            break;
        case 'VARIABLE':
            type = 'variables';
            break;
        default:
            throw new Error('ANALYZER: Illegal modifier for the STORE instruction: ' + modifier);
    }
    if (!this.context[type].includes(symbol)) {
        this.context[type].push(symbol);
    }
};


// invokeInstruction:
//     'INVOKE' 'INTRINSIC' SYMBOL |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AnalyzerVisitor.prototype.visitInvokeInstruction = function(ctx) {
    var symbol = ctx.SYMBOL().getText();
    if (!this.context.intrinsics.includes(symbol)) {
        this.context.intrinsics.push(symbol);
    }
};


// executeInstruction:
//     'EXECUTE' 'METHOD' SYMBOL |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'TARGET' |
//     'EXECUTE' 'METHOD' SYMBOL 'WITH' 'TARGET' 'AND' 'PARAMETERS'
AnalyzerVisitor.prototype.visitExecuteInstruction = function(ctx) {
    var symbol = ctx.SYMBOL().getText();
    if (!this.context.methods.includes(symbol)) {
        this.context.methods.push(symbol);
    }
};
