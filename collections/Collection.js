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
 * This abstract class defines the invariant methods that all collections must inherit.
 */
var Composite = require('./Composite').Composite;


/**
 * The constructor for the Collection class.
 * 
 * @returns {Collection} The new collection.
 */
function Collection() {
    Composite.call(this);
    return this;
}
Collection.prototype = Object.create(Composite.prototype);
Collection.prototype.constructor = Collection;
exports.Collection = Collection;


// PUBLIC METHODS

/**
 * This method returns the index of the specified item in the collection.
 * NOTE: It is tempting when dealing with a collection that uses an array
 * as an underlying data structure to use the Array.indexOf() method to
 * provide a faster implementation of this method. However, the indexOf()
 * method uses strict equality checks which for items that are objects
 * returns false even when all attributes on each item are the same. Therefore
 * it is better not to override this method in that case.
 * 
 * @param {Object} item The item to be looked up.
 * @returns {Number} The index of the item in the collection.
 */
Collection.prototype.getIndex = function(item) {
    var index = 0;
    var iterator = this.iterator();
    while (iterator.hasNext()) {
        var candidate = iterator.getNext();
        index++;
        if (item.equalTo(candidate)) return index;
    }
    return 0;  // not found
};


/**
 * This method returns a new collection of items starting with the item at the first index
 * and including the item at the last index.
 * 
 * @param {type} firstIndex The index of the first item to be included.
 * @param {type} lastIndex The index of the last item to be included.
 * @returns {Collection} The new collection containing the requested items.
 */
Collection.prototype.getItems = function(firstIndex, lastIndex) {
    firstIndex = this.normalizedIndex(firstIndex);
    lastIndex = this.normalizedIndex(lastIndex);
    var result = this.emptyCopy();
    var iterator = this.iterator();
    iterator.toSlot(firstIndex - 1);  // the slot before the first item
    var numberOfItems = lastIndex - firstIndex + 1;
    while (numberOfItems > 0) {
        var item = iterator.getNext();
        result.addItem(item);
        numberOfItems--;
    }
    return result;
};


/**
 * This method adds a list of new items to the collection.  The new
 * items will be added in the order they appear in the specified collection.
 *
 * @param {Collection} items The list of new items to be added.
 * @returns {Number} The number of items that were actually added to the collection.
 */
Collection.prototype.addItems = function(items) {
    var count = 0;
    var iterator = items.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        if (this.addItem(item)) count++;
    }
    return count;
};


/**
 * This method removes the specified items from the collection.  The number of
 * matching items is returned.
 *
 * @param {Collection} items The list of items to be removed from the collection.
 * @returns {Number} The number of items that were actually removed.
 */
Collection.prototype.removeItems = function(items) {
    var count = 0;
    var iterator = items.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        if (this.removeItem(item)) {
            count++;
        }
    }
    return count;
};

/**
 * This method determines if an item is contained in the collection.
 *
 * @param {Object} item The item to be checked for in the collection.
 * @returns {Boolean} Whether or not the specified item is contained in the collection.
 */
Collection.prototype.containsItem = function(item) {
    var index = this.getIndex(item);
    var result = index > 0;
    return result;
};


/**
 * This method determines whether any of the specified items are contained in
 * the collection.
 *
 * @param {Collection} items The items to be checked for in the collection.
 * @returns {Boolean} Whether or not any of the specified items are contained in the collection.
 */
Collection.prototype.containsAny = function(items) {
    var result = false;
    var iterator = items.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        result = this.containsItem(item);
        if (result) break;
    }
    return result;
};


/**
 * This method determines whether all of the specified items are contained in
 * the collection.
 *
 * @param {Collection} items The items to be checked for in the collection.
 * @returns {Boolean} Whether or not all of the specified items are contained in the collection.
 */
Collection.prototype.containsAll = function(items) {
    var result = false;
    var iterator = items.iterator();
    while (iterator.hasNext()) {
        var item = iterator.getNext();
        result = this.containsItem(item);
        if (!result) break;
    }
    return result;
};


/**
 * This method converts negative indexes into their corresponding positive indexes and
 * then checks to make sure the index is in the range [1..size]. NOTE: if the collection
 * is empty then the resulting index will be zero.
 *
 * The mapping between indexes is as follows:
 * <pre>
 * Negative Indexes:   -N      -N + 1     -N + 2     -N + 3   ...   -1
 * Positive Indexes:    1         2          3          4     ...    N
 * </pre>
 *
 * @param {Number} index The index to be normalized.
 * @returns {Number} The normalized [1..N] index.
 */
Collection.prototype.normalizedIndex = function(index) {
    var size = this.getSize();
    if (index > size) index = size;
    if (index < -size) index = -size;
    if (index < 0) index = index + size + 1;
    return index;
};
