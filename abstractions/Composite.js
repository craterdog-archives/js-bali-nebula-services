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
 * This abstract class defines the invariant methods that all composite components must inherit.
 */


/**
 * The constructor for the Composite class.
 * 
 * @returns {Composite} The new composite component.
 */
function Composite() {
    return this;
}
Composite.prototype.constructor = Composite;
exports.Composite = Composite;


// PUBLIC METHODS

/**
 * This method returns whether or not this composite component is empty.
 * 
 * @returns {Boolean}
 */
Composite.prototype.isEmpty = function() {
    return this.getSize() === 0;
};


/**
 * This method returns a number that can be used as a hash value for this composite component.
 * 
 * @returns {Number}
 */
Composite.prototype.getHash = function() {
    var hash = 1;
    var iterator = this.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        hash = 31 * hash + item.getHash();
    }
    hash |= 0;  // truncate to 32 bits
    return hash;
};


/**
 * This method compares this composit component with another object for equality.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Boolean}
 */
Composite.prototype.equalTo = function(that) {
    if (that && this.prototype !== that.prototype) return false;
    if (this.getSize() !== that.getSize()) return false;
    var thisIterator = this.iterator();
    var thatIterator = that.iterator();
    while (thisIterator.hasNext()) {
        var thisItem = thisIterator.getNext();
        var thatItem = thatIterator.getNext();
        if (!thisItem.equalTo(thatItem)) return false;
    }
    return true;
};


/**
 * This method compares this composite component with another object using a
 * NaturalComparator.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Number} -1 if this < that; 0 if this === that; and 1 if this > that
 */
Composite.prototype.compareTo = function(that) {
    if (that === null) return 1;
    if (this === that) return 0;  // same object
    var result = 0;
    var thisIterator = this.iterator();
    var thatIterator = that.iterator();
    while (thisIterator.hasNext() && thatIterator.hasNext()) {
        var thisItem = thisIterator.getNext();
        var thatItem = thatIterator.getNext();
        result = thisItem.compareTo(thatItem);
        if (result !== 0) break;
    }
    if (result === 0) {
        // same so far, check for different lengths
        if (this.getSize() < that.getSize()) {
            return -1;
        } else if (this.getSize() > that.getSize()) {
            return 1;
        }
    }
    return result;
};
