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

/*
 * This class defines a analyzing visitor that "walks" a parse tree
 * produced by the BaliInstructionSetParser and generates a symbol
 * catalog from the corresponding Bali virtual machine instructions.
 */

/**
 * This constructor creates a new instruction analyzer.
 * 
 * @constructor
 * @param {object} symbols The set of symbol catalogs for the instructions being
 * analyzed. 
 * @returns {ProcedureAnalyzer} The new analyzer.
 */
function ProcedureAnalyzer(symbols) {
    this.symbols = symbols;
    return this;
}
ProcedureAnalyzer.prototype.constructor = ProcedureAnalyzer;
exports.ProcedureAnalyzer = ProcedureAnalyzer;


/**
 * This method analyzes a parse tree structure containing instructions
 * and extracts label information that will be needed by the assembler
 * to generate the bytecode.
 * 
 * @param {object} instructions The parse tree structure to be analyzed.
 */
ProcedureAnalyzer.prototype.analyzeProcedure = function(instructions) {
    var visitor = new AnalyzerVisitor(this.symbols);
    instructions.accept(visitor);
};


// PRIVATE CLASSES

function AnalyzerVisitor(symbols) {
    this.symbols = symbols;
    this.address = 1;  // bali VM unit based addressing
    return this;
}
AnalyzerVisitor.prototype.constructor = AnalyzerVisitor;


// procedure: NEWLINE* step* NEWLINE* EOF;
AnalyzerVisitor.prototype.visitProcedure = function(procedure) {
    var steps = procedure.steps;
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        step.accept(this);
    }
};


// step: label? instruction NEWLINE;
AnalyzerVisitor.prototype.visitStep = function(step) {
    var label = step.label;
    if (label) {
        this.symbols.addresses[label] = this.address;
    }
    step.instruction.accept(this);
};


// skipInstruction: 'SKIP' 'INSTRUCTION'
AnalyzerVisitor.prototype.visitSkipInstruction = function(instruction) {
    this.address++;
};


// jumpInstruction:
//     'JUMP' 'TO' LABEL |
//     'JUMP' 'TO' LABEL 'ON' 'NONE' |
//     'JUMP' 'TO' LABEL 'ON' 'TRUE' |
//     'JUMP' 'TO' LABEL 'ON' 'FALSE'
AnalyzerVisitor.prototype.visitJumpInstruction = function(instruction) {
    this.address++;
};


// loadInstruction:
//     'LOAD' 'LITERAL' LITERAL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL |
//     'LOAD' 'VARIABLE' SYMBOL
AnalyzerVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.value;
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
    if (!this.symbols[type].includes(value)) {
        this.symbols[type].push(value);
    }
    this.address++;
};


// storeInstruction:
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL |
//     'STORE' 'VARIABLE' SYMBOL
AnalyzerVisitor.prototype.visitStoreInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.symbol;
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
    if (!this.symbols[type].includes(symbol)) {
        this.symbols[type].push(symbol);
    }
    this.address++;
};


// invokeInstruction:
//     'INVOKE' 'INTRINSIC' SYMBOL |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' 'INTRINSIC' SYMBOL 'WITH' NUMBER 'PARAMETERS'
AnalyzerVisitor.prototype.visitInvokeInstruction = function(instruction) {
    var symbol = instruction.symbol;
    if (!this.symbols.intrinsics.includes(symbol)) {
        this.symbols.intrinsics.push(symbol);
    }
    this.address++;
};


// executeInstruction:
//     'EXECUTE' 'PROCEDURE' SYMBOL |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' 'PROCEDURE' SYMBOL 'ON' 'TARGET' 'WITH' 'PARAMETERS'
AnalyzerVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var symbol = instruction.symbol;
    if (!this.symbols.procedures.includes(symbol)) {
        this.symbols.procedures.push(symbol);
    }
    this.address++;
};
