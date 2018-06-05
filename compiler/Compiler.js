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

/**
 * This library provides functions that compile a Bali Procedure into the
 * corresponding assembly instructions for the Bali Virtual Machine™.
 */
var types = require('bali-language/syntax/NodeTypes');


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure containing a Bali procedure
 * generating the corresponding assembly instructions for the Bali Virtual
 * Machine™.
 * 
 * @param {TreeNode} procedure The parse tree structure for the procedure.
 * @param {object} context The type context needed for compilation.
 * @returns {string} The assembly instructions.
 */
exports.compileProcedure = function(procedure, context) {
    var visitor = new CompilerVisitor(context);
    procedure.accept(visitor);
    return visitor.getResult();
};


// PRIVATE FUNCTIONS

/*
 * This function defines a missing conversion function for the standard String class.
 */
String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

/*
 * This function defines a missing stack function for the standard Array class.
 * The push(item) and pop() methods are already defined.
 */
Array.prototype.peek = function() {
    return this[this.length - 1];
};

/*
 * This function returns the subclauses of a statement in an array.
 * 
 * @param {object} statement The statement containing zero or more subclauses.
 * @returns {Array} An array containing the subclauses for the statement.
 */
function getSubClauses(statement) {
    var subClauses = [];
    var length = statement.children.length;
    for (var i = 0; i < length; i++) {
        var child = statement.children[i];
        if (child.type === types.BLOCK) subClauses.push(child);
    }
    return subClauses;
}

// PRIVATE VISITOR CLASS

/*
 * This private class uses the Visitor Pattern to traverse the syntax tree generated
 * by the parser. It in turn uses another private class, the InstructionBuilder,
 * to construct the corresponding Bali Virtual Machine™ instructions for the
 * syntax tree is it traversing.
 */
function CompilerVisitor(symbols) {
    this.symbols = symbols;
    this.builder = new InstructionBuilder();
    this.temporaryVariableCount = 1;
    return this;
}
CompilerVisitor.prototype.constructor = CompilerVisitor;


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the execution stack with the resulting
 * value of an arithmetic operation on them.
 */
// arithmeticExpression: expression ('*' | '/' | '//' | '+' | '-') expression
CompilerVisitor.prototype.visitArithmeticExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the result of the first operand expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the result of the second operand expression on top of the execution stack
    tree.children[1].accept(this);

    var operator = tree.operator;
    switch (operator) {
        case '*':
            // the VM places the product of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$product', 2);
            break;
        case '/':
            // the VM places the quotient of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$quotient', 2);
            break;
        case '//':
            // the VM places the remainder of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$remainder', 2);
            break;
        case '+':
            // the VM places the sum of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$sum', 2);
            break;
        case '-':
            // the VM places the difference of the two values on top of the execution stack
            this.builder.insertInvokeInstruction('$difference', 2);
            break;
        default:
            throw new Error('COMPILER: Invalid binary operator found: "' + operator + '"');
    }

    // the resulting value remains on the top of the execution stack
};


/*
 * This method inserts the instructions that cause the VM to place a key-value
 * pair for an association on the execution stack so that they can be added to
 * the parent catalog.
 */
// association: element ':' expression
CompilerVisitor.prototype.visitAssociation = function(tree) {
    // the VM places the element key on the execution stack
    tree.children[0].accept(this);

    // the VM places the value of the expression on the execution stack
    tree.children[1].accept(this);

    // the key and value pair remain on top of the execution stack
};


/*
 * This method compiles a procedure block. Since procedure blocks can be nested
 * within statement clauses each block needs its own compilation context. When
 * entering a block a new context is pushed onto the compilation stack and when
 * the block is done being compiled, that context is popped back off the stack.
 * NOTE: This stack is different than the runtime execution stack that is
 * maintained by the Bali Virtual Machine™.
 */
// block: '{' procedure '}'
CompilerVisitor.prototype.visitBlock = function(tree) {
    // create a new compiler block context in the instruction builder
    this.builder.pushBlockContext();

    // the VM adds any parameters to the current VM block context
    var parameters = tree.parameters;
    if (parameters) {
        for (var i = 0; i < parameters.length; i++) {
            // TODO: need to handle ranges, lists, and catalogs differently

            // the VM stores the value of the parameter in its associated variable
            parameters[i].accept(this);
            this.builder.insertStoreInstruction('VARIABLE', '$_parameter' + i + '_');
        }
    }

    // the VM executes the procedure
    tree.children[0].accept(this);

    // throw away the current compiler block context in the instruction builder
    this.builder.popBlockContext();
};


/*
 *  This method is causes the VM to jump out of the enclosing loop block.
 */
// breakClause: 'break' 'loop'
CompilerVisitor.prototype.visitBreakClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    // retrieve the loop label from the parent context
    var blocks = this.builder.blocks;
    var block;
    var loopLabel;
    var numberOfBlocks = blocks.length;
    for (var i = 0; i < numberOfBlocks; i++) {
        block = blocks[numberOfBlocks - i - 1];  // work backwards
        loopLabel = block.statement.loopLabel;
        if (loopLabel) {
            var doneLabel = block.statement.doneLabel;
            // the VM jumps out of the enclosing loop
            this.builder.insertJumpInstruction(doneLabel);
            return;
        }
    }
    // there was no matching enclosing loop with that label
    throw new Error('COMPILER: A break statement was found with no enclosing loop.');
};


/*
 * This method constructs a new catalog component and places it on top of the
 * execution stack. The catalog contains a sequence of key-value associations.
 * The order in which the associations are listed is maintained by the catalog.
 */
// catalog:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty catalog*/
CompilerVisitor.prototype.visitCatalog = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    // the VM places the size of the catalog on the execution stack
    var size = tree.children.length;
    this.builder.insertPushInstruction('DOCUMENT', size);

    // the VM replaces the size value on the execution stack with a new catalog containing the associations
    this.builder.insertInvokeInstruction('$catalog', 1);
    for (var i = 0; i < tree.children.length; i++) {
        // the VM places the association's key and value onto the top of the execution stack
        tree.children[i].accept(this);  // association

        // the VM sets the key in the catalog to the value
        this.builder.insertInvokeInstruction('$setValue', 3);
    }
    // the catalog remains on the execution stack
};


/*
 * This method compiles the instructions needed to checkout from the Bali Cloud
 * Environment™ a persistent document and assign it to a recipient. The recipient
 * may be either a variable or an indexed child of a composite component.
 */
// checkoutClause: 'checkout' recipient 'from' expression
CompilerVisitor.prototype.visitCheckoutClause = function(tree) {
    var recipient = tree.children[0];
    var location = tree.children[1];

    // the VM processes the recipient as needed
    recipient.accept(this);

    // the VM places the value of the reference to the location of the document
    // on top of the execution stack
    location.accept(this);

    // the VM stores the value of the reference to the location into a temporary variable
    location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the execution stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the VM sets the value of the recipient to the value on the top of the execution stack
    this.setRecipient(recipient);
};


/*
 * This method inserts the instructions needed to commit to the Bali Cloud
 * Environment™ a document that is on top of the execution stack. A reference to
 * the location of the persistent document is evaluated by the VM.
 */
// commitClause: 'commit' expression 'to' expression
CompilerVisitor.prototype.visitCommitClause = function(tree) {
    // the VM loads the value of the reference to the location of the persistent
    // document onto the top of the execution stack
    tree.children[1].accept(this);  // reference expression

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the document onto the top of the execution stack
    tree.children[0].accept(this);  // document expression

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DOCUMENT', location);
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the execution stack with the resulting
 * value of a comparison operation on them.
 */
// comparisonExpression: expression ('<' | '=' | '>' | 'is' | 'matches') expression
CompilerVisitor.prototype.visitComparisonExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the result of the first operand expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the result of the second operand expression on top of the execution stack
    tree.children[1].accept(this);

    // the VM performs the comparison operation
    var operator = tree.operator;
    switch (operator) {
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
            throw new Error('COMPILER: Invalid comparison operator found: "' + operator + '"');
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the execution stack with the logical
 * complement of the value.
 */
// complementExpression: 'not' expression
CompilerVisitor.prototype.visitComplementExpression = function(tree) {
    // TODO: call 'asProbability()' method on expressions prior to operating on them

    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM finds the logical complement of the top value on the execution stack
    this.builder.insertInvokeInstruction('$complement', 1);
};


// continueClause: 'continue' 'loop'
/*
 *  This method is causes the VM to jump to the beginning of the enclosing loop block.
 */
CompilerVisitor.prototype.visitContinueClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    // retrieve the loop label from the parent context
    var blocks = this.builder.blocks;
    var block;
    var loopLabel;
    var numberOfBlocks = blocks.length;
    for (var i = 0; i < numberOfBlocks; i++) {
        block = blocks[numberOfBlocks - i - 1];  // work backwards
        loopLabel = block.statement.loopLabel;
        if (loopLabel) {
            // the VM jumps to the beginning of the enclosing loop
            this.builder.insertJumpInstruction(loopLabel);
            return;
        }
    }
    // there was no matching enclosing loop with that label
    throw new Error('COMPILER: A continue statement was found with no enclosing loop.');
};


/*
 * This method evaluates the first expression and if its 'asProbability()' value is
 * 'false', replaces it on top of the execution stack with the value of the
 * second expression.
 */
// defaultExpression: expression '?' expression
CompilerVisitor.prototype.visitDefaultExpression = function(tree) {
    // TODO: call 'asProbability()' method on first expression

    // the VM places the result of the first operand expression on top of the execution stack
    tree.children[0].accept(this);  // value to be tested

    // the VM places the result of the second operand expression on top of the execution stack
    tree.children[1].accept(this);  // default value

    // the VM leaves the actual value on the top of the execution stack
    this.builder.insertInvokeInstruction('$default', 2);
};


/*
 * This method inserts the instructions that cause the VM to replace the
 * value of the reference expression that is on top of the execution stack
 * with the value that it references.
 */
// dereferenceExpression: '@' expression
CompilerVisitor.prototype.visitDereferenceExpression = function(tree) {
    // the VM loads the value of the reference to the location onto the top of the execution stack
    tree.children[0].accept(this);

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the execution stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the referenced document remains on top of the execution stack
};


/*
 * This method inserts the instructions needed to discard from the Bali Cloud
 * Environment™ a persistent draft of a document. A reference to
 * the location of the persistent draft is evaluated by the VM.
 */
// discardClause: 'discard' expression
CompilerVisitor.prototype.visitDiscardClause = function(tree) {
    // the VM loads the value of the reference to the location onto the top of the execution stack
    tree.children[0].accept(this);  // reference expression

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM stores no document into the remote location
    this.builder.insertPushInstruction('DOCUMENT', 'none');
    this.builder.insertStoreInstruction('DRAFT', location);
};


/*
 * This method unwraps the document and delegates compilation to the
 * component.
 */
// document: NEWLINE* component NEWLINE* EOF
CompilerVisitor.prototype.visitDocument = function(tree) {
    // the VM places the value of the component on top of the execution stack
    tree.children[0].accept(this);  // component
};


/*
 * This method tells the VM to place an element on the execution stack
 * as a literal value.
 */
// element:
//     binary |
//     duration |
//     moment |
//     number |
//     percent |
//     probability |
//     reference |
//     symbol |
//     tag |
//     template |
//     text |
//     version
CompilerVisitor.prototype.visitElement = function(terminal) {
    // the VM loads the element value onto the top of the execution stack
    var literal = terminal.value;
    this.builder.insertPushInstruction('DOCUMENT', literal);

    var parameters = terminal.parameters;
    if (parameters) {
        // the VM loads any parameters associated with the element onto the top of the execution stack
        parameters.accept(this);

        // the VM sets the parameters for the element
        this.builder.insertInvokeInstruction('$setParameters', 2);
    }
};


/*
 * This method compiles the instructions needed to evaluate an expression and
 * optionally assign the resulting value to a recipient. The recipient may be
 * either a variable or an indexed child of a composite component.
 */
// evaluateClause: (recipient ':=')? expression
CompilerVisitor.prototype.visitEvaluateClause = function(tree) {
    if (tree.children.length > 1) {
        var recipient = tree.children[0];
        var expression = tree.children[1];

        // the VM processes the recipient as needed
        recipient.accept(this);

        // the VM places the value of the expression on top of the execution stack
        expression.accept(this);

        // the VM sets the value of the recipient to the value on the top of the execution stack
        this.setRecipient(recipient);
    } else {
        // the VM places the value of the expression on top of the execution stack
        tree.children[0].accept(this);
        
        // the VM stores the value of the expression in the result variable
        this.builder.insertStoreInstruction('VARIABLE', '$_result_');
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the execution stack with the resulting
 * value of an exponential operation on them.
 */
// exponentialExpression: <assoc=right> expression '^' expression
CompilerVisitor.prototype.visitExponentialExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the result of the base expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the result of the exponent expression on top of the execution stack
    tree.children[1].accept(this);

    // the VM leaves the result of raising the base to the exponent on top of the execution stack
    this.builder.insertInvokeInstruction('$exponential', 2);
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the execution stack with the mathematical
 * factorial of the value.
 */
// factorialExpression: expression '!'
CompilerVisitor.prototype.visitFactorialExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM leaves the result of the factorial of the value on top of the execution stack
    this.builder.insertInvokeInstruction('$factorial', 1);
};


/*
 * This method inserts instructions that cause the VM to execute the
 * procedure associated with the named function, first placing the parameters
 * on the execution stack in a list. The resulting value of the procedure
 * remains on the execution stack.
 */
// functionExpression: function parameters
CompilerVisitor.prototype.visitFunctionExpression = function(tree) {
    // the VM places a reference to the type that defines the function on top of the execution stack
    var name = '$' + tree.children[0].value;
    //TODO: fix this
    //var typeReference = this.symbols.procedures[name];
    var typeReference = '<bali:/bali/types/SomeType>';
    this.builder.insertPushInstruction('DOCUMENT', typeReference);

    // if there are parameters then compile accordingly
    if (tree.children[1].children[0].children.length > 0) {
        // the VM places the function parameters on top of the execution stack
        tree.children[1].accept(this);  // parameters

        // the VM executes the <name>(<parameters>) method
        this.builder.insertExecuteInstruction(name, 'WITH PARAMETERS');
    } else {
        // the VM executes the <name>() method
        this.builder.insertExecuteInstruction(name);
    }

    // the result of the executed method remains on top of the execution stack
};


/*
 * This method inserts instructions that cause the VM to attempt to handle
 * the exception that is on top of the execution stack. The exception must
 * match the value of the template expression or the VM will jump to the next
 * handler or the end of the exception clauses if there isn't another one.
 */
// handleClause: 'handle' symbol 'matching' expression 'with' block
CompilerVisitor.prototype.visitHandleClause = function(tree) {
    // setup the labels
    var statement = this.builder.getStatementContext();
    var clausePrefix = this.builder.getClausePrefix();
    var handleLabel = clausePrefix + 'HandleClause';
    this.builder.insertLabel(handleLabel);

    // the VM stores the exception that is on top of the execution stack in the variable
    var exception = tree.children[0].value;
    this.builder.insertStoreInstruction('VARIABLE', exception);

    // the VM compares the template expression with the actual exception
    this.builder.insertLoadInstruction('VARIABLE', exception);  // for handler
    this.builder.insertLoadInstruction('VARIABLE', exception);  // for matching check
    tree.children[1].accept(this);  // expression
    this.builder.insertInvokeInstruction('$matches', 2);

    // if the template and exception did not match the VM jumps past this exception handler
    var nextLabel = this.builder.getNextClausePrefix() + 'HandleClause';
    if (statement.clauseNumber === statement.clauseCount) {
        nextLabel = statement.unhandledLabel;
    }
    this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

    // the VM executes the handler clause
    tree.children[2].accept(this);  // block

    // the exception was handled so the VM jumps to the end of the statement
    this.builder.insertLabel(clausePrefix + 'HandleClauseDone');
    this.builder.insertJumpInstruction(statement.endLabel);
};


/*
 * This method inserts instructions that cause the VM to evaluate one or
 * condition expressions and execute a procedure block for the condition
 * that evaluates to 'true'. If none of the conditions are true an optional
 * procedure block may be executed by the VM.
 */
// ifClause: 'if' expression 'then' block ('else' 'if' expression 'then' block)* ('else' block)?
CompilerVisitor.prototype.visitIfClause = function(tree) {
    var statement = this.builder.getStatementContext();
    var doneLabel = statement.doneLabel;
    var children = tree.children;
    var count = children.length;
    var elseBlock;
    var clausePrefix;

    // separate out the parts of the statement
    if (count % 2 === 1) {
        elseBlock = children[count - 1];
        children = children.slice(0, count - 1);  // exclude the else block
        count = children.length;
    }

    // compile each condition
    for (var i = 0; i < count; i++) {
        clausePrefix = this.builder.getClausePrefix();
        var conditionLabel = clausePrefix + 'ConditionClause';
        this.builder.insertLabel(conditionLabel);

        // the VM places the condition value on top of the execution stack
        children[i++].accept(this);  // condition

        // determine what the next label will be
        var nextLabel = this.builder.getNextClausePrefix();
        if (i === count - 1) {
            // we are on the last condition
            if (elseBlock) {
                nextLabel += 'ElseClause';
            } else {
                nextLabel = doneLabel;
            }
        } else {
            nextLabel += 'ConditionClause';
        }

        // if the condition is not true, the VM jumps to the next condition, else block, or the end
        this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

        // if the condition is true, then the VM enters the block
        children[i].accept(this);  // block

        // completed execution of the block
        if (elseBlock || i < count - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertLabel(clausePrefix + 'ConditionClauseDone');
            this.builder.insertJumpInstruction(doneLabel);
        }
    }

    // the VM executes the optional else block
    if (elseBlock) {
        clausePrefix = this.builder.getClausePrefix();
        var elseLabel = clausePrefix + 'ElseClause';
        this.builder.insertLabel(elseLabel);
        elseBlock.accept(this);
        this.builder.insertLabel(clausePrefix + 'ElseClauseDone');
    }
};


/*
 * This method inserts instructions that cause the VM to traverse all but the
 * last index in a list of indices associated with a component. For each index
 * the VM replaces the component that is on top of the execution stack with its
 * subcomponent at that index. It leaves the parent component and the index of
 * the final subcomponent on the execution stack so that the outer rule can
 * either use them to get the final subcomponent value or set it depending on
 * the context.
 */
// indices: '[' list ']'
CompilerVisitor.prototype.visitIndices = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    // the VM has the component to be indexed on top of the execution stack
    var indices = tree.children[0].children;

    // traverse all but the last index
    for (var i = 0; i < indices.length - 1; i++) {

        // the VM places the value of the next index onto the top of the execution stack
        indices[i].accept(this);

        // the VM retrieves the value of the subcomponent at the given index of the parent component
        this.builder.insertInvokeInstruction('$getValue', 2);
        // the parent and index have been replaced by the value of the subcomponent
    }

    // the VM places the value of the last index onto the top of the execution stack
    indices[indices.length - 1].accept(this);

    // the parent component and index of the last subcomponent are on top of the execution stack
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the execution stack with the arithmetic,
 * geometric, or complex inverse of the value.
 */
// inversionExpression: ('-' | '/' | '*') expression
CompilerVisitor.prototype.visitInversionExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM leaves the result of the inversion of the value on top of the execution stack
    var operator = tree.operator;
    switch (operator) {
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
            throw new Error('COMPILER: Invalid inversion operator found: "' + operator + '"');
    }
};


/*
 * This method constructs a new list component and places it on top of the
 * execution stack. The list contains a sequence of values. The order in
 * which the values are listed is maintained by the list.
 */
// list:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty list*/
CompilerVisitor.prototype.visitList = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    // the VM places the size of the list on the execution stack
    var size = tree.children.length;
    this.builder.insertPushInstruction('DOCUMENT', size);

    // the VM replaces the size value on the execution stack with a new list containing the items
    this.builder.insertInvokeInstruction('$list', 1);
    for (var i = 0; i < tree.children.length; i++) {
        tree.children[i].accept(this);
        this.builder.insertInvokeInstruction('$addItem', 2);
    }

    // the list remains on the execution stack
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the execution stack with the resulting
 * value of a logical operation on them.
 */
// logicalExpression: expression ('and' | 'sans' | 'xor' | 'or') expression
CompilerVisitor.prototype.visitLogicalExpression = function(tree) {
    // TODO: call 'asProbability()' or 'asSet()' method on expressions prior to operating on them

    // the VM places the value of the first expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the value of the second expression on top of the execution stack
    tree.children[1].accept(this);

    // the VM leaves the result of the logical operation on the values on top of the execution stack
    var operator = tree.operator;
    switch (operator) {
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
            throw new Error('COMPILER: Invalid logical operator found: "' + operator + '"');
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the execution stack with the numeric
 * magnitude of the value.
 */
// magnitudeExpression: '|' expression '|'
CompilerVisitor.prototype.visitMagnitudeExpression = function(tree) {
    // TODO: call 'asNumber()' method on expressions prior to operating on them

    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM leaves the result of the magnitude of the value on top of the execution stack
    this.builder.insertInvokeInstruction('$magnitude', 1);
};


/*
 * This method inserts instructions that cause the VM to execute the
 * procedure associated with the named message on the value of an
 * expression, first placing the parameters on the execution stack in
 * a list. The resulting value of the procedure remains on the execution
 * stack.
 */
// messageExpression: expression '.' message parameters
CompilerVisitor.prototype.visitMessageExpression = function(tree) {
    // the VM places the value of the target expression onto the top of the execution stack
    tree.children[0].accept(this);

    // extract the message name
    var name = '$' + tree.children[1].value;  // message name

    // if there are parameters then compile accordingly
    if (tree.children[2].children[0].children.length > 0) {
        // the VM places the message parameters on top of the execution stack
        tree.children[2].accept(this);  // parameters

        // the VM executes the target.<name>(<parameters>) method
        this.builder.insertExecuteInstruction(name, 'ON TARGET WITH PARAMETERS');
    } else {
        // the VM executes the target.<name>() method
        this.builder.insertExecuteInstruction(name, 'ON TARGET');
    }

    // the result of the executed method remains on the execution stack
};


/*
 * This method inserts instructions that cause the VM to place a sequence
 * of parameters on top of the execution stack.
 */
// parameters: '(' composite ')'
CompilerVisitor.prototype.visitParameters = function(tree) {
    // the VM places the value of the composite on top of the execution stack
    tree.children[0].accept(this);
};


/*
 * This method inserts the instructions that cause the VM to place the
 * value of a precedence expression on top of the execution stack. It
 * ensures that this expression is evaluated with higher precedence
 * than any surrounding expressions.
 */
// precedenceExpression: '(' expression ')'
CompilerVisitor.prototype.visitPrecedenceExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);
};


/*
 * This method compiles a sequence of statements by inserting instructions for
 * the VM to follow for each statement.
 */
// procedure:
//     statement (';' statement)*   |
//     NEWLINE (statement NEWLINE)* |
//     /*empty statements*/
CompilerVisitor.prototype.visitProcedure = function(tree) {
    var statements = tree.children;

    // compile the statements
    for (var i = 0; i < statements.length; i++) {
        statements[i].accept(this);
        this.builder.incrementStatementCount();
    }
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * expression and then publish the resulting value that is on top of the
 * execution stack to the global event queue in the Bali Cloud Environment™.
 */
// publishClause: 'publish' expression
CompilerVisitor.prototype.visitPublishClause = function(tree) {
    // the VM places the value of the event expression onto the top of the execution stack
    tree.children[0].accept(this);  // event expression

    // the VM stores the event on the event queue
    this.builder.insertStoreInstruction('MESSAGE', '$_eventQueue_');
};


/*
 * This method inserts the instructions that cause the VM to evaluate a
 * message expression and then place the resulting message on a message
 * queue in the Bali Cloud Environment™. The reference to the message
 * queue is another expression that the VM evaluates as well.
 */
// queueClause: 'queue' expression 'on' expression
CompilerVisitor.prototype.visitQueueClause = function(tree) {
    // the VM stores the reference to the queue in a temporary variable
    tree.children[1].accept(this);  // queue
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM stores the message on the message queue
    tree.children[0].accept(this);  // message
    this.builder.insertStoreInstruction('MESSAGE', queue);
};


/*
 * This method inserts the instructions that cause the VM to evaluate two
 * expressions and then replace the resulting values that are on the
 * execution stack with a range component that has the two values as its
 * starting and ending values.
 */
// range: expression '..' expression
CompilerVisitor.prototype.visitRange = function(tree) {
    // the VM places the value of the starting expression on the execution stack
    tree.children[0].accept(this);  // first value in the range

    // the VM places the value of the ending expression on the execution stack
    tree.children[1].accept(this);  // last value in the range

    // the VM replaces the two range values on the execution stack with a new range component
    this.builder.insertInvokeInstruction('$range', 2);
};


/*
 * This method inserts the instructions that cause the VM to prepare the recipient
 * of a value to receive it. The recipient may be either a variable or an indexed
 * child of a composite component. If it is a variable (identified by its symbol)
 * no preparation is needed. But if it is the latter, the children of the composite
 * component must be traversed using the specified indices until the parent of the
 * last child and the last child's index are left on the execution stack. This
 * leaves the stack ready for a call to '$setValue' to set the value of the child
 * to the value of an expression that will be placed on the top of the execution
 * stack prior to the call.
 */
// recipient: symbol | variable indices
CompilerVisitor.prototype.visitRecipient = function(tree) {
    var children = tree.children;
    var length = children.length;
    if (length > 1) {
        // the VM places the value of the component variable onto the top of the execution stack
        children[0].accept(this);  // variable

        // the VM replaces the component on the execution stack with the parent and index of the subcomponent
        children[1].accept(this);  // indices
    }
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * optional expression and then set the resulting value that is on top
 * of the execution stack as the result of the current procedure. The VM
 * then returns the result to the calling procedure.
 */
// returnClause: 'return' expression?
CompilerVisitor.prototype.visitReturnClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    // the VM stores the result in a temporary variable and sets a flag
    if (tree.children.length > 0) {
        // the VM stores the value of the result expression in a temporary variable
        tree.children[0].accept(this);  // expression
        this.builder.insertStoreInstruction('VARIABLE', '$_result_');
    }
    this.builder.insertLoadInstruction('VARIABLE', '$_result_');

    // the VM returns the result to the calling procedure
    this.builder.insertHandleInstruction('RESULT');
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * expression and then store the resulting component that is on top of
 * the execution stack persistently in the Bali Cloud Environment™. The
 * reference to the document location is another expression that the VM
 * evaluates as well.
 */
// saveClause: 'save' expression 'to' expression
CompilerVisitor.prototype.visitSaveClause = function(tree) {
    // the VM stores the value of the reference to the location into a temporary variable
    tree.children[1].accept(this);  // location expression
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the execution stack
    tree.children[0].accept(this);  // draft expression

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DRAFT', location);
};


/*
 * This method inserts instructions that cause the VM to evaluate one or
 * condition expressions and execute a procedure block for the condition
 * that matches the value of a selector expression. If none of the
 * conditions are true an optional procedure block may be executed by the VM.
 */
// selectClause: 'select' expression 'from' (expression 'do' block)+ ('else' block)?
CompilerVisitor.prototype.visitSelectClause = function(tree) {
    var doneLabel = this.builder.getStatementContext().doneLabel;
    var children = tree.children;
    var count = children.length;
    var elseBlock;
    var clausePrefix;

    // separate out the parts of the statement
    var selector = children[0];
    if (count % 2 === 0) {
        elseBlock = children[count - 1];
        children = children.slice(1, count - 1);
    } else {
        children = children.slice(1);
    }
    count = children.length;

    // the VM saves the value of the selector expression in a temporary variable
    selector.accept(this);
    var selectorVariable = this.createTemporaryVariable('selector');
    this.builder.insertStoreInstruction('VARIABLE', selectorVariable);

    // check each option
    for (var i = 0; i < count; i++) {
        clausePrefix = this.builder.getClausePrefix();
        var optionLabel = clausePrefix + 'OptionClause';
        this.builder.insertLabel(optionLabel);

        // the VM loads the selector value onto the top of the execution stack
        this.builder.insertLoadInstruction('VARIABLE', selectorVariable);

        // the VM places the option value on top of the execution stack
        children[i++].accept(this);  // option expression

        // the VM checks to see if the selector and option match and places the result on the execution stack
        this.builder.insertInvokeInstruction('$matches', 2);

        // determine what the next label will be
        var nextLabel = this.builder.getNextClausePrefix();
        if (i === count - 1) {
            // we are on the last option
            if (elseBlock) {
                nextLabel += 'ElseClause';
            } else {
                nextLabel = doneLabel;
            }
        } else {
            nextLabel += 'OptionClause';
        }

        // if the option does not match, the VM jumps to the next option, the else block, or the end
        this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

        // if the option matches, then the VM enters the block
        children[i].accept(this);  // block

        // completed execution of the block
        if (elseBlock || i < count - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertLabel(clausePrefix + 'OptionClauseDone');
            this.builder.insertJumpInstruction(doneLabel);
        }
    }

    // the VM executes the optional else block
    if (elseBlock) {
        clausePrefix = this.builder.getClausePrefix();
        var elseLabel = clausePrefix + 'ElseClause';
        this.builder.insertLabel(elseLabel);
        elseBlock.accept(this);
        this.builder.insertLabel(clausePrefix + 'ElseClauseDone');
        this.builder.insertJumpInstruction(doneLabel);
    }
};


/*
 * This method inserts instructions that cause the VM to attempt to execute
 * a main clause and then if any exceptions are thrown attempts to handle
 * them using a sequence of handle clauses.
 */
// statement: (
//     evaluateClause |
//     checkoutClause |
//     saveClause |
//     discardClause |
//     commitClause |
//     publishClause |
//     queueClause |
//     waitClause |
//     ifClause |
//     selectClause |
//     whileClause |
//     withClause |
//     continueClause |
//     breakClause |
//     returnClause |
//     throwClause
// ) handleClause*
CompilerVisitor.prototype.visitStatement = function(tree) {
    // initialize the context for this statement
    var statement = this.builder.pushStatementContext(tree);
    this.builder.insertLabel(statement.startLabel);

    // the VM pushes any exception handlers onto the exception handler stack
    if (this.builder.hasHandlers()) {
        this.builder.insertPushInstruction('HANDLER', statement.handlerLabel);
    }

    // the VM attempts to execute the main clause
    statement.mainClause.accept(this);

    // the VM made it through the main clause without any exceptions
    if (this.builder.hasClauses()) {
        // need a label for subclauses to jump to when done
        this.builder.insertLabel(statement.doneLabel);

        if (this.builder.hasHandlers()) {
            // the exception handlers are no longer needed
            this.builder.insertPopInstruction('HANDLER');

            // jump over the exception handlers
            this.builder.insertJumpInstruction(statement.endLabel);

            // the VM will direct any exceptions from the main clause here to be handled
            var handlers = statement.handleClauses;
            for (var i = 0; i < handlers.length; i++) {
                // each handler inserts its own label
                handlers[i].accept(this);
            }

            // none of the exception handlers matched so the VM must try the parent handlers
            this.builder.insertLabel(statement.unhandledLabel);
            this.builder.insertHandleInstruction('EXCEPTION');

            // the VM encountered no exceptions or was able to handle them
            this.builder.insertLabel(statement.endLabel);
        }
    }

    // the VM moves on to the next statement
    this.builder.popStatementContext();
};


/*
 * This method inserts instructions that cause the VM to place a sequence
 * of components that are embedded in a composite structure onto the top
 * of the execution stack.
 */
// structure: '[' composite ']'
CompilerVisitor.prototype.visitStructure = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    // the VM places the value of the composite on top of the execution stack
    tree.children[0].accept(this);  // composite

    var parameters = tree.parameters;
    if (parameters) {
        // the VM places the value of the parameters on top of the execution stack
        parameters.accept(this);  // parameters

        // the VM sets the parameters for the structure
        this.builder.insertInvokeInstruction('$setParameters', 2);
    }
};


/*
 * This method inserts the instructions that cause the VM to replace
 * the value of an expression that is on top of the execution stack
 * with its subcomponent referred to by the indices.
 */
// subcomponentExpression: expression indices
CompilerVisitor.prototype.visitSubcomponentExpression = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);  // expression

    // the VM replaces the value on the execution stack with the parent and index of the subcomponent
    tree.children[1].accept(this);  // indices

    // the VM retrieves the value of the subcomponent at the given index of the parent component
    this.builder.insertInvokeInstruction('$getValue', 2);
    // the value of the subcomponent remains on the execution stack
};


/*
 * This method throws an exception since a task should be interpreted rather
 * than compiled.
 */
// task: SHELL NEWLINE* procedure NEWLINE* EOF
CompilerVisitor.prototype.visitTask = function(tree) {
    throw new Error('COMPILER: A task script cannot be compiled, it must be interpreted.');
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * exception expression and then jumps to the the handle clauses for the
 * current block context.
 */
// throwClause: 'throw' expression
CompilerVisitor.prototype.visitThrowClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    // the VM evaluates the exception expression
    tree.children[0].accept(this);  // exception expression

    // the VM jumps to the handler clauses for the current context
    this.builder.insertHandleInstruction('EXCEPTION');
};


/*
 * This method inserts the instructions that cause the VM to place the
 * value of a variable onto the top of the execution stack.
 */
// variable: IDENTIFIER
CompilerVisitor.prototype.visitVariable = function(terminal) {
    // the VM loads the value of the variable onto the top of the execution stack
    var variable = '$' + terminal.value;
    this.builder.insertLoadInstruction('VARIABLE', variable);
};


/*
 * This method compiles the instructions needed to wait for a message from a
 * queue in the Bali Cloud Environemnt™. The resulting message is assigned
 * to a recipient. The recipient may be either a variable or an indexed child
 * of a composite component.
 */
// waitClause: 'wait' 'for' recipient 'from' expression
CompilerVisitor.prototype.visitWaitClause = function(tree) {
    var recipient = tree.children[0];
    var queue = tree.children[1];

    // the VM processes the recipient as needed
    recipient.accept(this);

    // the VM places the value of the reference to the queue
    // on top of the execution stack
    queue.accept(this);

    // the VM stores the value of the reference to the queue into a temporary variable
    queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM loads the next message from the remote queue onto the top of the execution stack
    // NOTE: this call blocks until a message is available on the queue
    this.builder.insertLoadInstruction('MESSAGE', queue);

    // the VM sets the value of the recipient to the value on the top of the execution stack
    this.setRecipient(recipient);
};


/*
 * This method inserts instructions that cause the VM to repeatedly execute a procedure
 * block while a condition expression is true.
 */
// whileClause: 'while' expression 'do' block
CompilerVisitor.prototype.visitWhileClause = function(tree) {
    var clausePrefix = this.builder.getClausePrefix();
    var children = tree.children;

    // construct the loop and done labels
    var statement = this.builder.getStatementContext();
    statement.loopLabel = clausePrefix + 'ConditionClause';

    // label the start of the loop
    this.builder.insertLabel(statement.loopLabel);

    // the VM jumps past the end of the loop if the condition expression evaluates to false
    children[0].accept(this);  // condition expression
    this.builder.insertJumpInstruction(statement.doneLabel, 'ON FALSE');

    // if the condition is true, then the VM enters the block
    children[1].accept(this);  // block

    // the VM jumps to the top of the loop for the next iteration
    var statementPrefix = this.builder.getStatementPrefix();
    var repeatLabel = statementPrefix + 'ConditionRepeat';
    this.builder.insertLabel(repeatLabel);
    this.builder.insertJumpInstruction(statement.loopLabel);
};


/*
 * This method inserts instructions that cause the VM to execute a procedure block for
 * each item in a collection expression.
 */
// withClause: 'with' ('each' symbol 'in')? expression 'do' block
CompilerVisitor.prototype.visitWithClause = function(tree) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    var clausePrefix = this.builder.getClausePrefix();
    var children = tree.children;
    var length = children.length;

    // construct the loop and done labels
    var statement = this.builder.getStatementContext();
    statement.loopLabel = clausePrefix + 'ConditionClause';

    // construct the item symbol
    var item;
    if (length > 2) {
        item = children[0].value;
    } else {
        item = this.createTemporaryVariable('item');
    }

    // the VM places the value of the sequence expression onto the top of the execution stack
    children[length - 2].accept(this);  // sequence expression

    // the VM replaces the sequence on the execution stack with an iterator to it
    this.builder.insertInvokeInstruction('$createIterator', 1);

    // The VM stores the iterater in a temporary variable
    var iterator = this.createTemporaryVariable('iterator');
    this.builder.insertStoreInstruction('VARIABLE', iterator);

    // label the start of the loop
    this.builder.insertLabel(statement.loopLabel);

    // the VM jumps past the end of the loop if the iterator has no more items
    this.builder.insertLoadInstruction('VARIABLE', iterator);
    this.builder.insertInvokeInstruction('$hasNext', 1);
    this.builder.insertJumpInstruction(statement.doneLabel, 'ON FALSE');

    // the VM places the iterator back onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM replaces the iterator on the execution stack with the next item from the sequence
    this.builder.insertInvokeInstruction('$getNext', 1);

    // the VM stores the item that is on top of the execution stack in the variable
    this.builder.insertStoreInstruction('VARIABLE', item);

    // the VM executes the block using the item if needed
    children[length - 1].accept(this);  // block

    // the VM jumps to the top of the loop for the next iteration
    var statementPrefix = this.builder.getStatementPrefix();
    var repeatLabel = statementPrefix + 'ConditionRepeat';
    this.builder.insertLabel(repeatLabel);
    this.builder.insertJumpInstruction(statement.loopLabel);
};


/*
 * This method inserts instructions that cause the VM to either set
 * the value of a variable or a subcomponent to the value on the top of the
 * execution stack.
 */
CompilerVisitor.prototype.setRecipient = function(recipient) {
    // TODO: check for 'type' parameter and use methods instead of functions if there is one

    if (recipient.children.length > 1) {
        // the VM sets the value of the subcomponent at the given index of the parent component
        // to the value that is on top of the execution stack
        this.builder.insertInvokeInstruction('$setValue', 3);
    } else {
        // the VM stores the value that is on top of the execution stack in the variable
        var symbol = recipient.children[0].value;
        this.builder.insertStoreInstruction('VARIABLE', symbol);
    }
};


/*
 * This method creates a new temporary variable name. Since each variable name must
 * be unique within the scope of the procedure block being compiled, a counter is
 * used to append a unique number to the end of each temporary variable.
 */
CompilerVisitor.prototype.createTemporaryVariable = function(name) {
    return '$_' + name + '_' + this.temporaryVariableCount++;
};


CompilerVisitor.prototype.parentBlock = function() {
    var blocks = this.builder.blocks;
    var parent = blocks[blocks.length - 2];
    return parent;
};


CompilerVisitor.prototype.getResult = function() {
    this.builder.finalize();
    return this.builder.asmcode;
};


// PRIVATE BUILDER CLASS

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
        var parent = this.blocks.peek();
        this.blocks.push({
            statementNumber: 1,
            prefix: parent.prefix + parent.statementNumber + '.' + parent.statement.clauseNumber + '.'
        });
        parent.statement.clauseNumber++;
    } else {
        this.blocks.push({
            statementNumber: 1,
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
 * This method pushes a new statement context onto the block stack and initializes
 * it.
 */
InstructionBuilder.prototype.pushStatementContext = function(tree) {
    var children = tree.children;
    var mainClause = children[0];
    var subClauses = getSubClauses(mainClause);
    var handleClauses = children.slice(1);
    var clauseCount = subClauses.length + handleClauses.length;
    var block = this.blocks.peek();
    block.statement = {
        mainClause: mainClause,
        subClauses: subClauses,
        handleClauses: handleClauses,
        clauseCount: clauseCount,
        clauseNumber: 1
    };

    // initialize the block configuration for this statement
    var statement = block.statement;
    var type = types.TREE_TYPES[statement.mainClause.type].toTitleCase().slice(0, -6);
    var prefix = block.prefix + block.statementNumber + '.';
    statement.startLabel = prefix + type + 'Statement';
    if (statement.clauseCount > 0) {
        statement.doneLabel = prefix + type + 'StatementDone';
    }
    if (statement.handleClauses.length > 0) {
        statement.handlerLabel = prefix + (statement.subClauses.length + 1) + '.HandleClause';
        statement.unhandledLabel = prefix + 'UnhandledException';
        statement.endLabel = prefix + type + 'StatementEnd';
    }

    return block.statement;
};


/*
 * This method pops off the current statement context when the compiler is done processing
 * that statement.
 */
InstructionBuilder.prototype.popStatementContext = function() {
    this.blocks.peek().statement = undefined;
};


/*
 * This method determines whether or not the current statement contains clauses.
 */
InstructionBuilder.prototype.hasClauses = function() {
    var statement = this.blocks.peek().statement;
    return statement.clauseCount > 0;
};


/*
 * This method determines whether or not the current statement contains handlers.
 */
InstructionBuilder.prototype.hasHandlers = function() {
    var statement = this.blocks.peek().statement;
    return statement.handleClauses.length > 0;
};


/*
 * This method returns the number of the current clause within its block context. For
 * example a 'then' clause within an 'if then else' statement would be the first clause
 * and the 'else' clause would be the second clause. Exception clauses and final clauses
 * are also included in the numbering.
 */
InstructionBuilder.prototype.getClauseNumber = function() {
    var block = this.blocks.peek();
    var number = block.statement.clauseNumber;
    return number;
};


/*
 * This method returns the number of the current statement within its block context. The
 * statements are numbered sequentially starting with the number 1.
 */
InstructionBuilder.prototype.getStatementNumber = function() {
    var block = this.blocks.peek();
    var number = block.statementNumber;
    return number;
};


/*
 * This method increments by one the statement counter within the current block context.
 */
InstructionBuilder.prototype.incrementStatementCount = function() {
    var block = this.blocks.peek();
    block.statementNumber++;
};


/*
 * This method returns the label prefix for the current instruction within the current
 * block context.
 */
InstructionBuilder.prototype.getStatementPrefix = function() {
    var block = this.blocks.peek();
    var prefix = block.prefix + block.statementNumber + '.';
    return prefix;
};


/*
 * This method returns the type of the current statement.
 */
InstructionBuilder.prototype.getStatementType = function() {
    var statement = this.blocks.peek().statement;
    var type = types.TREE_TYPES[statement.mainClause.type].toTitleCase().slice(0, -6);
    return type;
};


/*
 * This method returns the context for the current statement.
 */
InstructionBuilder.prototype.getStatementContext = function() {
    var statement = this.blocks.peek().statement;
    return statement;
};


/*
 * This method returns the label prefix for the current clause within the current
 * block context.
 */
InstructionBuilder.prototype.getClausePrefix = function() {
    var block = this.blocks.peek();
    var prefix = block.prefix + block.statementNumber + '.' + block.statement.clauseNumber + '.';
    return prefix;
};


/*
 * This method returns the label prefix for the next clause within the current
 * block context.
 */
InstructionBuilder.prototype.getNextClausePrefix = function() {
    var block = this.blocks.peek();
    var prefix = block.prefix + block.statementNumber + '.' + (block.statement.clauseNumber + 1) + '.';
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
InstructionBuilder.prototype.insertJumpInstruction = function(label, context) {
    var instruction = 'JUMP TO ' + label;
    if (context) instruction += ' ' + context;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'push' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertPushInstruction = function(type, value) {
    var instruction = 'PUSH ' + type + ' ';
    if (type === 'DOCUMENT') {
        instruction += '`' + value + '`';  // value as a literal
    } else {
        instruction += value;  // value as a label
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'pop' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertPopInstruction = function(type) {
    var instruction = 'POP ' + type;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'load' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertLoadInstruction = function(type, symbol) {
    var instruction = 'LOAD ' + type + ' ' + symbol;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'store' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertStoreInstruction = function(type, symbol) {
    var instruction = 'STORE ' + type + ' ' + symbol;
    this.insertInstruction(instruction);
};


/*
 * This method inserts an 'invoke' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertInvokeInstruction = function(intrinsic, numberOfParameters) {
    var instruction = 'INVOKE ' + intrinsic;
    switch (numberOfParameters) {
        case undefined:
        case 0:
            break;
        case 1:
            instruction += ' WITH PARAMETER';
            break;
        default:
            instruction += ' WITH ' + numberOfParameters + ' PARAMETERS';
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts an 'execute' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertExecuteInstruction = function(method, context) {
    var instruction = 'EXECUTE ' + method;
    if (context) instruction += ' ' + context;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'handle' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertHandleInstruction = function(context) {
    var instruction = 'HANDLE ' + context;
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
    this.asmcode += '\n';  // POSIX requires all lines end with a line feed
};
