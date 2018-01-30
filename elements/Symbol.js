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
 * This element class captures the state and methods associated with a
 * symbol element.
 */


/**
 * This constructor creates a new symbol element.
 * 
 * @param {string} value The value of the symbol.
 * @returns {Symbol} The new symbol element.
 */
function Symbol(value) {
    if (!value) {
        throw new Error('SYMBOL: A symbol cannot be null.');
    }
    if (!/^\$[a-zA-Z][0-9a-zA-Z]*$/g.test(value)) {
        throw new Error("SYMBOL: A symbol must begin with a '$' and contain at least one character and cannot contain white space: " + this.value);
    }
    this.value = value;
    return this;
}
Symbol.prototype.constructor = Symbol;
exports.Symbol = Symbol;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {ObjectVisitor} visitor The visitor that wants to visit this element.
 */
Symbol.prototype.accept = function(visitor) {
    visitor.visitSymbol(this);
};


/**
 * This method returns a string representation of the symbol element.
 * 
 * @returns {string} The string representation of the symbol element.
 */
Symbol.prototype.toString = function() {
    return this.value;
};


/**
 * This method returns the identifier part of the symbol element.
 * 
 * @returns {string} The the identifier part of the symbol element.
 */
Symbol.prototype.getIdentifier = function() {
    return this.value.substring(1);
};
