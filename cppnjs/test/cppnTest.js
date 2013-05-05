var assert = require('assert');
var should = require('should');
var fs = require('fs');

var utilities = require('../utility/utilities.js');
var cppns = require('../cppns/cppn.js');
var cppnConnection = require('../components/cppnConnection.js');
var cppnNode = require('../components/cppnNode.js');
var cppnActivationFactory = require('../activationFunctions/cppnActivationFactory.js');

describe('Testing cppns against a known working file',function(){

    it('TestCPPNS(): testing overall cppns', function(done){

        fs.readFile(__dirname  + '/testgenomes.json', 'utf8', function (err,data) {
            if (err) {
                console.log(err);
                throw err;
            }
            //we need to parse the data, and create some cppns!

            var dataObject = JSON.parse(data);

            var testNetworks  = dataObject['networks'];
            for(var i=0; i < testNetworks.length; i++)
            {
                //grab our network, we'll need to parse
                var networkJSON = testNetworks[i];

                var nodesAndConnections = networkJSON['network'];

                var connections = [];
                //turn our connections into actual connections!
                for(var c=0; c< nodesAndConnections.connections.length; c++)
                {
                    var loadedConn = nodesAndConnections.connections[c];
                    connections.push(
                        new cppnConnection.CPPNConnection(loadedConn.sourceNeuronIdx, loadedConn.targetNeuronIdx, loadedConn.weight));
                }

                var activationFunctions = [];
                for(var af =0; af < nodesAndConnections.activationFunctions.length; af++)
                {
                    activationFunctions.push(
                        cppnActivationFactory.Factory.getActivationFunction(nodesAndConnections.activationFunctions[af].FunctionId));
                }

                var cppn = new cppns.CPPN(
                    nodesAndConnections.BiasNeuronCount,
                    nodesAndConnections.InputNeuronCount,
                    nodesAndConnections.OutputNeuronCount,
                    nodesAndConnections.TotalNeuronCount,
                    connections,
                    nodesAndConnections.biasList,
                    activationFunctions
                );
                var dupcppn = new cppns.CPPN(
                    nodesAndConnections.BiasNeuronCount,
                    nodesAndConnections.InputNeuronCount,
                    nodesAndConnections.OutputNeuronCount,
                    nodesAndConnections.TotalNeuronCount,
                    connections,
                    nodesAndConnections.biasList,
                    activationFunctions
                );

                //now fetch our inputs/outputs
                var tests = networkJSON['tests'];
                for(var t=0; t< tests.length; t++)
                {
                    var inputs = tests[t]['inputs'];
                    cppn.clearSignals();
                    cppn.setInputSignals(inputs);

                    dupcppn.clearSignals();
                    dupcppn.setInputSignals(inputs);

                    cppn.neuronSignals[0].should.equal(1);//nodesAndConnections.biasList[0]);

                    for(var check=cppn.biasNeuronCount; check < cppn.inputNeuronCount + cppn.biasNeuronCount; check++){
                        cppn.neuronSignals[check].should.equal(inputs[check-cppn.biasNeuronCount]);
                    }

//                    cppn.recursiveActivation();
                    cppn.multipleSteps(30);
                    dupcppn.recursiveActivation();

                    var outputs = tests[t]['outputs'];
                    for(var o=0; o < outputs.length; o++)
                    {
                        //output signals should be equal, no matter what type of activation
                        cppn.getOutputSignal(o).should.equal(dupcppn.getOutputSignal(o));
                        parseFloat(Math.abs(outputs[o] - dupcppn.getOutputSignal(o)).toFixed(5)).should.be.lessThan(.0001);
//   console.log('Difference: ' + Math.abs(parseFloat(outputs[o].toFixed(8)) - parseFloat(cppn.getOutputSignal(o).toFixed(8))));
//                        console.log('Difference: ' + Math.abs(parseFloat(outputs[o].toFixed(5)) - parseFloat(dupcppn.getOutputSignal(o).toFixed(5))));
//                        console.log('DiffBetween: ' + Math.abs(parseFloat(dupcppn.getOutputSignal(o).toFixed(14)) - parseFloat(cppn.getOutputSignal(o).toFixed(14))));
//                        console.log('OutSignals: ' + cppn.getOutputSignal(o) + ' actual: ' +
//                            outputs[o]);
//                        dupcppn.getOutputSignal(o).should.equal(outputs[o]);
                    }
                }
            }

            done();


//        console.log(data);
        });

    })


});