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
 * This class defines a block of code that can be executed on the Bali Virtual Machine™.
 */


/**
 * This function creates a new block of code.
 * 
 * @param {String} source The source string for the code.
 * @returns {Code} The new block of code.
 */
exports.fromSource = function(source) {
    var code = new Code(source);
    return code;
};


function Code(source) {
    this.source = source;
    return this;
}
Code.prototype.constructor = Code;


Code.prototype.accept = function(visitor) {
    visitor.visitCode(this);
};


Code.prototype.toString = function() {
    var string = this.toBali();
    return string;
};


Code.prototype.toBali = function(padding) {
    padding = padding ? padding : '';
    var source = this.source;
    if (padding) {
        source = source.replace(/\n/g, '\n' + padding);
    }
    return source;
};

