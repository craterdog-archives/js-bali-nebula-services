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
var language = require('bali-language/BaliLanguage');
var intrinsics = require('../intrinsics/IntrinsicFunctions');
var elements = require('../elements');
var collections = require('../collections');
var bytecode = require('../utilities/BytecodeUtilities');
var generator = require('../transformers/ParseTreeGenerator');
var TaskContext = require('./TaskContext');
var ProcedureContext = require('./ProcedureContext');
// var cloud = require('bali-cloud-api');
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
    receiveMessage: function(reference) {
        console.log('receiveMessage(' + reference + ')');
    },
    sendMessage: function(reference, message) {
        console.log('sendMessage(' + reference + ', ' +  message + ')');
    },
    publishEvent: function(event) {
        console.log('publishEvent(' + event + ')');
    }
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
        this.taskContext = cloud.readDraft(taskReference);
        this.procedureContext = this.taskContext.procedures.getTop();
    } else {
        this.taskReference = new elements.Reference('bali:/' + new elements.Tag());
        this.taskContext = new TaskContext();
    }
    return this;
}
VirtualMachine.prototype.constructor = VirtualMachine;
exports.VirtualMachine = VirtualMachine;


/**
 * This method processes the instructions in the current task until the end of the
 * instructions is reached or the task is waiting to receive a message from a queue
 * If the virtual machine is in a single step mode, then this method processes the
 * next instruction only.
 */
VirtualMachine.prototype.processInstructions = function() {
    // process the instructions
    while (this.taskContext.status === TaskContext.ACTIVE) {
        // fetch the next instruction
        var instruction = this.fetchNextInstruction();
        // execute the next instruction
        this.executeNextInstruction(instruction);
        // check for single step mode
        if (this.taskContext.stepping) break;  // after a each instruction
    }
    // determine the outcome of the processing
    if (this.taskContext.status === TaskContext.DONE) {
        // the task completed successfully or with an exception so notify any interested parties
        this.publishCompletionEvent();
    } else {
        // waiting on a message from a queue or single stepping so save the task state in the
        // cloud document repository
        this.saveTaskState();
    }
};


/**
 * This method fetches the next bytecode instruction from the current procedure context.
 * 
 * @returns {Number} The next 16 bit bytecode instruction.
 */
VirtualMachine.prototype.fetchNextInstruction = function() {
    // increment the address pointer
    this.procedureContext.address++;

    // load the next instruction from the current procedure context
    var instruction = this.procedureContext.instructions.getItem(this.procedureContext.address).toNumber();
    return instruction;
};


/**
 * This method executes the next bytecode instruction.
 * 
 * @param {Number} instruction The 16 bit bytecode instruction to be executed.
 */
VirtualMachine.prototype.executeNextInstruction = function(instruction) {
    // decode the bytecode instruction
    var operation = bytecode.decodeOperation(instruction);
    var modifier = bytecode.decodeModifier(instruction);
    var operand = bytecode.decodeOperand(instruction);
    // pass execution off to the correct operation handler
    var index = (operation << 2) | modifier;
    this.instructionHandlers[index](operand);
};


/**
 * This method publishes a task completion event to the global event queue.
 */
VirtualMachine.prototype.publishCompletionEvent = function() {
    var event = '[\n' +
        '    $type: $completion\n' +
        '    $task: ' + this.taskReference + '\n' +
        '    $result: ' + this.result + '\n' +
        '    $exception: ' + this.exception + '\n' +
        ']';
    cloud.publishEvent(event);
};


VirtualMachine.prototype.saveTaskState = function() {
    // generate a parse tree from the task context
    var tree = generator.generateParseTree(this.taskContext);
    // format the parse tree into a document
    var context = language.formatParseTree(tree);
    // save the document in the cloud
    cloud.writeDraft(this.taskReference, context);
};


VirtualMachine.prototype.instructionHandlers = [
    // JUMP TO label
    function(operand) {
        var address = operand;
        // if the address is not zero then use it as the next instruction to be executed,
        // otherwise it is a SKIP INSTRUCTION (aka NOOP)
        if (address) {
            this.procedureContext.address = address;
        }
    },

    // JUMP TO label ON NONE
    function(operand) {
        var address = operand;
        // pop the condition component off the component stack
        var component = this.procedureContext.components.popItem();
        // if the condition is 'none' then use the address as the next instruction to be executed
        if (address && component.equalTo(elements.Template.NONE)) {
            this.procedureContext.address = address;
        }
    },

    // JUMP TO label ON TRUE
    function(operand) {
        var address = operand;
        // pop the condition component off the component stack
        var component = this.procedureContext.components.popItem();
        // if the condition is 'true' then use the address as the next instruction to be executed
        if (address && component.equalTo(elements.Probability.TRUE)) {
            this.procedureContext.address = address;
        }
    },

    // JUMP TO label ON FALSE
    function(operand) {
        var address = operand;
        // pop the condition component off the component stack
        var component = this.procedureContext.components.popItem();
        // if the condition is 'false' then use the address as the next instruction to be executed
        if (address && component.equalTo(elements.Probability.FALSE)) {
            this.procedureContext.address = address;
        }
    },

    // PUSH HANDLER label
    function(operand) {
        var address = new elements.Complex(operand);  // must convert to Bali element
        // push the address of the current exception handlers onto the handlers stack
        this.procedureContext.handlers.pushItem(address);
    },

    // PUSH ELEMENT literal
    function(operand) {
        var index = operand;
        // lookup the literal associated with the index
        var literal = this.procedureContext.literals.getItem(index);
        this.procedureContext.components.pushItem(literal);
    },

    // PUSH CODE literal
    function(operand) {
        var index = operand;
        // lookup the literal associated with the index
        var code = this.procedureContext.literals.getItem(index);
        this.procedureContext.components.pushItem(code);
    },

    // UNIMPLEMENTED PUSH OPERATION
    function(operand) {
        throw new Error('An unimplemented PUSH operation was attempted: 13');
    },

    // POP HANDLER
    function(operand) {
        // remove the current exception handler address from the top of the handlers stack
        // since it is no longer in scope
        this.procedureContext.handlers.popItem();
    },

    // POP COMPONENT
    function(operand) {
        // remove the component that is on top of the component stack since it was not used
        this.procedureContext.components.popItem();
    },

    // UNIMPLEMENTED POP OPERATION
    function(operand) {
        throw new Error('An unimplemented POP operation was attempted: 22');
    },

    // UNIMPLEMENTED POP OPERATION
    function(operand) {
        throw new Error('An unimplemented POP operation was attempted: 23');
    },

    // LOAD VARIABLE symbol
    function(operand) {
        var index = operand;
        // lookup the variable associated with the index
        var variable = this.procedureContext.variables.getItem(index).value;
        this.procedureContext.components.pushItem(variable);
    },

    // LOAD PARAMETER symbol
    function(operand) {
        var index = operand;
        // lookup the parameter associated with the index
        var parameter = this.procedureContext.parameters.getItem(index).value;
        this.procedureContext.components.pushItem(parameter);
    },

    // LOAD DOCUMENT symbol
    function(operand) {
        var index = operand;
        // lookup the reference associated with the index
        var reference = this.procedureContext.variables.getItem(index).value;
        // read the referenced document from the cloud repository
        var document = cloud.readDocument(reference);
        // push the document on top of the component stack
        this.procedureContext.components.pushItem(document);
    },

    // LOAD MESSAGE symbol
    function(operand) {
        var index = operand;
        // lookup the referenced queue associated with the index
        var queue = this.procedureContext.variables.getItem(index).value;
        // attempt to receive a message from the referenced queue in the cloud
        var message = cloud.receiveMessage(queue);
        if (message) {
            this.procedureContext.components.pushItem(message);
        } else {
            // set the task status to 'waiting'
            this.procedureContext.status = TaskContext.WAITING;
            // make sure that the same instruction will be tried again
            this.procedureContext.address--;
        }
    },

    // STORE VARIABLE symbol
    function(operand) {
        var index = operand;
        // pop the component that is on top of the component stack off the stack
        var component = this.procedureContext.components.popItem();
        // and store the component in the variable associated with the index
        this.procedureContext.variables.replaceItem(index, component);
    },

    // STORE DRAFT symbol
    function(operand) {
        var index = operand;
        // pop the draft that is on top of the component stack off the stack
        var draft = this.procedureContext.components.popItem();
        // lookup the reference associated with the index operand
        var reference = this.procedureContext.variables.getItem(index).value;
        // write the referenced draft to the cloud repository
        cloud.writeDraft(reference, draft);
    },

    // STORE DOCUMENT symbol
    function(operand) {
        var index = operand;
        // pop the document that is on top of the component stack off the stack
        var document = this.procedureContext.components.popItem();
        // lookup the reference associated with the index operand
        var reference = this.procedureContext.variables.getItem(index).value;
        // write the referenced document to the cloud repository
        cloud.writeDocument(reference, document);
    },

    // STORE MESSAGE symbol
    function(operand) {
        var index = operand;
        // pop the message that is on top of the component stack off the stack
        var message = this.procedureContext.components.popItem();
        // lookup the referenced queue associated with the index operand
        var queue = this.procedureContext.variables.getItem(index).value;
        // send the message to the referenced queue in the cloud
        cloud.sendMessage(queue, message);
    },

    // INVOKE symbol
    function(operand) {
        var index = operand - 1;  // convert to a javascript zero based index
        // create an empty parameters list for the intrinsic function call
        var parameters = new collections.List();
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
        // push the result of the function call onto the top of the component stack
        this.procedureContext.components.pushItem(result);
    },

    // INVOKE symbol WITH PARAMETER
    function(operand) {
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
        // push the result of the function call onto the top of the component stack
        this.procedureContext.components.pushItem(result);
    },

    // INVOKE symbol WITH 2 PARAMETERS
    function(operand) {
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
        // push the result of the function call onto the top of the component stack
        this.procedureContext.components.pushItem(result);
    },

    // INVOKE symbol WITH 3 PARAMETERS
    function(operand) {
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        parameter = this.procedureContext.components.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
        // push the result of the function call onto the top of the component stack
        this.procedureContext.components.pushItem(result);
    },

    // EXECUTE symbol
    function(operand) {
        var index = operand;
        var context = new ProcedureContext();
        context.target = elements.Template.NONE;
        context.type = this.procedureContext.components.popItem();
        var type = cloud.readDocument(context.type);
        var association = type.procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        context.parameters = type.parameters;
        context.literals = type.literals;
        context.variables = this.extractVariables(type);
        context.bytecode = procedure.getValue('$bytecode');
        context.address = 1;
        this.procedureContext = context;
        this.taskContext.procedures.pushItem(context);
    },

    // EXECUTE symbol WITH PARAMETERS
    function(operand) {
        var index = operand;
        // set the target component to null since there isn't one
        var target = elements.Template.NONE;
        // pop the type reference for the procedure call off of the component stack
        var reference = this.procedureContext.components.popItem();
        // read the referenced type from the cloud repository
        var type = cloud.readDocument(reference);
        // lookup the procedure associated with the index operand
        var symbols = this.procedureContext.symbols;
        var procedures = symbols.getValue('$procedures');
        var procedure = procedures.getItem(index);
        // pop the parameters to the procedure call off of the component stack
        var parameters = this.procedureContext.components.popItem();
        // create a new context for the procedure call
        var context = new ProcedureContext(target, type, procedure, parameters);
        // make the new context the current context for this VM
        this.procedureContext = context;
        this.taskContext.procedures.pushItem(context);
    },

    // EXECUTE symbol ON TARGET
    function(operand) {
        var index = operand;
        // pop the target component for the procedure call off of the component stack
        var target = this.procedureContext.components.popItem();
        // retrieve a reference to the type of the target component
        var parameters = new collections.List([target]);
        var reference = intrinsics.intrinsicFunctions[intrinsics.GET_TYPE].apply(this, parameters);
        // read the referenced type from the cloud repository
        var type = cloud.readDocument(reference);
        // lookup the procedure associated with the index operand
        var symbols = this.procedureContext.symbols;
        var procedures = symbols.getValue('$procedures');
        var procedure = procedures.getItem(index);
        // create an empty parameters list for the procedure call
        parameters = new collections.List();
        // create a new context for the procedure call
        var context = new ProcedureContext(target, type, procedure, parameters);
        // make the new context the current context for this VM
        this.procedureContext = context;
        this.taskContext.procedures.pushItem(context);
    },

    // EXECUTE symbol ON TARGET WITH PARAMETERS
    function(operand) {
        var index = operand;
        var context = new ProcedureContext();
        context.target = this.procedureContext.components.popItem();
        context.type = this.extractType(context.target);
        var type = cloud.readDocument(context.type);
        var procedures = type.getValue('$procedures');
        var association = procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        var parameters = this.procedureContext.components.popItem();
        context.parameters = this.extractParameters(procedure, parameters);
        context.literals = type.literals;
        context.variables = this.extractVariables(procedure);
        context.bytecode = procedure.getValue('$bytecode');
        context.address = 1;
        this.procedureContext = context;
        this.taskContext.procedures.pushItem(context);
    },

    // HANDLE EXCEPTION
    function(operand) {
        // pop the current exception off of the component stack
        var exception = this.procedureContext.components.popItem();
        while (this.taskContext.procedures.getSize() > 0 &&
                this.procedureContext.handlers.getSize() === 0) {
            // pop the current context off of the context stack since it has no handlers
            this.taskContext.procedures.popItem();
            this.procedureContext = this.taskContext.procedures.getTop();
        }
        // TODO: need to check for no more contexts
        // push the current exception onto the top of the component stack
        this.procedureContext.components.pushItem(exception);
        // retrieve the address of the current exception handlers
        var address = this.procedureContext.handlers.popItem().toNumber();
        // use that address as the next instruction to be executed
        this.procedureContext.address = address;
    },

    // HANDLE RESULT
    function(operand) {
        // pop the result of the procedure call off of the component stack
        var result = this.procedureContext.components.popItem();
        // pop the current context off of the context stack since it is now out of scope
        this.taskContext.procedures.popItem();
        this.procedureContext = this.taskContext.procedures.getTop();
        // push the result of the procedure call onto the top of the component stack
        this.procedureContext.components.pushItem(result);
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 72');
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 73');
    }

];
