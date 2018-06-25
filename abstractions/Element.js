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
 * This abstract class defines the invariant methods that all element components must inherit.
 */


/**
 * The constructor for the Element class.
 * 
 * @returns {Element} The new element component.
 */
function Element() {
    return this;
}
Element.prototype.constructor = Element;
exports.Element = Element;


// PUBLIC METHODS

/**
 * This method returns a number that can be used as a hash value for this element.
 * 
 * @returns {Number}
 */
Element.prototype.getHash = function() {
    var string = this.toString();
    var hash = 0;
    if (string.length === 0) return hash;
    for (var i = 0; i < string.length; i++) {
        var character = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash |= 0;  // truncate to 32 bits
    }
    return hash;
};


/**
 * This method compares this composit component with another object for equality.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Boolean}
 */
Element.prototype.equalTo = function(that) {
    if (that && this.constructor.name !== that.constructor.name) return false;
    var thisString = this.toString();
    var thatString = that.toString();
    return thisString === thatString;
};


/**
 * This method compares this element component with another object using a
 * NaturalComparator.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Number} -1 if this < that; 0 if this === that; and 1 if this > that
 */
Element.prototype.compareTo = function(that) {
    // everything is greater than null
    if (that === undefined || that === null) return 1;

    // compare types
    var thisType = this.constructor.name;
    var thatType = that.constructor.name;
    if (thisType !== thatType) return thisType.localeCompare(thatType);

    // compare values
    return this.comparedWith(that);
};
