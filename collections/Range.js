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
 * This collection class extracts a range of items from a collection data structure. It then
 * provides an iterator to iterate over the range of items. A range, once formed, remains
 * static.
 */
var abstractions = require('../abstractions/');


/**
 * The constructor for the range class takes a first and last item and an optional
 * collection as arguments. If no collection is provided the range is assumed to be
 * over the collection of all integers.
 * 
 * @param {Number} first The first item in the range.
 * @param {Number} last The last item in the range.
 * @param {Collection} optionalCollection The collection that the items belong to.
 */
function Range(first, last, optionalCollection) {
    abstractions.Composite.call(this);
    this.first = first;
    this.last = last;
    if (optionalCollection) {
        this.array = [];
        var iterator = optionalCollection.iterator();
        var inRange = false;
        while (iterator.hasNext()) {
            var item = iterator.getNext();
            if (item.equalTo(first)) inRange = true;
            if (inRange) this.array.push(item);
            if (item.equalTo(last)) {
                inRange = false;
                break;
            }
        }
    } else if (!Number.isInteger(first) || !Number.isInteger(last)) {
        throw new Error('A number range must have first and last items that are integers.');
    }
    return this;
}
Range.prototype = Object.create(abstractions.Composite.prototype);
Range.prototype.constructor = Range;
exports.Range = Range;


// PUBLIC METHODS

/**
/**
 * This method returns the number of items that are in the range.
 * 
 * @returns {Number}
 */
Range.prototype.getSize = function() {
    var size = this.array ? this.array.length : this.last - this.first + 1;
    return size;
};


/**
 * This method creates an iterator that can be used to iterate over the range.
 * 
 * @returns {Iterator}
 */
Range.prototype.iterator = function() {
    var iterator = new RangeIterator(this);
    return iterator;
};


// PRIVATE CLASSES

/**
 * The constructor for the RangeIterator class.
 * 
 * @param {Range} range The range to be iterated over.
 * @returns {RangeIterator} The new range iterator.
 */
function RangeIterator(range) {
    this.slot = 0;  // the slot before the first item
    this.size = range.getSize();  // static so we can cache it here
    this.range = range;
    return this;
}
RangeIterator.prototype.constructor = RangeIterator;


RangeIterator.prototype.toStart = function() {
    this.slot = 0;  // the slot before the first item
};


RangeIterator.prototype.toSlot = function(slot) {
    this.slot = slot;
};


RangeIterator.prototype.toEnd = function() {
    this.slot = this.size;  // the slot after the last item
};


RangeIterator.prototype.hasPrevious = function() {
    return this.slot > 0;
};


RangeIterator.prototype.hasNext = function() {
    return this.slot < this.size;
};


RangeIterator.prototype.getPrevious = function() {
    if (!this.hasPrevious()) throw new Error('The iterator is at the beginning of the range.');
    this.slot--;
    var item = this.range.array ? this.range.array[this.slot] : this.range.first + this.slot;
    return item;
};


RangeIterator.prototype.getNext = function() {
    if (!this.hasNext()) throw new Error('The iterator is at the end of the range.');
    var item = this.range.array ? this.range.array[this.slot] : this.range.first + this.slot;
    this.slot++;
    return item;
};
