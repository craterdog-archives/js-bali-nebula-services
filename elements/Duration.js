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
 * duration element.
 */
var abstractions = require('../abstractions/');
var duration = require('moment').duration;


/**
 * This constructor creates a new duration element.
 * 
 * @param {string} value The value of the duration.
 * @returns {Duration} The new duration element.
 */
function Duration(value) {
    abstractions.Element.call(this);
    if (value) {
        var raw = value.slice(1);  // remove leading '~'
        this.value = duration(raw);
    } else {
        this.value = duration('P0D');  // use a duration of zero
    }
    return this;
}
Duration.prototype = Object.create(abstractions.Element.prototype);
Duration.prototype.constructor = Duration;
exports.Duration = Duration;


/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this element.
 */
Duration.prototype.accept = function(visitor) {
    visitor.visitDuration(this);
};


/**
 * This method compares two durations for ordering.
 * 
 * @param {Duration} that The other duration to be compared with. 
 * @returns {Number} 1 if greater, 0 if equal, and -1 if less.
 */
Duration.prototype.comparedWith = function(that) {
    var thisMilliseconds = this.value.asMilliseconds();
    var thatMilliseconds = that.value.asMilliseconds();
    if (thisMilliseconds < thatMilliseconds) return -1;
    if (thisMilliseconds > thatMilliseconds) return 1;
    return 0;
};


/**
 * This method returns a string representation of the duration element.
 * 
 * @returns {string} The string representation of the duration element.
 */
Duration.prototype.toString = function() {
    return '~' + this.value.toISOString();
};
