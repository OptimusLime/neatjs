//Convert between C# SharpNEAT Genotype encoded in XML into a JS genotype in JSON
//pretty simple

/**
 * Module dependencies.
 */

var NeatGenome = require('../genome/neatGenome.js');
var NeatNode = require('../genome/neatNode.js');
var NeatConnection = require('../genome/neatConnection.js');
var NodeType = require('../types/nodeType.js');


/**
 * Expose `GenomeConverter`.
 */

var converter = {};

//we export the convert object, with two functions
module.exports = converter;

converter.NeuronTypeToNodeType = function(type)
{
    switch(type)
    {
        case "bias":
            return NodeType.bias;
        case "in":
            return NodeType.input;
        case "out":
            return NodeType.output;
        case "hid":
            return NodeType.hidden;
        default:
            throw new Error("inpropper C# neuron type detected");
    }
};

converter.ConvertCSharpToJS = function(xmlGenome)
{

    //we need to parse through a c# version of genome, and make a js genome from it

    var aNeurons = xmlGenome['neurons']['neuron'] || xmlGenome['neurons'];
    var aConnections = xmlGenome['connections']['connection'] || xmlGenome['connections'];


    //we will use nodes and connections to make our genome
    var nodes = [], connections = [];
    var inCount = 0, outCount = 0;

    for(var i=0; i < aNeurons.length; i++)
    {
        var csNeuron = aNeurons[i];
        var jsNode = new NeatNode(csNeuron.id, csNeuron.activationFunction, csNeuron.layer, {type: converter.NeuronTypeToNodeType(csNeuron.type)});
        nodes.push(jsNode);

        if(csNeuron.type == 'in') inCount++;
        else if(csNeuron.type == 'out') outCount++;
    }

    for(var i=0; i < aConnections.length; i++)
    {
        var csConnection = aConnections[i];
        var jsConnection = new NeatConnection(csConnection['innov-id'], csConnection.weight, {sourceID:csConnection['src-id'], targetID: csConnection['tgt-id']});
        connections.push(jsConnection);
    }

    var ng = new NeatGenome(xmlGenome['id'], nodes, connections, inCount, outCount);
    ng.adaptable = (xmlGenome['adaptable'] == 'True');
    ng.modulated = (xmlGenome['modulated'] == 'True');
    ng.fitness = xmlGenome['fitness'];
    ng.realFitness = xmlGenome['realfitness'];
    ng.age = xmlGenome['age'];

    return ng;
};
