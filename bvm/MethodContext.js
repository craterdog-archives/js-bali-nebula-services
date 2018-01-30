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
 * This class defines the context for a method that is being executed by the
 * the Bali Virtual Machine™.
 */
var bytecode = require('../utilities/BytecodeUtilities');


/**
 * This constructor creates a method context for a function or document message.
 * 
 * @constructor
 * @param {object} type The type containing the method definition.
 * @param {object} target The optional target on which the method operates.
 * @param {string} method The name of the method to be executed.
 * @param {object} parameters The array or table of parameters that were passed to the method.
 * @returns {MethodContext} The new method context.
 */
function MethodContext(type, target, method, parameters) {
    this.type = type;
    this.target = target;
    this.literals = {};  // TODO: initialize from type
    this.variables = {};  // TODO: initialize from type
    this.references = {};  // TODO: initialize from type
    this.procedures = {};  // TODO: initialize from type
    this.instructions = this.procedures[method].instructions;
    this.instructionPointer = 1;  // Bali unit based indexing
    this.operation = null;
    this.modifier = null;
    this.operand = 0;
    return this;
}
MethodContext.prototype.constructor = MethodContext;
exports.MethodContext = MethodContext;


/**
 * This method determines whether or not the processing of this instruction is done.
 * 
 * @returns {boolean} Whether or not the processing is done.
 */
MethodContext.prototype.isDone = function() {
    return this.instructionPointer > this.instructions.length;
};


/**
 * This method loads the next instruction in this method and decodes its operation,
 * modifier, and operand.
 */
MethodContext.prototype.loadNextInstruction = function() {
    var instruction = this.instructions[this.instructionPointer++ - 1];  // JS zero based indexing
    this.operation = bytecode.decodeOperation(instruction);
    this.modifier = bytecode.decodeModifier(instruction);
    this.operand = bytecode.decodeOperand(instruction);
};
