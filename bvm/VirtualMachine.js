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
var codex = require('bali-document-notation/utilities/EncodingUtilities');
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
    var procedureContext = taskContext.procedureStack.peek();

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
function isRunnable(bvm) {
    // NOTE: the nextAddress is a Bali address but the bytecodeInstructions is a JS array
    var hasInstructions = bvm.procedureContext && bvm.procedureContext.nextAddress <= bvm.procedureContext.bytecodeInstructions.length;
    var isActive = bvm.taskContext.processorStatus === TaskContext.ACTIVE;
    var hasTokens = bvm.taskContext.accountBalance > 0;
    return hasInstructions && isActive && hasTokens;
}


/*
 * This method fetches the next 16 bit bytecode instruction from the current procedure context.
 */
function fetchInstruction(bvm) {
    if (isRunnable(bvm)) {
        var nextAddress = bvm.procedureContext.nextAddress - 1;  // JS zero based indexing
        var currentInstruction = bvm.procedureContext.bytecodeInstructions[nextAddress];
        bvm.procedureContext.currentInstruction = currentInstruction;
        return true;
    } else {
        return false;
    }
}


/*
 * This method executes the next 16 bit bytecode instruction.
 */
function executeInstruction(bvm) {
    // decode the bytecode instruction
    var instruction = bvm.procedureContext.currentInstruction;
    var operation = bytecode.decodeOperation(instruction);
    var modifier = bytecode.decodeModifier(instruction);
    var operand = bytecode.decodeOperand(instruction);

    // pass execution off to the correct operation handler
    var index = (operation << 2) | modifier;  // index: [0..31]
    instructionHandlers[index](bvm, operand); // operand: [0..2047]

    // update the state of the task context
    bvm.taskContext.clockCycles++;
    bvm.taskContext.accountBalance--;
    bvm.procedureContext.nextAddress++;
}


/*
 * This method finalizes the processing depending on the status of the task.
 */
function finalizeProcessing(bvm) {
    switch (bvm.taskContext.processorStatus) {
        case TaskContext.ACTIVE:
            // the task hit a break point or the account balance is zero so notify any interested parties
            publishSuspensionEvent(bvm);
            break;
        case TaskContext.WAITING:
            // the task is waiting on a message so requeue the task context
            queueTaskContext(bvm);
            break;
        case TaskContext.DONE:
            // the task completed successfully or with an exception so notify any interested parties
            publishCompletionEvent(bvm);
            break;
        default:
    }
}


/*
 * This method publishes a task completion event to the global event queue.
 */
function publishCompletionEvent(bvm) {
    var event = '[\n' +
        '    $eventType: $completion\n' +
        '    $taskTag: ' + bvm.taskContext.taskTag + '\n' +
        '    $accountTag: ' + bvm.taskContext.accountTag + '\n' +
        '    $accountBalance: ' + bvm.taskContext.accountBalance + '\n' +
        '    $clockCycles: ' + bvm.taskContext.clockCycles + '\n' +
        '    $result: ' + bvm.taskContext.result + '\n' +
        ']';
    bvm.environment.publishEvent(event);
}


/*
 * This method publishes a task step event to the global event queue.
 */
function publishSuspensionEvent(bvm) {
    var event = '[\n' +
        '    $eventType: $suspension\n' +
        '    $taskTag: ' + bvm.taskContext.taskTag + '\n' +
        '    $context: ' + bvm.taskContext + '\n' +
        ']';
    bvm.environment.publishEvent(event);
}


/*
 * This method places the current task context on the queue for tasks awaiting messages
 */
function queueTaskContext(bvm) {
    // generate a parse tree from the task context
    var document = bvm.taskContext.toDocument();
    // queue up the task for a new virtual machine
    var WAIT_QUEUE = '#3F8TVTX4SVG5Z12F3RMYZCTWHV2VPX4K';
    bvm.environment.queueMessage(WAIT_QUEUE, document);
}


/*
 * This list contains the instruction handlers for each type of machine instruction.
 */
var instructionHandlers = [
    // JUMP TO label
    function(bvm, operand) {
        // if the operand is not zero then use it as the next instruction to be executed,
        // otherwise it is a SKIP INSTRUCTION (aka NOOP)
        if (operand) {
            var nextAddress = operand - 1;  // JS zero based indexing
            bvm.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON NONE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand - 1;  // JS zero based indexing
        // pop the condition component off the component stack
        var condition = bvm.taskContext.componentStack.pop();
        // if the condition is 'none' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Template.NONE)) {
            bvm.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON TRUE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand - 1;  // JS zero based indexing
        // pop the condition component off the component stack
        var condition = bvm.taskContext.componentStack.pop();
        // if the condition is 'true' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.TRUE)) {
            bvm.procedureContext.nextAddress = nextAddress;
        }
    },

    // JUMP TO label ON FALSE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var nextAddress = operand - 1;  // JS zero based indexing
        // pop the condition component off the component stack
        var condition = bvm.taskContext.componentStack.pop();
        // if the condition is 'false' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.FALSE)) {
            bvm.procedureContext.nextAddress = nextAddress;
        }
    },

    // PUSH HANDLER label
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var handlerAddress = operand - 1;  // JS zero based indexing
        // push the address of the current exception handlers onto the handlers stack
        bvm.taskContext.handlerStack.push(handlerAddress);
    },

    // PUSH ELEMENT literal
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the literal associated with the index
        var literal = bvm.procedureContext.literalValues[index];
        bvm.taskContext.componentStack.push(literal);
    },

    // PUSH CODE literal
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the literal associated with the index
        var code = bvm.procedureContext.literalValues[index];
        bvm.taskContext.componentStack.push(code);
    },

    // UNIMPLEMENTED PUSH OPERATION
    function(bvm, operand) {
        throw new Error('An unimplemented PUSH operation was attempted: 13');
    },

    // POP HANDLER
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // remove the current exception handler address from the top of the handlers stack
        // since it is no longer in scope
        bvm.taskContext.handlerStack.pop();
    },

    // POP COMPONENT
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // remove the component that is on top of the component stack since it was not used
        bvm.taskContext.componentStack.pop();
    },

    // UNIMPLEMENTED POP OPERATION
    function(bvm, operand) {
        throw new Error('An unimplemented POP operation was attempted: 22');
    },

    // UNIMPLEMENTED POP OPERATION
    function(bvm, operand) {
        throw new Error('An unimplemented POP operation was attempted: 23');
    },

    // LOAD VARIABLE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the variable associated with the index
        var variable = bvm.procedureContext.variableValues[index];
        bvm.taskContext.componentStack.push(variable);
    },

    // LOAD PARAMETER symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the parameter associated with the index
        var parameter = bvm.procedureContext.parameterValues[index];
        bvm.taskContext.componentStack.push(parameter);
    },

    // LOAD DOCUMENT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the reference associated with the index
        var reference = bvm.procedureContext.variableValues[index];
        // TODO: jump to exception handler if reference isn't a reference
        // retrieve the referenced document from the cloud repository
        var citation = BaliCitation.fromReference(reference);
        var document;
        if (citation.digest === 'none') {
            document = bvm.environment.retrieveDraft(citation.tag, citation.version);
        } else {
            document = bvm.environment.retrieveDocument(citation);
        }
        // push the document on top of the component stack
        bvm.taskContext.componentStack.push(document);
    },

    // LOAD MESSAGE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // lookup the referenced queue associated with the index
        var queue = bvm.procedureContext.variableValues[index];
        // TODO: jump to exception handler if queue isn't a reference
        // attempt to receive a message from the referenced queue in the cloud
        var message = bvm.environment.receiveMessage(queue);
        if (message) {
            bvm.taskContext.componentStack.push(message);
        } else {
            // set the task status to 'waiting'
            bvm.taskContext.processorStatus = TaskContext.WAITING;
            // make sure that the same instruction will be tried again
            bvm.procedureContext.nextAddress--;
        }
    },

    // STORE VARIABLE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the component that is on top of the component stack off the stack
        var component = bvm.taskContext.componentStack.pop();
        // and store the component in the variable associated with the index
        bvm.procedureContext.variableValues[index] = component;
    },

    // STORE DRAFT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the draft that is on top of the component stack off the stack
        var draft = bvm.taskContext.componentStack.pop();
        // lookup the reference associated with the index operand
        var reference = bvm.procedureContext.variableValues[index];
        // TODO: jump to exception handler if reference isn't a reference
        // write the referenced draft to the cloud repository
        var citation = BaliCitation.fromReference(reference);
        bvm.environment.saveDraft(citation.tag, citation.version, draft);
    },

    // STORE DOCUMENT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the document that is on top of the component stack off the stack
        var document = bvm.taskContext.componentStack.pop();
        // lookup the reference associated with the index operand
        var reference = bvm.procedureContext.variableValues[index];
        // TODO: jump to exception handler if reference isn't a reference
        // write the referenced document to the cloud repository
        var citation = BaliCitation.fromReference(reference);
        citation = bvm.environment.commitDocument(citation.tag, citation.version, document);
        bvm.procedureContext.variableValues[index] = citation.toReference();
    },

    // STORE MESSAGE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the message that is on top of the component stack off the stack
        var message = bvm.taskContext.componentStack.pop();
        // lookup the referenced queue associated with the index operand
        var queue = bvm.procedureContext.variableValues[index];
        // TODO: jump to exception handler if queue isn't a reference
        // send the message to the referenced queue in the cloud
        bvm.environment.sendMessage(queue, message);
    },

    // INVOKE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // create an empty parameters list for the intrinsic function call
        var parameters = new collections.List();
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH PARAMETER
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH 2 PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.taskContext.componentStack.push(result);
    },

    // INVOKE symbol WITH 3 PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        parameter = bvm.taskContext.componentStack.pop();
        parameters.push(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.taskContext.componentStack.push(result);
    },

    // EXECUTE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        var procedureContext = new ProcedureContext();
        procedureContext.targetComponent = elements.Template.NONE;
        procedureContext.typeReference = bvm.taskContext.componentStack.pop();
        var type = bvm.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions[index];
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        procedureContext.parameterValues = new collections.List();
        procedureContext.variableValues = bvm.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        bvm.procedureContext = procedureContext;
        bvm.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol WITH PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        var procedureContext = new ProcedureContext();
        procedureContext.targetComponent = elements.Template.NONE;
        procedureContext.typeReference = bvm.taskContext.componentStack.pop();
        var type = bvm.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions[index];
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        var parameterValues = bvm.taskContext.componentStack.pop();
        procedureContext.parameterValues = this.extractParameters(procedure, parameterValues);
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        bvm.procedureContext = procedureContext;
        bvm.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol ON TARGET
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        var procedureContext = new ProcedureContext();
        procedureContext.targetComponent = bvm.taskContext.componentStack.pop();
        procedureContext.typeReference = this.extractType(procedureContext.targetComponent);
        var type = bvm.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions[index];
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        procedureContext.parameterValues = new collections.List();
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        bvm.procedureContext = procedureContext;
        bvm.taskContext.procedureStack.push(procedureContext);
    },

    // EXECUTE symbol ON TARGET WITH PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // JS zero based indexing
        var procedureContext = new ProcedureContext();
        procedureContext.targetComponent = bvm.taskContext.componentStack.pop();
        procedureContext.typeReference = this.extractType(procedureContext.targetComponent);
        var type = bvm.environment.retrieveDocument(procedureContext.typeReference);
        var procedureDefinitions = type.getValue('$procedureDefinitions');
        var association = procedureDefinitions[index];
        procedureContext.procedureName = association.key;
        var procedure = association.value;
        procedureContext.literalValues = type.literalValues;
        var parameterValues = bvm.taskContext.componentStack.pop();
        procedureContext.parameterValues = this.extractParameters(procedure, parameterValues);
        procedureContext.variableValues = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecodeInstructions').value;
        procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytes);
        procedureContext.nextAddress = 1;
        bvm.procedureContext = procedureContext;
        bvm.taskContext.procedureStack.push(procedureContext);
    },

    // HANDLE EXCEPTION
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // search up the stack for a handler
        while (!bvm.taskContext.procedureStack.isEmpty()) {
            while (!bvm.taskContext.handlerStack.isEmpty()) {
                // retrieve the address of the current exception handlers
                var handlerAddress = bvm.taskContext.handlerStack.pop();
                // use that address as the next instruction to be executed
                bvm.procedureContext.nextAddress = handlerAddress;
            }
            // pop the current exception off of the component stack
            var exception = bvm.taskContext.componentStack.pop();
            // pop the current procedure context off of the context stack since it has no handlers
            bvm.taskContext.procedureStack.pop();
            if (bvm.taskContext.procedureStack.isEmpty()) {
                // we're done
                bvm.taskContext.exception = exception;
                bvm.taskContext.processorStatus = TaskContext.DONE;
            } else {
                bvm.procedureContext = bvm.taskContext.procedureStack.peek();
                // push the result of the procedure call onto the top of the component stack
                bvm.taskContext.componentStack.push(exception);
            }
        }
    },

    // HANDLE RESULT
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // pop the result of the procedure call off of the component stack
        var result = bvm.taskContext.componentStack.pop();
        // pop the current context off of the context stack since it is now out of scope
        bvm.taskContext.procedureStack.pop();
        if (bvm.taskContext.procedureStack.isEmpty()) {
            // we're done
            bvm.taskContext.result = result;
            bvm.taskContext.processorStatus = TaskContext.DONE;
        } else {
            bvm.procedureContext = bvm.taskContext.procedureStack.peek();
            // push the result of the procedure call onto the top of the component stack
            bvm.taskContext.componentStack.push(result);
        }
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(bvm, operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 72');
    },

    // UNIMPLEMENTED HANDLE OPERATION
    function(bvm, operand) {
        throw new Error('An unimplemented HANDLE operation was attempted: 73');
    }

];

