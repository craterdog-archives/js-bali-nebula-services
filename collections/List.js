/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

/**
 * This collection class implements a sortable list which performs very well for both inserts and
 * indexed lookups of its values.  The implementation dynamically scales up and down the size of
 * the underlying data structures as the number of items changes over time. The indexing
 * is unit based and allows positive indexes starting at the beginning of the list or
 * negative indexes starting at the end of the list as follows:
 * <pre>
 *        1          2          3            N
 *    [item 1] . [item 2] . [item 3] ... [item N]
 *       -N        -(N-1)     -(N-2)        -1
 * </pre>
 */
var abstractions = require('../abstractions/');


/**
 * The constructor creates a new list using an optional collection of items.
 *
 * @param {Collection} optionalItems A collection of items to use to seed the list.
 */
function List(optionalItems) {
    abstractions.SortableCollection.call(this);
    this.array = [];
    if (optionalItems) {
        if (Array.isArray(optionalItems)) {
            this.array = optionalItems.slice();  // make a copy
        } else {
            var iterator = optionalItems.iterator();
            while (iterator.hasNext()) {
                var item = iterator.getNext();
                this.array.push(item);
            }
        }
    }
    return this;
}
List.prototype = Object.create(abstractions.SortableCollection.prototype);
List.prototype.constructor = List;
exports.List = List;


// PUBLIC METHODS

/**
 * This method accepts a visitor as part of the visitor pattern.
 * 
 * @param {Visitor} visitor The visitor that wants to visit this collection.
 */
List.prototype.accept = function(visitor) {
    visitor.visitList(this);
};


/**
 * This method returns the number of items that are currently in the list.
 * 
 * @returns {Number} The number of items in the list.
 */
List.prototype.getSize = function() {
    var size = this.array.length;
    return size;
};


/**
 * This method returns the item that is specified by the numeric index.
 * 
 * @param {Number} index The index of the desired item.
 * @returns {Object} The item at the position in the list.
 */
List.prototype.getItem = function(index) {
    index = this.normalizedIndex(index) - 1;  // change to javascript zero based indexing
    var item = this.array[index];
    return item;
};


/*
 * This method appends the specified item to the list.
 * 
 * @param {Object} item The item to be added to the list.
 * @returns {Boolean} Whether or not a new item was added, which it always will have been.
 */
List.prototype.addItem = function(item) {
    this.array.push(item);
    return true;
};


/*
 * This method removes the specified item from the list.
 * 
 * @param {Object} item The item to be removed from the list.
 * @returns {Boolean} Whether or not the item was removed.
 */
List.prototype.removeItem = function(item) {
    var index = 0;
    for (var i = 0; i < this.array.length; i++) {
        var candidate = this.array[i];
        if (candidate.equalTo(item)) {
            this.array.splice(index, 1);
            return true;
        }
        index++;
    }
    return false;
};


/**
 * This method inserts the specified item into the list before the item
 * associated with the specified index.
 *
 * @param {Object} item The new item to be inserted into the list.
 * @param {Number} index The index of the item before which the new item is to be inserted.
 */
List.prototype.insertItem = function(item, index) {
    index = this.normalizedIndex(index) - 1;  // convert to javascript zero based indexing
    this.array.splice(index, 0, item);
};


/**
 * This method inserts the specified items into the list before the item
 * associated with the specified index.  The new items are inserted in the same
 * order as they appear in the specified list.
 *
 * @param {Collection} items The new items to be inserted into the list.
 * @param {Number} index The index of the item before which the new item is to be inserted.
 */
List.prototype.insertItems = function(items, index) {
    index = this.normalizedIndex(index) - 1;  // convert to javascript zero based indexing
    this.array.splice.apply(this.array, [index, 0].concat(items));
};


/**
 * This method replaces an existing item in the list with a new one.  The new
 * item replaces the existing item at the specified index.
 *
 * @param {Object} item The new item that will replace the existing one.
 * @param {Number} index The index of the existing item.
 *
 * @returns The item that was at the specified index.
 */
List.prototype.replaceItem = function(item, index) {
    index = this.normalizedIndex(index) - 1;  // convert to javascript zero based indexing
    var result = this.array[index];
    this.array[index] = item;
    return result;
};


/**
 * This method removes from the list the item associated with the specified
 * index.
 *
 * @param {Number} index The index of the item to be removed.
 * @returns {Object} The item at the specified index.
 */
List.prototype.removeIndex = function(index) {
    index = this.normalizedIndex(index) - 1;  // convert to javascript zero based indexing
    var result = this.array[index];
    this.array.splice(index, 1);
    return result;
};


/**
 * This method removes from the list the items associated with the specified
 * index range.
 *
 * @param {Number} firstIndex The index of the first item to be removed.
 * @param {Number} lastIndex The index of the last item to be removed.
 * @returns The list of the items that were removed from the list.
 */
List.prototype.removeIndices = function(firstIndex, lastIndex) {
    firstIndex = this.normalizedIndex(firstIndex) - 1;  // convert to javascript zero based indexing
    lastIndex = this.normalizedIndex(lastIndex) - 1;  // convert to javascript zero based indexing
    var result = new List(this.array.slice(firstIndex, lastIndex));
    this.array.splice(firstIndex, lastIndex - firstIndex);
    return result;
};


/**
 * This method removes all items from the list.
 */
List.prototype.removeAll = function() {
    this.array.splice(0);
};


/**
 * This method creates an iterator that can be used to traverse the items within
 * a list in the order that they were added to it.
 * 
 * @returns {Object} The new iterator for the specified list.
 */
List.prototype.iterator = function() {
    var iterator = new ListIterator(this);
    return iterator;
};


/**
 * This method creates an empty set. It is used by the Collection.getItems()
 * method.
 * 
 * @returns {List} The resulting empty set.
 */
List.prototype.emptyCopy = function() {
    var copy = new List();
    return copy;
};


// PUBLIC FUNCTIONS

/**
 * This function returns a new list that contains the all the items from
 * both the specified lists.
 *
 * @param {List} list1 The first list whose items are to be concatenated.
 * @param {List} list2 The second list whose items are to be concatenated.
 * @returns {List} The resulting list.
 */
List.concatenation = function(list1, list2) {
    var result = new List(list1);
    result.addItems(list2);
    return result;
};


// PRIVATE CLASSES

/**
 * The constructor for the ListIterator class.
 * 
 * @param {List} list The list to be iterated over.
 * @returns {ListIterator} The new list iterator.
 */
function ListIterator(list) {
    this.slot = 0;  // the slot before the first item
    this.list = list;
    return this;
}
ListIterator.prototype.constructor = ListIterator;


ListIterator.prototype.toStart = function() {
    this.slot = 0;  // the slot before the first item
};


ListIterator.prototype.toSlot = function(slot) {
    this.slot = slot;
};


ListIterator.prototype.toEnd = function() {
    this.slot = this.list.array.length;  // the slot after the last item
};


ListIterator.prototype.hasPrevious = function() {
    return this.slot > 0;
};


ListIterator.prototype.hasNext = function() {
    return this.slot < this.list.array.length;
};


ListIterator.prototype.getPrevious = function() {
    if (!this.hasPrevious()) throw new Error('The iterator is at the beginning of the list.');
    var item = this.list.array[--this.slot];
    return item;
};


ListIterator.prototype.getNext = function() {
    if (!this.hasNext()) throw new Error('The iterator is at the end of the list.');
    var item = this.list.array[this.slot++];
    return item;
};
