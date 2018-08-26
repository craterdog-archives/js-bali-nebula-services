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
var documents = require('bali-document-notation/BaliDocuments');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var intrinsics = require('../intrinsics/IntrinsicFunctions');
var elements = require('../elements');
var collections = require('../collections');
var bytecode = require('../utilities/BytecodeUtilities');
var treeGenerator = require('../transformers/ParseTreeGenerator');
var taskGenerator = require('../transformers/TaskContextGenerator');
var TaskContext = require('./TaskContext');
var ProcedureContext = require('./ProcedureContext');


exports.bvm = function(document, testDirectory) {
    var notary = BaliNotary.notary(testDirectory);
    var repository = testDirectory ? TestRepository.repository(testDirectory) : CloudRepository.repository();
    var environment = BaliAPI.environment(notary, repository);
    var taskContext = taskGenerator.generateTaskContext(document);
    var procedureContext = taskContext.procedureStack.getTop();

    return {

        /*
         * This method processes the instructions in the current task until the end of the
         * instructions is reached, the account balance reaches zero, or the task is waiting
         * to receive a message from a queue. If the task is running in single step mode,
         * this method processes only the next instruction. When the account balance reaches
         * zero, the task changes to single step mode to allow the owner to decide whether to
         * put more money in the account or give up processing.
         */
        processInstructions: function() {
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
    var isActive = bvm.taskContext.processorStatus === TaskContext.ACTIVE;
    var hasTokens = bvm.taskContext.accountBalance > 0;
    var hasBreakPoints = bvm.taskContext.breakPoints;
    var atBreakPoint = hasBreakPoints && bvm.taskContext.breakPoints.contains(bvm.procedureContext.address);
    return isActive && hasTokens && !atBreakPoint;
}


/*
 * This method fetches the next 16 bit bytecode instruction from the current procedure context.
 */
function fetchInstruction(bvm) {
    if (isRunnable()) {
        var address = bvm.procedureContext.address++;
        var instruction = bvm.procedureContext.bytecode.getItem(address).toNumber();
        bvm.procedureContext.instruction = instruction;
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
    var instruction = bvm.procedureContext.instruction;
    var operation = bytecode.decodeOperation(instruction);
    var modifier = bytecode.decodeModifier(instruction);
    var operand = bytecode.decodeOperand(instruction);

    // pass execution off to the correct operation handler
    var index = (operation << 2) | modifier;  // index: [0..31]
    instructionHandlers[index](bvm, operand); // operand: [0..2047]

    // update the state of the task context
    bvm.taskContext.clockCycles++;
    bvm.taskContext.accountBalance--;
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
        '    $type: $completion\n' +
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
        '    $type: $suspension\n' +
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
    var document = treeGenerator.generateParseTree(bvm.taskContext);
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
        var address = operand;
        // if the address is not zero then use it as the next instruction to be executed,
        // otherwise it is a SKIP INSTRUCTION (aka NOOP)
        if (address) {
            bvm.procedureContext.address = address;
        }
    },

    // JUMP TO label ON NONE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var address = operand;
        // pop the condition component off the component stack
        var condition = bvm.procedureContext.componentStack.popItem();
        // if the condition is 'none' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Template.NONE)) {
            bvm.procedureContext.address = address;
        }
    },

    // JUMP TO label ON TRUE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var address = operand;
        // pop the condition component off the component stack
        var condition = bvm.procedureContext.componentStack.popItem();
        // if the condition is 'true' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.TRUE)) {
            bvm.procedureContext.address = address;
        }
    },

    // JUMP TO label ON FALSE
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var address = operand;
        // pop the condition component off the component stack
        var condition = bvm.procedureContext.componentStack.popItem();
        // if the condition is 'false' then use the address as the next instruction to be executed
        if (condition.equalTo(elements.Probability.FALSE)) {
            bvm.procedureContext.address = address;
        }
    },

    // PUSH HANDLER label
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero address operand.');
        var handlerAddress = new elements.Complex(operand);  // must convert to Bali element
        // push the address of the current exception handlers onto the handlers stack
        bvm.procedureContext.handlerStack.pushItem(handlerAddress);
    },

    // PUSH ELEMENT literal
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the literal associated with the index
        var literal = bvm.procedureContext.literals.getItem(index);
        bvm.procedureContext.componentStack.pushItem(literal);
    },

    // PUSH CODE literal
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the literal associated with the index
        var code = bvm.procedureContext.literals.getItem(index);
        bvm.procedureContext.componentStack.pushItem(code);
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
        bvm.procedureContext.handlerStack.popItem();
    },

    // POP COMPONENT
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // remove the component that is on top of the component stack since it was not used
        bvm.procedureContext.componentStack.popItem();
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
        var index = operand;
        // lookup the variable associated with the index
        var variable = bvm.procedureContext.variables.getItem(index).value;
        bvm.procedureContext.componentStack.pushItem(variable);
    },

    // LOAD PARAMETER symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the parameter associated with the index
        var parameter = bvm.procedureContext.parameters.getItem(index).value;
        bvm.procedureContext.componentStack.pushItem(parameter);
    },

    // LOAD DOCUMENT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the reference associated with the index
        var reference = bvm.procedureContext.variables.getItem(index).value;
        // retrieve the referenced document from the cloud repository
        var citation = BaliCitation.fromReference(reference);
        var document;
        if (citation.digest === elements.Template.NONE) {
            document = bvm.environment.retrieveDraft(citation.tag, citation.version);
        } else {
            document = bvm.environment.retrieveDocument(citation);
        }
        // push the document on top of the component stack
        bvm.procedureContext.componentStack.pushItem(document);
    },

    // LOAD MESSAGE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // lookup the referenced queue associated with the index
        var queue = bvm.procedureContext.variables.getItem(index).value;
        // attempt to receive a message from the referenced queue in the cloud
        var message = bvm.environment.receiveMessage(queue);
        if (message) {
            bvm.procedureContext.componentStack.pushItem(message);
        } else {
            // set the task status to 'waiting'
            bvm.procedureContext.processorStatus = TaskContext.WAITING;
            // make sure that the same instruction will be tried again
            bvm.procedureContext.address--;
        }
    },

    // STORE VARIABLE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the component that is on top of the component stack off the stack
        var component = bvm.procedureContext.componentStack.popItem();
        // and store the component in the variable associated with the index
        bvm.procedureContext.variables.replaceItem(index, component);
    },

    // STORE DRAFT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the draft that is on top of the component stack off the stack
        var draft = bvm.procedureContext.componentStack.popItem();
        // lookup the reference associated with the index operand
        var reference = bvm.procedureContext.variables.getItem(index).value;
        var citation = BaliCitation.fromReference(reference);
        // write the referenced draft to the cloud repository
        bvm.environment.saveDraft(citation.tag, citation.version, draft);
    },

    // STORE DOCUMENT symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the document that is on top of the component stack off the stack
        var document = bvm.procedureContext.componentStack.popItem();
        // lookup the reference associated with the index operand
        var reference = bvm.procedureContext.variables.getItem(index).value;
        var citation = BaliCitation.fromReference(reference);
        // write the referenced document to the cloud repository
        bvm.environment.commitDocument(citation, document);
    },

    // STORE MESSAGE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        // pop the message that is on top of the component stack off the stack
        var message = bvm.procedureContext.componentStack.popItem();
        // lookup the referenced queue associated with the index operand
        var queue = bvm.procedureContext.variables.getItem(index).value;
        // send the message to the referenced queue in the cloud
        bvm.environment.sendMessage(queue, message);
    },

    // INVOKE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // convert to a javascript zero based index
        // create an empty parameters list for the intrinsic function call
        var parameters = new collections.List();
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.procedureContext.componentStack.pushItem(result);
    },

    // INVOKE symbol WITH PARAMETER
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.procedureContext.componentStack.pushItem(result);
    },

    // INVOKE symbol WITH 2 PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.procedureContext.componentStack.pushItem(result);
    },

    // INVOKE symbol WITH 3 PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand - 1;  // convert to a javascript zero based index
        // pop the parameters to the intrinsic function call off of the component stack
        var parameters = new collections.List();
        var parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        parameter = bvm.procedureContext.componentStack.popItem();
        parameters.pushItem(parameter);
        // call the intrinsic function associated with the index operand
        var result = intrinsics.intrinsicFunctions[index].apply(bvm, parameters);
        // push the result of the function call onto the top of the component stack
        bvm.procedureContext.componentStack.pushItem(result);
    },

    // EXECUTE symbol
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var context = new ProcedureContext();
        context.target = elements.Template.NONE;
        context.type = bvm.procedureContext.componentStack.popItem();
        var type = bvm.environment.retrieveDocument(context.type);
        var procedures = type.getValue('$procedures');
        var association = procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        context.literals = type.literals;
        context.parameters = new collections.List();
        context.variables = bvm.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecode').value;
        context.bytecode = codex.bytesToBytecode(bytes);
        context.address = 1;
        bvm.procedureContext = context;
        bvm.taskContext.procedureStack.pushItem(context);
    },

    // EXECUTE symbol WITH PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var context = new ProcedureContext();
        context.target = elements.Template.NONE;
        context.type = bvm.procedureContext.componentStack.popItem();
        var type = bvm.environment.retrieveDocument(context.type);
        var procedures = type.getValue('$procedures');
        var association = procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        context.literals = type.literals;
        var parameters = bvm.procedureContext.componentStack.popItem();
        context.parameters = this.extractParameters(procedure, parameters);
        context.variables = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecode').value;
        context.bytecode = codex.bytesToBytecode(bytes);
        context.address = 1;
        bvm.procedureContext = context;
        bvm.taskContext.procedureStack.pushItem(context);
    },

    // EXECUTE symbol ON TARGET
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var context = new ProcedureContext();
        context.target = bvm.procedureContext.componentStack.popItem();
        context.type = this.extractType(context.target);
        var type = bvm.environment.retrieveDocument(context.type);
        var procedures = type.getValue('$procedures');
        var association = procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        context.literals = type.literals;
        context.parameters = new collections.List();
        context.variables = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecode').value;
        context.bytecode = codex.bytesToBytecode(bytes);
        context.address = 1;
        bvm.procedureContext = context;
        bvm.taskContext.procedureStack.pushItem(context);
    },

    // EXECUTE symbol ON TARGET WITH PARAMETERS
    function(bvm, operand) {
        if (!operand) throw new Error('BVM: The current instruction has a zero index operand.');
        var index = operand;
        var context = new ProcedureContext();
        context.target = bvm.procedureContext.componentStack.popItem();
        context.type = this.extractType(context.target);
        var type = bvm.environment.retrieveDocument(context.type);
        var procedures = type.getValue('$procedures');
        var association = procedures.getItem(index);
        context.procedure = association.key;
        var procedure = association.value;
        context.literals = type.literals;
        var parameters = bvm.procedureContext.componentStack.popItem();
        context.parameters = this.extractParameters(procedure, parameters);
        context.variables = this.extractVariables(procedure);
        var bytes = procedure.getValue('$bytecode').value;
        context.bytecode = codex.bytesToBytecode(bytes);
        context.address = 1;
        bvm.procedureContext = context;
        bvm.taskContext.procedureStack.pushItem(context);
    },

    // HANDLE EXCEPTION
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // search up the stack for a handler
        while (!bvm.taskContext.procedureStack.isEmpty()) {
            while (!bvm.procedureContext.handlerStack.isEmpty()) {
                // retrieve the address of the current exception handlers
                var address = bvm.procedureContext.handlerStack.popItem().toNumber();
                // use that address as the next instruction to be executed
                bvm.procedureContext.address = address;
            }
            // pop the current exception off of the component stack
            var exception = bvm.procedureContext.componentStack.popItem();
            // pop the current procedure context off of the context stack since it has no handlers
            bvm.taskContext.procedureStack.popItem();
            if (bvm.taskContext.procedureStack.isEmpty()) {
                // we're done
                bvm.taskContext.exception = exception;
                bvm.taskContext.processorStatus = TaskContext.DONE;
            } else {
                bvm.procedureContext = bvm.taskContext.procedureStack.getTop();
                // push the result of the procedure call onto the top of the component stack
                bvm.procedureContext.componentStack.pushItem(exception);
            }
        }
    },

    // HANDLE RESULT
    function(bvm, operand) {
        if (operand) throw new Error('BVM: The current instruction has a non-zero operand.');
        // pop the result of the procedure call off of the component stack
        var result = bvm.procedureContext.componentStack.popItem();
        // pop the current context off of the context stack since it is now out of scope
        bvm.taskContext.procedureStack.popItem();
        if (bvm.taskContext.procedureStack.isEmpty()) {
            // we're done
            bvm.taskContext.result = result;
            bvm.taskContext.processorStatus = TaskContext.DONE;
        } else {
            bvm.procedureContext = bvm.taskContext.procedureStack.getTop();
            // push the result of the procedure call onto the top of the component stack
            bvm.procedureContext.componentStack.pushItem(result);
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

