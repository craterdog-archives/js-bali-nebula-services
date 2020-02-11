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

const debug = 2;  // logging level in range [0..3]
const configuration = {
    names: 'craterdog-bali-names-us-west-2',
    drafts: 'craterdog-bali-drafts-us-west-2',
    documents: 'craterdog-bali-documents-us-west-2',
    messages: 'craterdog-bali-messages-us-west-2'
};

const bali = require('bali-component-framework').api(debug);
const notary = require('bali-digital-notary').service(debug);
const repository = require('bali-document-repository').service(notary, configuration, debug);
const engine = require('bali-document-repository').engine(notary, repository, debug);
const protocol = notary.getProtocols().getItem(-1);  // most recent protocol


if (debug > 2) console.log('Loading the "Bali Nebula™ Repository Service" lambda function');

exports.handler = async function(request) {
    return await engine.processRequest(request);
};
