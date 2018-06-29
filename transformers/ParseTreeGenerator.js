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
 * This library provides functions that transform a Bali Virtual Machine™
 * task context into its corresponding parse tree structure.
 */
var language = require('bali-language/BaliLanguage');
var syntax = require('bali-language/syntax');
var types = require('bali-language/syntax/NodeTypes');
var elements = require('../elements');
var codex = require('../utilities/EncodingUtilities');


/**
 * This function takes a Bali Virtual Machine™ task context and
 * transforms it into its corresponding Bali parse tree.
 * 
 * @param {Object} context The task context to be transformed.
 * @returns {DocumentContext} The corresponding parse tree structure.
 */
exports.generateParseTree = function(context) {
    var visitor = new ContextVisitor();
    context.accept(visitor);
    var parseTree = visitor.result;
    return parseTree;
};


// PRIVATE CLASSES

function ContextVisitor() {
    return this;
}
ContextVisitor.prototype.constructor = ContextVisitor;


/*
ContextVisitor.prototype.visitAngle = function(angle) {
    this.result = new syntax.TerminalNode(types.ANGLE, angle.toString());
};
*/


ContextVisitor.prototype.visitBinary = function(binary) {
    this.result = new syntax.TerminalNode(types.BINARY, binary.toString());
};


ContextVisitor.prototype.visitDuration = function(duration) {
    this.result = new syntax.TerminalNode(types.DURATION, duration.toString());
};


ContextVisitor.prototype.visitMoment = function(moment) {
    this.result = new syntax.TerminalNode(types.MOMENT, moment.toString());
};


ContextVisitor.prototype.visitNumber = function(number) {
    this.result = new syntax.TerminalNode(types.NUMBER, number.toString());
};


ContextVisitor.prototype.visitPercent = function(percent) {
    this.result = new syntax.TerminalNode(types.PERCENT, percent.toString());
};


ContextVisitor.prototype.visitProbability = function(probability) {
    this.result = new syntax.TerminalNode(types.PROBABILITY, probability.toString());
};


ContextVisitor.prototype.visitReference = function(reference) {
    this.result = new syntax.TerminalNode(types.REFERENCE, reference.toString());
};


ContextVisitor.prototype.visitSymbol = function(symbol) {
    this.result = new syntax.TerminalNode(types.SYMBOL, symbol.toString());
};


ContextVisitor.prototype.visitTag = function(tag) {
    this.result = new syntax.TerminalNode(types.TAG, tag.toString());
};


ContextVisitor.prototype.visitTemplate = function(template) {
    this.result = new syntax.TerminalNode(types.TEMPLATE, template.toString());
};


ContextVisitor.prototype.visitText = function(text) {
    this.result = new syntax.TerminalNode(types.TEXT, text.toString());
};


ContextVisitor.prototype.visitVersion = function(version) {
    this.result = new syntax.TerminalNode(types.VERSION, version.toString());
};


ContextVisitor.prototype.visitAssociation = function(association) {
    var tree = new syntax.TreeNode(types.ASSOCIATION);
    association.key.accept(this);
    tree.addChild(this.result);
    association.value.accept(this);
    tree.addChild(this.result);
    this.result = tree;
};


ContextVisitor.prototype.visitCatalog = function(catalog) {
    var tree = new syntax.TreeNode(types.CATALOG);
    var iterator = catalog.iterator();
    while (iterator.hasNext()) {
        var association = iterator.getNext();
        association.accept(this);
        tree.addChild(this.result);
    }
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitList = function(list) {
    var tree = new syntax.TreeNode(types.LIST);
    var iterator = list.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitRange = function(range) {
    var tree = new syntax.TreeNode(types.RANGE);
    var first = range.getFirst();
    var last = range.getLast();
    first.accept(this);
    tree.addChild(this.result);
    last.accept(this);
    tree.addChild(this.result);
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitSet = function(set) {
    var tree = new syntax.TreeNode(types.LIST);
    var iterator = set.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    var parameters = language.parseParameters('($type: <bali:/?name=bali/types/collections/Set>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitStack = function(stack) {
    var tree = new syntax.TreeNode(types.LIST);
    var iterator = stack.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    var parameters = language.parseParameters('($type: <bali:/?name=bali/types/collections/Stack>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitTaskContext = function(context) {
    var tree = new syntax.TreeNode(types.CATALOG);

    // generate the status attribute
    var association = new syntax.TreeNode(types.ASSOCIATION);
    var symbol = new syntax.TerminalNode(types.SYMBOL, '$status');
    association.addChild(symbol);
    context.status.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the clock attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$clock');
    association.addChild(symbol);
    var value = new syntax.TerminalNode(types.NUMBER, context.clock);
    association.addChild(value);
    tree.addChild(association);

    // generate the stepping attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$stepping');
    association.addChild(symbol);
    value = new syntax.TerminalNode(types.PROBABILITY, context.stepping);
    association.addChild(value);
    tree.addChild(association);

    // generate the component stack
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$components');
    association.addChild(symbol);
    context.components.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the procedure stack
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$procedures');
    association.addChild(symbol);
    context.procedures.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the handler stack
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$handlers');
    association.addChild(symbol);
    context.handlers.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the parameters
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    var parameters = language.parseParameters('($type: <bali:/?name=bali/types/vm/TaskContext>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitProcedureContext = function(context) {
    var tree = new syntax.TreeNode(types.CATALOG);

    // generate the target attribute
    var association = new syntax.TreeNode(types.ASSOCIATION);
    var symbol = new syntax.TerminalNode(types.SYMBOL, '$target');
    association.addChild(symbol);
    context.target.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the type attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$type');
    association.addChild(symbol);
    context.type.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the procedure attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$procedure');
    association.addChild(symbol);
    context.procedure.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the parameters attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$parameters');
    association.addChild(symbol);
    context.parameters.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the literals attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$literals');
    association.addChild(symbol);
    context.literals.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the variables attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$variables');
    association.addChild(symbol);
    context.variables.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the bytecode attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$bytecode');
    association.addChild(symbol);
    var bytes = "";
    for (var i = 0; i < context.bytecode.length; i++) {
        bytes += codex.shortToBytes(context.bytecode[i]);
    }
    var binary = codex.base16Encode(bytes, '                ');
    var bytecode = language.parseExpression("'" + binary + "'" + '($mediatype: "application/bcod")');
    association.addChild(bytecode);
    tree.addChild(association);

    // generate the address attribute
    association = new syntax.TreeNode(types.ASSOCIATION);
    symbol = new syntax.TerminalNode(types.SYMBOL, '$address');
    association.addChild(symbol);
    var value = new syntax.TerminalNode(types.NUMBER, context.address);
    association.addChild(value);
    tree.addChild(association);

    // generate the parameters
    var structure = new syntax.TreeNode(types.STRUCTURE);
    structure.addChild(tree);
    var component = new syntax.TreeNode(types.COMPONENT);
    component.addChild(structure);
    var parameters = language.parseParameters('($type: <bali:/?name=bali/types/vm/ProcedureContext>)');
    component.addChild(parameters);
    this.result = component;
};
