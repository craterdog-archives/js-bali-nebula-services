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
 * task context into its corresponding Bali parse tree structure.
 */
var documents = require('bali-document-notation/BaliDocuments');
var Document = require('bali-document-notation/nodes/Document').Document;
var Tree = require('bali-document-notation/nodes/Tree').Tree;
var Terminal = require('bali-document-notation/nodes/Terminal').Terminal;
var types = require('bali-document-notation/nodes/Types');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var utilities = require('../utilities/BytecodeUtilities');


/**
 * This function takes a Bali Virtual Machine™ task context and
 * transforms it into its corresponding Bali parse tree.
 * 
 * @param {Object} context The task context to be transformed.
 * @returns {Document} The corresponding parse tree structure.
 */
exports.generateParseTree = function(context) {
    var visitor = new ContextVisitor();
    context.accept(visitor);
    var body = visitor.result;
    // must turn it into a document
    var document = new Document(types.DOCUMENT, body);
    return document;
};


// PRIVATE CLASSES

function ContextVisitor() {
    return this;
}
ContextVisitor.prototype.constructor = ContextVisitor;


ContextVisitor.prototype.visitAngle = function(angle) {
    this.result = new Terminal(types.ANGLE, angle.toString());
};


ContextVisitor.prototype.visitBinary = function(binary) {
    this.result = new Terminal(types.BINARY, binary.toString());
};


ContextVisitor.prototype.visitDuration = function(duration) {
    this.result = new Terminal(types.DURATION, duration.toString());
};


ContextVisitor.prototype.visitMoment = function(moment) {
    this.result = new Terminal(types.MOMENT, moment.toString());
};


ContextVisitor.prototype.visitNumber = function(number) {
    this.result = new Terminal(types.NUMBER, number.toString());
};


ContextVisitor.prototype.visitPercent = function(percent) {
    this.result = new Terminal(types.PERCENT, percent.toString());
};


ContextVisitor.prototype.visitProbability = function(probability) {
    this.result = new Terminal(types.PROBABILITY, probability.toString());
};


ContextVisitor.prototype.visitReference = function(reference) {
    this.result = new Terminal(types.REFERENCE, reference.toString());
};


ContextVisitor.prototype.visitSymbol = function(symbol) {
    this.result = new Terminal(types.SYMBOL, symbol.toString());
};


ContextVisitor.prototype.visitTag = function(tag) {
    this.result = new Terminal(types.TAG, tag.toString());
};


ContextVisitor.prototype.visitTemplate = function(template) {
    this.result = new Terminal(types.TEMPLATE, template.toString());
};


ContextVisitor.prototype.visitText = function(text) {
    this.result = new Terminal(types.TEXT, text.toString());
};


ContextVisitor.prototype.visitVersion = function(version) {
    this.result = new Terminal(types.VERSION, version.toString());
};


ContextVisitor.prototype.visitAssociation = function(association) {
    var tree = new Tree(types.ASSOCIATION);
    association.key.accept(this);
    tree.addChild(this.result);
    association.value.accept(this);
    tree.addChild(this.result);
    this.result = tree;
};


ContextVisitor.prototype.visitCatalog = function(catalog) {
    var tree = new Tree(types.CATALOG);
    var iterator = catalog.iterator();
    while (iterator.hasNext()) {
        var association = iterator.getNext();
        association.accept(this);
        tree.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitList = function(list) {
    var tree = new Tree(types.LIST);
    var iterator = list.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitRange = function(range) {
    var tree = new Tree(types.RANGE);
    var first = range.getFirst();
    var last = range.getLast();
    first.accept(this);
    tree.addChild(this.result);
    last.accept(this);
    tree.addChild(this.result);
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


ContextVisitor.prototype.visitSet = function(set) {
    var tree = new Tree(types.LIST);
    var iterator = set.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = documents.parseParameters('($type: <bali:/?name=bali/types/collections/Set>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitStack = function(stack) {
    var tree = new Tree(types.LIST);
    var iterator = stack.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        tree.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = documents.parseParameters('($type: <bali:/?name=bali/types/collections/Stack>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitTaskContext = function(context) {
    var catalog = new Tree(types.CATALOG);

    // generate the task tag attribute
    var association = new Tree(types.ASSOCIATION);
    var symbol = new Terminal(types.TAG, '$taskTag');
    association.addChild(symbol);
    context.taskTag.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the account tag attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.TAG, '$accountTag');
    association.addChild(symbol);
    context.accountTag.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the account balance attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$accountBalance');
    association.addChild(symbol);
    var value = new Terminal(types.NUMBER, context.accountBalance);
    association.addChild(value);
    catalog.addChild(association);

    // generate the processor status attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$processorStatus');
    association.addChild(symbol);
    context.processorStatus.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the clock cycles attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$clockCycles');
    association.addChild(symbol);
    value = new Terminal(types.NUMBER, context.clockCycles);
    association.addChild(value);
    catalog.addChild(association);

    // generate the component stack
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$componentStack');
    association.addChild(symbol);
    context.componentStack.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the procedure stack
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$procedureStack');
    association.addChild(symbol);
    context.procedureStack.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the handler stack
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$handlerStack');
    association.addChild(symbol);
    context.handlerStack.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the parameters
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(catalog);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = documents.parseParameters('($type: <bali:/?name=bali/types/vm/TaskContext>)');
    component.addChild(parameters);
    this.result = component;
};


ContextVisitor.prototype.visitProcedureContext = function(context) {
    var tree = new Tree(types.CATALOG);

    // generate the target attribute
    var association = new Tree(types.ASSOCIATION);
    var symbol = new Terminal(types.SYMBOL, '$target');
    association.addChild(symbol);
    context.target.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the type attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$type');
    association.addChild(symbol);
    context.type.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the procedure attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$procedure');
    association.addChild(symbol);
    context.procedure.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the literals attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$literals');
    association.addChild(symbol);
    context.literals.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the parameters attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$parameters');
    association.addChild(symbol);
    context.parameters.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the variables attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$variables');
    association.addChild(symbol);
    context.variables.accept(this);
    association.addChild(this.result);
    tree.addChild(association);

    // generate the bytecode attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$bytecode');
    association.addChild(symbol);
    var bytes = utilities.bytecodeToBytes(context.bytecode);
    var base16 = codex.base16Encode(bytes, '                ');
    var bytecode = documents.parseExpression("'" + base16 + "'" + '($mediatype: "application/bcod")');
    association.addChild(bytecode);
    tree.addChild(association);

    // generate the address attribute
    association = new Tree(types.ASSOCIATION);
    symbol = new Terminal(types.SYMBOL, '$address');
    association.addChild(symbol);
    var value = new Terminal(types.NUMBER, context.address);
    association.addChild(value);
    tree.addChild(association);

    // generate the parameters
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(tree);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = documents.parseParameters('($type: <bali:/?name=bali/types/vm/ProcedureContext>)');
    component.addChild(parameters);
    this.result = component;
};
