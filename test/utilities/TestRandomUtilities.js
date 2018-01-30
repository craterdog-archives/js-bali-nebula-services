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
var random = require('../../utilities/RandomUtilities');
var testCase = require('nodeunit').testCase;


module.exports = testCase({
    'Test Coin Toss': function(test) {
        test.expect(2);
        test.ok(!random.coinToss(0));
        test.ok(random.coinToss(1));
        test.done();
    }
});
