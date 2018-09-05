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
var BaliNotary = require('bali-digital-notary/BaliNotary');
var BaliCitation = require('bali-digital-notary/BaliCitation');
var BaliAPI = require('bali-cloud-api/BaliAPI');
var CloudRepository = require('bali-cloud-api/CloudRepository');
var TestRepository = require('bali-cloud-api/LocalRepository');
var intrinsics = require('../intrinsics/IntrinsicFunctions');
var elements = require('bali-element-types/elements');
var collections = require('bali-collection-types/collections');
var bytecode = require('../utilities/BytecodeUtilities');
var TaskContext = require('./TaskContext');
var ProcedureContext = require('./TaskContext').ProcedureContext;


exports.fromDocument = function(taskContext, testDirectory) {
    var notary = BaliNotary.notary(testDirectory);
    var repository = testDirectory ? TestRepository.repository(testDirectory) : CloudRepository.repository();
    var environment = BaliAPI.environment(notary, repository);
    var procedureContext = taskContext.procedureStack.getTop();

    return {

        environment: environment,
        taskContext: taskContext,
        procedureContext: procedureContext,

        /*
         * This method executes the next instruction in the current task.
         */
        step: function() {
            var wasFetched = fetchInstruction(this);
            if (wasFetched) {
                executeInstruction(this);
            }
            return wasFetched;
        },

        /*
         * This method executes all of the instructions in the current task until the end of the
         * instructions is reached, the account balance reaches zero, or the task is waiting
         * to receive a message from a queue.
         */
        run: function() {
            while (fetchInstruction(this)) {
                executeInstruction(this);
            }
            finalizeProcessing(this);
        }
    };
};


/*
 * This method fetches the next 16 bit bytecode instruction from the current procedure context.
 */
function isRunnable(processor) {
    var hasInstructions = processor.procedureContext && processor.procedureContext.nextAddress <= processor.procedureContext.bytecodeInstructions.getSize();
    var isActive = processor.taskContext.processorStatus === TaskContext.ACTIVE;
    var hasTokens = processor.taskContext.accountBalance > 0;
    return hasInstructions && isActive && hasTokens;
}


/*
 * This method fetches the next 16 bit bytecode instruction from the current procedure context.
 */
function fetchInstruction(processor) {
    if (isRunnable(processor)) {
        var nextAddress = processor.procedureContext.nextAddress;
        var currentInstruction = processor.procedureContext.bytecodeInstructions.getItem(nextAddress);
        processor.procedureContext.currentInstruction = currentInstruction;
        return true;
    } else {
        return false;
    }
}


/*
 * This method executes the next 16 bit bytecode instruction.
 */
function executeInstruction(processor) {
    // decode the bytecode instruction
    var instruction = processor.procedureContext.currentInstruction;
    var operation = bytecode.decodeOperation(instruction);
    var modifier = bytecode.decodeModifier(instruction);
    var operand = bytecode.decodeOperand(instruction);

    // pass execution off to the correct operation handler
    var index = (operation << 2) | modifier;  // index: [0..31]
    instructionHandlers[index](processor, operand); // operand: [0..2047]

    // update the state of the task context
    processor.taskContext.clockCycles++;
    processor.taskContext.accountBalance--;
    processor.procedureContext.nextAddress++;
}


/*
 * This method finalizes the processing depending on the status of the task.
 */
function finalizeProcessing(processor) {
    switch (processor.taskContext.processorStatus) {
        case TaskContext.ACTIVE:
            // the task hit a break point or the account balance is zero so notify any interested parties
            publishSuspensionEvent(processor);
            break;
        case TaskContext.WAITING:
            // the task is waiting on a message so requeue the task context
            queueTaskContext(processor);
            break;
        case TaskContext.DONE:
            // the task completed successfully or with an exception so notify any interested parties
            publishCompletionEvent(processor);
            break;
        default:
    }
}


/*
 * This method publishes a task completion event to the global event queue.
 */
function publishCompletionEvent(processor) {
    var event = '[\n' +
        '    $eventType: $completion\n' +
        '    $taskTag: ' + processor.taskContext.taskTag + '\n' +
        '    $accountTag: ' + processor.taskContext.accountTag + '\n' +
        '    $accountBalance: ' + processor.taskContext.accountBalance + '\n' +
        '    $clockCycles: ' + processor.taskContext.clockCycles + '\n' +
        '    $result: ' + processor.taskContext.result + '\n' +
        ']';
    processor.environment.publishEvent(event);
}


/*
 * This method publishes a task step event to the global event queue.
 */
function publishSuspensionEvent(processor) {
    var event = '[\n' +
        '    $eventType: $suspension\n' +
        '    $taskTag: ' + processor.taskContext.taskTag + '\n' +
        '    $context: ' + processor.taskContext + '\n' +
        ']';
    processor.environment.publishEvent(event);
}


/*
 * This method places the current task context on the queue for tasks awaiting messages
 */
function queueTaskContext(processor) {
    // generate a parse tree from the task context
    var document = processor.taskContext.toDocument();
    // queue up the task for a new virtual machine
    var WAIT_QUEUE = '#3F8TVTX4SVG5Z12F3RMYZCTWHV2VPX4K';
    processor.environment.queueMessage(WAIT_QUEUE, document);
}


/*
 * This list contains the instruction handlers for each type of machine instruction.
 */
var instructionHandlers = [
    // JUMP TO label
    function(processor, operand) {
        // if the operand is not zero then use it as the next instruction to be executed,
        // otherwise it is a SKIP INSTRUCTION (aka NOOP)
        if (operand) {
            var nextAddress = operand;
            processor.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON NONE
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand;
        // pop the condition component off the component stack
        var condition = processor.taskContext.componentStack.pop();
        // if the condition is 'none' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Template.NONE)) {
            processor.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON TRUE
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand;
        // pop the condition component off the component stack
        var condition = processor.taskContext.componentStack.pop();
        // if the condition is 'true' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.TRUE)) {
            processor.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON FALSE
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand;
        // pop the condition component off the component stack
        var condition = processor.taskContext.componentStack.pop();
        // if the condition is 'false' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.FALSE)) {
            processor.procedureContext.nextAddress = nextAddress;
        }
    },

    // PUSH HANDLER label
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var handlerAddress = operand;
        // push the address of the current exception handlers onto the handlers stack
        processor.taskContext.handlerStack.push(handlerAddress);
    },

    // PUSH ELEMENT literal
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the literal associated with the index
        var literal = processor.procedureContext.literalValues.getItem(index);
        processor.taskContext.componentStack.push(literal);
    },

    // PUSH CODE literal
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the literal associated with the index
        var code = processor.procedureContext.literalValues.getItem(index);
        processor.taskContext.componentStack.push(code);
    },

    // UNIMPLEMENTED PUSH OPERATION
    function(processor, operand) {
        throw new Error('An unimplemented PUSH operation was attempted: 13');
    },

    // POP HANDLER
    function(processor, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // remove the current exception handler address from the top of the handlers stack
        // since it is no longer in scope
        processor.taskContext.handlerStack.pop();
    },

    // POP COMPONENT
    function(processor, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // remove the component that is on top of the component stack since it was not used
        processor.taskContext.componentStack.pop();
    },

    // UNIMPLEMENTED POP OPERATION
    function(processor, operand) {
        throw new Error('An unimplemented POP operation was attempted: 22');
    },

    // UNIMPLEMENTED POP OPERATION
    function(processor, operand) {
        throw new Error('An unimplemented POP operation was attempted: 23');
    },

    // LOAD VARIABLE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the variable associated with the index
        var variable = processor.procedureContext.variableValues.getItem(index);
        processor.taskContext.componentStack.push(variable);
    },

    // LOAD PARAMETER symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the parameter associated with the index
        var parameter = processor.procedureContext.parameterValues.getItem(index);
        processor.taskContext.componentStack.push(parameter);
    },

    // LOAD DOCUMENT symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the reference associated with the index
        var reference = processor.procedureContext.variableValues.getItem(index);
        // TODO: jump to exception handler if reference isn't a reference
        // retrieve the referenced document from the cloud repository
        var citation = BaliCitation.fromReference(reference);
        var document;
        if (citation.digest === 'none') {
            document = processor.environment.retrieveDraft(citation.tag, citation.version);
        } else {
            document = processor.environment.retrieveDocument(citation);
        }
        // push the document on top of the component stack
        processor.taskContext.componentStack.push(document);
    },

    // LOAD MESSAGE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the referenced queue associated with the index
        var queue = processor.procedureContext.variableValues.getItem(index);
        // TODO: jump to exception handler if queue isn't a reference
        // attempt to receive a message from the referenced queue in the cloud
        var message = processor.environment.receiveMessage(queue);
        if (message) {
            processor.taskContext.componentStack.push(message);
        } else {
            // set the task status to 'waiting'
            processor.taskContext.processorStatus = TaskContext.WAITING;
            // make sure that the same instruction will be tried again
            processor.procedureContext.nextAddress--;
        }
    },

    // STORE VARIABLE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the component that is on top of the component stack off the stack
        var component = processor.taskContext.componentStack.pop();
        // and store the component in the variable associated with the index
        processor.procedureContext.variableValues.setItem(index, component);
    },

    // STORE DRAFT symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the draft that is on top of the component stack off the stack
        var draft = processor.taskContext.componentStack.pop();
        // lookup the reference associated with the index operand
        var reference = processor.procedureContext.variableValues.getItem(index);
        // TODO: jump to exception handler if reference isn't a reference
        // write the referenced draft to the cloud repository
        var citation = BaliCitation.fromReference(reference);
        processor.environment.saveDraft(citation.tag, citation.version, draft);
    },

    // STORE DOCUMENT symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the document that is on top of the component stack off the stack
        var document = processor.taskContext.componentStack.pop();
        // lookup the reference associated with the index operand
        var reference = processor.procedureContext.variableValues.getItem(index);
        // TODO: jump to exception handler if reference isn't a reference
        // write the referenced document to the cloud repository
        var citation = BaliCitation.fromReference(reference);
        citation = processor.environment.commitDocument(citation.tag, citation.version, document);
        processor.procedureContext.variableValues.setItem(index, citation.toReference());
    },

    // STORE MESSAGE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the message that is on top of the component stack off the stack
        var message = processor.taskContext.componentStack.pop();
        // lookup the referenced queue associated with the index operand
        var queue = processor.procedureContext.variableValues.getItem(index);
        // TODO: jump to exception handler if queue isn't a reference
        // send the message to the referenced queue in the cloud
        processor.environment.queueMessage(queue, message);
    },

    // INVOKE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // create an empty parameters list for the intrinsic function call
        var parameters = new collections.List();
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(processor, parameters);
        // push the result of the function call onto the top of the component stack
        processor.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH PARAMETER
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(processor, parameters);
        // push the result of the function call onto the top of the component stack
        processor.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH 2 PARAMETERS
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(processor, parameters);
        // push the result of the function call onto the top of the component stack
        processor.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH 3 PARAMETERS
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        parameter = processor.taskContext.componentStack.pop();
        parameters.addItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(processor, parameters);
        // push the result of the function call onto the top of the component stack
        processor.taskContext.componentStack.push(result);
    },

    // EXECUTE symbol
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var procedureContext = ProcedureContext.fromScratch();
        procedureContext.targetComponent = elements.Template.NONE;
        procedureContext.typeReference = processor.taskContext.componentStack.pop();
        var type = processor.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions.getItem(index);
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        procedureContext.parameterValues = new collections.List();
        procedureContext.variableValues = processor.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        processor.procedureContext = procedureContext;
        processor.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol WITH PARAMETERS
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var procedureContext = ProcedureContext.fromScratch();
        procedureContext.targetComponent = elements.Template.NONE;
        procedureContext.typeReference = processor.taskContext.componentStack.pop();
        var type = processor.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions.getItem(index);
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        var parameterValues = processor.taskContext.componentStack.pop();
        procedureContext.parameterValues = this.extractParameters(procedure, parameterValues);
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        processor.procedureContext = procedureContext;
        processor.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol ON TARGET
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var procedureContext = ProcedureContext.fromScratch();
        procedureContext.targetComponent = processor.taskContext.componentStack.pop();
        procedureContext.typeReference = this.extractType(procedureContext.targetComponent);
        var type = processor.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions.getItem(index);
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        procedureContext.parameterValues = new collections.List();
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        processor.procedureContext = procedureContext;
        processor.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol ON TARGET WITH PARAMETERS
    function(processor, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var procedureContext = ProcedureContext.fromScratch();
        procedureContext.targetComponent = processor.taskContext.componentStack.pop();
        procedureContext.typeReference = this.extractType(procedureContext.targetComponent);
        var type = processor.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions.getItem(index);
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        var parameterValues = processor.taskContext.componentStack.pop();
        procedureContext.parameterValues = this.extractParameters(procedure, parameterValues);
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        processor.procedureContext = procedureContext;
        processor.taskContext.procedureStack.push(procedureContext);
    },

    // HANDLE EXCEPTION
    function(processor, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // search up the stack for a handler
        while (!processor.taskContext.procedureStack.isEmpty()) {
            while (!processor.taskContext.handlerStack.isEmpty()) {
                // retrieve the address of the current exception handlers
                var handlerAddress = processor.taskContext.handlerStack.pop();
                // use that address as the next instruction to be executed
                processor.procedureContext.nextAddress = handlerAddress;
            }
            // pop the current exception off of the component stack
            var exception = processor.taskContext.componentStack.pop();
            // pop the current procedure context off of the context stack since it has no handlers
            processor.taskContext.procedureStack.pop();
            if (processor.taskContext.procedureStack.isEmpty()) {
                // we're done
                processor.taskContext.exception = exception;
                processor.taskContext.processorStatus = TaskContext.DONE;
            } else {
                processor.procedureContext = processor.taskContext.procedureStack.getTop();
                // push the result of the procedure call onto the top of the component stack
                processor.taskContext.componentStack.push(exception);
            }
        }
    },

    // HANDLE RESULT
    function(processor, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // pop the result of the procedure call off of the component stack
        var result = processor.taskContext.componentStack.pop();
        // pop the current context off of the context stack since it is now out of scope
        processor.taskContext.procedureStack.pop();
        if (processor.taskContext.procedureStack.isEmpty()) {
            // we're done
            processor.taskContext.result = result;
            processor.taskContext.processorStatus = TaskContext.DONE;
        } else {
            processor.procedureContext = processor.taskContext.procedureStack.getTop();
            // push the result of the procedure call onto the top of the component stack
            processor.taskContext.componentStack.push(result);
        }
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(processor, operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 72');
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(processor, operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 73');
    }

];

