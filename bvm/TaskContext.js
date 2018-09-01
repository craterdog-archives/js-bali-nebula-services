/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

/*
 * This class defines the context for a task that is being executed by the
 * the Bali Virtual Machine™.
 */
var BaliDocument = require('bali-document-notation/BaliDocument');
var Tree = require('bali-document-notation/nodes/Tree').Tree;
var Terminal = require('bali-document-notation/nodes/Terminal').Terminal;
var types = require('bali-document-notation/nodes/Types');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var parser = require('bali-document-notation/transformers/DocumentParser');
var bytecode = require('../utilities/BytecodeUtilities');
var elements = require('bali-element-types/elements');
var collections = require('bali-collection-types/collections');


// machine states
exports.ACTIVE = '$active';
exports.WAITING = '$waiting';
exports.DONE = '$done';


/**
 * This function creates a new task context that is not initialized.
 * 
 * @returns {TaskContext} The new task context.
 */
exports.fromScratch = function() {
    var taskContext = new TaskContext();
    return taskContext;
};


/**
 * This function creates a new task context from a Bali document containing its definition.
 * 
 * @param {BaliDocument} document The Bali document defining the task context.
 * @returns {TaskContext} The corresponding task context.
 */
exports.fromDocument = function(document) {
    var visitor = new TaskImporter();
    document.accept(visitor);
    var taskContext = visitor.result;
    return taskContext;
};


// TASK CONTEXT

function TaskContext() {
    this.taskTag = codex.randomTag();
    this.accountTag = undefined;
    this.accountBalance = 0;
    this.processorStatus = exports.ACTIVE;
    this.clockCycles = 0;
    this.componentStack = [];
    this.procedureStack = [];
    this.handlerStack = [];
    return this;
}
TaskContext.prototype.constructor = TaskContext;


TaskContext.prototype.accept = function(visitor) {
    visitor.visitTaskContext(this);
};


TaskContext.prototype.toString = function() {
    var visitor = new TaskExporter();
    this.accept(visitor);
    var document = visitor.result;
    var string = document.toString();
    return string;
};


// PROCEDURE CONTEXT

function ProcedureContext() {
    this.targetComponent = undefined;
    this.typeReference = undefined;
    this.procedureName = undefined;
    this.parameterValues = [];
    this.literalValues = [];
    this.variableValues = [];
    this.bytecodeInstructions = [];
    this.currentInstruction = 0;  // SKIP INSTRUCTION
    this.nextAddress = 1;
    return this;
}
ProcedureContext.prototype.constructor = ProcedureContext;
exports.ProcedureContext = ProcedureContext;


ProcedureContext.prototype.accept = function(visitor) {
    visitor.visitProcedureContext(this);
};


// CODE

function Code(source) {
    this.source = source;
    return this;
}
Code.prototype.constructor = Code;
exports.Code = Code;


Code.prototype.toString = function() {
    return this.source;
};


Code.prototype.accept = function(visitor) {
    visitor.visitCode(this);
};


/*
 * The task importer is a visitor that walks a Bali document parse tree defining a
 * task context and generates the corresponding javascript task context structure.
 */
function TaskImporter() {
    return this;
}
TaskImporter.prototype.constructor = TaskImporter;


// association: component ':' expression
TaskImporter.prototype.visitAssociation = function(tree) {
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
TaskImporter.prototype.visitCatalog = function(tree) {
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
TaskImporter.prototype.visitCode = function(tree) {
    var source = tree.toString();
    var code = new Code(source);
    this.result = code;
};


// component: object parameters?
TaskImporter.prototype.visitComponent = function(tree) {
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


TaskImporter.prototype.replaceCollectionType = function(collection) {
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
        case 'Set':
            collection = new collections.Set(collection);
            break;
        case 'Stack':
            collection = new collections.Stack(collection);
            break;
        case 'TaskContext':
            collection = new TaskContext(collection);
            break;
        case 'ProcedureContext':
            collection = new ProcedureContext(collection);
            break;
        default:
            throw new Error('Found an illegal collection type in the parameter list: ' + type);
    }
    return collection;
};


// document: NEWLINE* (reference NEWLINE)? content (NEWLINE seal)* NEWLINE* EOF
TaskImporter.prototype.visitDocument = function(tree) {
    this.visitTaskContext(tree.documentContent);
};


TaskImporter.prototype.visitTaskContext = function(tree) {
    var taskContext = new TaskContext();
    taskContext.taskTag = tree.getValue('$taskTag').element().toString();
    taskContext.accountTag = tree.getValue('$accountTag').element().toString();
    taskContext.accountBalance = Number(tree.getValue('$accountBalance').element().toString());
    taskContext.processorStatus = tree.getValue('$processorStatus').element().toString();
    taskContext.clockCycles = Number(tree.getValue('$clockCycles').element().toString());

    var componentStack = [];
    var iterator = tree.getValue('$componentStack').iterator();
    while (iterator.hasNext()) {
        var component = iterator.getNext();
        component.accept(this);
        componentStack.push(this.result);
    }
    taskContext.componentStack = componentStack;

    var handlerStack = [];
    iterator = tree.getValue('$handlerStack').iterator();
    while (iterator.hasNext()) {
        var handler = iterator.getNext();
        var address = Number(handler.element().toString());
        handlerStack.push(address);
    }
    taskContext.handlerStack = handlerStack;

    var procedureStack = [];
    iterator = tree.getValue('$procedureStack').iterator();
    while (iterator.hasNext()) {
        var procedure = iterator.getNext();
        this.visitProcedureContext(procedure);
        procedureStack.push(this.result);
    }
    taskContext.procedureStack = procedureStack;

    this.result = taskContext;
};


TaskImporter.prototype.visitProcedureContext = function(tree) {
    var procedureContext = new ProcedureContext();

    var targetComponent = tree.getValue('$targetComponent');
    targetComponent.accept(this);
    procedureContext.targetComponent = this.result;

    procedureContext.typeReference = tree.getValue('$typeReference').element().toString();
    procedureContext.procedureName = tree.getValue('$procedureName').element().toString();

    var parameterValues = [];
    var iterator = tree.getValue('$parameterValues').iterator();
    while (iterator.hasNext()) {
        var parameter = iterator.getNext();
        parameter.accept(this);
        parameterValues.push(this.result);
    }
    procedureContext.parameterValues = parameterValues;

    var literalValues = [];
    iterator = tree.getValue('$literalValues').iterator();
    while (iterator.hasNext()) {
        var literal = iterator.getNext();
        literal.accept(this);
        literalValues.push(this.result);
    }
    procedureContext.literalValues = literalValues;

    var variableValues = [];
    iterator = tree.getValue('$variableValues').iterator();
    while (iterator.hasNext()) {
        var variable = iterator.getNext();
        variable.accept(this);
        variableValues.push(this.result);
    }
    procedureContext.variableValues = variableValues;

    var bytecodeInstructions = tree.getValue('$bytecodeInstructions').element().toString().slice(1, -1);
    procedureContext.bytecodeInstructions = bytecode.base16ToBytecode(bytecodeInstructions);

    procedureContext.currentInstruction = Number(tree.getValue('$currentInstruction').element().toString());
    procedureContext.nextAddress = Number(tree.getValue('$nextAddress').element().toString());

    this.result = procedureContext;
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
TaskImporter.prototype.visitElement = function(terminal) {
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
TaskImporter.prototype.visitList = function(tree) {
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
TaskImporter.prototype.visitParameters = function(tree) {
    tree.children[0].accept(this);
};


// range: expression '..' expression
TaskImporter.prototype.visitRange = function(tree) {
    tree.children[0].accept(this);
    var first = this.result;
    tree.children[1].accept(this);
    var last = this.result;
    var range = new collections.Range(first, last);
    this.result = range;
};


// structure: '[' collection ']'
TaskImporter.prototype.visitStructure = function(tree) {
    tree.children[0].accept(this);
};


// variable: IDENTIFIER
TaskImporter.prototype.visitVariable = function(terminal) {
    this.result = terminal.value;
};


/*
 * The task exporter is a visitor that walks a javascript task context structure and
 * generates the corresponding Bali document parse tree.
 */
function TaskExporter() {
    return this;
}
TaskExporter.prototype.constructor = TaskExporter;


TaskExporter.prototype.visitAngle = function(angle) {
    var element = new Terminal(types.ANGLE, angle.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitBinary = function(binary) {
    var element = new Terminal(types.BINARY, binary.toString());
    if (element.value.length > 82) element.isSimple = false;  // binaries are formatted in 80 character blocks
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitDuration = function(duration) {
    var element = new Terminal(types.DURATION, duration.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitMoment = function(moment) {
    var element = new Terminal(types.MOMENT, moment.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitNumber = function(number) {
    var element = new Terminal(types.NUMBER, number.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitPercent = function(percent) {
    var element = new Terminal(types.PERCENT, percent.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitProbability = function(probability) {
    var element = new Terminal(types.PROBABILITY, probability.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitReference = function(reference) {
    var element = new Terminal(types.REFERENCE, reference.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitSymbol = function(symbol) {
    var element = new Terminal(types.SYMBOL, symbol.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitTag = function(tag) {
    var element = new Terminal(types.TAG, tag.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitTemplate = function(template) {
    var element = new Terminal(types.TEMPLATE, template.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitText = function(text) {
    var element = new Terminal(types.TEXT, text.toString());
    if (element.value.startsWith('"\n')) element.isSimple = false;
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitVersion = function(version) {
    var element = new Terminal(types.VERSION, version.toString());
    var component = new Tree(types.COMPONENT);
    component.addChild(element);
    this.result = component;
};


TaskExporter.prototype.visitAssociation = function(association) {
    var tree = new Tree(types.ASSOCIATION);
    association.key.accept(this);
    tree.addChild(this.result);
    association.value.accept(this);
    tree.addChild(this.result);
    this.result = tree;
};


TaskExporter.prototype.visitCatalog = function(catalog) {
    var collection = new Tree(types.CATALOG);
    var iterator = catalog.iterator();
    while (iterator.hasNext()) {
        var association = iterator.getNext();
        association.accept(this);
        collection.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(collection);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


TaskExporter.prototype.visitList = function(list) {
    var collection = new Tree(types.LIST);
    var iterator = list.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        collection.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(collection);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


TaskExporter.prototype.visitRange = function(range) {
    var collection = new Tree(types.RANGE);
    var first = range.getFirst();
    var last = range.getLast();
    first.accept(this);
    collection.addChild(this.result);
    last.accept(this);
    collection.addChild(this.result);
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(collection);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    this.result = component;
};


TaskExporter.prototype.visitSet = function(set) {
    var collection = new Tree(types.LIST);
    var iterator = set.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        collection.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(collection);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = parser.parseParameters('($type: Set)');
    component.addChild(parameters);
    this.result = component;
};


TaskExporter.prototype.visitStack = function(stack) {
    var collection = new Tree(types.LIST);
    var iterator = stack.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        item.accept(this);
        collection.addChild(this.result);
    }
    var structure = new Tree(types.STRUCTURE);
    structure.addChild(collection);
    var component = new Tree(types.COMPONENT);
    component.addChild(structure);
    var parameters = parser.parseParameters('($type: Stack)');
    component.addChild(parameters);
    this.result = component;
};


TaskExporter.prototype.visitTaskContext = function(taskContext) {
    // generate the parameterized component
    var component = new Tree(types.COMPONENT);
    var structure = new Tree(types.STRUCTURE);
    var catalog = new Tree(types.CATALOG);
    structure.addChild(catalog);
    component.addChild(structure);
    var parameters = parser.parseParameters('($type: TaskContext)');
    component.addChild(parameters);

    // generate the task tag attribute
    var association = new Tree(types.ASSOCIATION);
    var key = new Terminal(types.SYMBOL, '$taskTag');
    association.addChild(key);
    var value = new Terminal(types.TAG, taskContext.taskTag);
    association.addChild(value);
    catalog.addChild(association);

    // generate the account tag attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$accountTag');
    association.addChild(key);
    value = new Terminal(types.TAG, taskContext.accountTag);
    association.addChild(value);
    catalog.addChild(association);

    // generate the account balance attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$accountBalance');
    association.addChild(key);
    value = new Terminal(types.NUMBER, taskContext.accountBalance.toString());
    association.addChild(value);
    catalog.addChild(association);

    // generate the processor status attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$processorStatus');
    association.addChild(key);
    value = new Terminal(types.SYMBOL, taskContext.processorStatus);
    association.addChild(value);
    catalog.addChild(association);

    // generate the clock cycles attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$clockCycles');
    association.addChild(key);
    value = new Terminal(types.NUMBER, taskContext.clockCycles.toString());
    association.addChild(value);
    catalog.addChild(association);

    // generate the component stack
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$componentStack');
    association.addChild(key);
    this.visitArray(taskContext.componentStack);
    parameters = parser.parseParameters('($type: Stack)');
    this.result.addChild(parameters);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the handler stack
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$handlerStack');
    association.addChild(key);
    this.visitArray(taskContext.handlerStack);
    parameters = parser.parseParameters('($type: Stack)');
    this.result.addChild(parameters);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the procedure stack
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$procedureStack');
    association.addChild(key);
    this.visitArray(taskContext.procedureStack);
    parameters = parser.parseParameters('($type: Stack)');
    this.result.addChild(parameters);
    association.addChild(this.result);
    catalog.addChild(association);

    this.result = component;
};


TaskExporter.prototype.visitProcedureContext = function(procedureContext) {
    // generate the parameterized component
    var component = new Tree(types.COMPONENT);
    var structure = new Tree(types.STRUCTURE);
    var catalog = new Tree(types.CATALOG);
    structure.addChild(catalog);
    component.addChild(structure);
    var parameters = parser.parseParameters('($type: ProcedureContext)');
    component.addChild(parameters);

    // generate the target component attribute
    var association = new Tree(types.ASSOCIATION);
    var key = new Terminal(types.SYMBOL, '$targetComponent');
    association.addChild(key);
    procedureContext.targetComponent.accept(this);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the type reference attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$typeReference');
    association.addChild(key);
    var value = new Terminal(types.REFERENCE, procedureContext.typeReference);
    association.addChild(value);
    catalog.addChild(association);

    // generate the procedure name attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$procedureName');
    association.addChild(key);
    value = new Terminal(types.SYMBOL, procedureContext.procedureName);
    association.addChild(value);
    catalog.addChild(association);

    // generate the parameter values attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$parameterValues');
    association.addChild(key);
    this.visitArray(procedureContext.parameterValues);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the literal values attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$literalValues');
    association.addChild(key);
    this.visitArray(procedureContext.literalValues);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the variable values attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$variableValues');
    association.addChild(key);
    this.visitArray(procedureContext.variableValues);
    association.addChild(this.result);
    catalog.addChild(association);

    // generate the bytecode instructions attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$bytecodeInstructions');
    association.addChild(key);
    var base16 = bytecode.bytecodeToBase16(procedureContext.bytecodeInstructions);
    var bytecodeInstructions = parser.parseExpression("'" + base16 + "\n            '" + '($mediatype: "application/bcod")');
    association.addChild(bytecodeInstructions);
    catalog.addChild(association);

    // generate the current instruction attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$currentInstruction');
    association.addChild(key);
    value = new Terminal(types.NUMBER, procedureContext.currentInstruction.toString());
    association.addChild(value);
    catalog.addChild(association);

    // generate the next address attribute
    association = new Tree(types.ASSOCIATION);
    key = new Terminal(types.SYMBOL, '$nextAddress');
    association.addChild(key);
    value = new Terminal(types.NUMBER, procedureContext.nextAddress.toString());
    association.addChild(value);
    catalog.addChild(association);

    this.result = component;
};


TaskExporter.prototype.visitArray = function(array) {
    var component = new Tree(types.COMPONENT);
    var structure = new Tree(types.STRUCTURE);
    var list = new Tree(types.LIST);
    structure.addChild(list);
    component.addChild(structure);
    for (var i = 0; i < array.length; i++) {
        var item = array[i];
        switch (item.constructor.name) {
            case 'String':
                this.result = new Terminal(types.SYMBOL, item.toString());
                break;
            case 'Number':
                this.result = new Terminal(types.NUMBER, item.toString());
                break;
            default:
                item.accept(this);
        }
        list.addChild(this.result);
    }
    this.result = component;
};
