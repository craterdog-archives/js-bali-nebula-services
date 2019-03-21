'use strict';

const path = require('path');
const childProcess = require('child_process');

// wrapper function for grunt configuration
module.exports = function(grunt) {

  grunt.initConfig({

    // read in the package information
    pkg: grunt.file.readJSON('package.json'),

    // grunt-eslint plugin configuration (lint for JS)
    eslint: {
      options: {
      },
      target: [
        'Gruntfile.js',
        'src/**/*.js',
        'test/**/*.js'
      ]
    },

    // grunt-contrib-clean plugin configuration (clean up files)
    clean: {
      build: [
        'dist/*',
        'test/config/'
      ],
      options: {
        force: false
      }
    },

    exec: {
      cleanDrafts: {
        command: 'aws s3api delete-object --bucket craterdog-bali-drafts-us-west-2 --key BXC15F9H0V4AJVTHJHN1B6VA8PZP4S51v1.2.3.ndoc',
        stdout: false,
        stderr: false
      },
      cleanDocuments: {
        command: 'aws s3api delete-object --bucket craterdog-bali-documents-us-west-2 --key 454J79TXY3799ZL8VNG2G4SBMVDFVPBVv3.4.ndoc',
        stdout: false,
        stderr: false
      }
    },

    // grunt-mocha-test plugin configuration (unit testing)
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          timeout: 10000 
        },
        src: [
          'test/**/*.js'
        ]
      }
    },

    // grunt-webpack plugin configuration (concatenates and removes whitespace)
    webpack: {
      clientConfig: {
        target: 'web',
        mode: 'development',
        node: {
          fs: "empty"  // required work-around for webpack bug
        },
        entry: './index.js',
        output: {
          path: path.resolve(__dirname, 'dist'),
          filename: 'lib-web.js',
          library: 'notary'
        }
      },
      serverConfig: {
        target: 'node',
        mode: 'development',
        entry: './index.js',
        output: {
          path: path.resolve(__dirname, 'dist'),
          filename: 'lib-node.js',
          library: 'notary'
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask('build', 'Build the module.', ['clean:build', 'exec', 'eslint', 'mochaTest']);
  grunt.registerTask('package', 'Package the libraries.', ['clean:build', 'exec', 'eslint', 'mochaTest', 'webpack']);
  grunt.registerTask('default', 'Default targets.', ['build']);

};
