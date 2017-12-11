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
 * This class defines the Bali Virtual Machine™.
 */
var bytecode = require('bali-instruction-set/utilities/BytecodeUtilities');
var TaskContext = require('./TaskContext');
var MethodContext = require('./MethodContext');


/*
 * This class implements the Bali Virtual Machine.
 */
function VirtualMachine() {
    this.context = new TaskContext();
    return this;
}
VirtualMachine.prototype.constructor = VirtualMachine;
exports.VirtualMachine = VirtualMachine;


VirtualMachine.prototype.processMessage = function(type, target, parameters, instructions) {
    // initialize the context for this task
    this.context.pushDocument(type);
    if (target) this.context.pushDocument(target);
    if (parameters) this.context.pushDocument(parameters);
    this.context.pushMethod(target, instructions);

    // process the message
    while (this.context.isRunning()) {
        this.fetchInstruction();
        this.executeInstruction();
    }

    // determine the outcome of the processing
    if (this.context.isDone()) {
        // TODO: publish a completion event on the global event queue
    } else {
        // TODO: save the current task context in the Bali Document Repository
    }
};


VirtualMachine.prototype.fetchInstruction = function() {
    this.context.loadNextInstruction();
};


VirtualMachine.prototype.executeInstruction = function() {
    var methodContext = this.context.method();
    switch (methodContext.operation) {
        case 'JUMP':
            this.handleJumpInstruction();
            break;
        case 'LOAD':
            this.handleLoadInstruction();
            break;
        case 'STORE':
            this.handleStoreInstruction();
            break;
        case 'INVOKE':
            this.handleInvokeInstruction();
            break;
        case 'EXECUTE':
            this.handleExecuteInstruction();
            break;
        default:
            throw new Error('BALI VM: Invalid operation attempted: ' + methodContext.operation);
    }
};


VirtualMachine.prototype.handleJumpInstruction = function() {
};


VirtualMachine.prototype.handleLoadInstruction = function() {
};


VirtualMachine.prototype.handleStoreInstruction = function() {
};


VirtualMachine.prototype.handleInvokeInstruction = function() {
};


VirtualMachine.prototype.handleExecuteInstruction = function() {
};

