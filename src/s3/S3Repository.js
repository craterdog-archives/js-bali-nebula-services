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

///////////////////////////////////////////////////////////////////////////////////////
// This module should be used for LOCAL TESTING ONLY.  It is NOT SECURE and provides //
// no guarantees on protecting access to the documents.  YOU HAVE BEEN WARNED!!!     //
///////////////////////////////////////////////////////////////////////////////////////


/*
 * This module defines a singleton that implements an AWS S3 bucket based document
 * repository. It treats documents as UTF-8 encoded strings.
 */
const config = require('./Configuration.js');
const aws = new require('aws-sdk/clients/s3');
const s3 = new aws({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework');
const EOL = '\n';  // POSIX compliant end of line


/**
 * This function returns an object that implements the API for an AWS S3 based document
 * repository.
 * 
 * will be logged to the error console.
 * @returns {Object} An object implementing the document repository interface.
 */
exports.repository = function() {

    // return a singleton object for the API
    return {

        /**
         * This function returns a string providing attributes about this repository.
         * 
         * @returns {String} A string providing attributes about this repository.
         */
        toString: function() {
            const catalog = bali.catalog({
                $module: '/bali/repositories/S3Repository',
                $url: this.getURL()
            });
            return catalog.toString();
        },

        /**
         * This function returns a reference to this document repository.
         * 
         * @returns {Reference} A reference to this document repository.
         */
        getURL: function() {
            return bali.reference(config.url);
        },

        /**
         * This function checks to see whether or not a document citation is associated
         * with the specified name.
         * 
         * @param {String} name The unique name for the document citation being checked.
         * @returns {Boolean} Whether or not the document citation exists.
         */
        citationExists: async function(name) {
            const filename = name + '.bali';
            const exists = await doesExist(config.citationBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve a document citation from the repository for
         * the specified name.
         * 
         * @param {String} name The unique name for the document citation being fetched.
         * @returns {String} The canonical source string for the document citation, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchCitation: async function(name) {
            var citation;
            const filename = name + '.bali';
            const exists = await doesExist(config.citationBucket, filename);
            if (exists) {
                citation = await getObject(config.citationBucket, filename);
                citation = citation.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return citation;
        },

        /**
         * This function associates a new name with the specified document citation in
         * the repository.
         * 
         * @param {String} name The unique name for the specified document citation.
         * @param {String} citation The canonical source string for the document citation.
         */
        createCitation: async function(name, citation) {
            const filename = name + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createCitation',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            citation = citation + EOL;  // add POSIX compliant <EOL>
            await putObject(config.citationBucket, filename, citation);
        },

        /**
         * This function checks to see whether or not a draft document is associated with the
         * specified identifier.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being checked.
         * @returns {Boolean} Whether or not the draft document exists.
         */
        draftExists: async function(draftId) {
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being fetched.
         * @returns {String} The canonical source string for the draft document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDraft: async function(draftId) {
            var draft;
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            if (exists) {
                draft = await getObject(config.draftBucket, filename);
                draft = draft.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return draft;
        },

        /**
         * This function saves a draft document in the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being saved.
         * @param {String} draft The canonical source string for the draft document.
         */
        saveDraft: async function(draftId, draft) {
            const filename = draftId + '.bali';
            const document = draft + EOL;  // add POSIX compliant <EOL>
            await putObject(config.draftBucket, filename, document);
        },

        /**
         * This function attempts to delete the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being deleted.
         */
        deleteDraft: async function(draftId) {
            const filename = draftId + '.bali';
            const exists = await doesExist(config.draftBucket, filename);
            if (exists) {
                await deleteObject(config.draftBucket, filename);
            }
        },

        /**
         * This function checks to see whether or not a document is associated with the
         * specified identifier.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being checked.
         * @returns {Boolean} Whether or not the document exists.
         */
        documentExists: async function(documentId) {
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            return exists;
        },

        /**
         * This function attempts to retrieve the specified document from the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being fetched.
         * @returns {String} The canonical source string for the document, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchDocument: async function(documentId) {
            var document;
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            if (exists) {
                document = await getObject(config.documentBucket, filename);
                document = document.toString().slice(0, -1);  // remove POSIX compliant <EOL>
            }
            return document;
        },

        /**
         * This function creates a new document in the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being created.
         * @param {String} document The canonical source string for the document.
         */
        createDocument: async function(documentId, document) {
            const filename = documentId + '.bali';
            const exists = await doesExist(config.documentBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$createDocument',
                    $exception: '$fileExists',
                    $url: this.getURL(),
                    $file: bali.text(filename),
                    $text: bali.text('The file to be written already exists.')
                });
            }
            document = document + EOL;  // add POSIX compliant <EOL>
            await putObject(config.documentBucket, filename, document);
        },

        /**
         * This function adds a new message onto the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @param {String} message The canonical source string for the message.
         */
        queueMessage: async function(queueId, message) {
            const messageId = bali.tag().getValue();
            const filename = queueId + '/' + messageId + '.bali';
            const exists = await doesExist(config.queueBucket, filename);
            if (exists) {
                throw bali.exception({
                    $module: '/bali/repositories/S3Repository',
                    $procedure: '$queueMessage',
                    $exception: '$messageExists',
                    $message: bali.text(filename),
                    $text: bali.text('The message to be written already exists.')
                });
            }
            const document = message + EOL;  // add POSIX compliant <EOL>
            await putObject(config.queueBucket, filename, document);
        },

        /**
         * This function removes a message (at random) from the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @returns {String} The canonical source string for the message.
         */
        dequeueMessage: async function(queueId) {
            var message;
            while (true) {
                const messages = (await listObjects(config.queueBucket, queueId));
                if (messages && messages.length) {
                    // select a message a random since a distributed queue cannot guarantee FIFO
                    const count = messages.length;
                    const index = bali.random.index(count) - 1;  // convert to zero based indexing
                    const filename = messages[index].Key;
                    message = await getObject(config.queueBucket, filename);
                    message = message.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                    try {
                        await deleteObject(config.queueBucket, filename);
                        break; // we got there first
                    } catch (exception) {
                        // another process got there first
                        message = undefined;
                    }
                } else {
                    break;  // no more messages
                }
            }
            return message;
        }

    };
};


// PRIVATE FUNCTIONS

const listObjects = async function(bucket, prefix) {
    return new Promise(function(resolve, reject) {
        try {
            s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: 64}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Contents);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const doesExist = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.headObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error || data.DeleteMarker || !data.ContentLength) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const getObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.getObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Body.toString());
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const putObject = async function(bucket, key, object) {
    return new Promise(function(resolve, reject) {
        try {
            s3.putObject({Bucket: bucket, Key: key, Body: object.toString()}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};


const deleteObject = async function(bucket, key) {
    return new Promise(function(resolve, reject) {
        try {
            s3.deleteObject({Bucket: bucket, Key: key}, function(error, data) {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        } catch (cause) {
            reject(cause);
        }
    });
};
