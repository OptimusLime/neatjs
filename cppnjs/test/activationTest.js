var assert = require('assert');
var should = require('should');
var fs = require('fs');

var utilities = require('../utility/utilities.js');
var cppnActivationFactory = require('../activationFunctions/cppnActivationFactory.js');

describe('Testing activations against a known working file',function(){

    it('TestActivation(): testing overall activation functions', function(done){

        fs.readFile(__dirname  + '/testfunctions.json', 'utf8', function (err,data) {
            if (err) {
                console.log(err);
                throw err;
            }

            //we need to parse the data, and create some cppns!

            var dataObject = JSON.parse(data);

            var testFunctions  = dataObject['functions'];
            for(var i=0; i < testFunctions.length; i++)
            {
                //grab our network, we'll need to parse
                var functionJSON = testFunctions[i];

                var functionID = functionJSON['functionID'];
//                console.log('Testing: ' + functionID);

                var actFunction = cppnActivationFactory.Factory.getActivationFunction(functionID);

                //now fetch our inputs/outputs
                var tests = functionJSON['tests'];
                for(var t=0; t< tests.length; t++)
                {
                    var input = tests[t]['in'];
                    var output = tests[t]['out'];

                    parseFloat(output.toFixed(9)).should.equal(parseFloat(actFunction.calculate(input).toFixed(9)));
                }
            }

            done();
//        console.log(data);
        });

    })


});