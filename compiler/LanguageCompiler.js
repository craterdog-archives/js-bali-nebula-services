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
var types = require('bali-language/syntax/NodeTypes');
var language = require('bali-language/BaliLanguage');


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
    this.symbolTables = symbolTables;
    this.builder = new InstructionBuilder();
    this.temporaryVariableCount = 1;
    return this;
}
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


// arithmeticExpression: expression ('*' | '/' | '//' | '+' | '-') expression
CompilerVisitor.prototype.visitArithmeticExpression = function(tree) {
    // place the result of the first operand expression on top of the execution stack
    tree.children[0].accept(this);
    // place the result of the second operand expression on top of the execution stack
    tree.children[1].accept(this);
    // perform the binary operation
    var operator = tree.operator;
    switch (operator) {
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
            throw new Error('COMPILER: Invalid binary operator found: "' + operator + '"');
    }
};


// array:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty array*/
CompilerVisitor.prototype.visitArray = function(tree) {
    // the VM places the size of the array on the execution stack
    var size = tree.children.length;
    this.builder.insertLoadInstruction('LITERAL', size);

    // the VM replaces the size value on the execution stack with a new array containing the items
    this.builder.insertInvokeInstruction('$array', 1);
    for (var i = 0; i < tree.children.length; i++) {
        tree.children[i].accept(this);
        this.builder.insertInvokeInstruction('$addItem', 2);
    }

    // the array remains on the execution stack
};


// association: element ':' expression
CompilerVisitor.prototype.visitAssociation = function(tree) {
    // the VM places the element key on the execution stack
    tree.children[0].accept(this);

    // the VM places the value of the expression on the execution stack
    tree.children[1].accept(this);
};


// block: '{' procedure '}' parameters?
CompilerVisitor.prototype.visitBlock = function(tree) {
    // create a new compiler block context in the instruction builder
    this.builder.pushBlockContext();

    // the VM adds any parameters to the current block context
    if (tree.children[1]) {
        var parameters = tree.children[1].children;
        for (var i = 0; i < parameters.length; i++) {
            // TODO: need to handle ranges, arrays, and tables differently
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


// breakClause: 'break' ('from' label)?
/*
 *  This method is implemented as if there is no 'break from' statement type. The
 *  reason is that great care must be taken when unwinding nested statements since
 *  they may have 'finish with' clauses that must be executed regardless of how the
 *  blocks are exited. This implementation may be less efficient but is much easier
 *  to prove correct. It relies on a 'continueLoop' variable being checked in the
 *  loop statements as a way to tell them to end when continueLoop === false.
 */
CompilerVisitor.prototype.visitBreakClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'BreakStatement');

    // convert the label if it exists to be a loop label suffix
    var label;
    if (tree.children.length > 0) {
        label = tree.children[0].value;
        label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    // mark each enclosing loop as done
    var blocks = this.builder.blocks;
    var block;
    var numberOfBlocks = blocks.length;
    for (var i = 0; i < numberOfBlocks; i++) {
        block = blocks[numberOfBlocks - i - 1];  // work backwards
        var loopLabel = block.loopLabel;
        if (loopLabel) {
            // for each enclosing loop we need to tell it that its done
            // the VM sets the 'continueLoop' variable for this block to 'false'
            var continueLoop = this.createContinueVariable(loopLabel);
            this.builder.insertLoadInstruction('LITERAL', 'false');
            this.builder.insertStoreInstruction('VARIABLE', continueLoop);
            if (label === undefined || label === null || loopLabel.endsWith(label)) {
                // we found the matching enclosing loop and marked all enclosed loops as done
                break;
            }
        }
        if (i === numberOfBlocks - 1) {
            // there was no matching enclosing loop with that label which should never happen
            throw new Error('COMPILER: An unknown label was found in a break clause: ' + label);
        }
    }

    // look for the first enclosing loop
    for (var j = 0; j < numberOfBlocks; j++) {
        block = blocks[numberOfBlocks - i - 1];  // work backwards
        var finishLabel = block.finishLabel;
        if (finishLabel) {
            // the VM jumps to the end of the first enclosing loop
            this.builder.insertJumpInstruction(finishLabel);
        }
    }
};


// checkoutClause: 'checkout' symbol 'from' expression
CompilerVisitor.prototype.visitCheckoutClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'CheckoutStatement');

    // the VM loads the value of the reference to the location onto the top of the execution stack
    tree.children[1].accept(this);

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the document from the remote location onto the top of the execution stack
    this.builder.insertLoadInstruction('DOCUMENT', location);

    // the VM stores the document that is on top of the execution stack in the variable
    var symbol = tree.children[0].value;
    this.builder.insertStoreInstruction('VARIABLE', symbol);
};


// commitClause: 'commit' expression 'to' expression
CompilerVisitor.prototype.visitCommitClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'CommitStatement');

    // the VM loads the value of the reference to the location onto the top of the execution stack
    tree.children[1].accept(this);

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the execution stack
    tree.children[0].accept(this);

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DOCUMENT', location);
};


// comparisonExpression: expression ('<' | '=' | '>' | 'is' | 'matches') expression
CompilerVisitor.prototype.visitComparisonExpression = function(tree) {
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


// complementExpression: 'not' expression
CompilerVisitor.prototype.visitComplementExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM finds the logical complement of the top value on the execution stack
    this.builder.insertInvokeInstruction('$complement', 1);
};


// continueClause: 'continue' ('to' label)?
/*
 *  This method is implemented as if there is no 'continue to' statement type. The
 *  reason is that great care must be taken when unwinding nested statements since
 *  they may have 'finish with' clauses that must be executed regardless of how the
 *  blocks are exited. This implementation may be less efficient but is much easier
 *  to prove correct. It relies on a 'continueLoop' variable being checked in the
 *  loop statements as a way to tell them to end when continueLoop === false.
 */
CompilerVisitor.prototype.visitContinueClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ContinueStatement');

    // convert the label if it exists to be a loop label suffix
    var label;
    if (tree.children.length > 0) {
        label = tree.children[0].value;
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
                // the VM jumps to the end of the parent block
                // NOTE: we can't just jump straight to the matching loop or we will miss
                // executing final handlers along the way
                var blockEndLabel = this.builder.blocks.peek().blockEndLabel;
                this.builder.insertJumpInstruction(blockEndLabel);
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
    throw new Error('COMPILER: An unknown label was found in a continue clause: ' + label);
};


// defaultExpression: expression '?' expression
CompilerVisitor.prototype.visitDefaultExpression = function(tree) {
    // the VM places the result of the first operand expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the result of the second operand expression on top of the execution stack
    tree.children[1].accept(this);

    // the VM leaves the actual value on the top of the execution stack
    this.builder.insertInvokeInstruction('$default', 2);
};


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


// discardClause: 'discard' expression
CompilerVisitor.prototype.visitDiscardClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'DiscardStatement');

    // the VM loads the value of the reference to the location onto the top of the execution stack
    tree.children[0].accept(this);

    // the VM stores the value of the reference to the location into a temporary variable
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM stores no document into the remote location
    this.builder.insertLoadInstruction('LITERAL', 'none');
    this.builder.insertStoreInstruction('DRAFT', location);
};


// document: NEWLINE* component NEWLINE* EOF
CompilerVisitor.prototype.visitDocument = function(tree) {
    // the VM places the value of the component on top of the execution stack
    tree.children[0].accept(this);
};


// element: (
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
//) parameters?
CompilerVisitor.prototype.visitElement = function(terminal) {
    // the VM loads the element value onto the top of the execution stack
    var literal = terminal.value;
    this.builder.insertLoadInstruction('LITERAL', literal);

    if (terminal.parameters) {
        // the VM loads any parameters associated with the element onto the top of the execution stack
        terminal.parameters.accept(this);

        // the VM sets the parameters for the element
        this.builder.insertInvokeInstruction('$setParameters', 2);
    }
};


// evaluateClause: ((symbol | variable indices) ':=')? expression
CompilerVisitor.prototype.visitEvaluateClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'EvaluateStatement');
    var children = tree.children;
    var length = children.length;

    switch (length) {
        case 1:
            // the VM places the value of the expression onto the top of the execution stack
            children[0].accept(this);  // expression

            // the VM stores the value of the expression in the result variable
            this.builder.insertStoreInstruction('VARIABLE', '$_result_');
            break;
        case 2:
            // extract the symbol for the variable
            var symbol = children[0].value;  // symbol

            // the VM places the value of the expression onto the top of the execution stack
            children[1].accept(this);  // expression

            // the VM stores the value of the expression in the variable
            this.builder.insertStoreInstruction('VARIABLE', symbol);
            break;
        case 3:
            // the VM places the value of the component variable onto the top of the execution stack
            children[0].accept(this);  // variable

            // the VM replaces the component on the execution stack with the parent and index of the subcomponent
            children[1].accept(this);  // indices

            // the VM places the value of the expression onto the top of the execution stack
            children[2].accept(this);  // expression

            // the VM sets the value of the subcomponent at the given index of the parent component
            this.builder.insertInvokeInstruction('$setValue', 3);
            break;
        default:
            throw new Error('COMPILER: An invalid evaluate clause has too many children: ' + length);
    }
};


// exponentialExpression: <assoc=right> expression '^' expression
CompilerVisitor.prototype.visitExponentialExpression = function(tree) {
    // the VM places the result of the base expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM places the result of the exponent expression on top of the execution stack
    tree.children[1].accept(this);

    // the VM leaves the result of raising the base to the exponent on top of the execution stack
    this.builder.insertInvokeInstruction('$exponential', 2);
};


// factorialExpression: expression '!'
CompilerVisitor.prototype.visitFactorialExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM leaves the result of the factorial of the value on top of the execution stack
    this.builder.insertInvokeInstruction('$factorial', 1);
};


// finishClause: 'finish' 'with' block
CompilerVisitor.prototype.visitFinishClause = function(tree) {
    // compile the finish block
    tree.children[0].accept(this);  // block
};


// functionExpression: function parameters
CompilerVisitor.prototype.visitFunctionExpression = function(tree) {
    // the VM places a reference to the type that defines the function on top of the execution stack
    var name = '$' + tree.children[0].value;
    //var typeReference = this.symbolTables.procedures[name];
    var typeReference = '<bali:/bali/types/SomeType>';
    this.builder.insertLoadInstruction('LITERAL', typeReference);

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


// handleClause: 'handle' symbol 'matching' expression 'with' block
CompilerVisitor.prototype.visitHandleClause = function(tree) {
    // setup the labels
    var clausePrefix = this.builder.getClausePrefix();
    var handleLabel = clausePrefix + 'HandleClause';
    var clauseEndLabel = clausePrefix + 'ClauseEnd';
    this.builder.insertLabel(handleLabel);

    // the VM stores the exception that is on top of the execution stack in the variable
    var exception = tree.children[0].value;
    this.builder.insertStoreInstruction('VARIABLE', exception);

    // the VM compares the template expression with the actual exception
    this.builder.insertLoadInstruction('VARIABLE', exception);
    tree.children[1].accept(this);  // expression
    this.builder.insertInvokeInstruction('$matches', 2);

    // the VM jumps past this exception handler if the template and exception did not match
    this.builder.insertJumpInstruction(clauseEndLabel, 'ON FALSE');

    // the VM executes the handler block
    tree.children[2].accept(this);  // block

    // the VM clears the exception variable
    this.builder.insertLoadInstruction('LITERAL', 'none');
    this.builder.insertStoreInstruction('VARIABLE', '$_exception_');

    // the VM jumps here if the exception did not match the template
    this.builder.insertLabel(clauseEndLabel);
};


// ifClause: 'if' expression 'then' block ('else' 'if' expression 'then' block)* ('else' block)?
CompilerVisitor.prototype.visitIfClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'IfStatement');
    var children = tree.children;
    var elseBlock;
    if (children.length % 2 === 1) {
        elseBlock = children[children.length - 1];
        children = children.slice(0, children.length - 1);  // exclude the else block
    }
    var length = children.length;
    var elseLabel = statementPrefix + (length / 2 + 1) + '.ElseClause';
    var finishLabel = this.builder.blocks.peek().finishLabel;

    // compile each condition
    for (var i = 0; i < length; i++) {
        var clausePrefix = this.builder.getClausePrefix();
        this.builder.insertLabel(clausePrefix + 'ConditionClause');

        // the VM places the condition value on top of the execution stack
        children[i++].accept(this);  // condition

        // determine what the next label will be
        var nextLabel;
        if (i === length - 1) {
            // we are on the last condition
            if (elseBlock) {
                nextLabel = elseLabel;
            } else {
                nextLabel = finishLabel;
            }
        } else {
            nextLabel = statementPrefix + (this.builder.getClauseNumber() + 1) + '.ConditionClause';
        }

        // if the condition is not true, the VM jumps to the next condition, else block, or the end
        this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

        // if the condition is true, then the VM enters the block
        children[i].accept(this);  // block

        // completed execution of the block
        if (elseBlock || i < length - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertJumpInstruction(finishLabel);
        }
    }

    // compile the optional else block
    if (elseBlock) {
        this.builder.insertLabel(elseLabel);
        elseBlock.accept(this);
    }
};


// indices: '[' array ']'
// NOTE: this method traverses all but the last index in the array. It leaves the parent
// and the index of the final subcomponent on the execution stack so that the outer rule
// can either use them to get the final subcomponent value or set it depending on the
// context.
CompilerVisitor.prototype.visitIndices = function(tree) {
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


// inversionExpression: ('-' | '/' | '*') expression
CompilerVisitor.prototype.visitInversionExpression = function(tree) {
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


// logicalExpression: expression ('and' | 'sans' | 'xor' | 'or') expression
CompilerVisitor.prototype.visitLogicalExpression = function(tree) {
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


// magnitudeExpression: '|' expression '|'
CompilerVisitor.prototype.visitMagnitudeExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);

    // the VM leaves the result of the magnitude of the value on top of the execution stack
    this.builder.insertInvokeInstruction('$magnitude', 1);
};


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


// parameters: '(' composite ')'
CompilerVisitor.prototype.visitParameters = function(tree) {
    // the VM places the value of the composite on top of the execution stack
    tree.children[0].accept(this);
};


// precedenceExpression: '(' expression ')'
CompilerVisitor.prototype.visitPrecedenceExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);
};


// procedure:
//     statement (';' statement)*   |
//     NEWLINE (statement NEWLINE)* |
//     /*empty statements*/
CompilerVisitor.prototype.visitProcedure = function(tree) {
    // record the label for the end of the block in the compiler block context
    var statements = tree.children;
    var numberOfStatements = statements.length;
    var block = this.builder.blocks.peek();
    var blockEndLabel = block.prefix + (numberOfStatements + 1) + '.BlockEnd';
    block.blockEndLabel = blockEndLabel;

    // compile the statements
    for (var i = 0; i < statements.length; i++) {
        statements[i].accept(this);
        this.builder.incrementStatementCount();
    }

    // the VM jumps here when flow is interrupted by 'return', 'throw', 'continue', and 'break'
    this.builder.insertLabel(blockEndLabel);
};


// publishClause: 'publish' expression
CompilerVisitor.prototype.visitPublishClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'PublishStatement');

    // the VM places the value of the event expression onto the top of the execution stack
    tree.children[0].accept(this);  // event expression

    // the VM stores the event on the event queue
    this.builder.insertStoreInstruction('MESSAGE', '$_eventQueue_');
};


// queueClause: 'queue' expression 'on' expression
CompilerVisitor.prototype.visitQueueClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'QueueStatement');

    // the VM stores the reference to the queue in a temporary variable
    tree.children[1].accept(this);  // queue
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM stores the message on the message queue
    tree.children[0].accept(this);  // message
    this.builder.insertStoreInstruction('MESSAGE', queue);
};


// range: expression '..' expression
CompilerVisitor.prototype.visitRange = function(tree) {
    // the VM places the value of the starting expression on the execution stack
    tree.children[0].accept(this);  // first value in the range

    // the VM places the value of the ending expression on the execution stack
    tree.children[1].accept(this);  // last value in the range

    // the VM replaces the two range values on the execution stack with a new range component
    this.builder.insertInvokeInstruction('$range', 2);
};


// returnClause: 'return' expression?
CompilerVisitor.prototype.visitReturnClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ReturnStatement');

    if (tree.children.length > 0) {
        // the VM stores the value of the result expression in a temporary variable
        tree.children[0].accept(this);
        this.builder.insertStoreInstruction('VARIABLE', '$_result_');
    }
};


// saveClause: 'save' expression 'to' expression
CompilerVisitor.prototype.visitSaveClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'SaveStatement');

    // the VM stores the value of the reference to the location into a temporary variable
    tree.children[1].accept(this);  // location expression
    var location = this.createTemporaryVariable('location');
    this.builder.insertStoreInstruction('VARIABLE', location);

    // the VM loads the value of the draft onto the top of the execution stack
    tree.children[0].accept(this);  // draft expression

    // the VM stores the document on top of the execution stack into the remote location
    this.builder.insertStoreInstruction('DRAFT', location);
};


// selectClause: 'select' expression 'from' (expression 'do' block)+ ('else' block)?
CompilerVisitor.prototype.visitSelectClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'SelectStatement');
    var children = tree.children;
    var selector = children[0];
    var elseBlock;
    if (children.length % 2 === 0) {
        elseBlock = children[children.length - 1];
        children = children.slice(1, children.length - 1);
    } else {
        children = children.slice(1);
    }
    var length = children.length;
    var elseLabel = statementPrefix + (length / 2 + 1) + '.ElseClause';
    var finishLabel = this.builder.blocks.peek().finishLabel;

    // the VM saves the value of the selector expression in a temporary variable
    selector.accept(this);
    var selectorVariable = this.createTemporaryVariable('selector');
    this.builder.insertStoreInstruction('VARIABLE', selectorVariable);

    // check each option
    for (var i = 0; i < length; i++) {
        var clausePrefix = this.builder.getClausePrefix();
        this.builder.insertLabel(clausePrefix + 'OptionClause');

        // the VM loads the selector value onto the top of the execution stack
        this.builder.insertLoadInstruction('VARIABLE', selectorVariable);

        // the VM places the option value on top of the execution stack
        children[i++].accept(this);  // option expression

        // the VM checks to see if the selector and option match and places the result on the execution stack
        this.builder.insertInvokeInstruction('$matches', 2);
        var nextLabel;
        if (i === length - 1) {
            // we are on the last option
            if (elseBlock) {
                nextLabel = elseLabel;
            } else {
                nextLabel = finishLabel;
            }
        } else {
            nextLabel = statementPrefix + (this.builder.getClauseNumber() + 1) + '.OptionClause';
        }

        // if the option does not match, the VM jumps to the next option, the else block, or the end
        this.builder.insertJumpInstruction(nextLabel, 'ON FALSE');

        // if the option matches, then the VM enters the block
        children[i].accept(this);  // block

        // completed execution of the block
        if (elseBlock || i < length - 1) {
            // not the last block so the VM jumps to the end of the statement
            this.builder.insertJumpInstruction(finishLabel);
        }
    }

    // the VM executes the optional else block
    if (elseBlock) {
        this.builder.insertLabel(elseLabel);
        elseBlock.accept(this);
    }
};


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
// ) handleClause* finishClause?
CompilerVisitor.prototype.visitStatement = function(tree) {
    var children = tree.children;
    var mainClause = children[0];
    var finishClause = children[children.length - 1].type === types.FINISH_CLAUSE ? children[children.length - 1] : undefined;
    var handleClauses = finishClause ? children.slice(1, -1) : children.slice(1);

    var statementPrefix = this.builder.getStatementPrefix();
    var handleLabel = statementPrefix + 'HandleClauses';
    var finishLabel = statementPrefix + 'FinishClause';
    if (handleClauses.length > 0) this.builder.blocks.peek().handleLabel = handleLabel;
    this.builder.blocks.peek().finishLabel = finishLabel;

    // the VM attempts to execute the main clause
    mainClause.accept(this);

    // the VM ends up here after the main clause is done or if any exceptions were thrown by the main clause
    if (handleClauses.length > 0) {
        this.builder.insertLabel(handleLabel);
        for (var i = 0; i < handleClauses.length; i++) {
            // the VM jumps past the handle clauses if there is no exception
            this.builder.insertLoadInstruction('VARIABLE', '$_exception_');
            this.builder.insertJumpInstruction(finishLabel, 'ON NONE');

            // the VM attempts to handle the exception
            this.builder.insertLoadInstruction('VARIABLE', '$_exception_');
            handleClauses[i].accept(this);
        }
    }

    // the VM ends up here after the main clause is done and any exceptions were handled
    if (this.builder.getClauseNumber() > 1) {
        this.builder.insertLabel(finishLabel);
        if (finishClause) {
            finishClause.accept(this);
        }
    }
};


// structure: '[' composite ']' parameters?
CompilerVisitor.prototype.visitStructure = function(tree) {
    // the VM places the value of the composite on top of the execution stack
    tree.children[0].accept(this);  // composite

    if (tree.children[1]) {
        // the VM places the value of the parameters on top of the execution stack
        tree.children[1].accept(this);  // parameters

        // the VM sets the parameters for the structure
        this.builder.insertInvokeInstruction('$setParameters', 2);
    }
};


// subcomponentExpression: expression indices
CompilerVisitor.prototype.visitSubcomponentExpression = function(tree) {
    // the VM places the value of the expression on top of the execution stack
    tree.children[0].accept(this);  // expression

    // the VM replaces the value on the execution stack with the parent and index of the subcomponent
    tree.children[1].accept(this);  // indices

    // the VM retrieves the value of the subcomponent at the given index of the parent component
    this.builder.insertInvokeInstruction('$getValue', 2);
    // the parent and index have been replaced by the value of the subcomponent
};


// table:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty table*/
CompilerVisitor.prototype.visitTable = function(tree) {
    // the VM places the size of the table on the execution stack
    var size = tree.children.length;
    this.builder.insertLoadInstruction('LITERAL', size);

    // the VM replaces the size value on the execution stack with a new table containing the associations
    this.builder.insertInvokeInstruction('$table', 1);
    for (var i = 0; i < tree.children.length; i++) {
        // the VM places the association's key and value onto the top of the execution stack
        tree.children[i].accept(this);  // association

        // the VM sets the key in the table to the value
        this.builder.insertInvokeInstruction('$setValue', 3);
    }
    // the table remains on the execution stack
};


// task: SHELL NEWLINE* procedure NEWLINE* EOF
CompilerVisitor.prototype.visitTask = function(tree) {
    throw new Error('COMPILER: A task script cannot be compiled, it must be interpreted.');
};


// throwClause: 'throw' expression
CompilerVisitor.prototype.visitThrowClause = function(tree) {
    // TODO: throw an exception if this is not the last statement in the parent block!!!

    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'ThrowStatement');

    // the VM stores the exception in a temporary variable
    tree.children[0].accept(this);  // exception expression
    this.builder.insertStoreInstruction('VARIABLE', '$_exception_');
};


// variable: IDENTIFIER
CompilerVisitor.prototype.visitVariable = function(terminal) {
    // the VM loads the value of the variable onto the top of the execution stack
    var variable = '$' + terminal.value;
    this.builder.insertLoadInstruction('VARIABLE', variable);
};


// waitClause: 'wait' 'for' symbol 'from' expression
CompilerVisitor.prototype.visitWaitClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WaitStatement');

    // the VM stores the reference to the queue in a temporary variable
    tree.children[1].accept(this);  // reference to queue
    var queue = this.createTemporaryVariable('queue');
    this.builder.insertStoreInstruction('VARIABLE', queue);

    // the VM BLOCKS until a message is available on the queue and places it on top of the execution stack
    this.builder.insertLoadInstruction('MESSAGE', queue);

    // the VM stores the message as the value of the variable
    var message = tree.children[0].value;
    this.builder.insertStoreInstruction('VARIABLE', message);
};


// whileClause: (label ':')? 'while' expression 'do' block
/*
 * This method utilizes a 'continueLoop' variable that can be set by the 'break from'
 * and 'continue to' statements as an additional way to tell the loop when it is done.
 * Although this may seem like a primitive way to implement the functionality it is
 * necessary to ensure that all 'finish with' handlers are called when prematurely
 * exiting a loop and its enclosing blocks.
 */
CompilerVisitor.prototype.visitWhileClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WhileStatement');
    var children = tree.children;
    var length = children.length;

    // construct the loop label
    var loopLabel = 'WhileCondition';  // default loop label
    if (children[0].type === types.LABEL) {
        loopLabel = children[0].value;
        loopLabel = loopLabel.charAt(0).toUpperCase() + loopLabel.slice(1);
    }
    var clausePrefix = this.builder.getClausePrefix();
    loopLabel = clausePrefix + loopLabel;

    // setup the compiler state for this loop with respect to 'continue' and 'break' statements
    this.builder.blocks.peek().loopLabel = loopLabel;
    var continueLoop = this.createContinueVariable(loopLabel);
    this.builder.insertLoadInstruction('LITERAL', 'true');
    this.builder.insertStoreInstruction('VARIABLE', continueLoop);

    // label the start of the loop
    this.builder.insertLabel(clausePrefix + loopLabel);

    // the VM places the value of the continue loop variable on top of the execution stack
    this.builder.insertLoadInstruction('VARIABLE', continueLoop);

    // the VM places the result of the boolean condition on top of the execution stack
    children[length - 2].accept(this);  // condition expression

    // the VM replaces the two boolean values on the execution stack with the logical AND of the values
    this.builder.insertInvokeInstruction('$and', 2);

    // if the condition is false or the continue flag is false, the VM jumps to the end
    var finishLabel = this.builder.blocks.peek().finishLabel;
    this.builder.insertJumpInstruction(finishLabel, 'ON FALSE');

    // if the condition is true, then the VM enters the block
    children[length - 1].accept(this);  // block

    // the VM jumps to the top of the loop
    this.builder.insertJumpInstruction(loopLabel);
};


// withClause: (label ':')? 'with' ('each' symbol 'in')? expression 'do' block
/*
 * This method utilizes a 'continueLoop' variable that can be set by the 'break from'
 * and 'continue to' statements as an additional way to tell the loop when it is done.
 * Although this may seem like a primitive way to implement the functionality it is
 * necessary to ensure that all 'finish with' handlers are called when prematurely
 * exiting a loop and its enclosing blocks.
 */
CompilerVisitor.prototype.visitWithClause = function(tree) {
    var statementPrefix = this.builder.getStatementPrefix();
    this.builder.insertLabel(statementPrefix + 'WithStatement');
    var children = tree.children;
    var length = children.length;

    // construct the loop label
    var loopLabel = 'WithItem';  // default loop label
    if (children[0].type === types.LABEL) {
        loopLabel = children[0].value;
        loopLabel = loopLabel.charAt(0).toUpperCase() + loopLabel.slice(1);
    }
    var clausePrefix = this.builder.getClausePrefix();
    loopLabel = clausePrefix + loopLabel;

    // construct the symbol
    var item;
    if (length > 2 && children[length - 3].type === types.SYMBOL) {
        item = children[length - 3].value;
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

    // setup the compiler state for this loop with respect to 'continue' and 'break' statements
    this.builder.blocks.peek().loopLabel = loopLabel;
    var continueLoop = this.createContinueVariable(loopLabel);
    this.builder.insertLoadInstruction('LITERAL', 'true');
    this.builder.insertStoreInstruction('VARIABLE', continueLoop);

    // label the start of the loop
    this.builder.insertLabel(clausePrefix + loopLabel);

    // the VM places the value of the continue loop variable on top of the execution stack
    this.builder.insertLoadInstruction('VARIABLE', continueLoop);

    // the VM places the iterator onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM replaces the iterator on the execution stack with the result of the hasNext check
    this.builder.insertInvokeInstruction('$hasNext', 1);

    // the VM replaces the two boolean values on the execution stack with the logical AND of the values
    this.builder.insertInvokeInstruction('$and', 2);

    // if the condition is false or the continue flag is false, the VM jumps to the end
    var finishLabel = this.builder.blocks.peek().finishLabel;
    this.builder.insertJumpInstruction(finishLabel, 'ON FALSE');

    // the VM places the iterator back onto the execution stack
    this.builder.insertLoadInstruction('VARIABLE', iterator);

    // the VM replaces the iterator on the execution stack with the next item from the sequence
    this.builder.insertInvokeInstruction('$getNext', 1);

    // the VM stores the item that is on top of the execution stack in the variable
    this.builder.insertStoreInstruction('VARIABLE', item);

    // the VM executes the block using the item if needed
    children[length - 1].accept(this);  // block

    // the VM jumps to the top of the loop
    this.builder.insertJumpInstruction(loopLabel);
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
InstructionBuilder.prototype.insertJumpInstruction = function(label, context) {
    var instruction = 'JUMP TO ' + label;
    if (context) instruction += ' ' + context;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'load' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertLoadInstruction = function(type, value) {
    var instruction = 'LOAD ' + type;
    if (type === 'LITERAL') {
        instruction += ' `' + value + '`';
    } else {
        instruction += ' ' + value;
    }
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'store' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertStoreInstruction = function(type, value) {
    var instruction = 'STORE ' + type + ' ' + value;
    this.insertInstruction(instruction);
};


/*
 * This method inserts a 'invoke' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertInvokeInstruction = function(intrinsic, numberOfParameters) {
    var instruction = 'INVOKE INTRINSIC ' + intrinsic;
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
 * This method inserts a 'execute' instruction into the assembly source code.
 */
InstructionBuilder.prototype.insertExecuteInstruction = function(method, context) {
    var instruction = 'EXECUTE PROCEDURE ' + method;
    if (context) instruction += ' ' + context;
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
