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
 * This library provides functions that generate a Bali Virtual Machine™
 * task context from its associated Bali parse tree.
 */
var documents = require('bali-document-notation/BaliDocuments');
var types = require('bali-document-notation/nodes/Types');
var elements = require('../elements/');
var collections = require('../collections/');
var TaskContext = require('../bvm/TaskContext');
var ProcedureContext = require('../bvm/ProcedureContext');


/**
 * This function takes a Bali parse tree and uses it to generate a
 * corresponding Bali Virtual Machine™ task context.
 * 
 * @param {Document} document The Bali parse tree for the task context.
 * @returns {Object} The generated task context.
 */
exports.generateTaskContext = function(document) {
    var visitor = new TreeVisitor();
    document.accept(visitor);
    var taskContext = visitor.result;
    return taskContext;
};


// PRIVATE CLASSES

function TreeVisitor() {
    return this;
}
TreeVisitor.prototype.constructor = TreeVisitor;


// association: component ':' expression
TreeVisitor.prototype.visitAssociation = function(tree) {
    tree.children[0].accept(this);
    var key = this.result;
    tree.children[1].accept(this);
    var value = this.result;
    var association = new collections.Association(key, value);
    this.result = association;
};


// catalog:
//     association (',' association)* |
//     NEWLINE (association NEWLINE)* |
//     ':' /*empty catalog*/
TreeVisitor.prototype.visitCatalog = function(tree) {
    var catalog = new collections.Catalog();
    var associations = tree.children;
    for (var i = 0; i < associations.length; i++) {
        associations[i].accept(this);
        var association = this.result;
        catalog.addItem(association);
    }
    this.result = catalog;
};


// code: '{' procedure '}'
TreeVisitor.prototype.visitCode = function(tree) {
    var source = documents.formatParseTree(tree.children[0]);
    var code = new elements.Code(source);
    this.result = code;
};


// component: object parameters?
TreeVisitor.prototype.visitComponent = function(tree) {
    tree.children[0].accept(this);
    var object = this.result;
    if (tree.children[1]) {
        tree.children[1].accept(this);
        var parameters = this.result;
        object.parameters = parameters;
        if (tree.children[0].type === types.STRUCTURE) {
            object = this.replaceCollectionType(object);
        }
    }
    this.result = object;
};


TreeVisitor.prototype.replaceCollectionType = function(collection) {
    // extract the collection type from the parameters
    var parameters = collection.parameters;
    var type = parameters.constructor.name;
    switch (type) {
        case 'List':
            type = parameters.getItem(1).toString();
            break;
        case 'Catalog':
            var key = new elements.Symbol('$type');
            type = parameters.getValue(key).toString();
            break;
        default:
            throw new Error('Found an illegal parameters class type: ' + type);
    }
    // evaluate the parameterized collection type
    switch (type) {
        case '<bali:/?name=bali/types/collections/Set>':
            collection = new collections.Set(collection);
            break;
        case '<bali:/?name=bali/types/collections/Stack>':
            collection = new collections.Stack(collection);
            break;
        case '<bali:/?name=bali/types/vm/TaskContext>':
            collection = TaskContext.fromCatalog(collection);
            break;
        case '<bali:/?name=bali/types/vm/ProcedureContext>':
            collection = ProcedureContext.fromCatalog(collection);
            break;
        default:
            throw new Error('Found an illegal collection type in the parameter list: ' + type);
    }
    return collection;
};


// document: NEWLINE* (reference NEWLINE)? body (NEWLINE seal)* NEWLINE* EOF
TreeVisitor.prototype.visitDocument = function(document) {
    // we only care about the body of the document
    document.body.accept(this);
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
TreeVisitor.prototype.visitElement = function(terminal) {
    switch (terminal.type) {
        case types.ANGLE:
            this.result = new elements.Angle(terminal.value);
            break;
        case types.BINARY:
            this.result = new elements.Binary(terminal.value);
            break;
        case types.DURATION:
            this.result = new elements.Duration(terminal.value);
            break;
        case types.MOMENT:
            this.result = new elements.Moment(terminal.value);
            break;
        case types.NUMBER:
            this.result = new elements.Complex(terminal.value);
            break;
        case types.PERCENT:
            this.result = new elements.Percent(terminal.value);
            break;
        case types.PROBABILITY:
            this.result = new elements.Probability(terminal.value);
            break;
        case types.REFERENCE:
            this.result = new elements.Reference(terminal.value);
            break;
        case types.SYMBOL:
            this.result = new elements.Symbol(terminal.value);
            break;
        case types.TAG:
            this.result = new elements.Tag(terminal.value);
            break;
        case types.TEMPLATE:
            this.result = new elements.Template(terminal.value);
            break;
        case types.TEXT:
            this.result = new elements.Text(terminal.value);
            break;
        case types.VERSION:
            this.result = new elements.Version(terminal.value);
            break;
        default:
            throw new Error('Found an illegal terminal type: ' + terminal.type);
    }
};


// list:
//     expression (',' expression)* |
//     NEWLINE (expression NEWLINE)* |
//     /*empty list*/
TreeVisitor.prototype.visitList = function(tree) {
    var list = new collections.List();
    var items = tree.children;
    for (var i = 0; i < items.length; i++) {
        items[i].accept(this);
        var item = this.result;
        list.addItem(item);
    }
    this.result = list;
};


// parameters: '(' collection ')'
TreeVisitor.prototype.visitParameters = function(tree) {
    tree.children[0].accept(this);
};


// range: expression '..' expression
TreeVisitor.prototype.visitRange = function(tree) {
    tree.children[0].accept(this);
    var first = this.result;
    tree.children[1].accept(this);
    var last = this.result;
    var range = new collections.Range(first, last);
    this.result = range;
};


// seal: reference binary
TreeVisitor.prototype.visitSeal = function(tree) {
    tree.children[0].accept(this);
    tree.children[1].accept(this);
};


// structure: '[' collection ']'
TreeVisitor.prototype.visitStructure = function(tree) {
    tree.children[0].accept(this);
};
