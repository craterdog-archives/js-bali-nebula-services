/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/

var collections = require('../../collections/');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Virtual Machine™', function() {

    describe('Test the range constructors.', function() {

        it('should create an integer range with no associated collection', function() {
            var range = new collections.Range(2, 5);
            expect(range).to.exist;  // jshint ignore:line
            var size = range.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(4);
            var iterator = range.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            expect(iterator.getNext()).to.equal(2);
            expect(iterator.getNext()).to.equal(3);
            expect(iterator.getNext()).to.equal(4);
            expect(iterator.getNext()).to.equal(5);
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === true);
        });

        it('should throw exception for non-integer range with no associated collection', function() {
            expect(function() {new collections.Range('first', 'last');}).to.throw(Error, 'A number range must have first and last items that are integers.');
        });

        it('should create a range with an associated collection', function() {
            var list = new collections.List(items);
            var range = new collections.Range(new Item(1), item3, list);
            expect(range).to.exist;  // jshint ignore:line
            var size = range.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(3);
            var iterator = range.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === true);
            expect(iterator.hasPrevious() === false);
            expect(iterator.getNext().equalTo(item1)).to.equal(true);
            expect(iterator.getNext().equalTo(item2)).to.equal(true);
            expect(iterator.getNext().equalTo(item3)).to.equal(true);
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === true);
        });

    });

    describe('Test the range iterators.', function() {

        it('should iterate over a range forwards and backwards', function() {
            var list = new collections.List(items);
            var range = new collections.Range(item1, new Item(3), list);
            var index = list.length;
            var item;
            var iterator = range.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            // the iterator is at the first slot
            expect(iterator.hasPrevious() === false);
            expect(iterator.hasNext() === true);
            iterator.toEnd();
            // the iterator is at the last slot
            expect(iterator.hasPrevious() === true);
            expect(iterator.hasNext() === false);
            // iterate through the items in reverse order
            while (index > 0) {
                item = iterator.getNext();
                expect(items[index--].equalTo(item)).to.equal(true);
            }
            // should be at the first slot in the iterator
            expect(iterator.hasPrevious() === false);
            expect(iterator.hasNext() === true);
            // iterator through the items in order
            while (index < items.length) {
                item = iterator.getPrevious();
                expect(items[index++].equalTo(item)).to.equal(true);
            }
            // should be at the last slot in the iterator
            expect(iterator.hasPrevious() === true);
            expect(iterator.hasNext() === false);
            iterator.toStart();
            // should be at the first slot in the iterator
            expect(iterator.hasPrevious() === false);
            expect(iterator.hasNext() === true);
        });

    });

});

function Item(value) {
    this.value = value;
    return this;
}
Item.prototype.constructor = Item;


Item.prototype.equalTo = function(that) {
    return this.value === that.value;
};


Item.prototype.compareTo = function(that) {
    if (this.value < that.value) return -1;
    if (this.value === that.value) return 0;
    if (this.value > that.value) return 1;
};


var item1 = new Item(1);
var item2 = new Item(2);
var item3 = new Item(3);
var item4 = new Item(4);
var item5 = new Item(5);

var items = [
    item1,
    item2,
    item3,
    item4,
    item5
];

