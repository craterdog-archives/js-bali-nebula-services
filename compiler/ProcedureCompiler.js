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
var types = require('bali-document-notation/nodes/Types');


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure for a Bali type
 * analyzing it for correctness and filling in missing type information.
 * The function returns the context information that will be needed
 * by the compiler.
 * 
 * @param {TreeNode} tree The parse tree structure for the Bali type.
 * @returns {Object} An object containing the type context information.
 */
exports.analyzeType = function(tree) {
    var visitor = new AnalyzingVisitor();
    tree.accept(visitor);
};


/**
 * This function traverses a parse tree structure containing a Bali procedure
 * generating the corresponding assembly instructions for the Bali Virtual
 * Machine™.
 * 
 * @param {TreeNode} procedure The parse tree structure for the procedure.
 * @param {Object} type The type defining the procedure.
 * @returns {String} The assembly instructions.
 */
exports.compileProcedure = function(procedure, type) {
    var visitor = new CompilingVisitor(type);
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
 * @param {Object} statement The statement containing zero or more subclauses.
 * @returns {Array} An array containing the subclauses for the statement.
 */
function getSubClauses(statement) {
    var subClauses = [];
    var count = statement.children.length;
    for (var i = 0; i < count; i++) {
        var child = statement.children[i];
        if (child.type === types.BLOCK) subClauses.push(child);
    }
    return subClauses;
}


// PRIVATE CLASSES

function AnalyzingVisitor() {
    return this;
}
AnalyzingVisitor.prototype.constructor = AnalyzingVisitor;


// arithmeticExpression: expression ('*' | '/' | '//' | '+' | '-') expression
AnalyzingVisitor.prototype.visitArithmeticExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// association: component ':' expression
AnalyzingVisitor.prototype.visitAssociation = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// block: '{' procedure '}'
AnalyzingVisitor.prototype.visitBlock = function(tree) {
    tree.children[0].accept(this);
};


// breakClause: 'break' 'loop'
AnalyzingVisitor.prototype.visitBreakClause = function(tree) {
};


// catalog:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty catalog*/
AnalyzingVisitor.prototype.visitCatalog = function(tree) {
    var associations = tree.children;
    for (var i = 0; i < associations.length; i++) {
        associations[i].accept(this);
    }
};


// checkoutClause: 'checkout' recipient 'from' expression
AnalyzingVisitor.prototype.visitCheckoutClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// code: '{' procedure '}'
AnalyzingVisitor.prototype.visitCode = function(tree) {
    tree.children[0].accept(this);
};


// commitClause: 'commit' expression 'to' expression
AnalyzingVisitor.prototype.visitCommitClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// comparisonExpression: expression ('<' | '=' | '>' | 'is' | 'matches') expression
AnalyzingVisitor.prototype.visitComparisonExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// complementExpression: 'not' expression
AnalyzingVisitor.prototype.visitComplementExpression = function(tree) {
    tree.children[0].accept(this);
};


// component: state parameters?
AnalyzingVisitor.prototype.visitComponent = function(tree) {
    tree.children[0].accept(this);
    if (tree.children.length > 1) {
        tree.children[1].accept(this);
    }
};


// continueClause: 'continue' 'loop'
AnalyzingVisitor.prototype.visitContinueClause = function(tree) {
};


// defaultExpression: expression '?' expression
AnalyzingVisitor.prototype.visitDefaultExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// dereferenceExpression: '@' expression
AnalyzingVisitor.prototype.visitDereferenceExpression = function(tree) {
    tree.children[0].accept(this);
};


// discardClause: 'discard' expression
AnalyzingVisitor.prototype.visitDiscardClause = function(tree) {
    tree.children[0].accept(this);
};


// document: NEWLINE* (reference NEWLINE)? content (NEWLINE seal)* NEWLINE* EOF
AnalyzingVisitor.prototype.visitDocument = function(tree) {
    if (tree.previousReference) {
        tree.previousReference.accept(this);
    }
    tree.documentContent.accept(this);
    for (var i = 0; i < tree.notarySeals.length; i++) {
        tree.notarySeals[i].certificateReference.accept(this);
        tree.notarySeals[i].digitalSignature.accept(this);
    }
};


// element:
//     angle |
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
AnalyzingVisitor.prototype.visitElement = function(terminal) {
};


// evaluateClause: (recipient ':=')? expression
AnalyzingVisitor.prototype.visitEvaluateClause = function(tree) {
    var count = tree.children.length;
    if (count > 1) {
        tree.children[0].accept(this);
    }
    tree.children[count - 1].accept(this);
};


// exponentialExpression: expression '^' expression
AnalyzingVisitor.prototype.visitExponentialExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// factorialExpression: expression '!'
AnalyzingVisitor.prototype.visitFactorialExpression = function(tree) {
    tree.children[0].accept(this);
};


// function: IDENTIFIER
AnalyzingVisitor.prototype.visitFunction = function(terminal) {
};


// functionExpression: function parameters
AnalyzingVisitor.prototype.visitFunctionExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// handleClause: 'handle' symbol 'matching' expression 'with' block
AnalyzingVisitor.prototype.visitHandleClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
    tree.children[2].accept(this);
};


// ifClause: 'if' expression 'then' block ('else' 'if' expression 'then' block)* ('else' block)?
AnalyzingVisitor.prototype.visitIfClause = function(tree) {
    // handle first condition
    tree.children[0].accept(this);
    tree.children[1].accept(this);

    // handle optional additional conditions
    for (var i = 2; i < tree.children.length; i += 2) {
        if (i === tree.children.length - 1) {
            // handle else clause
            tree.children[i].accept(this);
        } else {
            // handle else if clause
            tree.children[i].accept(this);
            tree.children[i + 1].accept(this);
        }
    }
};


// indices: '[' list ']'
AnalyzingVisitor.prototype.visitIndices = function(tree) {
    tree.children[0].accept(this);
};


// inversionExpression: ('-' | '/' | '*') expression
AnalyzingVisitor.prototype.visitInversionExpression = function(tree) {
    tree.children[0].accept(this);
};


// list:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty list*/
AnalyzingVisitor.prototype.visitList = function(tree) {
    var expressions = tree.children;
    for (var i = 0; i < expressions.length; i++) {
        expressions[i].accept(this);
    }
};


// logicalExpression: expression ('and' | 'sans' | 'xor' | 'or') expression
AnalyzingVisitor.prototype.visitLogicalExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// magnitudeExpression: '|' expression '|'
AnalyzingVisitor.prototype.visitMagnitudeExpression = function(tree) {
    tree.children[0].accept(this);
};


// message: IDENTIFIER
AnalyzingVisitor.prototype.visitMessage = function(terminal) {
};


// messageExpression: expression '.' message parameters
AnalyzingVisitor.prototype.visitMessageExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
    tree.children[2].accept(this);
};


// parameters: '(' collection ')'
AnalyzingVisitor.prototype.visitParameters = function(tree) {
    tree.children[0].accept(this);
};


// precedenceExpression: '(' expression ')'
AnalyzingVisitor.prototype.visitPrecedenceExpression = function(tree) {
    tree.children[0].accept(this);
};


// procedure:
//     statement (';' statement)* |
//     NEWLINE (statement NEWLINE)* |
//     /*empty procedure*/
AnalyzingVisitor.prototype.visitProcedure = function(tree) {
    var statements = tree.children;
    for (var i = 0; i < statements.length; i++) {
        statements[i].accept(this);
    }
};


// publishClause: 'publish' expression
AnalyzingVisitor.prototype.visitPublishClause = function(tree) {
    tree.children[0].accept(this);
};


// queueClause: 'queue' expression 'on' expression
AnalyzingVisitor.prototype.visitQueueClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// range: expression '..' expression
AnalyzingVisitor.prototype.visitRange = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// returnClause: 'return' expression?
AnalyzingVisitor.prototype.visitReturnClause = function(tree) {
    if (tree.children.length > 0) {
        tree.children[0].accept(this);
    }
};


// saveClause: 'save' expression 'to' expression
AnalyzingVisitor.prototype.visitSaveClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// selectClause: 'select' expression 'from' (expression 'do' block)+ ('else' block)?
AnalyzingVisitor.prototype.visitSelectClause = function(tree) {
    var expressions = tree.children;

    // handle the selection
    expressions[0].accept(this);

    // handle option blocks
    for (var i = 1; i < expressions.length; i += 2) {
        if (i === expressions.length - 1) {
            // handle the else clause
            expressions[i].accept(this);
        } else {
            // handle the option clause
            expressions[i].accept(this);
            expressions[i + 1].accept(this);
        }
    }
};


// statement: mainClause handleClause*
AnalyzingVisitor.prototype.visitStatement = function(tree) {
    tree.children[0].accept(this);
    for (var i = 1; i < tree.children.length; i++) {
        tree.children[i].accept(this);
    }
};


// structure: '[' collection ']'
AnalyzingVisitor.prototype.visitStructure = function(tree) {
    tree.children[0].accept(this);
};


// subcomponent: variable indices
AnalyzingVisitor.prototype.visitSubcomponent = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// subcomponentExpression: expression indices
AnalyzingVisitor.prototype.visitSubcomponentExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// throwClause: 'throw' expression
AnalyzingVisitor.prototype.visitThrowClause = function(tree) {
    tree.children[0].accept(this);
};


// variable: IDENTIFIER
AnalyzingVisitor.prototype.visitVariable = function(terminal) {
};


// waitClause: 'wait' 'for' recipient 'from' expression
AnalyzingVisitor.prototype.visitWaitClause = function(tree) {
    tree.children[0].accept(this);  // recipient
    tree.children[1].accept(this);  // expression
};


// whileClause: 'while' expression 'do' block
AnalyzingVisitor.prototype.visitWhileClause = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// withClause: 'with' ('each' symbol 'in')? expression 'do' block
AnalyzingVisitor.prototype.visitWithClause = function(tree) {
    var count = tree.children.length;
    if (count > 2) {
        tree.children[0].accept(this);
    }
    tree.children[count - 2].accept(this);
    tree.children[count - 1].accept(this);
};


/*
 * This private class uses the Visitor Pattern to traverse the syntax tree generated
 * by the parser. It in turn uses another private class, the InstructionBuilder,
 * to construct the corresponding Bali Virtual Machine™ instructions for the
 * syntax tree is it traversing.
 */
function CompilingVisitor(type) {
    this.type = type;
    this.builder = new InstructionBuilder();
    this.temporaryVariableCount = 1;
    return this;
}
CompilingVisitor.prototype.constructor = CompilingVisitor;


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the component stack with the resulting
 * value of an arithmetic operation on them.
 */
// arithmeticExpression: expression ('*' | '/' | '//' | '+' | '-') expression
CompilingVisitor.prototype.visitArithmeticExpression = function(tree) {
    var firstOperand = tree.children[0];
    var secondOperand = tree.children[1];

    // the VM places the result of the first operand expression on top of the component stack
    firstOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM places the result of the second operand expression on top of the component stack
    secondOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    var operator = tree.operator;
    switch (operator) {
        case '*':
            // the VM places the product of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$product', 2);
            break;
        case '/':
            // the VM places the quotient of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$quotient', 2);
            break;
        case '//':
            // the VM places the remainder of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$remainder', 2);
            break;
        case '+':
            // the VM places the sum of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$sum', 2);
            break;
        case '-':
            // the VM places the difference of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$difference', 2);
            break;
    }

    // the resulting value remains on the top of the component stack
};


/*
 * This method inserts the instructions that cause the VM to place a key-value
 * pair for an association on the component stack so that they can be added to
 * the parent catalog.
 */
// association: component ':' expression
CompilingVisitor.prototype.visitAssociation = function(tree) {
    var key = tree.children[0];
    var value = tree.children[1];

    // the VM places the element key on the component stack
    key.accept(this);

    // the VM places the value of the expression on the component stack
    value.accept(this);

    // the key and value pair remain on top of the component stack
};


/*
 * This method compiles a procedure block.
 * NOTE: the 'block' and 'code' rules have the same syntax but different symantics.
 * A block gets compiled into the corresponding assembly instructions, but a code
 * component gets treated as a component on the component stack.
 */
// block: '{' procedure '}'
CompilingVisitor.prototype.visitBlock = function(tree) {
    var procedure = tree.children[0];

    // the VM executes the procedure
    procedure.accept(this);
};


/*
 *  This method is causes the VM to jump out of the enclosing loop procedure block.
 */
// breakClause: 'break' 'loop'
CompilingVisitor.prototype.visitBreakClause = function(tree) {
    // retrieve the loop label from the parent context
    var procedures = this.builder.procedures;
    var procedure;
    var loopLabel;
    var numberOfProcedures = procedures.length;
    for (var i = 0; i < numberOfProcedures; i++) {
        procedure = procedures[numberOfProcedures - i - 1];  // work backwards
        loopLabel = procedure.statement.loopLabel;
        if (loopLabel) {
            var doneLabel = procedure.statement.doneLabel;
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
 * component stack. The catalog contains a sequence of key-value associations.
 * The order in which the associations are listed is maintained by the catalog.
 */
// catalog:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty catalog*/
CompilingVisitor.prototype.visitCatalog = function(tree) {
    // the VM places the size of the catalog on the component stack
    var size = tree.children.length;
    this.builder.insertPushInstruction('ELEMENT', size);

    // the VM replaces the size value on the component stack with a new catalog containing the associations
    this.builder.insertInvokeInstruction('$catalog', 1);
    for (var i = 0; i < tree.children.length; i++) {
        var association = tree.children[i];

        // the VM places the association's key and value onto the top of the component stack
        association.accept(this);

        // the VM sets the key in the catalog to the value
        this.builder.insertInvokeInstruction('$setValue', 3);
    }
    // the catalog remains on the component stack
};


/*
 * This method compiles the instructions needed to checkout from the Bali Cloud
 * Environment™ a persistent document and assign it to a recipient. The recipient
 * may be either a variable or an indexed child of a collection component.
 */
// checkoutClause: 'checkout' recipient 'from' expression
CompilingVisitor.prototype.visitCheckoutClause = function(tree) {
    var recipient = tree.children[0];
    var location = tree.children[1];

    // the VM processes the recipient as needed
    recipient.accept(this);

    // the VM places the value of the reference to the location of the document
    // on top of the component stack
    location.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');

    // the VM stores the value of the reference to the location into a temporary variable
    location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the component stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the VM sets the value of the recipient to the value on the top of the component stack
    this.setRecipient(recipient);
};


/*
 * This method compiles a code block as a component rather than part of a statement.
 * NOTE: the 'code' and 'block' rules have the same syntax but different symantics.
 * A block gets compiled into the corresponding assembly instructions, but a code
 * component gets treated as a component on the component stack.
 */
// code: '{' procedure '}'
CompilingVisitor.prototype.visitCode = function(tree) {
    var procedure = tree.children[0];

    // the VM places the source code for the procedure on top of the component stack
    var source = procedure.toSource();
    this.builder.insertPushInstruction('CODE', source);
};


/*
 * This method inserts the instructions needed to commit to the Bali Cloud
 * Environment™ a document that is on top of the component stack. A reference to
 * the location of the persistent document is evaluated by the VM.
 */
// commitClause: 'commit' expression 'to' expression
CompilingVisitor.prototype.visitCommitClause = function(tree) {
    var document = tree.children[0];
    var reference = tree.children[1];

    // the VM loads the value of the reference to the location of the persistent
    // document onto the top of the component stack
    reference.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the document onto the top of the component stack
    document.accept(this);

    // the VM stores the document on top of the component stack into the remote location
    this.builder.insertStoreInstruction('DOCUMENT', location);
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the component stack with the resulting
 * value of a comparison operation on them.
 */
// comparisonExpression: expression ('<' | '=' | '>' | 'is' | 'matches') expression
CompilingVisitor.prototype.visitComparisonExpression = function(tree) {
    var firstOperand = tree.children[0];
    var secondOperand = tree.children[1];

    // the VM places the result of the first operand expression on top of the component stack
    firstOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM places the result of the second operand expression on top of the component stack
    secondOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

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
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the component stack with the logical
 * complement of the value.
 */
// complementExpression: 'not' expression
CompilingVisitor.prototype.visitComplementExpression = function(tree) {
    var operand = tree.children[0];

    // the VM places the value of the expression on top of the component stack
    operand.accept(this);
    this.builder.insertExecuteInstruction('$asLogical', 'ON TARGET');

    // the VM finds the logical complement of the top value on the component stack
    this.builder.insertInvokeInstruction('$complement', 1);
};


// component: state parameters?
CompilingVisitor.prototype.visitComponent = function(tree) {
    var state = tree.children[0];
    var parameters = tree.children[1];

    // the VM places the state on top of the component stack
    state.accept(this);

    if (parameters) {
        // the VM loads the parameters associated with the state onto the top of the component stack
        parameters.accept(this);

        // the VM sets the parameters for the state
        this.builder.insertInvokeInstruction('$setParameters', 2);
    }
};


// continueClause: 'continue' 'loop'
/*
 *  This method is causes the VM to jump to the beginning of the enclosing loop procedure block.
 */
CompilingVisitor.prototype.visitContinueClause = function(tree) {
    // retrieve the loop label from the parent context
    var procedures = this.builder.procedures;
    var procedure;
    var loopLabel;
    var numberOfProcedures = procedures.length;
    for (var i = 0; i < numberOfProcedures; i++) {
        procedure = procedures[numberOfProcedures - i - 1];  // work backwards
        loopLabel = procedure.statement.loopLabel;
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
 * This method evaluates the first expression and if its 'asBoolean()' value is
 * 'false', replaces it on top of the component stack with the value of the
 * second expression.
 */
// defaultExpression: expression '?' expression
CompilingVisitor.prototype.visitDefaultExpression = function(tree) {
    var proposedValue = tree.children[0];
    var defaultValue = tree.children[1];

    // the VM places the result of the first expression on top of the component stack
    proposedValue.accept(this);

    // the VM stores the value of the proposed expression into a temporary variable
    var value = this.createTemporaryVariable('value');
    this.builder.insertStoreInstruction('VARIABLE', value);

    // the VM loads the value of the proposed expression back onto the component stack
    this.builder.insertLoadInstruction('VARIABLE', value);

    // the VM replaces the proposed value with its boolean value
    this.builder.insertExecuteInstruction('$asBoolean', 'ON TARGET');

    // the VM loads the value of the proposed expression back onto the component stack
    this.builder.insertLoadInstruction('VARIABLE', value);

    // the VM places the value of the second expression on top of the component stack
    defaultValue.accept(this);

    // the VM leaves the actual value on the top of the component stack
    this.builder.insertInvokeInstruction('$default', 3);
};


/*
 * This method inserts the instructions that cause the VM to replace the
 * value of the reference expression that is on top of the component stack
 * with the value that it references.
 */
// dereferenceExpression: '@' expression
CompilingVisitor.prototype.visitDereferenceExpression = function(tree) {
    var reference = tree.children[0];

    // the VM loads the value of the reference to the location onto the top of the component stack
    reference.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the component stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the referenced document remains on top of the component stack
};


/*
 * This method inserts the instructions needed to discard from the Bali Cloud
 * Environment™ a persistent draft of a document. A reference to
 * the location of the persistent draft is evaluated by the VM.
 */
// discardClause: 'discard' expression
CompilingVisitor.prototype.visitDiscardClause = function(tree) {
    var reference = tree.children[0];

    // the VM loads the value of the reference to the location onto the top of the component stack
    reference.accept(this);  // reference expression
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM stores no document into the remote location
    this.builder.insertPushInstruction('ELEMENT', 'none');
    this.builder.insertStoreInstruction('DRAFT', location);
};


// document: NEWLINE* (reference NEWLINE)? content (NEWLINE seal)* NEWLINE* EOF
CompilingVisitor.prototype.visitDocument = function(tree) {
    tree.documentContent.accept(this);
};


/*
 * This method tells the VM to place an element on the component stack
 * as a literal value.
 */
// element:
//     angle |
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
CompilingVisitor.prototype.visitElement = function(terminal) {
    // TODO: add instructions to process procedure blocks embedded within text

    // the VM loads the element value onto the top of the component stack
    var literal = terminal.value;
    this.builder.insertPushInstruction('ELEMENT', literal);
};


/*
 * This method compiles the instructions needed to evaluate an expression and
 * optionally assign the resulting value to a recipient. The recipient may be
 * either a variable or an indexed child of a collection component.
 */
// evaluateClause: (recipient ':=')? expression
CompilingVisitor.prototype.visitEvaluateClause = function(tree) {
    var count = tree.children.length;
    var recipient = tree.children[0];
    var expression = tree.children[count - 1];

    if (count > 1) {
        // TODO: revisit this as it is currently awkward, it shouldn't require a check
        // the VM processes the recipient as needed
        if (recipient.type === types.SUBCOMPONENT_EXPRESSION) {
            recipient.accept(this);
        }

        // the VM places the value of the expression on top of the component stack
        expression.accept(this);

        // the VM sets the value of the recipient to the value on the top of the component stack
        this.setRecipient(recipient);
    } else {
        // the VM places the value of the expression on top of the component stack
        expression.accept(this);
        
        // the VM stores the value of the expression in the temporary result variable
        this.builder.insertStoreInstruction('VARIABLE', '$_result_');
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the component stack with the resulting
 * value of an exponential operation on them.
 */
// exponentialExpression: <assoc=right> expression '^' expression
CompilingVisitor.prototype.visitExponentialExpression = function(tree) {
    var firstOperand = tree.children[0];
    var secondOperand = tree.children[1];

    // the VM places the result of the base expression on top of the component stack
    firstOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM places the result of the exponent expression on top of the component stack
    secondOperand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM leaves the result of raising the base to the exponent on top of the component stack
    this.builder.insertInvokeInstruction('$exponential', 2);
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the component stack with the mathematical
 * factorial of the value.
 */
// factorialExpression: expression '!'
CompilingVisitor.prototype.visitFactorialExpression = function(tree) {
    var operand = tree.children[0];

    // the VM places the value of the expression on top of the component stack
    operand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM leaves the result of the factorial of the value on top of the component stack
    this.builder.insertInvokeInstruction('$factorial', 1);
};


/*
 * This method inserts instructions that cause the VM to execute the
 * procedure associated with the named function, first placing the parameters
 * on the component stack in a list. The resulting value of the procedure
 * remains on the component stack.
 */
// functionExpression: function parameters
CompilingVisitor.prototype.visitFunctionExpression = function(tree) {
    var funxtion = tree.children[0];
    var parameters = tree.children[1];

    // the VM places a reference to the type that defines the function on top of the component stack
    var name = '$' + funxtion.value;
    //TODO: fix this
    //var typeReference = this.type.procedures[name];
    var typeReference = '<bali:/bali/types/SomeType>';
    this.builder.insertPushInstruction('ELEMENT', typeReference);  // use PUSH instead of LOAD since VM may cache types

    // if there are parameters then compile accordingly
    if (parameters.children[0].children.length > 0) {
        // the VM places the function parameters on top of the component stack
        parameters.accept(this);

        // the VM executes the <name>(<parameters>) method
        this.builder.insertExecuteInstruction(name, 'WITH PARAMETERS');
    } else {
        // the VM executes the <name>() method
        this.builder.insertExecuteInstruction(name);
    }

    // the result of the executed method remains on top of the component stack
};


/*
 * This method inserts instructions that cause the VM to attempt to handle
 * the exception that is on top of the component stack. The exception must
 * match the value of the template expression or the VM will jump to the next
 * handler or the end of the exception clauses if there isn't another one.
 */
// handleClause: 'handle' symbol 'matching' expression 'with' block
CompilingVisitor.prototype.visitHandleClause = function(tree) {
    var symbol = tree.children[0];
    var template = tree.children[1];
    var block = tree.children[2];

    // setup the labels
    var statement = this.builder.getStatementContext();
    var clausePrefix = this.builder.getClausePrefix();
    var handleLabel = clausePrefix + 'HandleClause';
    this.builder.insertLabel(handleLabel);

    // the VM stores the exception that is on top of the component stack in the variable
    var exception = symbol.value;
    this.builder.insertStoreInstruction('VARIABLE', exception);

    // the VM loads the exception back on top of the component stack for the next handler
    this.builder.insertLoadInstruction('VARIABLE', exception);

    // the VM compares the template expression with the actual exception
    this.builder.insertLoadInstruction('VARIABLE', exception);
    template.accept(this);
    this.builder.insertInvokeInstruction('$matches', 2);

    // if the template and exception did not match the VM jumps past this exception handler
    var nextLabel = this.builder.getNextClausePrefix() + 'HandleClause';
    if (statement.clauseNumber === statement.clauseCount) {
        nextLabel = statement.failureLabel;
    }
    this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

    // the VM pops the exception off the component stack since this handler will handle it
    this.builder.insertPopInstruction('COMPONENT');

    // the VM executes the handler block
    block.accept(this);

    // the exception was handled successfully
    this.builder.insertLabel(clausePrefix + 'HandleClauseDone');
    this.builder.insertJumpInstruction(statement.successLabel);
};


/*
 * This method inserts instructions that cause the VM to evaluate one or
 * condition expressions and execute a procedure block for the condition
 * that evaluates to 'true'. If none of the conditions are true an optional
 * procedure block may be executed by the VM.
 */
// ifClause: 'if' expression 'then' block ('else' 'if' expression 'then' block)* ('else' block)?
CompilingVisitor.prototype.visitIfClause = function(tree) {
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
        var condition = children[i++];
        var block = children[i];
        clausePrefix = this.builder.getClausePrefix();
        var conditionLabel = clausePrefix + 'ConditionClause';
        this.builder.insertLabel(conditionLabel);

        // the VM places the condition value on top of the component stack
        condition.accept(this);
        this.builder.insertExecuteInstruction('$asBoolean', 'ON TARGET');

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
        block.accept(this);

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
 * the VM replaces the component that is on top of the component stack with its
 * subcomponent at that index. It leaves the parent component and the index of
 * the final subcomponent on the component stack so that the outer rule can
 * either use them to get the final subcomponent value or set it depending on
 * the context.
 */
// indices: '[' list ']'
CompilingVisitor.prototype.visitIndices = function(tree) {
    // the VM has the component to be indexed on top of the component stack
    var indices = tree.children[0].children;

    // traverse all but the last index
    for (var i = 0; i < indices.length - 1; i++) {

        // the VM places the value of the next index onto the top of the component stack
        indices[i].accept(this);

        // the VM retrieves the value of the subcomponent at the given index of the parent component
        this.builder.insertInvokeInstruction('$getValue', 2);
        // the parent and index have been replaced by the value of the subcomponent
    }

    // the VM places the value of the last index onto the top of the component stack
    indices[indices.length - 1].accept(this);

    // the parent component and index of the last subcomponent are on top of the component stack
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the component stack with the arithmetic,
 * geometric, or complex inverse of the value.
 */
// inversionExpression: ('-' | '/' | '*') expression
CompilingVisitor.prototype.visitInversionExpression = function(tree) {
    var operand = tree.children[0];

    // the VM places the value of the expression on top of the component stack
    operand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM leaves the result of the inversion of the value on top of the component stack
    var operator = tree.operator;
    switch (operator) {
        case '-':
            // take the additive inverse of the value on top of the component stack
            this.builder.insertInvokeInstruction('$negative', 1);
            break;
        case '/':
            // take the multiplicative inverse of the value on top of the component stack
            this.builder.insertInvokeInstruction('$inverse', 1);
            break;
        case '*':
            // take the complex conjugate of the value on top of the component stack
            this.builder.insertInvokeInstruction('$conjugate', 1);
            break;
    }
};


/*
 * This method constructs a new list component and places it on top of the
 * component stack. The list contains a sequence of values. The order in
 * which the values are listed is maintained by the list.
 */
// list:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty list*/
CompilingVisitor.prototype.visitList = function(tree) {
    // the VM places the size of the list on the component stack
    var size = tree.children.length;
    this.builder.insertPushInstruction('ELEMENT', size);

    // the VM replaces the size value on the component stack with a new list containing the items
    this.builder.insertInvokeInstruction('$list', 1);
    for (var i = 0; i < tree.children.length; i++) {
        var item = tree.children[i];
        item.accept(this);
        this.builder.insertInvokeInstruction('$addItem', 2);
    }

    // the list remains on the component stack
};


/*
 * This method inserts the instructions that cause the VM to replace the values
 * of two expressions that are on top of the component stack with the resulting
 * value of a logical operation on them.
 */
// logicalExpression: expression ('and' | 'sans' | 'xor' | 'or') expression
CompilingVisitor.prototype.visitLogicalExpression = function(tree) {
    var firstOperand = tree.children[0];
    var secondOperand = tree.children[1];

    // the VM places the value of the first expression on top of the component stack
    firstOperand.accept(this);
    this.builder.insertExecuteInstruction('$asLogical', 'ON TARGET');

    // the VM places the value of the second expression on top of the component stack
    secondOperand.accept(this);
    this.builder.insertExecuteInstruction('$asLogical', 'ON TARGET');

    // the VM leaves the result of the logical operation on the values on top of the component stack
    var operator = tree.operator;
    switch (operator) {
        case 'and':
            // find the logical AND of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$and', 2);
            break;
        case 'sans':
            // find the logical SANS of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$sans', 2);
            break;
        case 'xor':
            // find the logical XOR of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$xor', 2);
            break;
        case 'or':
            // find the logical OR of the two values on top of the component stack
            this.builder.insertInvokeInstruction('$or', 2);
            break;
    }
};


/*
 * This method inserts the instructions that cause the VM to replace the value
 * of the expression that is on top of the component stack with the numeric
 * magnitude of the value.
 */
// magnitudeExpression: '|' expression '|'
CompilingVisitor.prototype.visitMagnitudeExpression = function(tree) {
    var operand = tree.children[0];

    // the VM places the value of the expression on top of the component stack
    operand.accept(this);
    this.builder.insertExecuteInstruction('$asNumeric', 'ON TARGET');

    // the VM leaves the result of the magnitude of the value on top of the component stack
    this.builder.insertInvokeInstruction('$magnitude', 1);
};


/*
 * This method inserts instructions that cause the VM to execute the
 * procedure associated with the named message on the value of an
 * expression, first placing the parameters on the component stack in
 * a list. The resulting value of the procedure remains on the component
 * stack.
 */
// messageExpression: expression '.' message parameters
CompilingVisitor.prototype.visitMessageExpression = function(tree) {
    var target = tree.children[0];
    var message = tree.children[1];
    var parameters = tree.children[2];

    // the VM places the value of the target expression onto the top of the component stack
    target.accept(this);

    // extract the message name
    var name = '$' + message.value;  // message name

    // if there are parameters then compile accordingly
    if (parameters.children[0].children.length > 0) {
        // the VM places the message parameters on top of the component stack
        parameters.accept(this);

        // the VM executes the target.<name>(<parameters>) method
        this.builder.insertExecuteInstruction(name, 'ON TARGET WITH PARAMETERS');
    } else {
        // the VM executes the target.<name>() method
        this.builder.insertExecuteInstruction(name, 'ON TARGET');
    }

    // the result of the executed method remains on the component stack
};


/*
 * This method inserts instructions that cause the VM to place a collection
 * of parameters on top of the component stack.
 */
// parameters: '(' collection ')'
CompilingVisitor.prototype.visitParameters = function(tree) {
    var collection = tree.children[0];

    // the VM places the value of the collection on top of the component stack
    collection.accept(this);
};


/*
 * This method inserts the instructions that cause the VM to place the
 * value of a precedence expression on top of the component stack. It
 * ensures that this expression is evaluated with higher precedence
 * than any surrounding expressions.
 */
// precedenceExpression: '(' expression ')'
CompilingVisitor.prototype.visitPrecedenceExpression = function(tree) {
    var expression = tree.children[0];

    // the VM places the value of the expression on top of the component stack
    expression.accept(this);
};


/*
 * This method compiles a sequence of statements by inserting instructions for
 * the VM to follow for each statement. Since procedure blocks can be nested
 * within statement clauses each procedure needs its own compilation context. When
 * entering a procedure a new context is pushed onto the compilation stack and when
 * the procedure is done being compiled, that context is popped back off the stack.
 * NOTE: This stack is different than the runtime component stack that is
 * maintained by the Bali Virtual Machine™.
 */
// procedure:
//     statement (';' statement)*   |
//     NEWLINE (statement NEWLINE)* |
//     /*empty statements*/
CompilingVisitor.prototype.visitProcedure = function(tree) {
    // create a new compiler procedure context in the instruction builder
    this.builder.pushProcedureContext(tree);

    // the VM executes each statement
    var statements = tree.children;
    for (var i = 0; i < statements.length; i++) {
        statements[i].accept(this);
        this.builder.incrementStatementCount();
    }

    // throw away the current compiler procedure context in the instruction builder
    this.builder.popProcedureContext();
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * expression and then publish the resulting value that is on top of the
 * component stack to the global event queue in the Bali Cloud Environment™.
 */
// publishClause: 'publish' expression
CompilingVisitor.prototype.visitPublishClause = function(tree) {
    var event = tree.children[0];

    // the VM places the value of the event expression onto the top of the component stack
    event.accept(this);

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
CompilingVisitor.prototype.visitQueueClause = function(tree) {
    var message = tree.children[0];
    var reference = tree.children[1];

    // the VM stores the reference to the queue in a temporary variable
    reference.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM stores the message on the message queue
    message.accept(this);
    this.builder.insertStoreInstruction('MESSAGE', queue);
};


/*
 * This method inserts the instructions that cause the VM to evaluate two
 * expressions and then replace the resulting values that are on the
 * component stack with a range component that has the two values as its
 * starting and ending values.
 */
// range: expression '..' expression
CompilingVisitor.prototype.visitRange = function(tree) {
    var firstValue = tree.children[0];
    var lastValue = tree.children[1];

    // the VM places the value of the starting expression on the component stack
    firstValue.accept(this);  // first value in the range

    // the VM places the value of the ending expression on the component stack
    lastValue.accept(this);  // last value in the range

    // the VM replaces the two range values on the component stack with a new range component
    this.builder.insertInvokeInstruction('$range', 2);
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * optional expression and then set the resulting value that is on top
 * of the component stack as the result of the current procedure. The VM
 * then returns the result to the calling procedure.
 */
// returnClause: 'return' expression?
CompilingVisitor.prototype.visitReturnClause = function(tree) {
    if (tree.children.length > 0) {
        var result = tree.children[0];

        // the VM places the value of the result expression on top of the component stack
        result.accept(this);
    } else {
        // the VM places a 'none' value on top of the component stack
        this.builder.insertPushInstruction('ELEMENT', 'none');
    }

    // the VM returns the result to the calling procedure
    this.builder.insertHandleInstruction('RESULT');
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * expression and then store the resulting component that is on top of
 * the component stack persistently in the Bali Cloud Environment™. The
 * reference to the document location is another expression that the VM
 * evaluates as well.
 */
// saveClause: 'save' expression 'to' expression
CompilingVisitor.prototype.visitSaveClause = function(tree) {
    var draft = tree.children[0];
    var reference = tree.children[1];

    // the VM stores the value of the reference to the location into a temporary variable
    reference.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the component stack
    draft.accept(this);

    // the VM stores the document on top of the component stack into the remote location
    this.builder.insertStoreInstruction('DRAFT', location);
};


/*
 * This method inserts instructions that cause the VM to evaluate one or
 * condition expressions and execute a procedure block for the condition
 * that matches the value of a selector expression. If none of the
 * conditions are true an optional procedure block may be executed by the VM.
 */
// selectClause: 'select' expression 'from' (expression 'do' block)+ ('else' block)?
CompilingVisitor.prototype.visitSelectClause = function(tree) {
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
        var option = children[i++];
        var block = children[i];
        clausePrefix = this.builder.getClausePrefix();
        var optionLabel = clausePrefix + 'OptionClause';
        this.builder.insertLabel(optionLabel);

        // the VM loads the selector value onto the top of the componencomponent stack
        this.builder.insertLoadInstruction('VARIABLE', selectorVariable);

        // the VM places the option value on top of the component stack
        option.accept(this);

        // the VM checks to see if the selector and option match and places the result on the component stack
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
        block.accept(this);

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
// statement: mainClause handleClause*
CompilingVisitor.prototype.visitStatement = function(tree) {
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
            this.builder.insertJumpInstruction(statement.successLabel);

            // the VM will direct any exceptions from the main clause here to be handled
            this.builder.insertLabel(statement.handlerLabel);

            // the VM tries each handler for the exception
            var handlers = statement.handleClauses;
            for (var i = 0; i < handlers.length; i++) {
                handlers[i].accept(this);
            }

            // none of the exception handlers matched so the VM must try the parent handlers
            this.builder.insertLabel(statement.failureLabel);
            this.builder.insertHandleInstruction('EXCEPTION');

            // the VM encountered no exceptions or was able to handle them
            this.builder.insertLabel(statement.successLabel);
        }
    }

    // the VM moves on to the next statement
    this.builder.popStatementContext();
};


/*
 * This method inserts instructions that cause the VM to place a sequence
 * of components that are embedded in a collection onto the top
 * of the component stack.
 */
// structure: '[' collection ']'
CompilingVisitor.prototype.visitStructure = function(tree) {
    var collection = tree.children[0];

    // the VM places the value of the collection on top of the component stack
    collection.accept(this);
};


/*
 * This method inserts the instructions that cause the VM to prepare the recipient
 * of a value to receive it. The recipient may be either a variable or an indexed
 * child of a collection component. If it is a variable (identified by its symbol)
 * no preparation is needed. But if it is the latter, the children of the collection
 * component must be traversed using the specified indices until the parent of the
 * last child and the last child's index are left on the component stack. This
 * leaves the stack ready for a call to '$setValue' to set the value of the child
 * to the value of an expression that will be placed on the top of the component
 * stack prior to the call.
 */
// subcomponent: variable indices
CompilingVisitor.prototype.visitSubcomponent = function(tree) {
    var variable = tree.children[0];
    var indices = tree.children[1];

    // the VM places the value of the variable onto the top of the component stack
    variable.accept(this);

    // the VM replaces the value of the variable on the component stack with
    // the parent and index of the subcomponent
    indices.accept(this);
};


/*
 * This method inserts the instructions that cause the VM to replace
 * the value of an expression that is on top of the component stack
 * with its subcomponent referred to by the indices.
 */
// subcomponentExpression: expression indices
CompilingVisitor.prototype.visitSubcomponentExpression = function(tree) {
    var component = tree.children[0];
    var indices = tree.children[1];

    // TODO: replace invoke with execute no matter what

    // the VM places the value of the expression on top of the component stack
    component.accept(this);
    this.builder.insertExecuteInstruction('$asSequential', 'ON TARGET');

    // the VM replaces the value on the component stack with the parent and index of the subcomponent
    indices.accept(this);

    // the VM retrieves the value of the subcomponent at the given index of the parent component
    this.builder.insertInvokeInstruction('$getValue', 2);
    // the value of the subcomponent remains on the component stack
};


/*
 * This method inserts the instructions that cause the VM to evaluate an
 * exception expression and then jumps to the the handle clauses for the
 * current handler context.
 */
// throwClause: 'throw' expression
CompilingVisitor.prototype.visitThrowClause = function(tree) {
    var exception = tree.children[0];

    // the VM places the value of the exception expression on top of the component stack
    exception.accept(this);

    // the VM jumps to the handler clauses for the current context
    this.builder.insertHandleInstruction('EXCEPTION');
};


/*
 * This method inserts the instructions that cause the VM to place the
 * value of a variable onto the top of the component stack.
 */
// variable: IDENTIFIER
CompilingVisitor.prototype.visitVariable = function(terminal) {
    // the VM loads the value of the variable onto the top of the component stack
    var variable = '$' + terminal.value;
    this.builder.insertLoadInstruction('VARIABLE', variable);
};


/*
 * This method compiles the instructions needed to wait for a message from a
 * queue in the Bali Cloud Environemnt™. The resulting message is assigned
 * to a recipient. The recipient may be either a variable or an indexed child
 * of a collection component.
 */
// waitClause: 'wait' 'for' recipient 'from' expression
CompilingVisitor.prototype.visitWaitClause = function(tree) {
    var recipient = tree.children[0];
    var reference = tree.children[1];

    // the VM processes the recipient as needed
    recipient.accept(this);

    // the VM places the value of the reference to the queue
    // on top of the component stack
    reference.accept(this);
    this.builder.insertExecuteInstruction('$asReference', 'ON TARGET');

    // the VM stores the value of the reference to the queue into a temporary variable
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM loads the next message from the remote queue onto the top of the component stack
    // NOTE: this call blocks until a message is available on the queue
    this.builder.insertLoadInstruction('MESSAGE', queue);

    // the VM sets the value of the recipient to the value on the top of the component stack
    this.setRecipient(recipient);
};


/*
 * This method inserts instructions that cause the VM to repeatedly execute a procedure
 * block while a condition expression is true.
 */
// whileClause: 'while' expression 'do' block
CompilingVisitor.prototype.visitWhileClause = function(tree) {
    var condition = tree.children[0];
    var block = tree.children[1];
    var clausePrefix = this.builder.getClausePrefix();

    // construct the loop and done labels
    var statement = this.builder.getStatementContext();
    statement.loopLabel = clausePrefix + 'ConditionClause';

    // label the start of the loop
    this.builder.insertLabel(statement.loopLabel);

    // the VM jumps past the end of the loop if the condition expression evaluates to false
    condition.accept(this);
    this.builder.insertExecuteInstruction('$asBoolean', 'ON TARGET');
    this.builder.insertJumpInstruction(statement.doneLabel, 'ON FALSE');

    // if the condition is true, then the VM enters the block
    block.accept(this);

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
CompilingVisitor.prototype.visitWithClause = function(tree) {
    var count = tree.children.length;
    var symbol = tree.children[0];
    var sequence = tree.children[count - 2];
    var block = tree.children[count - 1];
    var clausePrefix = this.builder.getClausePrefix();

    // construct the loop and done labels
    var statement = this.builder.getStatementContext();
    statement.loopLabel = clausePrefix + 'ConditionClause';

    // construct the item symbol
    var item;
    if (count > 2) {
        item = symbol.value;
    } else {
        item = this.createTemporaryVariable('item');
    }

    // the VM places the value of the sequence expression onto the top of the component stack
    sequence.accept(this);
    this.builder.insertExecuteInstruction('$asSequential', 'ON TARGET');

    // the VM replaces the sequence on the component stack with an iterator to it
    this.builder.insertExecuteInstruction('$iterator', 'ON TARGET');

    // The VM stores the iterater in a temporary variable
    var iterator = this.createTemporaryVariable('iterator');
    this.builder.insertStoreInstruction('VARIABLE', iterator);

    // label the start of the loop
    this.builder.insertLabel(statement.loopLabel);

    // the VM jumps past the end of the loop if the iterator has no more items
    this.builder.insertLoadInstruction('VARIABLE', iterator);
    this.builder.insertExecuteInstruction('$hasNext', 'ON TARGET');
    this.builder.insertJumpInstruction(statement.doneLabel, 'ON FALSE');

    // the VM places the iterator back onto the component stack
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM replaces the iterator on the component stack with the next item from the sequence
    this.builder.insertExecuteInstruction('$getNext', 'ON TARGET');

    // the VM stores the item that is on top of the component stack in the variable
    this.builder.insertStoreInstruction('VARIABLE', item);

    // the VM executes the block using the item if needed
    block.accept(this);

    // the VM jumps to the top of the loop for the next iteration
    var statementPrefix = this.builder.getStatementPrefix();
    var repeatLabel = statementPrefix + 'ConditionRepeat';
    this.builder.insertLabel(repeatLabel);
    this.builder.insertJumpInstruction(statement.loopLabel);
};


/*
 * This method creates a new temporary variable name. Since each variable name must
 * be unique within the scope of the procedure block being compiled, a counter is
 * used to append a unique number to the end of each temporary variable.
 */
CompilingVisitor.prototype.createTemporaryVariable = function(name) {
    return '$_' + name + '_' + this.temporaryVariableCount++ + '_';
};


/*
 * This method inserts instructions that cause the VM to either set
 * the value of a variable or a subcomponent to the value on the top of the
 * component stack.
 */
CompilingVisitor.prototype.setRecipient = function(recipient) {
    // TODO: change invoke to execute for a subcomponent

    if (recipient.type === types.SYMBOL) {
        // the VM stores the value that is on top of the component stack in the variable
        var symbol = recipient.value;
        this.builder.insertStoreInstruction('VARIABLE', symbol);
    } else {
        // the VM sets the value of the subcomponent at the given index of the parent component
        // to the value that is on top of the component stack
        this.builder.insertInvokeInstruction('$setValue', 3);
    }
};


CompilingVisitor.prototype.getResult = function() {
    this.builder.finalize();
    return this.builder.asmcode;
};


// PRIVATE BUILDER CLASS

/*
 * This helper class is used to construct the Bali assembly source code. It
 * maintains a stack of procedure context objects that track the current statement
 * number and clause number within each procedure.  A prefix is a dot separated
 * sequence of positive numbers defining alternately the statement number and
 * clause number.  For example, a prefix of '2.3.4.' would correspond to the
 * fourth statement in the third clause of the second statement in the main procedure.
 */
function InstructionBuilder() {
    this.asmcode = '';
    this.procedures = [];  // stack of procedure contexts
    this.nextLabel = null;
    return this;
}
InstructionBuilder.prototype.constructor = InstructionBuilder;


/*
 * This method pushes a new procedure context onto the procedure stack and initializes
 * it based on the parent procedure context if one exists.
 */
InstructionBuilder.prototype.pushProcedureContext = function(tree) {
    var statementCount = tree.children.length;
    if (this.procedures.length > 0) {
        var parent = this.procedures.peek();
        this.procedures.push({
            statementNumber: 1,
            statementCount: statementCount,
            prefix: parent.prefix + parent.statementNumber + '.' + parent.statement.clauseNumber + '.'
        });
        parent.statement.clauseNumber++;
    } else {
        this.procedures.push({
            statementNumber: 1,
            statementCount: statementCount,
            prefix: ''
        });
    }
};


/*
 * This method pops off the current procedure context when the compiler is done processing
 * that procedure.
 */
InstructionBuilder.prototype.popProcedureContext = function() {
    this.procedures.pop();
};


/*
 * This method pushes a new statement context onto the procedure stack and initializes
 * it.
 */
InstructionBuilder.prototype.pushStatementContext = function(tree) {
    var children = tree.children;
    var mainClause = children[0];
    var subClauses = getSubClauses(mainClause);
    var handleClauses = children.slice(1);
    var clauseCount = subClauses.length + handleClauses.length;
    var procedure = this.procedures.peek();
    procedure.statement = {
        mainClause: mainClause,
        subClauses: subClauses,
        handleClauses: handleClauses,
        clauseCount: clauseCount,
        clauseNumber: 1
    };

    // initialize the procedure configuration for this statement
    var statement = procedure.statement;
    var type = types.NODE_TYPES[statement.mainClause.type].toTitleCase().slice(0, -6);
    var prefix = procedure.prefix + procedure.statementNumber + '.';
    statement.startLabel = prefix + type + 'Statement';
    if (statement.clauseCount > 0) {
        statement.doneLabel = prefix + type + 'StatementDone';
    }
    if (statement.handleClauses.length > 0) {
        statement.handlerLabel = prefix + type + 'StatementHandlers';
        statement.failureLabel = prefix + type + 'StatementFailed';
        statement.successLabel = prefix + type + 'StatementSucceeded';
    }

    return procedure.statement;
};


/*
 * This method pops off the current statement context when the compiler is done processing
 * that statement.
 */
InstructionBuilder.prototype.popStatementContext = function() {
    this.procedures.peek().statement = undefined;
};


/*
 * This method determines whether or not the current statement contains clauses.
 */
InstructionBuilder.prototype.hasClauses = function() {
    var statement = this.procedures.peek().statement;
    return statement.clauseCount > 0;
};


/*
 * This method determines whether or not the current statement contains handlers.
 */
InstructionBuilder.prototype.hasHandlers = function() {
    var statement = this.procedures.peek().statement;
    return statement.handleClauses.length > 0;
};


/*
 * This method returns the number of the current clause within its procedure context. For
 * example a 'then' clause within an 'if then else' statement would be the first clause
 * and the 'else' clause would be the second clause. Exception clauses and final clauses
 * are also included in the numbering.
 */
InstructionBuilder.prototype.getClauseNumber = function() {
    var procedure = this.procedures.peek();
    var number = procedure.statement.clauseNumber;
    return number;
};


/*
 * This method returns the number of the current statement within its procedure context. The
 * statements are numbered sequentially starting with the number 1.
 */
InstructionBuilder.prototype.getStatementNumber = function() {
    var procedure = this.procedures.peek();
    var number = procedure.statementNumber;
    return number;
};


/*
 * This method increments by one the statement counter within the current procedure context.
 */
InstructionBuilder.prototype.incrementStatementCount = function() {
    var procedure = this.procedures.peek();
    procedure.statementNumber++;
};


/*
 * This method returns the label prefix for the current instruction within the current
 * procedure context.
 */
InstructionBuilder.prototype.getStatementPrefix = function() {
    var procedure = this.procedures.peek();
    var prefix = procedure.prefix + procedure.statementNumber + '.';
    return prefix;
};


/*
 * This method returns the type of the current statement.
 */
InstructionBuilder.prototype.getStatementType = function() {
    var statement = this.procedures.peek().statement;
    var type = types.NODE_TYPES[statement.mainClause.type].toTitleCase().slice(0, -6);
    return type;
};


/*
 * This method returns the context for the current statement.
 */
InstructionBuilder.prototype.getStatementContext = function() {
    var statement = this.procedures.peek().statement;
    return statement;
};


/*
 * This method returns the label prefix for the current clause within the current
 * procedure context.
 */
InstructionBuilder.prototype.getClausePrefix = function() {
    var procedure = this.procedures.peek();
    var prefix = procedure.prefix + procedure.statementNumber + '.' + procedure.statement.clauseNumber + '.';
    return prefix;
};


/*
 * This method returns the label prefix for the next clause within the current
 * procedure context.
 */
InstructionBuilder.prototype.getNextClausePrefix = function() {
    var procedure = this.procedures.peek();
    var prefix = procedure.prefix + procedure.statementNumber + '.' + (procedure.statement.clauseNumber + 1) + '.';
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
    var instruction = 'PUSH ' + type;
    switch (type) {
        case 'HANDLER':
            instruction += ' ' + value;  // value as a label
            break;
        case 'ELEMENT':
        case 'CODE':
            instruction += ' `' + value + '`';  // value as a literal
            break;
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
 * This method finalizes the builder by adding instructions to handle the
 * result if not handled earlier.
 */
InstructionBuilder.prototype.finalize = function() {
    this.insertLoadInstruction('VARIABLE', '$_result_');
    this.insertHandleInstruction('RESULT');
};
