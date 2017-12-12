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
var elements = require('bali-language/elements');
var bytecode = require('bali-instruction-set/utilities/BytecodeUtilities');
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
    array: function(capacity) {},
    isFalse: function(document) {},
    isNone: function(document) {},
    isZero: function(document) {},
    table: function(capacity) {}
};


/**
 * This function processes a message using the Bali Virtual Machine™.
 * 
 * @param {Reference} typeReference A reference to the type containing the message definition.
 * @param {Reference} targetReference A reference to the target that supports the message.
 * @param {Symbol} message The symbol for the message to be processed.
 * @param {Composite} parameters The array or table of parameters that were passed with the message.
 */
exports.processMessage = function(typeReference, targetReference, message, parameters) {
    var type = cloud.readDocument(typeReference);
    var target = cloud.readDocument(targetReference);
    var virtualMachine = new VirtualMachine();
    var methodContext = new MethodContext(type, target, message, parameters);
    virtualMachine.taskContext.pushContext(methodContext);
    virtualMachine.processInstructions();
};


/**
 * This function continues processing a previous submitted message using the
 * Bali Virtual Machine™. The task context is retrieved from the Bali Document Repository™.
 * 
 * @param {Reference} taskReference A reference to an existing task context.
 */
exports.continueProcessing = function(taskReference) {
    var virtualMachine = new VirtualMachine(taskReference);
    virtualMachine.processInstructions();
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
    var method = this.taskContext.currentMethod();
    var operation = method.operation;
    var modifier = method.modifier;
    var operand = method.operand;
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
    if (method.isDone()) this.taskContext.popContext();
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
        '$result': this.taskContext.popDocument()
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
        case 'ON ZERO':
            this.jumpOnZero(address);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the JUMP instruction: ' + modifier);
    }
};


/**
 * This method handles the processing of a LOAD instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol table.
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
 * @param {number} index The index into the symbol table.
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
 * @param {number} index The index into the symbol table.
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
 * @param {number} index The index into the symbol table.
 */
VirtualMachine.prototype.handleExecuteInstruction = function(modifier, index) {
    switch (modifier) {
        case '':
            this.executeMethod(index);
            break;
        case 'WITH PARAMETERS':
            this.executeMethodWithParameters(index);
            break;
        case 'WITH TARGET':
            this.executeMethodWithTarget(index);
            break;
        case 'WITH TARGET AND PARAMETERS':
            this.executeMethodWithTargetAndParameters(index);
            break;
        default:
            throw new Error('BALI VM: Invalid modifier for the EXECUTE instruction: ' + modifier);
    }
};


VirtualMachine.prototype.jump = function(address) {
    if (address > 0) this.taskContext.currentMethod().instructionPointer = address;
};


VirtualMachine.prototype.jumpOnNone = function(address) {
    var document = this.taskContext.popDocument();
    if (intrinsics.isNone(document)) this.taskContext.currentMethod().instructionPointer = address;

};


VirtualMachine.prototype.jumpOnFalse = function(address) {
    var document = this.taskContext.popDocument();
    if (intrinsics.isFalse(document)) this.taskContext.currentMethod().instructionPointer = address;
};


VirtualMachine.prototype.jumpOnZero = function(address) {
    var document = this.taskContext.popDocument();
    if (intrinsics.isZero(document)) this.taskContext.currentMethod().instructionPointer = address;
};


VirtualMachine.prototype.loadLiteral = function(index) {
    var literal = this.taskContext.currentMethod().symbols.literals[index - 1];
    this.taskContext.pushDocument(literal);
};


VirtualMachine.prototype.loadDocument = function(index) {
    var reference = this.taskContext.currentMethod().symbols.references[index - 1];
    var document = cloud.readDocument(reference);
    this.taskContext.pushDocument(document);
};


VirtualMachine.prototype.loadMessage = function(index) {
    var reference = this.taskContext.currentMethod().symbols.references[index - 1];
    var message = cloud.readMessage(reference);
    if (message) {
        this.taskContext.pushDocument(message);
    } else {
        // set the task status to 'waiting'
        this.taskContext.wait();
        // make sure that the same instruction will be tried again
        this.taskContext.currentMethod().instructionPointer--;
    }
};


VirtualMachine.prototype.loadVariable = function(index) {
    var variable = this.taskContext.currentMethod().symbols.variables[index - 1];
    this.taskContext.pushDocument(variable);
};


VirtualMachine.prototype.storeDraft = function(index) {
    var reference = this.taskContext.currentMethod().symbols.references[index - 1];
    var document = this.taskContext.popDocument();
    cloud.writeDocument(reference, document);
};


VirtualMachine.prototype.storeDocument = function(index) {
    var reference = this.taskContext.currentMethod().symbols.references[index - 1];
    var document = this.taskContext.popDocument();
    cloud.commitDocument(reference, document);
};


VirtualMachine.prototype.storeMessage = function(index) {
    var reference = this.taskContext.currentMethod().symbols.references[index - 1];
    var message = this.taskContext.popDocument();
    cloud.writeMessage(message, reference);
};


VirtualMachine.prototype.storeVariable = function(index) {
    var variable = this.taskContext.popDocument();
    this.taskContext.currentMethod().symbols.variables[index - 1] = variable;
};


VirtualMachine.prototype.invokeIntrinsic = function(index, numberOfParameters) {
    var parameters = [];
    while (numberOfParameters-- > 0) parameters.push(this.taskContext.popDocument());
    var result = intrinsics[index - 1].apply(this, parameters);
    if (result) this.taskContext.pushDocument(result);
};


VirtualMachine.prototype.executeMethod = function(index) {
    var type = null;
    var target = null;
    var method = this.taskContext.currentMethod().symbols.methods[index - 1];
    var parameters = [];
    var newContext = new MethodContext(type, target, method, parameters);
    this.taskContext.pushContext(newContext);
};


VirtualMachine.prototype.executeMethodWithParameters = function(index) {
    var type = null;
    var target = null;
    var method = this.taskContext.currentMethod().symbols.methods[index - 1];
    var parameters = this.taskContext.popDocument();
    var newContext = new MethodContext(type, target, method, parameters);
    this.taskContext.pushContext(newContext);
};


VirtualMachine.prototype.executeMethodWithTarget = function(index) {
    var type = null;
    var target = this.taskContext.popDocument();
    var method = this.taskContext.currentMethod().symbols.methods[index - 1];
    var parameters = [];
    var newContext = new MethodContext(type, target, method, parameters);
    this.taskContext.pushContext(newContext);
};


VirtualMachine.prototype.executeMethodWithTargetAndParameters = function(index) {
    var type = null;
    var target = this.taskContext.popDocument();
    var method = this.taskContext.currentMethod().symbols.methods[index - 1];
    var parameters = this.taskContext.popDocument();
    var newContext = new MethodContext(type, target, method, parameters);
    this.taskContext.pushContext(newContext);
};
