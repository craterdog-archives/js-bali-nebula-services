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

var Text = require('../../elements/Text').Text;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
    'Test Constructor': function(test) {
        test.expect(8);

        var text = new Text();
        var string = text.toString();
        test.equal(string, '""', "1 The text strings didn't match.");
        var raw = text.getRawString();
        test.equal(raw, '', "1 The raw strings didn't match.");

        text = new Text('""');
        string = text.toString();
        test.equal(string, '""', "2 The text strings didn't match.");
        raw = text.getRawString();
        test.equal(raw, '', "2 The raw strings didn't match.");

        text = new Text('"This is a text string."');
        string = text.toString();
        test.equal(string, '"This is a text string."', "2 The text strings didn't match.");
        raw = text.getRawString();
        test.equal(raw, 'This is a text string.', "2 The raw strings didn't match.");

        text = new Text('"\nThis is a \"text block\" containing \'quotes\'.\n"');
        string = text.toString();
        test.equal(string, '"\nThis is a \"text block\" containing \'quotes\'.\n"', "2 The text strings didn't match.");
        raw = text.getRawString();
        test.equal(raw, '\nThis is a \"text block\" containing \'quotes\'.\n', "2 The raw strings didn't match.");

        test.done();
    }
});
