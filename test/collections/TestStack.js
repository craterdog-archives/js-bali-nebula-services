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

    describe('Test the stack constructors.', function() {

        it('should create a stack with default capacity', function() {
            var stack = new collections.Stack();
            expect(stack).to.exist;  // jshint ignore:line
            var size = stack.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
            var iterator = stack.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasNext() === false);
            expect(iterator.hasPrevious() === false);
            stack.removeAll();
        });

        it('should create a stack with small capacity', function() {
            var stack = new collections.Stack();
            stack.capacity = 1;
            var size = stack.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
            stack.pushItem(new Item(1));  // use a different object with same attributes
            size = stack.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(1);
            expect(function() {stack.pushItem(item2);}).to.throw(Error, 'Attempted to push an item onto a full stack.');
            var top = stack.popItem();
            expect(top).to.exist;  // jshint ignore:line
            expect(item1.equalTo(top)).to.equal(true);
            size = stack.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(0);
        });

    });

    describe('Test the stack methods.', function() {

        it('should be able to push and pop items from a stack', function() {
            var stack = new collections.Stack(items);
            var size = stack.getSize();
            expect(size).to.exist;  // jshint ignore:line
            expect(size).to.equal(5);
            var top = stack.getTop();
            expect(item5.equalTo(top)).to.equal(true);
            var pop = stack.popItem();
            expect(top.equalTo(pop)).to.equal(true);
            expect(stack.getSize()).to.equal(4);
            top = stack.getTop();
            expect(item4.equalTo(top)).to.equal(true);
            pop = stack.popItem();
            expect(top.equalTo(pop)).to.equal(true);
            expect(stack.getSize()).to.equal(3);
            top = stack.getTop();
            expect(item3.equalTo(top)).to.equal(true);
            pop = stack.popItem();
            expect(top.equalTo(pop)).to.equal(true);
            expect(stack.getSize()).to.equal(2);
            top = stack.getTop();
            expect(item2.equalTo(top)).to.equal(true);
            pop = stack.popItem();
            expect(top.equalTo(pop)).to.equal(true);
            expect(stack.getSize()).to.equal(1);
            top = stack.getTop();
            expect(item1.equalTo(top)).to.equal(true);
            pop = stack.popItem();
            expect(top.equalTo(pop)).to.equal(true);
            expect(stack.getSize()).to.equal(0);
        });

    });

    describe('Test the stack iterators.', function() {

        it('should iterate over a stack forwards and backwards', function() {
            // REMEMBER: The iterator for a stack iterates through the items in LIFO order
            var stack = new collections.Stack();
            var index;
            var item;
            // place the items on the stack in order
            while (index < items.length) {
                stack.pushItem(items[index++]);
            }
            // iterate through the items from top down
            var iterator = stack.iterator();
            expect(iterator).to.exist;  // jshint ignore:line
            expect(iterator.hasPrevious() === false);
            expect(iterator.hasNext() === true);
            while (index > 0) {  // now go through in LIFO order
                item = iterator.getNext();
                expect(items[index--].equalTo(item)).to.equal(true);
            }
            // should be at the last slot in the iterator
            expect(iterator.hasPrevious() === true);
            expect(iterator.hasNext() === false);
            // move to the first slot in the iterator
            iterator.toStart();
            expect(iterator.hasPrevious() === false);
            expect(iterator.hasNext() === true);
            // move back to the last slot in the iterator
            iterator.toEnd();
            expect(iterator.hasPrevious() === true);
            expect(iterator.hasNext() === false);
            // iterator through the items from bottom up
            while (index < items.length) {
                item = iterator.getPrevious();
                expect(items[index++].equalTo(item)).to.equal(true);
            }
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
