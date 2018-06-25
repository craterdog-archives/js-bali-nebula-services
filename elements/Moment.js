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
 * moment element.
 */
var abstractions = require('../abstractions/');
var moment = require('moment');
var FORMATS = [
    '<Y>',
    '<Y-MM>',
    '<Y-MM-DD>',
    '<Y-MM-DDTHH>',
    '<Y-MM-DDTHH:mm>',
    '<Y-MM-DDTHH:mm:ss>',
    '<Y-MM-DDTHH:mm:60>',  // HACK:JavaScript doesn't handle leap seconds
    '<Y-MM-DDTHH:mm:ss.SSS>',
    '<Y-MM-DDTHH:mm:60.SSS>'  // HACK:JavaScript doesn't handle leap seconds
];


/**
 * This constructor creates a new moment element.
 * 
 * @param {string} value The value of the moment.
 * @returns {Moment} The new moment element.
 */
function Moment(value) {
    abstractions.Element.call(this);
    if (value) {
        for (var i = 0; i < FORMATS.length; i++) {
            var attempt = moment(value, FORMATS[i], true);  // true means strict mode
            if (attempt.isValid()) {
                this.value = attempt;
                this.format = FORMATS[i];
                break;
            } 
        }
        if (!this.value) throw new Error('MOMENT: An invalid value was passed to the constructor: ' + value);
    } else {
        this.value = moment();  // use the current date and moment
        this.format = FORMATS[7];  // full date moment format
    }
    return this;
}
Moment.prototype = Object.create(abstractions.Element.prototype);
Moment.prototype.constructor = Moment;
exports.Moment = Moment;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {ObjectVisitor} visitor The visitor that wants to visit this element.
 */
Moment.prototype.accept = function(visitor) {
    visitor.visitMoment(this);
};


/**
 * This method compares two moments for ordering.
 * 
 * @param {Moment} that The other moment to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Moment.prototype.comparedWith = function(that) {
    if (this.value.isBefore(that.value)) return -1;
    if (this.value.isAfter(that.value)) return 1;
    return 0;
};


/**
 * This method returns a string representation of the moment element.
 * 
 * @returns {string} The string representation of the moment element.
 */
Moment.prototype.toString = function() {
    return this.value.format(this.format);
};
