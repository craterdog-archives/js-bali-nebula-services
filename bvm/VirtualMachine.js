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
var BaliAPI = require('bali-cloud-api/BaliAPI');
var CloudRepository = require('bali-cloud-api/CloudRepository');
var TestRepository = require('bali-cloud-api/LocalRepository');
var BaliAPI = require('bali-cloud-api/BaliAPI');
var documents = require('bali-document-notation/BaliDocuments');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var intrinsics = require('../intrinsics/IntrinsicFunctions');
var elements = require('../elements');
var collections = require('../collections');
var bytecode = require('../utilities/BytecodeUtilities');
var generator = require('../transformers/ParseTreeGenerator');
var TaskContext = require('./TaskContext');
var ProcedureContext = require('./ProcedureContext');


function bvm(taskReference, testDirectory) {
    var notary = BaliNotary.notary(testDirectory);
    var repository = testDirectory ? TestRepository.repository(testDirectory) : CloudRepository.repository();
    var environment = BaliAPI.environment(notary, repository);
    var taskContext = environment.retrieveDocument(taskReference);
    var procedureContext = taskContext.procedures.getTop();

    return {

        /*
         * This method processes the instructions in the current task until the end of the
         * instructions is reached or the task is waiting to receive a message from a queue
         * If the virtual machine is in single step mode, then this method processes the
         * next instruction only.
         */
        processInstructions: function() {
            while (taskContext.status === TaskContext.ACTIVE) {
                // process the next instruction
                var instruction = this.fetchNextInstruction();
                this.executeNextInstruction(instruction);
                if (taskContext.stepping) break;  // after a each instruction
            }
            if (taskContext.status === TaskContext.DONE) {
                // the task completed successfully or with an exception so notify any interested parties
                this.publishCompletionEvent();
            } else {
                // waiting on a message from a queue or single stepping so save the task state
                this.saveTaskContext();
            }
        },

        /*
         * This method fetches the next 16 bit bytecode instruction from the current procedure context.
         */
        fetchNextInstruction: function() {
            // increment the address pointer
            procedureContext.address++;

            // load the next instruction from the current procedure context
            var instruction = procedureContext.bytecode.getItem(procedureContext.address).toNumber();
            return instruction;
        },

        /*
         * This method executes the next 16 bit bytecode instruction.
         */
        executeNextInstruction: function(instruction) {
            // decode the bytecode instruction
            var operation = bytecode.decodeOperation(instruction);
            var modifier = bytecode.decodeModifier(instruction);
            var operand = bytecode.decodeOperand(instruction);
            // pass execution off to the correct operation handler
            var index = (operation << 2) | modifier;
            this.instructionHandlers[index](operand);
        },

        /*
         * This method publishes a task completion event to the global event queue.
         */
        publishCompletionEvent: function() {
            var event = '[\n' +
                '    $type: $completion\n' +
                '    $task: ' + taskReference + '\n' +
                '    $result: ' + taskContext.result + '\n' +
                '    $exception: ' + taskContext.exception + '\n' +
                ']';
            environment.publishEvent(event);
        },

        /*
         * This method exports the current task context and saves it in the document repository.
         */
        saveTaskContext: function() {
            // generate a parse tree from the task context
            var tree = generator.generateParseTree(taskContext);
            // format the parse tree into a document
            var context = documents.formatParseTree(tree);
            // save the document in the cloud
            environment.saveDraft(taskReference, context);
        },

        /*
         * This list contains the instruction handlers for each type of machine instruction.
         */
        instructionHandlers: [
            // JUMP TO label
            function(operand) {
                var address = operand;
                // if the address is not zero then use it as the next instruction to be executed,
                // otherwise it is a SKIP INSTRUCTION (aka NOOP)
                if (address) {
                    procedureContext.address = address;
                }
            },

            // JUMP TO label ON NONE
            function(operand) {
                var address = operand;
                // pop the condition component off the component stack
                var component = procedureContext.components.popItem();
                // if the condition is 'none' then use the address as the next instruction to be executed
                if (address && component.equalTo(elements.Template.NONE)) {
                    procedureContext.address = address;
                }
            },

            // JUMP TO label ON TRUE
            function(operand) {
                var address = operand;
                // pop the condition component off the component stack
                var component = procedureContext.components.popItem();
                // if the condition is 'true' then use the address as the next instruction to be executed
                if (address && component.equalTo(elements.Probability.TRUE)) {
                    procedureContext.address = address;
                }
            },

            // JUMP TO label ON FALSE
            function(operand) {
                var address = operand;
                // pop the condition component off the component stack
                var component = procedureContext.components.popItem();
                // if the condition is 'false' then use the address as the next instruction to be executed
                if (address && component.equalTo(elements.Probability.FALSE)) {
                    procedureContext.address = address;
                }
            },

            // PUSH HANDLER label
            function(operand) {
                // TODO: Fix Complex -> Number naming issues
                var handlerAddress = new elements.Complex(operand);  // must convert to Bali element
                // push the address of the current exception handlers onto the handlers stack
                procedureContext.handlers.pushItem(handlerAddress);
            },

            // PUSH ELEMENT literal
            function(operand) {
                var index = operand;
                // lookup the literal associated with the index
                var literal = procedureContext.literals.getItem(index);
                procedureContext.components.pushItem(literal);
            },

            // PUSH CODE literal
            function(operand) {
                var index = operand;
                // lookup the literal associated with the index
                var code = procedureContext.literals.getItem(index);
                procedureContext.components.pushItem(code);
            },

            // UNIMPLEMENTED PUSH OPERATION
            function(operand) {
                throw new Error('An unimplemented PUSH operation was attempted: 13');
            },

            // POP HANDLER
            function(operand) {
                // remove the current exception handler address from the top of the handlers stack
                // since it is no longer in scope
                procedureContext.handlers.popItem();
            },

            // POP COMPONENT
            function(operand) {
                // remove the component that is on top of the component stack since it was not used
                procedureContext.components.popItem();
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
                var variable = procedureContext.variables.getItem(index).value;
                procedureContext.components.pushItem(variable);
            },

            // LOAD PARAMETER symbol
            function(operand) {
                var index = operand;
                // lookup the parameter associated with the index
                var parameter = procedureContext.parameters.getItem(index).value;
                procedureContext.components.pushItem(parameter);
            },

            // LOAD DOCUMENT symbol
            function(operand) {
                var index = operand;
                // lookup the reference associated with the index
                var reference = procedureContext.variables.getItem(index).value;
                // retrieve the referenced document from the cloud repository
                var document = environment.retrieveDocument(reference);
                // push the document on top of the component stack
                procedureContext.components.pushItem(document);
            },

            // LOAD MESSAGE symbol
            function(operand) {
                var index = operand;
                // lookup the referenced queue associated with the index
                var queue = procedureContext.variables.getItem(index).value;
                // attempt to receive a message from the referenced queue in the cloud
                var message = environment.receiveMessage(queue);
                if (message) {
                    procedureContext.components.pushItem(message);
                } else {
                    // set the task status to 'waiting'
                    procedureContext.status = TaskContext.WAITING;
                    // make sure that the same instruction will be tried again
                    procedureContext.address--;
                }
            },

            // STORE VARIABLE symbol
            function(operand) {
                var index = operand;
                // pop the component that is on top of the component stack off the stack
                var component = procedureContext.components.popItem();
                // and store the component in the variable associated with the index
                procedureContext.variables.replaceItem(index, component);
            },

            // STORE DRAFT symbol
            function(operand) {
                var index = operand;
                // pop the draft that is on top of the component stack off the stack
                var draft = procedureContext.components.popItem();
                // lookup the reference associated with the index operand
                var reference = procedureContext.variables.getItem(index).value;
                // write the referenced draft to the cloud repository
                environment.saveDraft(reference, draft);
            },

            // STORE DOCUMENT symbol
            function(operand) {
                var index = operand;
                // pop the document that is on top of the component stack off the stack
                var document = procedureContext.components.popItem();
                // lookup the reference associated with the index operand
                var reference = procedureContext.variables.getItem(index).value;
                // write the referenced document to the cloud repository
                environment.commitDocument(reference, document);
            },

            // STORE MESSAGE symbol
            function(operand) {
                var index = operand;
                // pop the message that is on top of the component stack off the stack
                var message = procedureContext.components.popItem();
                // lookup the referenced queue associated with the index operand
                var queue = procedureContext.variables.getItem(index).value;
                // send the message to the referenced queue in the cloud
                environment.sendMessage(queue, message);
            },

            // INVOKE symbol
            function(operand) {
                var index = operand - 1;  // convert to a javascript zero based index
                // create an empty parameters list for the intrinsic function call
                var parameters = new collections.List();
                // call the intrinsic function associated with the index operand
                var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
                // push the result of the function call onto the top of the component stack
                procedureContext.components.pushItem(result);
            },

            // INVOKE symbol WITH PARAMETER
            function(operand) {
                var index = operand - 1;  // convert to a javascript zero based index
                // pop the parameters to the intrinsic function call off of the component stack
                var parameters = new collections.List();
                var parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                // call the intrinsic function associated with the index operand
                var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
                // push the result of the function call onto the top of the component stack
                procedureContext.components.pushItem(result);
            },

            // INVOKE symbol WITH 2 PARAMETERS
            function(operand) {
                var index = operand - 1;  // convert to a javascript zero based index
                // pop the parameters to the intrinsic function call off of the component stack
                var parameters = new collections.List();
                var parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                // call the intrinsic function associated with the index operand
                var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
                // push the result of the function call onto the top of the component stack
                procedureContext.components.pushItem(result);
            },

            // INVOKE symbol WITH 3 PARAMETERS
            function(operand) {
                var index = operand - 1;  // convert to a javascript zero based index
                // pop the parameters to the intrinsic function call off of the component stack
                var parameters = new collections.List();
                var parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                parameter = procedureContext.components.popItem();
                parameters.pushItem(parameter);
                // call the intrinsic function associated with the index operand
                var result = intrinsics.intrinsicFunctions[index].apply(this, parameters);
                // push the result of the function call onto the top of the component stack
                procedureContext.components.pushItem(result);
            },

            // EXECUTE symbol
            function(operand) {
                var index = operand;
                var context = new ProcedureContext();
                context.target = elements.Template.NONE;
                context.type = procedureContext.components.popItem();
                var type = environment.retrieveDocument(context.type);
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
                procedureContext = context;
                taskContext.procedures.pushItem(context);
            },

            // EXECUTE symbol WITH PARAMETERS
            function(operand) {
                var index = operand;
                var context = new ProcedureContext();
                context.target = elements.Template.NONE;
                context.type = procedureContext.components.popItem();
                var type = environment.retrieveDocument(context.type);
                var procedures = type.getValue('$procedures');
                var association = procedures.getItem(index);
                context.procedure = association.key;
                var procedure = association.value;
                context.literals = type.literals;
                var parameters = procedureContext.components.popItem();
                context.parameters = this.extractParameters(procedure, parameters);
                context.variables = this.extractVariables(procedure);
                var bytes = procedure.getValue('$bytecode').value;
                context.bytecode = codex.bytesToBytecode(bytes);
                context.address = 1;
                procedureContext = context;
                taskContext.procedures.pushItem(context);
            },

            // EXECUTE symbol ON TARGET
            function(operand) {
                var index = operand;
                var context = new ProcedureContext();
                context.target = procedureContext.components.popItem();
                context.type = this.extractType(context.target);
                var type = environment.retrieveDocument(context.type);
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
                procedureContext = context;
                taskContext.procedures.pushItem(context);
            },

            // EXECUTE symbol ON TARGET WITH PARAMETERS
            function(operand) {
                var index = operand;
                var context = new ProcedureContext();
                context.target = procedureContext.components.popItem();
                context.type = this.extractType(context.target);
                var type = environment.retrieveDocument(context.type);
                var procedures = type.getValue('$procedures');
                var association = procedures.getItem(index);
                context.procedure = association.key;
                var procedure = association.value;
                context.literals = type.literals;
                var parameters = procedureContext.components.popItem();
                context.parameters = this.extractParameters(procedure, parameters);
                context.variables = this.extractVariables(procedure);
                var bytes = procedure.getValue('$bytecode').value;
                context.bytecode = codex.bytesToBytecode(bytes);
                context.address = 1;
                procedureContext = context;
                taskContext.procedures.pushItem(context);
            },

            // HANDLE EXCEPTION
            function(operand) {
                // pop the current exception off of the component stack
                var exception = procedureContext.components.popItem();
                while (taskContext.procedures.getSize() > 0 &&
                        procedureContext.handlers.getSize() === 0) {
                    // pop the current context off of the context stack since it has no handlers
                    taskContext.procedures.popItem();
                    procedureContext = taskContext.procedures.getTop();
                }
                // TODO: need to check for no more contexts also for no more handler addresses
                //       and throw JS exception that can be caught by the main processing loop.

                // push the current exception onto the top of the component stack
                procedureContext.components.pushItem(exception);
                // retrieve the address of the current exception handlers
                var address = procedureContext.handlers.popItem().toNumber();
                // use that address as the next instruction to be executed
                procedureContext.address = address;
            },

            // HANDLE RESULT
            function(operand) {
                // pop the result of the procedure call off of the component stack
                var result = procedureContext.components.popItem();
                // pop the current context off of the context stack since it is now out of scope
                taskContext.procedures.popItem();
                procedureContext = taskContext.procedures.getTop();
                // push the result of the procedure call onto the top of the component stack
                procedureContext.components.pushItem(result);
            },

            // UNIMPLEMENTED HANDLE OPERATION
            function(operand) {
                throw new Error('An unimplemented HANDLE operation was attempted: 72');
            },

            // UNIMPLEMENTED HANDLE OPERATION
            function(operand) {
                throw new Error('An unimplemented HANDLE operation was attempted: 73');
            }

        ]

    };
}
