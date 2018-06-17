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
 * This abstract class defines the invariant methods that all sortable collections must inherit.
 * A sortable collection allows the order of its items to be determined externally.  By
 * default, the items will be placed in the order in which they were added to the collection.
 * Additionally, the items can be sorted in various ways depending on a specified sorting
 * algorithm and comparison function.
 */
var Collection = require('./Collection').Collection;


/**
 * The constructor for the SortableCollection class.
 * 
 * @returns {SortableCollection} The new sortable collection.
 */
function SortableCollection() {
    Collection.call(this);
    return this;
}
SortableCollection.prototype = Object.create(Collection.prototype);
SortableCollection.prototype.constructor = SortableCollection;
exports.SortableCollection = SortableCollection;


// PUBLIC METHODS

/**
 * This method shuffles the items in the collection using a randomizing algorithm.
 */
SortableCollection.prototype.shuffleItems = function() {
    var sorter = new RandomSorter();
    sorter.sortCollection(this);
};


/**
 * This method sorts the items in the collection.
 */
SortableCollection.prototype.sortItems = function() {
    var sorter = new MergeSorter();
    sorter.sortCollection(this);
};


// PRIVATE HELPER CLASSES

/*
 * This sorter class implements a standard merge sort algorithm.  The collection to be sorted
 * is recursively split into two collections each of which are then sorted and then the two
 * collections are merged back into a sorted collection.
 */

function MergeSorter() {
    return this;
}
MergeSorter.prototype.constructor = MergeSorter;


MergeSorter.prototype.sortCollection = function(collection) {
    if (collection && collection.getSize() > 1) {
        // convert the collection to an array
        var array = [];
        var iterator = collection.iterator();
        while (iterator.hasNext()) {
            var item = iterator.getNext();
            array.push(item);
        }

        // sort the array
        array = this.sortArray(array);

        // convert it back to a collection
        collection.removeAll();
        collection.addItems(array);
    }
};


MergeSorter.prototype.sortArray = function(array) {
    // check to see if the array is already sorted
    var length = array.length;
    if (length < 2) return;

    // split the array into two halves
    var leftLength = Math.floor(length / 2);
    var left = array.slice(0, leftLength);
    var right = array.slice(leftLength, length);

    // sort each half separately
    left = this.sortArray(left);
    right = this.sortArray(right);

    // merge the sorted halves back together
    var result = this.mergeArrays(left, right);
    return result;
};


MergeSorter.prototype.mergeArrays = function(left, right) {
    var leftIndex = 0;
    var rightIndex = 0;
    var result = [];
    while (leftIndex < left.length && rightIndex < right.length) {
        // still have elements in both halves
        switch (left[leftIndex].compareTo(right[rightIndex])) {
            case -1:
                // copy the next left element to the result
                result.push(left[leftIndex++]);
                break;
            case 0:
            case 1:
                // copy the next right element to the result
                result.push(right[rightIndex++]);
                break;
        }
    }
    if (leftIndex < left.length) {
        // copy the rest of the left half to the result
        result = result.concat(left.slice(leftIndex));
    } else {
        // copy the rest of the right half to the result
        result = result.concat(right.slice(rightIndex));
    }
    return result;
};


/**
 * This sorter class implements a randomizing sort algorithm.  The collection to be sorted
 * is randomly reordered such that the resulting order is completely random.
 */

function RandomSorter() {
    return this;
}
RandomSorter.prototype.constructor = RandomSorter;


RandomSorter.prototype.sortCollection = function(collection) {
    if (collection && collection.getSize() > 1) {
        // convert the collection to an array
        var array = [];
        var iterator = collection.iterator();
        while (iterator.hasNext()) {
            var item = iterator.getNext();
            array.push(item);
        }

        // randomize the array
        array = this.randomizeArray(array);

        // convert it back to a collection
        collection.removeAll();
        collection.addItems(array);
    }
};


RandomSorter.prototype.randomizeArray = function(array) {
    var size = array.length;
    for (var index = size; index > 1; index--) {
        var randomIndex = Math.floor(Math.random() * index);  // use zero based indexing
        var swap = array[index - 1];
        array[index - 1] = array[randomIndex];
        array[randomIndex] = swap;
    }
    return array;
};
