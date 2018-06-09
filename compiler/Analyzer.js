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
 * This library provides functions that analyze a Bali Type Document in
 * preparation for compilation.
 */


// PUBLIC FUNCTIONS

/**
 * This function traverses a parse tree structure for a Bali type
 * analyzing it for correctness and filling in missing type information.
 * The function returns the context information that will be needed
 * by the compiler.
 * 
 * @param {TreeNode} tree The parse tree structure for the Bali type.
 * @returns {object} An object containing the type context information.
 */
exports.analyzeType = function(tree) {
    var visitor = new AnalyzingVisitor();
    tree.accept(visitor);
};


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


// component: item parameters?
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


// document: NEWLINE* component NEWLINE* EOF
AnalyzingVisitor.prototype.visitDocument = function(tree) {
    tree.children[0].accept(this);
};


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


// parameters: '(' composite ')'
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


// recipient: symbol | variable indices
AnalyzingVisitor.prototype.visitRecipient = function(tree) {
    var children = tree.children;
    for (var i = 0; i < children.length; i++) {
        children[i].accept(this);
    }
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


// structure: '[' composite ']'
AnalyzingVisitor.prototype.visitStructure = function(tree) {
    tree.children[0].accept(this);
};


// subcomponentExpression: expression indices
AnalyzingVisitor.prototype.visitSubcomponentExpression = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// task: SHELL NEWLINE* procedure NEWLINE* EOF
AnalyzingVisitor.prototype.visitTask = function(tree) {
    tree.children[0].accept(this);
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
