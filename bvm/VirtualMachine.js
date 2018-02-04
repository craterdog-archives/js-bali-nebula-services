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
var elements = require('../elements');
var TaskContext = require('./TaskContext');
var MethodContext = require('./MethodContext');

// TODO: replace with require('bali-virtual-machine/cloud')
var cloud = {
    readDocument: function(reference) {},
    checkoutDocument: function(reference) {},
    discardDocument: function(reference) {},
    writeDocument: function(reference, document) {},
    commitDocument: function(reference, document) {},
    readMessage: function(reference) {},
    writeMessage: function(message, reference) {}
};

// TODO: replace with require('bali-primitives/intrinsics')
var intrinsics = {
    list: function(capacity) {},
    isFalse: function(document) {},
    isNone: function(document) {},
    isTrue: function(document) {},
    catalog: function(capacity) {}
};


/**
 * This constructor creates a new Bali Virtual Machine™ using a reference to an existing
 * task context if possible.
 * 
 * @param {Reference} taskReference A reference to an existing task context.
 * @returns {VirtualMachine} The new virtual machine.
 */
function VirtualMachine(taskReference) {
    if (taskReference) {
        this.taskReference = taskReference;
        this.taskContext = cloud.readDocument(taskReference);
    } else {
        this.taskReference = new elements.Reference('bali:/#' + new elements.Tag());
        this.taskContext = new TaskContext();
    }
    return this;
}
VirtualMachine.prototype.constructor = VirtualMachine;
exports.VirtualMachine = VirtualMachine;


/**
 * This method processes the instructions in the current task until the end of the
 * instructions is reached or the task is waiting to receive a message from another
 * task. If the virtual machine is in a 'stepping' state for debugging, then this
 * method processes the next instruction only.
 */
VirtualMachine.prototype.processInstructions = function() {
    // process the instructions
    while (this.isReady()) {
        this.fetchInstruction();
        this.executeInstruction();
        // check for debug mode
        if (this.isStepping()) break;  // after a each instruction
    }

    // determine the outcome of the processing
    if (this.isDone()) {
        // the task completed either successfully or with an exception
        this.publishCompletionEvent();
    } else {
        // waiting on a message from another task so stop for now
        this.saveState();
    }
};


/**
 * This method determines whether or not the virtual machine is ready to process
 * more instructions. When the current task is done, or waiting on a message from
 * another task, the virtual machine is not ready.
 * 
 * @returns {boolean} Whether or not the virtual machine is ready to process more
 * instructions.
 */
VirtualMachine.prototype.isReady = function() {
    return this.taskContext.isRunning() || this.taskContext.isStepping();
};


/**
 * This method determines whether or not the virtual machine is single stepping
 * the instructions. This is true when the task is being debugged.
 * 
 * @returns {boolean} Whether or not the virtual machine is single stepping
 * instructions.
 */
VirtualMachine.prototype.isStepping = function() {
    return this.taskContext.isStepping();
};


/**
 * This method determines whether or not the virtual machine is done processing
 * the instructions. The virtual machine is done when it reaches the end of the
 * instructions or when an exception is thrown.
 * 
 * @returns {boolean} Whether or not the virtual machine is single stepping
 * instructions.
 */
VirtualMachine.prototype.isDone = function() {
    return this.taskContext.isDone();
};


/**
 * This method retrieves the document that is on top of the execution stack.
 * 
 * @returns {object} The document from the top of the execution stack.
 */
VirtualMachine.prototype.getDocument = function() {
    return this.taskContext.popDocument();
};


/**
 * This method returns the literal value associated with a specific index.
 * 
 * @param {number} index The index of the literal in the symbol catalog.
 * @returns {Literal} The literal value associated with the index.
 */
VirtualMachine.prototype.getLiteral = function(index) {
    return this.currentContext().symbols.literals[index - 1];  // JS zero based indexing
};


/**
 * This method returns the reference associated with a specific index.
 * 
 * @param {number} index The index of the reference in the symbol catalog.
 * @returns {Reference} The reference associated with the index.
 */
VirtualMachine.prototype.getReference = function(index) {
    return this.currentContext().symbols.references[index - 1];  // JS zero based indexing
};


/**
 * This method returns the variable value associated with a specific index.
 * 
 * @param {number} index The index of the variable in the symbol catalog.
 * @returns {object} The variable value associated with the index.
 */
VirtualMachine.prototype.getVariable = function(index) {
    return this.currentContext().symbols.variables[index - 1];  // JS zero based indexing
};


/**
 * This method sets the value of the variable associated with a specific index.
 * 
 * @param {number} index The index of the variable in the symbol catalog.
 * @param {object} value The value of the variable to be set.
 */
VirtualMachine.prototype.setVariable = function(index, value) {
    this.currentContext().symbols.variables[index - 1] = value;  // JS zero based indexing
};


/**
 * This method returns the method name associated with a specific index.
 * 
 * @param {number} index The index of the method in the symbol catalog.
 * @returns {string} The method name value associated with the index.
 */
VirtualMachine.prototype.getMethod = function(index) {
    return this.currentContext().symbols.procedures[index - 1];  // JS zero based indexing
};


/**
 * This method places a document on top of the execution stack.
 * 
 * @param {object} document The document.
 */
VirtualMachine.prototype.pushDocument = function(document) {
    this.taskContext.pushDocument(document);
};


/**
 * This method places a new method context on top of the context stack.
 * 
 * @param {MethodContex} context The new method context.
 */
VirtualMachine.prototype.pushContext = function(context) {
    this.taskContext.pushContext(context);
};


/**
 * This method returns the method context that is on top of the context stack.
 * 
 * @returns {MethodContex} The current method context.
 */
VirtualMachine.prototype.currentContext = function() {
    return this.taskContext.currentContext();
};


/**
 * This method removes the method context is was on top of the context stack.
 * 
 * @returns {MethodContex} The method context that was on top of the context stack.
 */
VirtualMachine.prototype.popContext = function() {
    return this.taskContext.popContext();
};


/**
 * This method tells the virtual machine to pause its processing until a message
 * arrives from another task.
 */
VirtualMachine.prototype.pauseForMessage = function() {
    this.taskContext.wait();
};


/**
 * This method fetches the next instruction for the current method into the
 * virtual machine.
 */
VirtualMachine.prototype.fetchInstruction = function() {
    this.taskContext.loadNextInstruction();
};


/**
 * This method executes the instruction that was last fetched into the virtual
 * machine.
 */
VirtualMachine.prototype.executeInstruction = function() {
    var context = this.currentContext();
    var operation = context.operation;
    var modifier = context.modifier;
    var operand = context.operand;
    switch (operation) {
        case 'JUMP':
            this.handleJumpInstruction(modifier, operand);
            break;
        case 'LOAD':
            this.handleLoadInstruction(modifier, operand);
            break;
        case 'STORE':
            this.handleStoreInstruction(modifier, operand);
            break;
        case 'INVOKE':
            this.handleInvokeInstruction(modifier, operand);
            break;
        case 'EXECUTE':
            this.handleExecuteInstruction(modifier, operand);
            break;
        default:
            throw new Error('BALI VM: Invalid operation attempted: ' + operation);
    }
    if (context.isDone()) this.popContext();
};


/**
 * This method saves the current state of the task out to the Bali Document Repository™
 * so that processing on it can continue at a later time.
 */
VirtualMachine.prototype.saveState = function() {
    cloud.writeDocument(this.taskReference, this.taskContext);
};


/**
 * This method publishes a completion event for the current task to the Bali Event Queue™.
 * Any tasks that are waiting on that type of event will be notified asynchronously.
 */
VirtualMachine.prototype.publishCompletionEvent = function() {
    var event = {
        '$type': '$completion',
        '$task': this.taskReference,
        '$result': this.getDocument()
        // TODO: need to handle exceptions as well...
    };
    cloud.writeMessage(event, new elements.Reference('bali:/bali/EventQueue>'));
};


/**
 * This method handles the processing of a JUMP instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} address The address to be jumped to.
 */
VirtualMachine.prototype.handleJumpInstruction = function(modifier, address) {
    switch (modifier) {
        case '':
            this.jump(address);
            break;
        case 'ON NONE':
            this.jumpOnNone(address);
            break;
        case 'ON FALSE':
            this.jumpOnFalse(address);
            break;
        case 'ON TRUE':
            this.jumpOnTrue(address);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the JUMP instruction: ' + modifier);
    }
};


/**
 * This method handles the processing of a LOAD instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.handleLoadInstruction = function(modifier, index) {
    switch (modifier) {
        case 'LITERAL':
            this.loadLiteral(index);
            break;
        case 'DOCUMENT':
            this.loadDocument(index);
            break;
        case 'MESSAGE':
            this.loadMessage(index);
            break;
        case 'VARIABLE':
            this.loadVariable(index);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the LOAD instruction: ' + modifier);
    }
};


/**
 * This method handles the processing of a STORE instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.handleStoreInstruction = function(modifier, index) {
    switch (modifier) {
        case 'DRAFT':
            this.storeDraft(index);
            break;
        case 'DOCUMENT':
            this.storeDocument(index);
            break;
        case 'MESSAGE':
            this.storeMessage(index);
            break;
        case 'VARIABLE':
            this.storeVariable(index);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the STORE instruction: ' + modifier);
    }
};


/**
 * This method handles the processing of a INVOKE instruction.
 * 
 * @param {number} numberOfParameters The number of parameters passed to the intrinsic function.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.handleInvokeInstruction = function(numberOfParameters, index) {
    switch (numberOfParameters) {
        case 0:
        case 1:
        case 2:
        case 3:
            this.invokeIntrinsic(index, numberOfParameters);
            break;
        default:
            throw new Error('BALI VM: Invalid number of arguments for the INVOKE instruction: ' + numberOfParameters);
    }
};


/**
 * This method handles the processing of a EXECUTE instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.handleExecuteInstruction = function(modifier, index) {
    switch (modifier) {
        case '':
            this.executeProcedure(index);
            break;
        case 'WITH PARAMETERS':
            this.executeProcedureWithParameters(index);
            break;
        case 'ON TARGET':
            this.executeProcedureOnTarget(index);
            break;
        case 'ON TARGET WITH PARAMETERS':
            this.executeProcedureOnTargetWithParameters(index);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the EXECUTE instruction: ' + modifier);
    }
};


VirtualMachine.prototype.jump = function(address) {
    if (address > 0) this.currentContext().instructionPointer = address;
};


VirtualMachine.prototype.jumpOnNone = function(address) {
    var document = this.getDocument();
    if (intrinsics.isNone(document)) this.currentContext().instructionPointer = address;

};


VirtualMachine.prototype.jumpOnFalse = function(address) {
    var document = this.getDocument();
    if (intrinsics.isFalse(document)) this.currentContext().instructionPointer = address;
};


VirtualMachine.prototype.jumpOnTrue = function(address) {
    var document = this.getDocument();
    if (intrinsics.isTrue(document)) this.currentContext().instructionPointer = address;
};


VirtualMachine.prototype.loadLiteral = function(index) {
    var literal = this.getLiteral(index);
    this.pushDocument(literal);
};


VirtualMachine.prototype.loadDocument = function(index) {
    var reference = this.getReference(index);
    var document = cloud.readDocument(reference);
    this.pushDocument(document);
};


VirtualMachine.prototype.loadMessage = function(index) {
    var reference = this.getReference(index);
    var message = cloud.readMessage(reference);
    if (message) {
        this.pushDocument(message);
    } else {
        // set the task status to 'waiting'
        this.pauseForMessage();
        // make sure that the same instruction will be tried again
        this.currentContext().instructionPointer--;
    }
};


VirtualMachine.prototype.loadVariable = function(index) {
    var variable = this.getVariable(index);
    this.pushDocument(variable);
};


VirtualMachine.prototype.storeDraft = function(index) {
    var reference = this.getReference(index);
    var document = this.getDocument();
    cloud.writeDocument(reference, document);
};


VirtualMachine.prototype.storeDocument = function(index) {
    var reference = this.getReference(index);
    var document = this.getDocument();
    cloud.commitDocument(reference, document);
};


VirtualMachine.prototype.storeMessage = function(index) {
    var reference = this.getReference(index);
    var message = this.getDocument();
    cloud.writeMessage(message, reference);
};


VirtualMachine.prototype.storeVariable = function(index) {
    var variable = this.getDocument();
    this.setVariable(index, variable);
};


VirtualMachine.prototype.invokeIntrinsic = function(index, numberOfParameters) {
    var parameters = [];
    while (numberOfParameters-- > 0) parameters.push(this.getDocument());
    var result = intrinsics[index - 1].apply(this, parameters);
    if (result) this.pushDocument(result);
};


VirtualMachine.prototype.executeProcedure = function(index) {
    var typeReference = this.getDocument();
    var type = cloud.readDocument(typeReference);
    var target = null;
    var method = this.getMethod(index);
    var parameters = [];
    var newContext = new MethodContext(type, target, method, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureWithParameters = function(index) {
    var typeReference = this.getDocument();
    var type = cloud.readDocument(typeReference);
    var target = null;
    var method = this.getMethod(index);
    var parameters = this.getDocument();
    var newContext = new MethodContext(type, target, method, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureOnTarget = function(index) {
    var typeReference = this.getDocument();
    var type = cloud.readDocument(typeReference);
    var target = this.getDocument();
    var method = this.getMethod(index);
    var parameters = [];
    var newContext = new MethodContext(type, target, method, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureOnTargetWithParameters = function(index) {
    var typeReference = this.getDocument();
    var type = cloud.readDocument(typeReference);
    var target = this.getDocument();
    var method = this.getMethod(index);
    var parameters = this.getDocument();
    var newContext = new MethodContext(type, target, method, parameters);
    this.pushContext(newContext);
};
