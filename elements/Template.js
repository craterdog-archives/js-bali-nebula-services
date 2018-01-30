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
 * This element class captures the state and methods associated with an
 * template element.
 */


/**
 * This constructor creates a new template element.
 * 
 * @constructor
 * @param {string} value The value of the template element.
 * @returns {Template} The new template element.
 */
function Template(value) {
    if (!value) value = 'none';  // default value
    switch (value) {
        case 'none':
        case 'any':
            break;
        default:
            throw new Error('TEMPLATE: An invalid value was passed into the constructor: ' + value);
    }
    if (typeof Template.NONE !== 'undefined' && value === 'none') return Template.NONE;
    if (typeof Template.ANY !== 'undefined' && value === 'any') return Template.ANY;
    this.value = value;
    return this;
}
Template.prototype.constructor = Template;
exports.Template = Template;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {ObjectVisitor} visitor The visitor that wants to visit this element.
 */
Template.prototype.accept = function(visitor) {
    visitor.visitTemplate(this);
};


/**
 * This method returns the string value of the template type.
 * 
 * @returns {string} The string value of the template type.
 */
Template.prototype.toString = function() {
    return this.value;
};


// common constants
Template.NONE = new Template('none');
Template.ANY = new Template('any');
