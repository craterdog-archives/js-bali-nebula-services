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
var bytecode = require('bali-instruction-set/utilities/BytecodeUtilities');


/**
 * This constructor creates a method context for a function or document message.
 * 
 * @constructor
 * @param {object} target The optional target on which the method operates.
 * @param {array} instructions The bytecode array containing the instructions for the method. 
 * @returns {MethodContext} The new method context.
 */
function MethodContext(target, instructions) {
    if (instructions === undefined || instructions.constructor.name !== 'Array') {
        throw new Error('A method context cannot be created without a valid instructions bytecode array.');
    }
    this.target = target;
    this.instructionPointer = 1;
    this.operation = null;
    this.modifier = null;
    this.operand = 0;
    this.instructions = instructions;
    return this;
}
MethodContext.prototype.constructor = MethodContext;
exports.MethodContext = MethodContext;


/**
 * This method loads the next instruction in this method and decodes its operation,
 * modifier, and operand.
 */
MethodContext.prototype.loadNextInstruction = function() {
    var instruction = this.instructions[this.instructionPointer++];
    this.operation = bytecode.decodeOperation(instruction);
    this.modifier = bytecode.decodeModifier(instruction);
    this.operand = bytecode.decodeOperand(instruction);
};
