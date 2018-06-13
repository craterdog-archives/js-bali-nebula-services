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

/**
 * This library provides functions that scan assembly instructions for the
 * Bali Virtual Machine™ extracting useful information about symbols and
 * addresses.
 */
var types = require('bali-instruction-set/syntax/InstructionTypes');


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure containing assembly
 * instructions and extracts label information that will be needed by the
 * assembler to generate the bytecode.
 * 
 * @param {object} procedure The parse tree structure for the procedure.
 * @returns {object} The symbol table for the procedure.
 */
exports.extractSymbols = function(procedure) {
    var visitor = new ScanningVisitor();
    procedure.accept(visitor);
    return visitor.symbols;
};


// PRIVATE CLASSES

function ScanningVisitor() {
    this.symbols = {
        addresses: {},
        literals: [],
        variables: [],
        references: [],
        intrinsics: [],
        procedures: []
    };
    this.address = 1;  // bali VM unit based addressing
    return this;
}
ScanningVisitor.prototype.constructor = ScanningVisitor;


// procedure: NEWLINE* step* NEWLINE* EOF;
ScanningVisitor.prototype.visitProcedure = function(procedure) {
    var steps = procedure.steps;
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        step.accept(this);
    }
};


// step: label? instruction NEWLINE;
ScanningVisitor.prototype.visitStep = function(step) {
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
ScanningVisitor.prototype.visitJumpInstruction = function(instruction) {
    this.address++;
};


// pushInstruction:
//     'PUSH' 'HANDLER' LABEL |
//     'PUSH' 'ELEMENT' LITERAL |
//     'PUSH' 'CODE' LITERAL
ScanningVisitor.prototype.visitPushInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var value = instruction.operand;
    switch (modifier) {
        case types.ELEMENT:
        case types.CODE:
            if (!this.symbols.literals.includes(value)) this.symbols.literals.push(value);
            break;
    }
    this.address++;
};


// popInstruction:
//     'POP' 'HANDLER' |
//     'POP' 'COMPONENT'
ScanningVisitor.prototype.visitPopInstruction = function(instruction) {
    this.address++;
};


// loadInstruction:
//     'LOAD' 'VARIABLE' SYMBOL |
//     'LOAD' 'DOCUMENT' SYMBOL |
//     'LOAD' 'DRAFT' SYMBOL |
//     'LOAD' 'MESSAGE' SYMBOL
ScanningVisitor.prototype.visitLoadInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var type;
    switch(modifier) {
        case types.VARIABLE:
            type = 'variables';
            break;
        case types.DOCUMENT:
        case types.DRAFT:
        case types.MESSAGE:
            type = 'references';
            break;
    }
    if (!this.symbols[type].includes(symbol)) {
        this.symbols[type].push(symbol);
    }
    this.address++;
};


// storeInstruction:
//     'STORE' 'VARIABLE' SYMBOL |
//     'STORE' 'DOCUMENT' SYMBOL |
//     'STORE' 'DRAFT' SYMBOL |
//     'STORE' 'MESSAGE' SYMBOL
ScanningVisitor.prototype.visitStoreInstruction = function(instruction) {
    var modifier = instruction.modifier;
    var symbol = instruction.operand;
    var type;
    switch(modifier) {
        case types.VARIABLE:
            type = 'variables';
            break;
        case types.DOCUMENT:
        case types.DRAFT:
        case types.MESSAGE:
            type = 'references';
            break;
    }
    if (!this.symbols[type].includes(symbol)) {
        this.symbols[type].push(symbol);
    }
    this.address++;
};


// invokeInstruction:
//     'INVOKE' SYMBOL |
//     'INVOKE' SYMBOL 'WITH' 'PARAMETER' |
//     'INVOKE' SYMBOL 'WITH' NUMBER 'PARAMETERS'
ScanningVisitor.prototype.visitInvokeInstruction = function(instruction) {
    var symbol = instruction.operand;
    if (!this.symbols.intrinsics.includes(symbol)) {
        this.symbols.intrinsics.push(symbol);
    }
    this.address++;
};


// executeInstruction:
//     'EXECUTE' SYMBOL |
//     'EXECUTE' SYMBOL 'WITH' 'PARAMETERS' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' |
//     'EXECUTE' SYMBOL 'ON' 'TARGET' 'WITH' 'PARAMETERS'
ScanningVisitor.prototype.visitExecuteInstruction = function(instruction) {
    var symbol = instruction.operand;
    if (!this.symbols.procedures.includes(symbol)) {
        this.symbols.procedures.push(symbol);
    }
    this.address++;
};


// handleInstruction:
//     'HANDLE' 'EXCEPTION' |
//     'HANDLE' 'RESULT'
ScanningVisitor.prototype.visitHandleInstruction = function(instruction) {
    this.address++;
};
