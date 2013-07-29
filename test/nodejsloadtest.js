var cppnjs = require('cppn');
var neatjs = require('../neatjs.js');


var assert = require('assert');
var should = require('should');
var fs = require('fs');

describe('Testing loading of neatjs AND cppnjs in nodejs',function(){

    it('Loading components should work fine', function(done){

        //we should be able to load everything now
        for(var lib in neatjs.scripts)
        {
            for(var script in neatjs.scripts[lib])
            {
                var loadedScript = neatjs.loadLibraryFile(lib, script);
                (loadedScript === undefined).should.not.equal(true);
            }
        }

        done();
    });
});

