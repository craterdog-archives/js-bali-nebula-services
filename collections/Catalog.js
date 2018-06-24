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
 * This collection class implements a sortable collection containing key-value associations.  The
 * implementation is optimized for both inserting new associations and looking up values based on
 * their key.  The implementation also dynamically scales up and down the number of buckets as the
 * number of associations changes over time.
 */
var Composite = require('./Composite').Composite;
var SortableCollection = require('./SortableCollection').SortableCollection;
var List = require('./List').List;


/**
 * The constructor creates a new catalog using an optional collection of associations.
 *
 * @param {Collection} optionalAssociations A collection of associations to use to seed the catalog.
 */
function Catalog(optionalAssociations) {
    SortableCollection.call(this);
    this.map = new Map();
    this.array = [];
    if (optionalAssociations) {
        var association;
        if (Array.isArray(optionalAssociations)) {
            this.array = optionalAssociations.slice();  // make a copy
            for (var i = 0; i < optionalAssociations.length; i++) {
                association = optionalAssociations[i];
                this.map.set(association.key, association);
            }
        } else {
            var iterator = optionalAssociations.iterator();
            while (iterator.hasNext()) {
                association = iterator.getNext();
                this.map.set(association.key, association);
                this.array.push(association);
            }
        }
    }
    return this;
}
Catalog.prototype = Object.create(SortableCollection.prototype);
Catalog.prototype.constructor = Catalog;
exports.Catalog = Catalog;


// PUBLIC METHODS

/**
 * This method returns the number of associations that are currently in the catalog.
 * 
 * @returns {Number} The number of associations in the catalog.
 */
Catalog.prototype.getSize = function() {
    var size = this.array.length;
    return size;
};


/**
 * This method returns whether or not the specified association is contained in the
 * catalog.
 * 
 * @param {Association} association The association to be searched for in the catalog.
 */
Catalog.prototype.containsItem = function(association) {
    var candidate = this.map.get(association.key);
    var result = association.equalTo(candidate);
    return result;
};


/**
 * This method returns the association that is specified by the numeric index.
 * 
 * @param {Number} index The index of the desired association.
 * @returns {Association} The association at the indexed position in the catalog.
 */
Catalog.prototype.getItem = function(index) {
    index = this.normalizedIndex(index) - 1;  // change to javascript zero based indexing
    var association = this.array[index];
    return association;
};


/*
 * This method adds the specified association to the catalog if an association with that
 * key does not already exist in the catalog.
 * NOTE: This method has different semantics from the setValue() method.  This
 * method only inserts a new value if the key does not already exist in the catalog.
 * Otherwise, it does nothing.
 * 
 * @param {Association} association The association to be added to the catalog.
 * @returns {Boolean} Whether or not a new association was added.
 */
Catalog.prototype.addItem = function(association) {
    var key = association.key;
    var value = association.value;
    if (!this.map.has(key)) {
        this.setValue(key, value);
        return true;
    }
    return false;
};


/*
 * This method removes the specified association from the catalog.
 * NOTE: This method has different semantics from the removeValue() method.  This
 * method only removes an association if both the key and value match the specified
 * association.  Otherwise, it does nothing.
 * 
 * @param {Association} association The association to be removed from the catalog.
 * @returns {Boolean} Whether or not the association was removed.
 */
Catalog.prototype.removeItem = function(association) {
    var key = association.key;
    var value = association.value;
    var candidate = this.map.get(key);
    if (candidate.value.equalTo(value)) {
        this.removeValue(key);
        return true;
    }
    return false;
};


/**
 * This method removes all associations from the catalog.
 */
Catalog.prototype.removeAll = function() {
    this.map.clear();
    this.array.splice(0);
};


/**
 * This method returns the value associated with the specified key in the catalog.
 *
 * @param {Object} key The key for the value to be retrieved.
 * @returns {Object} The value associated with the key.
 */
Catalog.prototype.getValue = function(key) {
    var value;
    var association = this.map.get(key);
    if (association) {
        value = association.value;
    }
    return value;
};


/**
 * This method associates in the catalog a new value with a key.  If there is already
 * a value associated with the specified key, the new value replaces the old value.
 *
 * @param {Object} key The key for the new value.
 * @param {Object} value The new value to be associated with the key.
 */
Catalog.prototype.setValue = function(key, value) {
    var association = this.map.get(key);
    if (association) {
        association.value = value;
    } else {
        association = new Association(key, value);
        this.array.push(association);
        this.map.set(key, association);
    }
};


/**
 * This method removes from the catalog the value associated with a key.  If no value
 * is associated with the specified key then the return value is undefined.
 *
 * @param {Object} key The key for the value to be removed.
 * @returns {Object} The value associated with the key.
 */
Catalog.prototype.removeValue = function(key) {
    var value;
    if (this.map.delete(key)) {
        for (var i = 0; i < this.array.length; i++) {
            var association = this.array[i];
            var candidate = association.key;
            if (candidate.equalTo(key)) {
                value = association.value;
                this.array.splice(i, 1);
                break;
            }
        }
    }
    return value;
};


/**
 * This method returns a sortable collection of the keys for the associations in this catalog.
 *
 * @returns {SortableCollection} A sortable collection of the keys for this catalog.
 */
Catalog.prototype.getKeys = function() {
    var keys = new List();
    for (var i = 0; i < this.array.length; i++) {
        var association = this.array[i];
        var key = association.key;
        keys.addItem(key);
    }
    return keys;
};


/**
 * This method returns a sortable collection of the values for the associations in this catalog.
 *
 * @returns {SortableCollection} A sortable collection of the values for this catalog.
 */
Catalog.prototype.getValues = function() {
    var values = new List();
    for (var i = 0; i < this.array.length; i++) {
        var association = this.array[i];
        var value = association.value;
        values.addItem(value);
    }
    return values;
};


/**
 * This method returns the list of associations between keys and values for this catalog.
 *
 * @returns {SortableCollection} A sortable collection of the associations for this catalog.
 */
Catalog.prototype.getAssociations = function() {
    var associations = new List();
    for (var i = 0; i < this.array.length; i++) {
        var association = this.array[i];
        associations.addItem(association);
    }
    return associations;
};


/**
 * This method creates an iterator that can be used to traverse the associations within
 * a catalog in the order that they were added to it.
 * 
 * @returns {Object} The new iterator for the specified catalog.
 */
Catalog.prototype.iterator = function() {
    var iterator = new CatalogIterator(this);
    return iterator;
};


/**
 * This method creates an empty set. It is used by the Collection.getItems()
 * method.
 * 
 * @returns {Catalog} The resulting empty set.
 */
Catalog.prototype.emptyCopy = function() {
    var copy = new Catalog();
    return copy;
};


// PUBLIC FUNCTIONS

/**
 * This function returns a new catalog that contains the all the associations from
 * both the specified catalogs.
 *
 * @param {Catalog} catalog1 The first catalog whose items are to be concatenated.
 * @param {Catalog} catalog2 The second catalog whose items are to be concatenated.
 * @returns {Catalog} The resulting catalog.
 */
Catalog.concatenation = function(catalog1, catalog2) {
    var result = new Catalog(catalog1);
    result.addItems(catalog2);
    return result;
};


/**
 * This function returns a new catalog that contains only the associations with
 * the specified keys.
 *
 * @param catalog The catalog whose items are to be reduced.
 * @param keys The collection of keys for the associates to be saved.
 * @returns The resulting catalog.
 */
Catalog.reduction = function(catalog, keys) {
    var result = new Catalog();
    var iterator = keys.iterator();
    while (iterator.hasNext()) {
        var key = iterator.getNext();
        var value = catalog.getValue(key);
        if (value) {
            result.setValue(key, value);
        }
    }
    return result;
};


// PRIVATE CLASSES

/**
 * The constructor for the CatalogIterator class.
 * 
 * @param {Catalog} catalog The catalog to be iterated over.
 * @returns {CatalogIterator} The new catalog iterator.
 */
function CatalogIterator(catalog) {
    this.slot = 0;  // the slot before the first association
    this.catalog = catalog;
    return this;
}
CatalogIterator.prototype.constructor = CatalogIterator;


CatalogIterator.prototype.toStart = function() {
    this.slot = 0;  // the slot before the first association
};


CatalogIterator.prototype.toSlot = function(slot) {
    this.slot = slot;
};


CatalogIterator.prototype.toEnd = function() {
    this.slot = this.catalog.array.length;  // the slot after the last association
};


CatalogIterator.prototype.hasPrevious = function() {
    return this.slot > 0;
};


CatalogIterator.prototype.hasNext = function() {
    return this.slot < this.catalog.array.length;
};


CatalogIterator.prototype.getPrevious = function() {
    if (!this.hasPrevious()) throw new Error('The iterator is at the beginning of the catalog.');
    var association = this.catalog.array[--this.slot];
    return association;
};


CatalogIterator.prototype.getNext = function() {
    if (!this.hasNext()) throw new Error('The iterator is at the end of the catalog.');
    var association = this.catalog.array[this.slot++];
    return association;
};


// HELPER CLASS

/**
 * The constructor creates a new association between a key and a value.
 *
 * @param {Object} key The key for the association.
 * @param {Object} value The value associated with the key.
 */
function Association(key, value) {
    Composite.call(this);
    this.key = key;
    this.value = value;
    return this;
}
Association.prototype = Object.create(Composite.prototype);
Association.prototype.constructor = Association;
exports.Association = Association;


// PUBLIC METHODS

/**
 * This method returns whether or not this association is empty.
 * 
 * @returns {Boolean} Whether or not this association is empty, it never is.
 */
Association.prototype.isEmpty = function() {
    return false;
};


/**
 * This method returns a number that can be used as a hash value for this association.
 * 
 * @returns {Number} The unique hash value for this association.
 */
Association.prototype.getHash = function() {
    var hash = 7;
    hash = 13 * hash + this.key.getHash();
    hash = 13 * hash + this.value.getHash();
    return hash;
};


/**
 * This method compares this association with another object for equality.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Boolean} Whether or not the two are equal.
 */
Association.prototype.equalTo = function(that) {
    if (that === undefined || that === null || that.constructor.name !== 'Association') return false;
    return this.key.equalTo(that.key) && this.value.equalTo(that.value);
};


/**
 * This method compares this association with another object for ordering.
 * 
 * @param {Object} that The object that is being compared.
 * @returns {Number} -1 if this < that; 0 if this === that; and 1 if this > that
 */
Association.prototype.compareTo = function(that) {
    if (that === undefined || that === null) return 1;
    if (this === that) return 0;  // same object
    var result = this.key.compareTo(that.key);
    if (result !== 0) return result;
    result = this.value.compareTo(that.value);
    return result;
};
