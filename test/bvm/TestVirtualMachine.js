/************************************************************************
 * Copyright (c) Crater Dog Technologies(TM).  All Rights Reserved.     *
 ************************************************************************
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.        *
 *                                                                      *
 * This code is free software; you can redistribute it and/or modify it *
 * under the terms of The MIT License (MIT), as published by the Open   *
 * Source Initiative. (See http://opensource.org/licenses/MIT)          *
 ************************************************************************/
var BaliNotary = require('bali-digital-notary/BaliNotary');
var TestRepository = require('bali-cloud-api/LocalRepository');
var BaliAPI = require('bali-cloud-api/BaliAPI');
var codex = require('bali-document-notation/utilities/EncodingUtilities');
var ProcedureContext = require('../../bvm/ProcedureContext');
var TaskContext = require('../../bvm/TaskContext');
var VirtualMachine = require('../../bvm/VirtualMachine');
var elements = require('../elements');
var mocha = require('mocha');
var expect = require('chai').expect;


describe('Bali Cloud Environment™', function() {
    var testDirectory = 'test/config/';
    var notary = BaliNotary.notary(testDirectory);
    var repository = TestRepository.repository(testDirectory);
    var environment = BaliAPI.environment(notary, repository);

    describe('Test the Bali virtual machine.', function() {
        var accountTag = new elements.Tag();
        var accountBalance = 100;
        var procedureContext;
        var taskContext = TaskContext.create(accountTag, accountBalance, procedureContext);

        it('should process a new message', function() {
            var bvm = VirtualMachine(taskContext, testDirectory);
            bvm.processInstructions();
        });

        it('should continue waiting for a waiting task', function() {
        });

        it('should continue processing an existing task', function() {
        });

        it('should single step an existing task', function() {
        });

    });

});
