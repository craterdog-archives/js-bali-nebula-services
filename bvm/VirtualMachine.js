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
// var intrinsics = require('../intrinsics');
var TaskContext = require('./TaskContext');
var ProcedureContext = require('./ProcedureContext');
// var cloud = require('bali-cloud-api');


// TODO: replace with require('bali-cloud-api')
var cloud = {
    readDocument: function(reference) {
        console.log('readDocument(' + reference + ')');
    },
    checkoutDocument: function(reference) {
        console.log('checkoutDocument(' + reference + ')');
    },
    saveDraft: function(reference, document) {
        console.log('saveDraft(' + reference + ', ' +  document + ')');
    },
    discardDraft: function(reference) {
        console.log('discardDraft(' + reference + ')');
    },
    commitDocument: function(reference, document) {
        console.log('commitDocument(' + reference + ', ' +  document + ')');
    },
    readMessage: function(reference) {
        console.log('readMessage(' + reference + ')');
    },
    writeMessage: function(reference, message) {
        console.log('writeMessage(' + reference + ', ' +  message + ')');
    },
    publishEvent: function(event) {
        console.log('publishEvent(' + event + ')');
    }
};

// TODO: replace with require('../intrinsics')
var intrinsics = {
    and: function() {},
    catalog: function() {},
    complement: function() {},
    conjugate: function() {},
    default: function() {},
    difference: function() {},
    equal: function() {},
    exponential: function() {},
    factorial: function() {},
    getValue: function() {},
    inverse: function() {},
    is: function() {},
    less: function() {},
    list: function() {},
    magnitude: function() {},
    matches: function() {},
    more: function() {},
    negative: function() {},
    or: function() {},
    product: function() {},
    quotient: function() {},
    range: function() {},
    remainder: function() {},
    sans: function() {},
    setParameters: function() {},
    setValue: function() {},
    sum: function() {},
    xor: function() {}
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
    this.context = this.taskContext.contexts.peek();
    return this;
}
VirtualMachine.prototype.constructor = VirtualMachine;
exports.VirtualMachine = VirtualMachine;


/**
 * This method processes the instructions in the current task until the end of the
 * instructions is reached or the task is waiting to receive a message from a queue
 * If the virtual machine is in a 'stepping' state for debugging, then this method
 * processes the next instruction only.
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
        // the task completed successfully or with an exception
        this.publishCompletionEvent();

    } else {
        // waiting on a message from a queue so stop for now
        this.saveState();
    }
};


/**
 * This method determines whether or not the virtual machine is ready to process
 * more instructions. When the current task is done, or waiting on a message from
 * a queue, the virtual machine is not ready.
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
 * This method retrieves the component that is on top of the component stack.
 * 
 * @returns {object} The component from the top of the component stack.
 */
VirtualMachine.prototype.getComponent = function() {
    return this.taskContext.popComponent();
};


/**
 * This method returns the element value associated with a specific index.
 * 
 * @param {number} index The index of the element in the symbol catalog.
 * @returns {Literal} The element value associated with the index.
 */
VirtualMachine.prototype.getElement = function(index) {
    return this.context.symbols.elements[index - 1];  // JS zero based indexing
};


/**
 * This method returns the code value associated with a specific index.
 * 
 * @param {number} index The index of the code in the symbol catalog.
 * @returns {Literal} The code value associated with the index.
 */
VirtualMachine.prototype.getCode = function(index) {
    return this.context.symbols.code[index - 1];  // JS zero based indexing
};


/**
 * This method returns the reference associated with a specific index.
 * 
 * @param {number} index The index of the reference in the symbol catalog.
 * @returns {Reference} The reference associated with the index.
 */
VirtualMachine.prototype.getReference = function(index) {
    return this.context.symbols.references[index - 1];  // JS zero based indexing
};


/**
 * This method returns the variable value associated with a specific index.
 * 
 * @param {number} index The index of the variable in the symbol catalog.
 * @returns {object} The variable value associated with the index.
 */
VirtualMachine.prototype.getVariable = function(index) {
    return this.context.symbols.variables[index - 1];  // JS zero based indexing
};


/**
 * This method sets the value of the variable associated with a specific index.
 * 
 * @param {number} index The index of the variable in the symbol catalog.
 * @param {object} value The value of the variable to be set.
 */
VirtualMachine.prototype.setVariable = function(index, value) {
    this.context.symbols.variables[index - 1] = value;  // JS zero based indexing
};


/**
 * This method returns the intrinsic name associated with a specific index.
 * 
 * @param {number} index The index of the intrinsic in the symbol catalog.
 * @returns {string} The intrinsic name value associated with the index.
 */
VirtualMachine.prototype.getIntrinsic = function(index) {
    return this.context.symbols.intrinsics[index - 1];  // JS zero based indexing
};


/**
 * This method returns the procedure name associated with a specific index.
 * 
 * @param {number} index The index of the procedure in the symbol catalog.
 * @returns {string} The procedure name value associated with the index.
 */
VirtualMachine.prototype.getProcedure = function(index) {
    return this.context.symbols.procedures[index - 1];  // JS zero based indexing
};


/**
 * This method places a component on top of the component stack.
 * 
 * @param {object} component The component.
 */
VirtualMachine.prototype.pushComponent = function(component) {
    this.taskContext.pushComponent(component);
};


/**
 * This method places a new procedure context on top of the context stack.
 * 
 * @param {ProcedureContex} context The new procedure context.
 */
VirtualMachine.prototype.pushContext = function(context) {
    this.taskContext.pushContext(context);
};


/**
 * This method removes the procedure context is was on top of the context stack.
 * 
 * @returns {ProcedureContex} The procedure context that was on top of the context stack.
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
 * This method fetches the next instruction for the current procedure into the
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
    var operation = this.context.operation;
    var modifier = this.context.modifier;
    var operand = this.context.operand;
    switch (operation) {
        case 'JUMP':
            this.processJumpInstruction(modifier, operand);
            break;
        case 'PUSH':
            this.processPushInstruction(modifier, operand);
            break;
        case 'POP':
            this.processPopInstruction(modifier);
            break;
        case 'LOAD':
            this.processLoadInstruction(modifier, operand);
            break;
        case 'STORE':
            this.processStoreInstruction(modifier, operand);
            break;
        case 'INVOKE':
            this.processInvokeInstruction(modifier, operand);
            break;
        case 'EXECUTE':
            this.processExecuteInstruction(modifier, operand);
            break;
        case 'HANDLE':
            this.processHandleInstruction(modifier);
            break;
    }
    if (this.context.isDone()) this.popContext();
};


/**
 * This method saves the current state of the task out to the Bali Document Repository™
 * so that processing on it can continue at a later time.
 */
VirtualMachine.prototype.saveState = function() {
    cloud.saveDraft(this.taskReference, this.taskContext);
};


/**
 * This method publishes a completion event for the current task to the Bali Event Queue™.
 * Any tasks that are waiting on that type of event will be notified asynchronously.
 */
VirtualMachine.prototype.publishCompletionEvent = function() {
    var event = {
        '$type': '$completion',
        '$task': this.taskReference,
        '$result': this.getComponent()
        // TODO: need to handle unhandled exceptions as well...
    };
    cloud.writeMessage(event, new elements.Reference('bali:/bali/EventQueue>'));
};


/**
 * This method handles the processing of a JUMP instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} address The address to be jumped to.
 */
VirtualMachine.prototype.processJumpInstruction = function(modifier, address) {
    switch (modifier) {
        case '':
            this.jumpOnAny(address);
            break;
        case 'ON NONE':
            this.jumpOnNone(address);
            break;
        case 'ON TRUE':
            this.jumpOnTrue(address);
            break;
        case 'ON FALSE':
            this.jumpOnFalse(address);
            break;
    }
};


/**
 * This method handles the processing of a PUSH instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} value The value to be pushed.
 */
VirtualMachine.prototype.processPushInstruction = function(modifier, value) {
    switch (modifier) {
        case 'HANDLER':
            this.pushAddress(value);
            break;
        case 'ELEMENT':
            this.pushElement(value);
            break;
        case 'CODE':
            this.pushCode(value);
            break;
    }
};


/**
 * This method handles the processing of a POP instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 */
VirtualMachine.prototype.processPopInstruction = function(modifier) {
    switch (modifier) {
        case 'HANDLER':
            this.popAddress();
            break;
        case 'COMPONENT':
            this.popComponent();
            break;
    }
};


/**
 * This method handles the processing of a LOAD instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.processLoadInstruction = function(modifier, index) {
    switch (modifier) {
        case 'VARIABLE':
            this.loadVariable(index);
            break;
        case 'DRAFT':
            this.loadDraft(index);
            break;
        case 'DOCUMENT':
            this.loadDocument(index);
            break;
        case 'MESSAGE':
            this.loadMessage(index);
            break;
    }
};


/**
 * This method handles the processing of a STORE instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.processStoreInstruction = function(modifier, index) {
    switch (modifier) {
        case 'VARIABLE':
            this.storeVariable(index);
            break;
        case 'DRAFT':
            this.storeDraft(index);
            break;
        case 'DOCUMENT':
            this.storeDocument(index);
            break;
        case 'MESSAGE':
            this.storeMessage(index);
            break;
    }
};


/**
 * This method handles the processing of a INVOKE instruction.
 * 
 * @param {number} numberOfParameters The number of parameters passed to the intrinsic function.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.processInvokeInstruction = function(numberOfParameters, index) {
    this.invokeIntrinsic(index, numberOfParameters);
};


/**
 * This method handles the processing of a EXECUTE instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 * @param {number} index The index into the symbol catalog.
 */
VirtualMachine.prototype.processExecuteInstruction = function(modifier, index) {
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
    }
};


/**
 * This method handles the processing of a HANDLE instruction.
 * 
 * @param {string} modifier The modifier for the operation.
 */
VirtualMachine.prototype.processHandleInstruction = function(modifier) {
    switch (modifier) {
        case 'RESULT':
            this.handleResult();
            break;
        case 'EXCEPTION':
            this.handleException();
            break;
    }
};


VirtualMachine.prototype.jumpOnAny = function(address) {
    // address === 0 means a SKIP INSTRUCTION (aka NOOP)
    if (address > 0) this.context.instructionPointer = address;
};


VirtualMachine.prototype.jumpOnNone = function(address) {
    var component = this.context.components.pop();
    if (component === elements.Template.NONE) this.context.instructionPointer = address;
};


VirtualMachine.prototype.jumpOnTrue = function(address) {
    var component = this.context.components.pop();
    if (component === elements.Probability.TRUE) this.context.instructionPointer = address;
};


VirtualMachine.prototype.jumpOnFalse = function(address) {
    var component = this.context.components.pop();
    if (component === elements.Probability.FALSE) this.context.instructionPointer = address;
};


VirtualMachine.prototype.pushAddress = function(address) {
    this.context.handlers.push(address);
};


VirtualMachine.prototype.pushElement = function(index) {
};


VirtualMachine.prototype.pushCode = function(index) {
};


VirtualMachine.prototype.popAddress = function() {
    this.context.handlers.pop();
};


VirtualMachine.prototype.popComponent = function() {
    this.context.components.pop();
};


VirtualMachine.prototype.loadVariable = function(index) {
    var variable = this.getVariable(index);
    this.pushComponent(variable);
};


VirtualMachine.prototype.loadDraft = function(index) {
    var literal = this.getLiteral(index);
    this.pushComponent(literal);
};


VirtualMachine.prototype.loadDocument = function(index) {
    var reference = this.getReference(index);
    var component = cloud.readDocument(reference);
    this.pushComponent(component);
};


VirtualMachine.prototype.loadMessage = function(index) {
    var reference = this.getReference(index);
    var message = cloud.readMessage(reference);
    if (message) {
        this.pushComponent(message);
    } else {
        // set the task status to 'waiting'
        this.pauseForMessage();
        // make sure that the same instruction will be tried again
        this.context.instructionPointer--;
    }
};


VirtualMachine.prototype.storeVariable = function(index) {
    var variable = this.getComponent();
    this.setVariable(index, variable);
};


VirtualMachine.prototype.storeDraft = function(index) {
    var reference = this.getReference(index);
    var draft = this.getComponent();
    cloud.saveDraft(reference, draft);
};


VirtualMachine.prototype.storeDocument = function(index) {
    var reference = this.getReference(index);
    var document = this.getComponent();
    cloud.commitDocument(reference, document);
};


VirtualMachine.prototype.storeMessage = function(index) {
    var reference = this.getReference(index);
    var message = this.getComponent();
    cloud.writeMessage(reference, message);
};


VirtualMachine.prototype.invokeIntrinsic = function(index, numberOfParameters) {
    // pop the parameters off the component stack
    var parameters = [];
    while (numberOfParameters-- > 0) parameters.push(this.getComponent());

    // execute the intrinsic function passing the parameters
    var result = intrinsics[index - 1].apply(this, parameters);

    // push the result of the function onto the top of the component stack
    this.pushComponent(result);
};


VirtualMachine.prototype.executeProcedure = function(index) {
    var typeReference = this.getComponent();
    var type = cloud.readDocument(typeReference);
    var target = null;
    var procedure = this.getProcedure(index);
    var parameters = [];
    var newContext = new ProcedureContext(type, target, procedure, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureWithParameters = function(index) {
    var typeReference = this.getComponent();
    var type = cloud.readDocument(typeReference);
    var target = null;
    var procedure = this.getProcedure(index);
    var parameters = this.getComponent();
    var newContext = new ProcedureContext(type, target, procedure, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureOnTarget = function(index) {
    var typeReference = this.getComponent();
    var type = cloud.readDocument(typeReference);
    var target = this.getComponent();
    var procedure = this.getProcedure(index);
    var parameters = [];
    var newContext = new ProcedureContext(type, target, procedure, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.executeProcedureOnTargetWithParameters = function(index) {
    var typeReference = this.getComponent();
    var type = cloud.readDocument(typeReference);
    var target = this.getComponent();
    var procedure = this.getProcedure(index);
    var parameters = this.getComponent();
    var newContext = new ProcedureContext(type, target, procedure, parameters);
    this.pushContext(newContext);
};


VirtualMachine.prototype.handleResult = function() {
};


VirtualMachine.prototype.handleException = function() {
};

