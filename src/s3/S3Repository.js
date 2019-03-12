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
const s3 = require('aws-sdk/client/s3')({apiVersion: '2006-03-01'});
const bali = require('bali-component-framework');
const EOL = '\n';  // POSIX compliant end of line


/**
 * This function returns an object that implements the API for an AWS S3 based document
 * repository.
 * 
 * @param {Boolean} debug An optional flag that determines whether or not exceptions
 * will be logged to the error console.
 * @returns {Object} An object implementing the document repository interface.
 */
exports.repository = function(debug) {
    debug = debug || false;

    // return a singleton object for the API
    return {

        /**
         * This function returns a string providing attributes about this repository.
         * 
         * @returns {String} A string providing attributes about this repository.
         */
        toString: function() {
            return bali.catalog({
                $module: '$S3Repository',
                $url: this.getURL()
            });
        },

        /**
         * This function returns a reference to this document repository.
         * 
         * @returns {Reference} A reference to this document repository.
         */
        getURL: function() {
            return bali.reference(config.cloudURL);
        },

        /**
         * This function initializes the document repository.  It must be called before any
         * other API function and can only be called once.
         */
        initializeAPI: async function() {
            try {
                this.initializeAPI = undefined;  // can only be called once
            } catch (cause) {
                const exception = bali.exception({
                    $module: '$S3Repository',
                    $function: '$initializeAPI',
                    $exception: '$unexpected',
                    $url: this.getURL(),
                    $text: bali.text('An unexpected error occurred while attempting to initialize the API.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function checks to see whether or not a certificate is associated with the
         * specified identifier.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being checked.
         * @returns {Boolean} Whether or not the certificate exists.
         */
        certificateExists: async function(certificateId) {
            try {
                const filename = certificateId + '.ndoc';
                const exists = await doesExist(config.certificateBucket, filename);
                return exists;
            } catch (cause) {
                const exception = bali.exception({
                    $module: '$S3Repository',
                    $function: '$certificateExists',
                    $exception: '$unexpected',
                    $url: this.getURL(),
                    $certificateId: certificateId ? bali.text(certificateId) : bali.NONE,
                    $text: bali.text('An unexpected error occurred while attempting to see if a certificate exists.')
                }, cause);
                if (debug) console.error(exception.toString());
                throw exception;
            }
        },

        /**
         * This function attempts to retrieve the specified certificate from the repository.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being fetched.
         * @returns {String} The canonical source string for the certificate, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchCertificate: async function(certificateId) {
            try {
                var certificate;
                const filename = certificateId + '.ndoc';
                const exists = await doesExist(config.certificateBucket, filename);
                if (exists) {
                    certificate = await s3.getObject({Bucket: config.certificateBucket, Key: filename});
                    certificate = certificate.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return certificate;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$fetchCertificate',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $certificateId: certificateId ? bali.text(certificateId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function creates a new certificate in the repository.
         * 
         * @param {String} certificateId The unique identifier (including version number) for
         * the certificate being created.
         * @param {String} certificate The canonical source string for the certificate.
         */
        createCertificate: async function(certificateId, certificate) {
            try {
                const filename = certificateId + '.ndoc';
                const exists = await doesExist(config.certificateBucket, filename);
                if (exists) {
                    throw bali.exception({
                        $module: '$S3Repository',
                        $function: '$createCertificate',
                        $exception: '$fileExists',
                        $url: this.getURL(),
                        $file: bali.text(filename),
                        $text: bali.text('The file to be written already exists.')
                    });
                }
                const document = certificate + EOL;  // add POSIX compliant <EOL>
                await s3.putObject({Bucket: config.certificateBucket, Key: filename});
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$createCertificate',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $certificateId: certificateId ? bali.text(certificateId) : bali.NONE,
                    $certificate: certificate || bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
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
            try {
                const filename = draftId + '.ndoc';
                const exists = await doesExist(config.draftBucket, filename);
                return exists;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$draftExists',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $draftId: draftId ? bali.text(draftId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
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
            try {
                var draft;
                const filename = draftId + '.ndoc';
                const exists = await doesExist(config.draftBucket, filename);
                if (exists) {
                    draft = await s3.getObject({Bucket: config.draftBucket, Key: filename});
                    draft = draft.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return draft;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$fetchDraft',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $draftId: draftId ? bali.text(draftId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function updates an existing draft document in the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being updated.
         * @param {String} draft The canonical source string for the draft document.
         */
        saveDraft: async function(draftId, draft) {
            try {
                const filename = draftId + '.ndoc';
                const exists = await doesExist(config.draftBucket, filename);
                if (!exists) {
                    throw bali.exception({
                        $module: '$S3Repository',
                        $function: '$updateDraft',
                        $exception: '$fileMissing',
                        $url: this.getURL(),
                        $file: bali.text(filename),
                        $text: bali.text('The file to be updated does not exist.')
                    });
                }
                const document = draft + EOL;  // add POSIX compliant <EOL>
                await s3.putObject({Bucket: config.draftBucket, Key: filename});
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$updateDraft',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $draftId: draftId ? bali.text(draftId) : bali.NONE,
                    $draft: draft || bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function attempts to delete the specified draft document from the repository.
         * 
         * @param {String} draftId The unique identifier (including version number) for
         * the draft document being deleted.
         */
        deleteDraft: async function(draftId) {
            try {
                const filename = draftId + '.ndoc';
                const exists = await doesExist(config.draftBucket, filename);
                if (exists) {
                    await s3.deleteObject({Bucket: config.draftBucket, Key: filename});
                }
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$deleteDraft',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $draftId: draftId ? bali.text(draftId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
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
            try {
                const filename = documentId + '.ndoc';
                const exists = await doesExist(config.documentBucket, filename);
                return exists;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$documentExists',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $documentId: documentId ? bali.text(documentId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
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
            try {
                var document;
                const filename = documentId + '.ndoc';
                const exists = await doesExist(config.documentBucket, filename);
                if (exists) {
                    document = await s3.getObject({Bucket: config.documentBucket, Key: filename});
                    document = document.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return document;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$fetchDocument',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $documentId: documentId ? bali.text(documentId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function creates a new document in the repository.
         * 
         * @param {String} documentId The unique identifier (including version number) for
         * the document being created.
         * @param {String} document The canonical source string for the document.
         */
        createDocument: async function(documentId, document) {
            try {
                const filename = documentId + '.ndoc';
                const exists = await doesExist(config.documentBucket, filename);
                if (exists) {
                    throw bali.exception({
                        $module: '$S3Repository',
                        $function: '$createDocument',
                        $exception: '$fileExists',
                        $url: this.getURL(),
                        $file: bali.text(filename),
                        $text: bali.text('The file to be written already exists.')
                    });
                }
                document = document + EOL;  // add POSIX compliant <EOL>
                await s3.putObject({Bucket: config.documentBucket, Key: filename});
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$createDocument',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $documentId: documentId ? bali.text(documentId) : bali.NONE,
                    $document: document || bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function checks to see whether or not a type is associated with the
         * specified identifier.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being checked.
         * @returns {Boolean} Whether or not the type exists.
         */
        typeExists: async function(typeId) {
            try {
                const filename = typeId + '.ndoc';
                const exists = await doesExist(config.typeBucket, filename);
                return exists;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$typeExists',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $typeId: typeId ? bali.text(typeId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function attempts to retrieve the specified type from the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being fetched.
         * @returns {String} The canonical source string for the type, or
         * <code>undefined</code> if it doesn't exist.
         */
        fetchType: async function(typeId) {
            try {
                var type;
                const filename = typeId + '.ndoc';
                const exists = await doesExist(config.typeBucket, filename);
                if (exists) {
                    type = await s3.getObject({Bucket: config.typeBucket, Key: filename});
                    type = type.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                }
                return type;
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$fetchType',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $typeId: typeId ? bali.text(typeId) : bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function creates a new type in the repository.
         * 
         * @param {String} typeId The unique identifier (including version number) for
         * the type being created.
         * @param {String} type The canonical source string for the type.
         */
        createType: async function(typeId, type) {
            try {
                const filename = typeId + '.ndoc';
                const exists = await doesExist(config.typeBucket, filename);
                if (exists) {
                    throw bali.exception({
                        $module: '$S3Repository',
                        $function: '$createType',
                        $exception: '$fileExists',
                        $url: this.getURL(),
                        $file: bali.text(filename),
                        $text: bali.text('The file to be written already exists.')
                    });
                }
                const document = type + EOL;  // add POSIX compliant <EOL>
                await s3.putObject({Bucket: config.typeBucket, Key: filename});
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$createType',
                    $exception: '$directoryAccess',
                    $url: this.getURL(),
                    $typeId: typeId ? bali.text(typeId) : bali.NONE,
                    $type: type || bali.NONE,
                    $text: bali.text('The S3 repository could not be accessed.')
                }, exception);
            }
        },

        /**
         * This function adds a new message onto the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @param {String} message The canonical source string for the message.
         */
        queueMessage: async function(queueId, message) {
            const messageId = bali.tag().getValue();
            try {
                const filename = queueId + '/' + messageId + '.ndoc';
                const exists = await doesExist(config.queueBucket, filename);
                if (exists) {
                    throw bali.exception({
                        $module: '$S3Repository',
                        $function: '$queueMessage',
                        $exception: '$messageExists',
                        $message: bali.text(filename),
                        $text: bali.text('The message to be written already exists.')
                    });
                }
                const document = message + EOL;  // add POSIX compliant <EOL>
                await s3.putObject({Bucket: config.queueBucket, Key: filename});
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$queueMessage',
                    $exception: '$queueAccess',
                    $queueId: queueId ? bali.text(queueId) : bali.NONE,
                    $messageId: messageId ? bali.text(messageId) : bali.NONE,
                    $text: bali.text('The S3 repository not be accessed.')
                }, exception);
            }
        },

        /**
         * This function removes a message (at random) from the specified queue in the repository.
         * 
         * @param {String} queueId The unique identifier for the queue.
         * @returns {String} The canonical source string for the message.
         */
        dequeueMessage: async function(queueId) {
            try {
                var message;
                while (true) {
                    const messages = (await s3.listObjects({Bucket: config.queueBucket, Prefix: queueId, MaxKeys: 64})).Contents;
                    const count = messages.length;
                    if (count) {
                        // select a message a random since a distributed queue cannot guarantee FIFO
                        const index = bali.random.index(count) - 1;  // convert to zero based indexing
                        const filename = messages[index].Key;
                        message = await s3.getObject({Bucket: config.queueBucket, Key: filename});
                        message = message.toString().slice(0, -1);  // remove POSIX compliant <EOL>
                        try {
                            await s3.deleteObject({Bucket: config.queueBucket, Key: filename});
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
            } catch (exception) {
                throw bali.exception({
                    $module: '$S3Repository',
                    $function: '$dequeueMessage',
                    $exception: '$queueAccess',
                    $queueId: queueId ? bali.text(queueId) : bali.NONE,
                    $text: bali.text('The S3 repository not be accessed.')
                }, exception);
            }
        }

    };
};


// PRIVATE FUNCTIONS

const doesExist = async function(bucket, filename) {
    var exists = true;
    try {
        await s3.headObject({Bucket: bucket, Key: filename});
    } catch (exception) {
        if (exception.code === 'NotFound') {
            // the file does not exist
            exists = false;
        } else {
            // something else went wrong
            throw exception;
        }
    }
    // the file exists
    return exists;
};
