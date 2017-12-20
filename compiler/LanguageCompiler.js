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
 * This class defines a compiling visitor that "walks" a parse tree
 * produced by the BaliLanguageParser and generates the assembly code
 * that can be used to generate the bytecode for the Bali Virtual Machine™.
 */
var BaliLanguageVisitor = require('bali-language/grammar/BaliLanguageVisitor').BaliLanguageVisitor;
var LanguageFormatter = require('bali-language/transformers/LanguageFormatter').LanguageFormatter;


/**
 * This constructor creates a new compiler.
 * 
 * @constructor
 * @returns {LanguageCompiler} The new compiler.
 */
function LanguageCompiler() {
    return this;
}
LanguageCompiler.prototype.constructor = LanguageCompiler;
exports.LanguageCompiler = LanguageCompiler;


/**
 * This function takes a Bali block and compiles it into machine language.
 * 
 * @param {BlockContext} baliBlock The Bali block to be compiled.
 * @param {object} symbolTables The symbol tables for variables, labels, etc.
 * @returns {string} The assembly instruction code.
 */
LanguageCompiler.prototype.compileBlock = function(baliBlock, symbolTables) {
    var visitor = new CompilerVisitor(symbolTables);
    baliBlock.accept(visitor);
    return visitor.getResult() + '\n';  // POSIX requires all lines end with a line feed
};


// PRIVATE VISITOR CLASS

function CompilerVisitor(symbolTables) {
    BaliLanguageVisitor.call(this);
    if (symbolTables) {
        this.symbolTables = symbolTables;
    } else {
        this.symbolTables = {};
    }
    if (!this.symbolTables.attributes) this.symbolTables.attributes = [];
    if (!this.symbolTables.variables) this.symbolTables.variables = [];
    if (!this.symbolTables.parameters) this.symbolTables.parameters = [];
    if (!this.symbolTables.arguments) this.symbolTables.arguments = [];
    if (!this.symbolTables.literals) this.symbolTables.literals = [];
    if (!this.symbolTables.functions) this.symbolTables.functions = [];
    if (!this.symbolTables.messages) this.symbolTables.messages = [];
    this.builder = new InstructionBuilder();
    this.temporaryVariableCount = 1;
    return this;
}
CompilerVisitor.prototype = Object.create(BaliLanguageVisitor.prototype);
CompilerVisitor.prototype.constructor = CompilerVisitor;


CompilerVisitor.prototype.createTemporaryVariable = function(name) {
    return '$_' + name + '_' + this.temporaryVariableCount++;
};


CompilerVisitor.prototype.createContinueVariable = function(loopLabel) {
    return '$_continue_' + loopLabel.replace(/\./g, '_');
};


CompilerVisitor.prototype.getResult = function() {
    this.builder.finalize();
    return this.builder.asmcode;
};


// document: literal parameters?
CompilerVisitor.prototype.visitDocument = function(ctx) {
    // the VM places the literal component on the execution stack
    this.visitLiteral(ctx.literal());

    // the VM places the parameters on the execution stack
    var parameters = ctx.parameters();
    if (parameters) {
        this.visitParameters(parameters);
        // TODO: what do we do with these if they exist?
        // If they remain on the execution stack how do we know they are there?
    }

    // the literal component remains on the execution stack
};


// literal: element | structure | block
CompilerVisitor.prototype.visitLiteral = function(ctx) {
    this.visitChildren(ctx);
};


// parameters: '(' composite ')'
CompilerVisitor.prototype.visitParameters = function(ctx) {
    this.visitComposite(ctx.composite());
};


// structure: '[' composite ']'
CompilerVisitor.prototype.visitStructure = function(ctx) {
    this.visitComposite(ctx.composite());
};


// composite: range | array | table
CompilerVisitor.prototype.visitComposite = function(ctx) {
    this.visitChildren(ctx);
};


// range: value '..' value
CompilerVisitor.prototype.visitRange = function(ctx) {
    // the VM places the result of the starting range value on the execution stack
    this.visitValue(ctx.value(0));

    // the VM places the result of the ending range value on the execution stack
    this.visitValue(ctx.value(1));

    // the VM replaces the two range values on the execution stack with a new range component
    this.builder.insertInvokeInstruction('$range', 2);
};


// array:
//     value (',' value)*       |
//     NEWLINE (value NEWLINE)* |
//     /*empty array*/
CompilerVisitor.prototype.visitArray = function(ctx) {
    // the VM places the size of the array on the execution stack
    var values = ctx.value();
    var size = values.length;
    this.builder.insertLoadInstruction('LITERAL', size);

    // the VM replaces the size value on the execution stack with a new array containing the items
    this.builder.insertInvokeInstruction('$array', 1);
    for (var i = 0; i < values.length; i++) {
        this.visitValue(values[i]);
        this.builder.insertInvokeInstruction('$addItem', 2);
    }

    // the array remains on the execution stack
};
// THESE MUST BE HERE SINCE visitArray() IS NOT CALLED DIRECTLY
CompilerVisitor.prototype.visitInlineArray = function(ctx) {
    // delegate to general case
    this.visitArray(ctx);
};
CompilerVisitor.prototype.visitNewlineArray = function(ctx) {
    // delegate to general case
    this.visitArray(ctx);
};
CompilerVisitor.prototype.visitEmptyArray = function(ctx) {
    // the VM loads a new empty array onto the top of the execution stack
    this.builder.insertLoadInstruction('LITERAL', 0);
    this.builder.insertInvokeInstruction('$array', 1);
};


// table:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty table*/
CompilerVisitor.prototype.visitTable = function(ctx) {
    // the VM places the size of the array on the execution stack
    var associations = ctx.association();
    var size = associations.length;
    this.builder.insertLoadInstruction('LITERAL', size);

    // the VM replaces the size value on the execution stack with a new table containing the associations
    this.builder.insertInvokeInstruction('$table', 1);
    for (var i = 0; i < associations.length; i++) {
        this.visitAssociation(associations[i]);
        this.builder.insertInvokeInstruction('$setValue', 3);
    }

    // the table remains on the execution stack
};
// THESE MUST BE HERE SINCE visitTable() IS NOT CALLED DIRECTLY
CompilerVisitor.prototype.visitInlineTable = function(ctx) {
    this.visitTable(ctx);
};
CompilerVisitor.prototype.visitNewlineTable = function(ctx) {
    this.visitTable(ctx);
};
CompilerVisitor.prototype.visitEmptyTable = function(ctx) {
    // the VM loads a new empty table onto the top of the execution stack
    this.builder.insertLoadInstruction('LITERAL', 0);
    this.builder.insertInvokeInstruction('$table', 1);
};


// association: key ':' value
CompilerVisitor.prototype.visitAssociation = function(ctx) {
    // the VM places the key component on the execution stack
    this.visitKey(ctx.key());

    // the VM places the result of the value value on the execution stack
    this.visitValue(ctx.value());
};


// key: element parameters?
CompilerVisitor.prototype.visitKey = function(ctx) {
    // the VM places the element component on the execution stack
    this.visitElement(ctx.element());

    // the VM places the parameters on the execution stack
    var parameters = ctx.parameters();
    if (parameters) {
        this.visitParameters(parameters);
        // TODO: what do we do with these if they exist?
        // If they remain on the execution stack how do we know they are there?
    }

    // the element component remains on the execution stack
};


// value: expression
CompilerVisitor.prototype.visitValue = function(ctx) {
    this.visitExpression(ctx.expression());
};


// script: SHELL statements EOF
CompilerVisitor.prototype.visitScript = function(ctx) {
    throw new Error('COMPILER: A script cannot be compiled, it must be interpreted.');
    //this.visitStatements(ctx.statements());
};


// block: '{' statements '}'
CompilerVisitor.prototype.visitBlock = function(ctx) {
    // create a new compiler block context in the instruction builder
    this.builder.pushBlockContext();

    // compile the statements in the block
    this.visitStatements(ctx.statements());

    // throw away the current compiler block context in the instruction builder
    this.builder.popBlockContext();
};


// statements:
//     statement (';' statement)*   |
//     NEWLINE (statement NEWLINE)* |
//     /*empty statements*/
CompilerVisitor.prototype.visitStatements = function(ctx) {
    // record the label for the end of the block in the compiler block context
    var statements = ctx.statement();
    var numberOfStatements = statements.length;
    var block = this.builder.blocks.peek();
    var blockEndLabel = block.prefix + (numberOfStatements + 1) + '.BlockEnd';
    block.blockEndLabel = blockEndLabel;

    // compile the statements
    for (var i = 0; i < statements.length; i++) {
        this.visitStatement(statements[i]);
        this.builder.incrementStatementCount();
    }

    // the VM jumps here when flow is interrupted by 'return', 'throw', 'continue', and 'break'
    this.builder.insertLabel(blockEndLabel);
};


// statement: mainClause exceptionClause* finalClause?
CompilerVisitor.prototype.visitStatement = function(ctx) {
    var exceptionClauses = ctx.exceptionClause();
    var numberOfClauses = exceptionClauses.length;
    var finalClause = ctx.finalClause();
    var statementPrefix = this.builder.getStatementPrefix();
    var exceptionsLabel = statementPrefix + 'ExceptionClauses';
    var statementEndLabel = statementPrefix;
    statementEndLabel += finalClause ? 'FinalClause' : 'StatementEnd';
    this.builder.blocks.peek().statementEndLabel = statementEndLabel;

    // the VM executes the main clause
    this.visitMainClause(ctx.mainClause());

    if (exceptionClauses.length > 0) {
        this.builder.insertLabel(exceptionsLabel);
        for (var i = 0; i < numberOfClauses; i++) {
            // the VM jumps past the exception clauses if there is no exception
            this.builder.insertLoadInstruction('VARIABLE', '$_exception_');
            this.builder.insertJumpInstruction('ON NONE', statementEndLabel);

            // the VM attempts to handle the exception
            this.builder.insertLoadInstruction('VARIABLE', '$_exception_');
            this.visitExceptionClause(exceptionClauses[i]);
        }
    }

    if (this.builder.getClauseNumber() > 1) {
        // the VM jumps to here when there is no exception
        this.builder.insertLabel(statementEndLabel);
    }

    if (finalClause) {
        // the VM executes the final clause
        this.visitFinalClause(finalClause);
    }

    // the VM jumps to a parent final or exception clauses if there is an exception

};


// mainClause:
//     evaluateExpression |
//     checkoutDocument |
//     saveDraft |
//     discardDraft |
//     commitDocument |
//     publishEvent |
//     queueMessage |
//     waitForMessage |
//     ifThen |
//     selectFrom |
//     whileLoop |
//     withLoop |
//     continueTo |
//     breakFrom |
//     returnResult |
//     throwException
CompilerVisitor.prototype.visitMainClause = function(ctx) {
    this.visitChildren(ctx);
};


// exceptionClause: 'catch' symbol 'matching' template 'with' block
CompilerVisitor.prototype.visitExceptionClause = function(ctx) {
    var clausePrefix = this.builder.getClausePrefix();
    var exceptionLabel = clausePrefix + 'ExceptionClause';
    var statementEndLabel = clausePrefix + 'ClauseEnd';
    this.builder.insertLabel(exceptionLabel);

    // the VM stores the exception that is on top of the execution stack in the variable
    var exception = ctx.symbol().SYMBOL().getText();
    this.builder.insertStoreInstruction('VARIABLE', exception);

    // the VM compares the template with actual exception
    this.builder.insertLoadInstruction('VARIABLE', exception);
    this.visitXception(ctx.template());
    this.builder.insertInvokeInstruction('$matches', 2);

    // the VM jumps past this exception handler if the template and exception did not match
    this.builder.insertJumpInstruction('ON FALSE', statementEndLabel);

    // the VM executes the exception handler
    this.visitBlock(ctx.block());

    // the VM clears the exception variable
    this.builder.insertLoadInstruction('LITERAL', 'none');
    this.builder.insertStoreInstruction('VARIABLE', '$_exception_');

    // the VM jumps here if the exception did not match the template
    this.builder.insertLabel(statementEndLabel);
};


// template: expression
CompilerVisitor.prototype.visitTemplate = function(ctx) {
    this.visitExpression(ctx.expression());
};


// finalClause: 'finish' 'with' block
CompilerVisitor.prototype.visitFinalClause = function(ctx) {
    this.visitBlock(ctx.block());
};


// evaluateExpression: (assignee ':=')? expression
CompilerVisitor.prototype.visitEvaluateExpression = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'EvaluateStatement');

    var assignee = ctx.assignee();
    var variable = assignee ? assignee.symbol() : null;
    variable = variable ? variable.SYMBOL().getText() : '$_result_';
    var component = assignee ? assignee.component() : null;
    var parent = this.createTemporaryVariable('component');
    var index = this.createTemporaryVariable('index');

    if (component) {
        // load the parent of the component and index of the child onto the execution stack
        this.visitComponent(component);

        // save of the parent and index in temporary variables
        this.builder.insertStoreInstruction('VARIABLE', index);
        this.builder.insertStoreInstruction('VARIABLE', parent);
    }

    // load the value of the expression onto the top of the execution stack
    this.visitExpression(ctx.expression());

    if (component) {
        // the VM stores the value of the expression in a temporary variable
        var value = this.createTemporaryVariable('value');
        this.builder.insertStoreInstruction('VARIABLE', value);

        // the VM stores the type of the parent in a temporary variable
        this.builder.insertLoadInstruction('VARIABLE', parent);
        this.builder.insertInvokeInstruction('$getType', 1);
        var type = this.createTemporaryVariable('type');
        this.builder.insertStoreInstruction('VARIABLE', type);

        // the VM creates the parameters array in a temporary variable
        var parameters = this.createTemporaryVariable('parameters');
        this.builder.insertLoadInstruction('LITERAL', 2);  // the initial capacity of the array
        this.builder.insertInvokeInstruction('$array', 1);
        this.builder.insertLoadInstruction('VARIABLE', index);
        this.builder.insertInvokeInstruction('$addItem', 2);
        this.builder.insertLoadInstruction('VARIABLE', value);
        this.builder.insertInvokeInstruction('$addItem', 2);
        this.builder.insertStoreInstruction('VARIABLE', parameters);

        // the VM loads the method context onto the execution stack
        this.builder.insertLoadInstruction('VARIABLE', type);
        this.builder.insertLoadInstruction('VARIABLE', parent);
        this.builder.insertLoadInstruction('VARIABLE', parameters);

        // the VM executes the parent.setValue(index, value) method
        this.builder.insertExecuteInstruction('WITH TARGET AND PARAMETERS', '$setValue');
    } else {
        // the VM stores the value that is on top of the execution stack in the variable
        this.builder.insertStoreInstruction('VARIABLE', variable);
    }
};


// assignee: symbol | component
CompilerVisitor.prototype.visitAssignee = function(ctx) {
    // never called...
    this.visitChildren(ctx);
};


// component: variable indices
CompilerVisitor.prototype.visitComponent = function(ctx) {
    // the VM places the value of the variable on the execution stack
    this.visitVariable(ctx.variable());

    // the VM places the parent of the child component and index of the child onto the execution stack
    this.visitIndices(ctx.indices());
};


// variable: IDENTIFIER
CompilerVisitor.prototype.visitVariable = function(ctx) {
    // the VM loads the value of the variable onto the top of the execution stack
    var variable = '$' + ctx.IDENTIFIER().getText();
    this.builder.insertLoadInstruction('VARIABLE', variable);
};


// indices: '[' array ']'
CompilerVisitor.prototype.visitIndices = function(ctx) {
    // the VM stores the component that is on top of the execution stack in a temporary variable
    var component = this.createTemporaryVariable('component');
    this.builder.insertStoreInstruction('VARIABLE', component);

    var indices = ctx.array().value();
    for (var i = 0; i <indices.length; i++) {
        var value = indices[i];

        // the VM loads the component onto the top of the execution stack
        this.builder.insertLoadInstruction('VARIABLE', component);

        // the VM stores the value of the next index expression in a temporary variable
        var index = this.createTemporaryVariable('index');
        this.visitValue(value);
        if (i === indices.length - 1) break;  // leave the last index on the execution stack and exit
        this.builder.insertStoreInstruction('VARIABLE', index);
        
        // the VM stores a reference to the type of the component in a temporary variable
        this.builder.insertLoadInstruction('VARIABLE', component);
        this.builder.insertInvokeInstruction('$getType', 1);
        var type = this.createTemporaryVariable('type');
        this.builder.insertStoreInstruction('VARIABLE', type);

        // the VM creates a parameters array in a temporary variable
        var parameters = this.createTemporaryVariable('parameters');
        this.builder.insertLoadInstruction('LITERAL', 1);  // the initial capacity of the array
        this.builder.insertInvokeInstruction('$array', 1);
        this.builder.insertLoadInstruction('VARIABLE', index);
        this.builder.insertInvokeInstruction('$addItem', 2);
        this.builder.insertStoreInstruction('VARIABLE', parameters);

        // the VM loads the method context onto the execution stack
        this.builder.insertLoadInstruction('VARIABLE', type);
        this.builder.insertLoadInstruction('VARIABLE', component);
        this.builder.insertLoadInstruction('VARIABLE', parameters);

        // the VM executes the component.getValue(index) method
        this.builder.insertExecuteInstruction('WITH TARGET AND PARAMETERS', '$getValue');
        // NOTE: this must be an executed message rather than an intrinsic to handle any collection

        // the VM stores the child component in the temporary variable
        this.builder.insertStoreInstruction('VARIABLE', component);
    }

    // the parent component and index of the last child component are on top of the execution stack
};


// checkoutDocument: 'checkout' symbol 'from' location
CompilerVisitor.prototype.visitCheckoutDocument = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'CheckoutStatement');

    // the VM stores the value of the reference to the location into a temporary variable
    this.visitLocation(ctx.location());
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the execution stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the VM stores the document in the variable
    var document = ctx.symbol().SYMBOL().getText();
    this.builder.insertStoreInstruction('VARIABLE', document);
};


// saveDraft: 'save' draft 'to' location
CompilerVisitor.prototype.visitSaveDraft = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'SaveStatement');

    // the VM stores the value of the reference to the location into a temporary variable
    this.visitLocation(ctx.location());
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the execution stack
    this.visitDraft(ctx.draft());

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DRAFT', location);
};


// discardDraft: 'discard' location
CompilerVisitor.prototype.visitDiscardDraft = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'DiscardStatement');

    // the VM stores the value of the reference to the location into a temporary variable
    this.visitLocation(ctx.location());
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM stores no document into the remote location
    this.builder.insertLoadInstruction('LITERAL', 'none');
    this.builder.insertStoreInstruction('DRAFT', location);
};


// commitDraft: 'commit' draft 'to' location
CompilerVisitor.prototype.visitCommitDraft = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'CommitStatement');

    // the VM stores the value of the reference to the location into a temporary variable
    this.visitLocation(ctx.location());
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the execution stack
    this.visitDraft(ctx.draft());

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DOCUMENT', location);
};


// draft: expression
CompilerVisitor.prototype.visitDraft = function(ctx) {
    this.visitExpression(ctx.expression());
};


// location: expression
CompilerVisitor.prototype.visitLocation = function(ctx) {
    this.visitExpression(ctx.expression());
};


// publishEvent: 'publish' event
CompilerVisitor.prototype.visitPublishEvent = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'PublishStatement');

    // the VM places the value of the event onto the top of the execution stack
    this.visitEvent(ctx.event());

    // the VM stores the event on the event queue
    this.builder.insertStoreInstruction('MESSAGE', '$_eventQueue_');
};


// event: expression
CompilerVisitor.prototype.visitEvent = function(ctx) {
    this.visitExpression(ctx.expression());
};


// queueMessage: 'queue' message 'on' queue
CompilerVisitor.prototype.visitQueueMessage = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'QueueStatement');

    // the VM stores the reference to the queue in a temporary variable
    this.visitQueue(ctx.queue());
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM stores the message on the message queue
    this.visitMessage(ctx.message());
    this.builder.insertStoreInstruction('MESSAGE', queue);
};


// waitForMessage: 'wait' 'for' symbol 'from' queue
CompilerVisitor.prototype.visitWaitForMessage = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WaitStatement');

    // the VM stores the reference to the queue in a temporary variable
    this.visitQueue(ctx.queue());
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM retrieves a message from the message queue and place it on top of the execution stack
    this.builder.insertLoadInstruction('MESSAGE', queue);  // VM blocks until a message is available
    //
    // the VM stores the message as the value of the variable
    var message = ctx.symbol().SYMBOL().getText();
    this.builder.insertStoreInstruction('VARIABLE', message);
};


// message: expression
CompilerVisitor.prototype.visitMessage = function(ctx) {
    this.visitExpression(ctx.expression());
};


// queue: expression
CompilerVisitor.prototype.visitQueue = function(ctx) {
    this.visitExpression(ctx.expression());
};


// ifThen: 'if' condition 'then' block ('else' 'if' condition 'then' block)* ('else' block)?
CompilerVisitor.prototype.visitIfThen = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'IfStatement');
    var conditions = ctx.condition();
    var blocks = ctx.block();
    var hasElseClause = blocks.length > conditions.length;
    var elseLabel = statementPrefix + (conditions.length + 1) + '.ElseClause';
    var statementEndLabel = this.builder.blocks.peek().statementEndLabel;

    // check each condition
    for (var i = 0; i < conditions.length; i++) {
        var clausePrefix = this.builder.getClausePrefix();
        this.builder.insertLabel(clausePrefix + 'IfCondition');
        // place the condition value on top of the execution stack
        this.visitCondition(conditions[i]);
        // the result of the condition expression is now on top of the execution stack
        var nextLabel;
        if (i === conditions.length - 1) {
            // we are on the last condition
            if (hasElseClause) {
                nextLabel = elseLabel;
            } else {
                nextLabel = statementEndLabel;
            }
        } else {
            nextLabel = statementPrefix + (this.builder.getClauseNumber() + 1) + 'IfCondition';
        }
        // if the condition is not true, the VM branches to the next condition or the end
        this.builder.insertJumpInstruction('ON FALSE', nextLabel);
        // if the condition is true, then the VM enters the block
        this.visitBlock(blocks[i]);
        // all done
        if (hasElseClause || i < conditions.length - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertJumpInstruction('', statementEndLabel);
        }
    }

    // compile the optional final else block
    if (hasElseClause) {
        this.builder.insertLabel(elseLabel);
        this.visitBlock(blocks[blocks.length - 1]);
    }
};


// condition: expression
CompilerVisitor.prototype.visitCondition = function(ctx) {
    this.visitExpression(ctx.expression());
};


// selectFrom: 'select' selection 'from' (option 'do' block)+ ('else' block)?
CompilerVisitor.prototype.visitSelectFrom = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'SelectStatement');
    var options = ctx.option();
    var blocks = ctx.block();
    var hasElseClause = blocks.length > options.length;
    var elseLabel = statementPrefix + (options.length + 1) + '.ElseClause';
    var statementEndLabel = this.builder.blocks.peek().statementEndLabel;

    // place the selection value on the top of the execution stack
    this.visitSelection(ctx.selection());
    // store off the selection value so that it can be used multiple times
    var selection = this.createTemporaryVariable('selection');
    this.builder.insertStoreInstruction('VARIABLE', selection);

    // check each option
    for (var i = 0; i < options.length; i++) {
        var clausePrefix = this.builder.getClausePrefix();
        this.builder.insertLabel(clausePrefix + 'SelectOption');
        // load the selection value onto the execution stack
        this.builder.insertLoadInstruction('VARIABLE', selection);
        // place the option value on top of the execution stack
        this.visitOption(options[i]);
        // the VM checks to see if the selection and option match
        this.builder.insertInvokeInstruction('$matches', 2);
        var nextLabel;
        if (i === options.length - 1) {
            // we are on the last option
            if (hasElseClause) {
                nextLabel = elseLabel;
            } else {
                nextLabel = statementEndLabel;
            }
        } else {
            nextLabel = statementPrefix + (this.builder.getClauseNumber() + 1) + 'SelectOption';
        }
        // if the option does not match, the VM branches to the next option or the end
        this.builder.insertJumpInstruction('ON FALSE', nextLabel);
        // if the option matches, then the VM enters the block
        this.visitBlock(blocks[i]);
        // all done
        if (hasElseClause || i < options.length - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertJumpInstruction('', statementEndLabel);
        }
    }

    // the VM executes the optional final else block
    if (hasElseClause) {
        this.builder.insertLabel(elseLabel);
        this.visitBlock(blocks[blocks.length - 1]);
    }
};


// selection: expression
CompilerVisitor.prototype.visitSelection = function(ctx) {
    this.visitExpression(ctx.expression());
};


// option: expression
CompilerVisitor.prototype.visitOption = function(ctx) {
    this.visitExpression(ctx.expression());
};


// whileLoop: (label ':')? 'while' condition 'do' block
/*
 * This method utilizes a 'continueLoop' variable that can be set by the 'break from'
 * and 'continue to' statements as an additional way to tell the loop when it is done.
 * Although this may seem like a primitive way to implement the functionality it is
 * necessary to ensure that all 'finish with' handlers are called when prematurely
 * exiting a loop and its enclosing blocks.
 */
CompilerVisitor.prototype.visitWhileLoop = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WhileStatement');

    // construct the labels
    var loopLabel = ctx.label();
    if (loopLabel) {
        loopLabel = loopLabel.IDENTIFIER().getText();
        loopLabel = loopLabel.charAt(0).toUpperCase() + loopLabel.slice(1);
    } else {
        loopLabel = 'WhileCondition';
    }
    var clausePrefix = this.builder.getClausePrefix();
    loopLabel = clausePrefix + loopLabel;
    var statementEndLabel = this.builder.blocks.peek().statementEndLabel;

    // setup the compiler state for this loop with respect to 'continue' and 'break' statements
    this.builder.blocks.peek().loopLabel = loopLabel;
    var continueLoop = this.createContinueVariable(loopLabel);
    this.builder.insertLoadInstruction('LITERAL', true);
    this.builder.insertStoreInstruction('VARIABLE', continueLoop);

    // label the start of the loop
    this.builder.insertLabel(loopLabel);
    // the VM places the value of the continue loop variable on top of the execution stack
    this.builder.insertLoadInstruction('VARIABLE', continueLoop);
    // the VM places the result of the boolean condition on top of the execution stack
    this.visitCondition(ctx.condition());

    // the VM replaces the two values on the execution stack with the logical AND of the values
    this.builder.insertInvokeInstruction('$and', 2);

    // if the condition is false or the continue flag is false, the VM branches to the end
    this.builder.insertJumpInstruction('ON FALSE', statementEndLabel);
    // if the condition is true, then the VM enters the block
    this.visitBlock(ctx.block());
    // all done, the VM jumps to the end of the statement
    this.builder.insertJumpInstruction('', loopLabel);
};


// withLoop: (label ':')? 'with' ('each' symbol 'in')? sequence 'do' block
/*
 * This method utilizes a 'continueLoop' variable that can be set by the 'break from'
 * and 'continue to' statements as an additional way to tell the loop when it is done.
 * Although this may seem like a primitive way to implement the functionality it is
 * necessary to ensure that all 'finish with' handlers are called when prematurely
 * exiting a loop and its enclosing blocks.
 */
CompilerVisitor.prototype.visitWithLoop = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WithStatement');

    // the VM evaluates the sequence expression and places the result on top of the execution stack
    this.visitSequence(ctx.sequence());

    // the VM stores the sequence in a temporary variable
    var sequence = this.createTemporaryVariable('sequence');
    this.builder.insertStoreInstruction('VARIABLE', sequence);

    // the VM stores a reference to the type of the sequence in a temporary variable
    this.builder.insertLoadInstruction('VARIABLE', sequence);
    this.builder.insertInvokeInstruction('$getType', 1);
    var sequenceType = this.createTemporaryVariable('sequenceType');
    this.builder.insertStoreInstruction('VARIABLE', sequenceType);

    // the VM loads the method context onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', sequenceType);
    this.builder.insertLoadInstruction('VARIABLE', sequence);

    // the VM executes the sequence.createIterator() method
    this.builder.insertExecuteInstruction('WITH TARGET', '$createIterator');

    // The VM stores the iterater in a temporary variable
    var iterator = this.createTemporaryVariable('iterator');
    this.builder.insertStoreInstruction('VARIABLE', iterator);

    // the VM stores a reference to the type of the iterator in a temporary variable
    this.builder.insertLoadInstruction('VARIABLE', iterator);
    this.builder.insertInvokeInstruction('$getType', 1);
    var iteratorType = this.createTemporaryVariable('iteratorType');
    this.builder.insertStoreInstruction('VARIABLE', iteratorType);

    // retrieve the name of the item variable or make a temporary variable for it
    var item = ctx.symbol();
    if (item) {
        item = item.SYMBOL().getText();
    } else {
        item = this.createTemporaryVariable('item');
    }

    // construct the labels
    var loopLabel = ctx.label();
    if (loopLabel) {
        loopLabel = loopLabel.IDENTIFIER().getText();
        loopLabel = loopLabel.charAt(0).toUpperCase() + loopLabel.slice(1);
    } else {
        loopLabel = 'WithItem';
    }
    var clausePrefix = this.builder.getClausePrefix();
    loopLabel = clausePrefix + loopLabel;
    var statementEndLabel = this.builder.blocks.peek().statementEndLabel;

    // setup the compiler state for this loop with respect to 'continue' and 'break' statements
    this.builder.blocks.peek().loopLabel = loopLabel;
    var continueLoop = this.createContinueVariable(loopLabel);
    this.builder.insertLoadInstruction('LITERAL', true);
    this.builder.insertStoreInstruction('VARIABLE', continueLoop);

    // label the start of the loop
    this.builder.insertLabel(loopLabel);

    // the VM places the value of the continue loop variable on top of the execution stack
    this.builder.insertLoadInstruction('VARIABLE', continueLoop);

    // the VM loads the method context onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', iteratorType);
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM executes the sequence.createIterator() method
    this.builder.insertExecuteInstruction('WITH TARGET', '$hasNext');

    // the VM replaces the two values on the execution stack with the logical AND of the values
    this.builder.insertInvokeInstruction('$and', 2);

    // if the condition is false or the continue flag is false, the VM branches to the end
    this.builder.insertJumpInstruction('ON FALSE', statementEndLabel);

    // the VM loads the method context onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', iteratorType);
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM executes the sequence.createIterator() method
    this.builder.insertExecuteInstruction('WITH TARGET', '$getNext');

    // the VM stores the item that is on top of the execution stack in the variable
    this.builder.insertStoreInstruction('VARIABLE', item);

    // the VM executes the block using the item if needed
    this.visitBlock(ctx.block());

    // the VM jumps to the top of the loop
    this.builder.insertJumpInstruction('', loopLabel);
};


// sequence: expression
CompilerVisitor.prototype.visitSequence = function(ctx) {
    this.visitExpression(ctx.expression());
};


// continueTo: 'continue' ('to' label)?
/*
 *  This method is implemented as if there is no 'continue to' statement type. The
 *  reason is that great care must be taken when unwinding nested statements since
 *  they may have 'finish with' clauses that must be executed regardless of how the
 *  blocks are exited. This implementation may be less efficient but is much easier
 *  to prove correct. It relies on a 'continueLoop' variable being checked in the
 *  loop statements as a way to tell them to end when continueLoop === false.
 */
CompilerVisitor.prototype.visitContinueTo = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ContinueStatement');

    // convert the label if it exists to be a loop label suffix
    var label = ctx.label();
    if (label) {
        label = label.IDENTIFIER().getText();
        label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    var blocks = this.builder.blocks;
    var numberOfBlocks = blocks.length;
    for (var i = 0; i < numberOfBlocks; i++) {
        var block = blocks[numberOfBlocks - i - 1];  // work backwards
        var loopLabel = block.loopLabel;
        if (loopLabel) {
            if (label === undefined || label === null || loopLabel.endsWith(label)) {
                // found the matching enclosing loop
                // the VM jumps to the end label of the parent block
                // NOTE: we can't just jump straight to the matching loop or we will miss
                // executing final handlers along the way
                var blockEndLabel = this.builder.blocks.peek().blockEndLabel;
                this.builder.insertJumpInstruction('', blockEndLabel);
                return;
            }
            // not yet found the matching enclosing loop so break out of this one
            // the VM sets the 'continueLoop' variable for this block to 'false'
            var continueLoop = this.createContinueVariable(loopLabel);
            this.builder.insertLoadInstruction('LITERAL', false);
            this.builder.insertStoreInstruction('VARIABLE', continueLoop);
        }
    }
    // if we get here there was no matching enclosing loop which should never happen
    throw new Error('COMPILER: An unknown label was found in a "continue to" statement: ' + label);
};


// breakFrom: 'break' ('from' label)?
/*
 *  This method is implemented as if there is no 'break from' statement type. The
 *  reason is that great care must be taken when unwinding nested statements since
 *  they may have 'finish with' clauses that must be executed regardless of how the
 *  blocks are exited. This implementation may be less efficient but is much easier
 *  to prove correct. It relies on a 'continueLoop' variable being checked in the
 *  loop statements as a way to tell them to end when continueLoop === false.
 */
CompilerVisitor.prototype.visitBreakFrom = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'BreakStatement');

    // convert the label if it exists to be a loop label suffix
    var label = ctx.label();
    if (label) {
        label = label.IDENTIFIER().getText();
        label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    var blocks = this.builder.blocks;
    var numberOfBlocks = blocks.length;
    for (var i = 0; i < numberOfBlocks; i++) {
        var block = blocks[numberOfBlocks - i - 1];  // work backwards
        var loopLabel = block.loopLabel;
        if (loopLabel) {
            // for each enclosing loop we need to tell it that its done
            // the VM sets the 'continueLoop' variable for this block to 'false'
            var continueLoop = this.createContinueVariable(loopLabel);
            this.builder.insertLoadInstruction('LITERAL', false);
            this.builder.insertStoreInstruction('VARIABLE', continueLoop);
            if (label === undefined || label === null || loopLabel.endsWith(label)) {
                // found the matching enclosing loop
                // the VM jumps to the end label of the parent block
                // NOTE: we can't just jump straight to the matching loop or we will miss
                // executing final handlers along the way
                var blockEndLabel = this.builder.blocks.peek().blockEndLabel;
                this.builder.insertJumpInstruction('', blockEndLabel);
                return;
            }
        }
    }
    // if we get here there was no matching enclosing loop which should never happen
    throw new Error('COMPILER: An unknown label was found in a "break from" statement: ' + label);
};


// label: IDENTIFIER
CompilerVisitor.prototype.visitLabel = function(ctx) {
    // not called...
    //var label = ctx.IDENTIFIER().getText();
};


// returnResult: 'return' result?
CompilerVisitor.prototype.visitReturnResult = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ReturnStatement');

    var result = ctx.result();
    if (result) {
        // the VM stores the result in a temporary variable
        this.visitResult(result);
        this.builder.insertStoreInstruction('VARIABLE', '$_result_');
    }

    // the VM jumps to the end of the block
    var blockEndLabel = this.builder.blocks.peek().blockEndLabel;
    this.builder.insertJumpInstruction('', blockEndLabel);
};


// result: expression
CompilerVisitor.prototype.visitResult = function(ctx) {
    this.visitExpression(ctx.expression());
};


// throwException: 'throw' xception
CompilerVisitor.prototype.visitThrowException = function(ctx) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ThrowStatement');

    // the VM stores the exception in a temporary variable
    this.visitXception(ctx.xception());
    this.builder.insertStoreInstruction('VARIABLE', '$_exception_');

    // the VM jumps to the end of the block
    var blockEndLabel = this.builder.blocks.peek().blockEndLabel;
    this.builder.insertJumpInstruction('', blockEndLabel);
};


// xception: expression
CompilerVisitor.prototype.visitXception = function(ctx) {
    // place the value of the exception on top of the execution stack
    this.visitExpression(ctx.expression());
};


// HACK: this method is missing from the generated visitor!
CompilerVisitor.prototype.visitExpression = function(ctx) {
    ctx.accept(this);
};


// documentExpression: document
CompilerVisitor.prototype.visitDocumentExpression = function(ctx) {
    // place the document on top of the execution stack
    this.visitDocument(ctx.document());
};


// variableExpression: variable
CompilerVisitor.prototype.visitVariableExpression = function(ctx) {
    // place the value of the variable on top of the execution stack
    this.visitVariable(ctx.variable());
};


// functionExpression: IDENTIFIER parameters
CompilerVisitor.prototype.visitFunctionExpression = function(ctx) {
    // the VM stores the type of the function in a temporary variable
    var type = '$type'; // TODO: How do we find the type????

    // the VM loads the method context onto the execution stack
    var parameters = ctx.parameters();
    this.builder.insertLoadInstruction('VARIABLE', type);
    this.visitParameters(parameters);

    // the VM executes the <functionName>(...) method
    var functionName = '$' + ctx.IDENTIFIER().getText();
    this.builder.insertExecuteInstruction('WITH PARAMETERS', functionName);

    // the result of the executed method remains on the execution stack
};


// precedenceExpression: '(' expression ')'
CompilerVisitor.prototype.visitPrecedenceExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
};


// dereferenceExpression: '@' expression
CompilerVisitor.prototype.visitDereferenceExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
    var reference = this.createTemporaryVariable('reference');
    this.builder.insertStoreInstruction('VARIABLE', reference);
    // load the value of the reference onto the top of the execution stack
    this.builder.insertLoadInstruction('DOCUMENT', reference);
    // the reference document remains on top of the execution stack
};


// componentExpression: expression indices
CompilerVisitor.prototype.visitComponentExpression = function(ctx) {
    // the VM places the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());

    // the VM places the parent of the child component and index of the child onto the execution stack
    this.visitIndices(ctx.indices());

    // the VM retrieves the value of the child at the given index of the parent component
    this.builder.insertInvokeInstruction('$getValue', 2);
    // the parent and index have been replaced by the value of the child
};


// messageExpression: expression '.' IDENTIFIER parameters
CompilerVisitor.prototype.visitMessageExpression = function(ctx) {
    // the VM stores the result of the target expression in a temporary variable
    this.visitExpression(ctx.expression());
    var target = this.createTemporaryVariable('target');
    this.builder.insertStoreInstruction('VARIABLE', target);

    // the VM stores a reference to the type of the target in a temporary variable
    this.builder.insertLoadInstruction('VARIABLE', target);
    this.builder.insertInvokeInstruction('$getType', 1);
    var type = this.createTemporaryVariable('type');
    this.builder.insertStoreInstruction('VARIABLE', type);

    // the VM loads the method context onto the execution stack
    var parameters = ctx.parameters();
    this.builder.insertLoadInstruction('VARIABLE', type);
    this.builder.insertLoadInstruction('VARIABLE', target);
    this.visitParameters(parameters);

    // the VM executes the method associated with the message
    var messageName = '$' + ctx.IDENTIFIER().getText();
    this.builder.insertExecuteInstruction('WITH TARGET AND PARAMETERS', messageName);

    // the result of the executed method remains on the execution stack
};


// factorialExpression: expression '!'
CompilerVisitor.prototype.visitFactorialExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
    // take the factorial of the top value on the execution stack
    this.builder.insertInvokeInstruction('$factorial', 1);
};


// exponentialExpression: <assoc=right> expression '^' expression
CompilerVisitor.prototype.visitExponentialExpression = function(ctx) {
    // place the result of the base expression on top of the execution stack
    this.visitExpression(ctx.expression(0));
    // place the result of the exponent expression on top of the execution stack
    this.visitExpression(ctx.expression(1));
    // raise the base to the exponent and place the result on top of the execution stack
    this.builder.insertInvokeInstruction('$exponential', 2);
};


// inversionExpression: op=('-' | '/' | '*') expression
CompilerVisitor.prototype.visitInversionExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
    // perform the unary operation
    var operation = ctx.op.text;
    switch (operation) {
        case '-':
            // take the additive inverse of the value on top of the execution stack
            this.builder.insertInvokeInstruction('$negative', 1);
            break;
        case '/':
            // take the multiplicative inverse of the value on top of the execution stack
            this.builder.insertInvokeInstruction('$inverse', 1);
            break;
        case '*':
            // take the complex conjugate of the value on top of the execution stack
            this.builder.insertInvokeInstruction('$conjugate', 1);
            break;
        default:
            throw new Error('COMPILER: Invalid unary operator found: "' + operation + '"');
    }
};


// arithmeticExpression: expression op=('*' | '/' | '//' | '+' | '-') expression
CompilerVisitor.prototype.visitArithmeticExpression = function(ctx) {
    // place the result of the first operand expression on top of the execution stack
    this.visitExpression(ctx.expression(0));
    // place the result of the second operand expression on top of the execution stack
    this.visitExpression(ctx.expression(1));
    // perform the binary operation
    var operation = ctx.op.text;
    switch (operation) {
        case '*':
            // find the product of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$product', 2);
            break;
        case '/':
            // find the quotient of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$quotient', 2);
            break;
        case '//':
            // find the remainder of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$remainder', 2);
            break;
        case '+':
            // find the sum of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$sum', 2);
            break;
        case '-':
            // find the difference of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$difference', 2);
            break;
        default:
            throw new Error('COMPILER: Invalid binary operator found: "' + operation + '"');
    }
};


// magnitudeExpression: '|' expression '|'
CompilerVisitor.prototype.visitMagnitudeExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
    // find the magnitude of the top value on the execution stack
    this.builder.insertInvokeInstruction('$magnitude', 1);
};


// comparisonExpression: expression op=('<' | '=' | '>' | 'is' | 'matches') expression
CompilerVisitor.prototype.visitComparisonExpression = function(ctx) {
    // place the result of the first operand expression on top of the execution stack
    this.visitExpression(ctx.expression(0));
    // place the result of the second operand expression on top of the execution stack
    this.visitExpression(ctx.expression(1));
    // perform the comparison operation
    var operation = ctx.op.text;
    switch (operation) {
        case '<':
            // determine whether or not the first value is less than the second value
            this.builder.insertInvokeInstruction('$less', 2);
            break;
        case '=':
            // determine whether or not the first value is equal to the second value
            this.builder.insertInvokeInstruction('$equal', 2);
            break;
        case '>':
            // determine whether or not the first value is more than the second value
            this.builder.insertInvokeInstruction('$more', 2);
            break;
        case 'is':
            // determine whether or not the first value is the same value as the second value
            this.builder.insertInvokeInstruction('$is', 2);
            break;
        case 'matches':
            // determine whether or not the first value matches the second value
            this.builder.insertInvokeInstruction('$matches', 2);
            break;
        default:
            throw new Error('COMPILER: Invalid comparison operator found: "' + operation + '"');
    }
};


// complementExpression: 'not' expression
CompilerVisitor.prototype.visitComplementExpression = function(ctx) {
    // place the result of the expression on top of the execution stack
    this.visitExpression(ctx.expression());
    // find the logical complement of the top value on the execution stack
    this.builder.insertInvokeInstruction('$complement', 1);
};


// logicalExpression: expression op=('and' | 'sans' | 'xor' | 'or') expression
CompilerVisitor.prototype.visitLogicalExpression = function(ctx) {
    // place the result of the first operand expression on top of the execution stack
    this.visitExpression(ctx.expression(0));
    // place the result of the second operand expression on top of the execution stack
    this.visitExpression(ctx.expression(1));
    // perform the logical operation
    var operation = ctx.op.text;
    switch (operation) {
        case 'and':
            // find the logical AND of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$and', 2);
            break;
        case 'sans':
            // find the logical SANS of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$sans', 2);
            break;
        case 'xor':
            // find the logical XOR of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$xor', 2);
            break;
        case 'or':
            // find the logical OR of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$or', 2);
            break;
        default:
            throw new Error('COMPILER: Invalid logical operator found: "' + operation + '"');
    }
};


// defaultExpression: expression '?' expression
CompilerVisitor.prototype.visitDefaultExpression = function(ctx) {
    // place the result of the first operand expression on top of the execution stack
    this.visitExpression(ctx.expression(0));
    // place the result of the second operand expression on top of the execution stack
    this.visitExpression(ctx.expression(1));
    // find the actual value of the top value on the execution stack
    this.builder.insertInvokeInstruction('$default', 2);
};


// element: any | tag | symbol | moment | reference | version | text | binary |
//  probability | percent | number
CompilerVisitor.prototype.visitElement = function(ctx) {
    var formatter = new LanguageFormatter();
    var literal = formatter.formatDocument(ctx);
    this.builder.insertLoadInstruction('LITERAL', literal);
};


// PRIVATE BUILDER CLASS

// define the missing stack function for Array
Array.prototype.peek = function() {
    return this[this.length - 1];
};


/*
 * This helper class is used to construct the Bali assembly source code. It
 * maintains a stack of block context objects that track the current statement
 * number and clause number within each block as well as the label prefixes for
 * each level.  A prefix is a dot separated sequence of positive numbers defining
 * alternately the statement number and clause number.  For example, a prefix of
 * '2.3.4.' would correspond to the fourth statement in the third clause of the
 * second statement in the main block.
 */
function InstructionBuilder() {
    this.asmcode = '';
    this.blocks = [];  // stack of block contexts
    this.nextLabel = null;
    return this;
}
InstructionBuilder.prototype.constructor = InstructionBuilder;


/*
 * This method pushes a new block context onto the block stack and initializes
 * it based on the parent block context if one exists.
 */
InstructionBuilder.prototype.pushBlockContext = function() {
    if (this.blocks.length > 0) {
        var block = this.blocks.peek();
        this.blocks.push({
            clauseCount: 1,
            statementCount: 1,
            prefix: block.prefix + block.statementCount + '.' + block.clauseCount + '.'
        });
        block.clauseCount++;
    } else {
        this.blocks.push({
            clauseCount: 1,
            statementCount: 1,
            prefix: ''
        });
    }
};


/*
 * This method pops off the current block context when the compiler is done processing
 * that block.
 */
InstructionBuilder.prototype.popBlockContext = function() {
    this.blocks.pop();
};


/*
 * This method returns the number of the current clause within its block context. For
 * example a 'then' clause within an 'if then else' statement would be the first clause
 * and the 'else' clause would be the second clause. Exception clauses and final clauses
 * are also included in the numbering.
 */
InstructionBuilder.prototype.getClauseNumber = function() {
    var block = this.blocks.peek();
    var number = block.clauseCount;
    return number;
};


/*
 * This method returns the number of the current statement within its block context. The
 * statements are numbered sequentially starting with the number 1.
 */
InstructionBuilder.prototype.getStatementNumber = function() {
    var block = this.blocks.peek();
    var number = block.statementCount;
    return number;
};


/*
 * This method increments by one the statement counter within the current block context.
 */
InstructionBuilder.prototype.incrementStatementCount = function() {
    var block = this.blocks.peek();
    block.statementCount++;
    block.clauseCount = 1;
};


/*
 * This method returns the label prefix for the current instruction within the current
 * block context.
 */
InstructionBuilder.prototype.getStatementPrefix = function() {
    var block = this.blocks.peek();
    var prefix = block.prefix + this.getStatementNumber() + '.';
    return prefix;
};


/*
 * This method returns the label prefix for the current clause within the current
 * block context.
 */
InstructionBuilder.prototype.getClausePrefix = function() {
    var prefix = this.getStatementPrefix() + this.getClauseNumber() + '.';
    return prefix;
};


/*
 * This method sets the label to be used for the next instruction. If a label has
 * already been set, then the existing label is used to label a new 'skip'
 * instruction that is inserted.
 */
InstructionBuilder.prototype.insertLabel = function(label) {
    // check for existing label
    if (this.nextLabel) {
        this.insertSkipInstruction();
    }

    // set the new label
    this.nextLabel = label;
};


/*
 * This method inserts into the assembly source code the specified instruction. If
 * a label is pending it is prepended to the instruction.
 */
InstructionBuilder.prototype.insertInstruction = function(instruction) {
    if (this.nextLabel) {
        this.asmcode += '\n' + this.nextLabel + ':\n';
        this.nextLabel = null;
    }
    this.asmcode += instruction + '\n';
};


/*
 * This method inserts a 'skip' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertSkipInstruction = function() {
    var instruction = 'SKIP INSTRUCTION';
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'jump' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertJumpInstruction = function(context, label) {
    var instruction;
    switch (context) {
        case '':
            instruction = 'JUMP TO ' + label;
            break;
        case 'ON NONE':
        case 'ON FALSE':
        case 'ON ZERO':
            instruction = 'JUMP TO ' + label + ' ' + context;
            break;
        default:
            throw new Error('COMPILER: Attempted to insert a JUMP instruction with an invalid context: ' + context);
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'load' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertLoadInstruction = function(type, value) {
    var instruction;
    switch (type) {
        case 'LITERAL':
            instruction = 'LOAD ' + type + ' `' + value + '`';
            break;
        case 'DOCUMENT':
        case 'MESSAGE':
        case 'VARIABLE':
            instruction = 'LOAD ' + type + ' ' + value;
            break;
        default:
            throw new Error('COMPILER: Attempted to insert a LOAD instruction with an invalid type: ' + type);
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'store' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertStoreInstruction = function(type, value) {
    var instruction;
    switch (type) {
        case 'DRAFT':
        case 'DOCUMENT':
        case 'MESSAGE':
        case 'VARIABLE':
            instruction = 'STORE ' + type + ' ' + value;
            break;
        default:
            throw new Error('COMPILER: Attempted to insert a STORE instruction with an invalid type: ' + type);
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'invoke' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertInvokeInstruction = function(intrinsic, numberOfArguments) {
    var instruction;
    switch (numberOfArguments) {
        case 0:
            instruction = 'INVOKE INTRINSIC ' + intrinsic;
            break;
        case 1:
            instruction = 'INVOKE INTRINSIC ' + intrinsic + ' WITH PARAMETER';
            break;
        default:
            instruction = 'INVOKE INTRINSIC ' + intrinsic + ' WITH ' + numberOfArguments + ' PARAMETERS';
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'execute' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertExecuteInstruction = function(context, method) {
    var instruction;
    switch (context) {
        case '':
            instruction = 'EXECUTE METHOD ' + method;
            break;
        case 'WITH PARAMETERS':
            instruction = 'EXECUTE METHOD ' + method + ' WITH PARAMETERS';
            break;
        case 'WITH TARGET':
            instruction = 'EXECUTE METHOD ' + method + ' WITH TARGET';
            break;
        case 'WITH TARGET AND PARAMETERS':
            instruction = 'EXECUTE METHOD ' + method + ' WITH TARGET AND PARAMETERS';
            break;
        default:
            throw new Error('COMPILER: Attempted to insert an EXECUTE instruction with an invalid context: ' + context);
    }
    this.insertInstruction(instruction);
};


/*
 * This method finalizes the builder by adding a 'skip' instruction with any
 * outstanding label that has not yet been prepended to an instruction.
 */
InstructionBuilder.prototype.finalize = function() {
    // check for existing label
    if (this.nextLabel) {
        this.insertSkipInstruction();
    }
};
