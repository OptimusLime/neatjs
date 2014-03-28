var assert = require('assert');
var should = require('should');
var fs = require('fs');
var util = require('util');
var xml2js = require('xml2js');

var genomeSharpToJS = require('../utility/genomeSharpToJS.js');

describe('Testing C# to JS Genome converstion',function(){

    it('should correclty load an example iesor seed genome', function(done){

        var attrkey = '$';
        var parser = new xml2js.Parser({explicitArray : false, attrkey: attrkey, mergeAttrs: true});


        parser.addListener('end', function(result) {


            var genome = result['genome'];

            //slightly confusing, but how it's parsed by xml2js
            var neurons = genome['neurons']['neuron'];
            var connections = genome['connections']['connection'];

//            console.log(util.inspect(genome, false, null));

//            console.log(genome);
            //now we should have a defined genome, let's pass it along
            var ng = genomeSharpToJS.ConvertCSharpToJS(genome);


            ng.nodes.length.should.equal(neurons.length);
            ng.connections.length.should.equal(connections.length);

            for(var n =0; n < ng.nodes.length; n++)
            {
                var node = ng.nodes[n];
                var other = neurons[n];

                node.gid.should.equal((other.id));
                node.activationFunction.should.equal(other.activationFunction);
                node.layer.should.equal(parseFloat(other.layer));
                node.nodeType.should.equal(genomeSharpToJS.NeuronTypeToNodeType(other.type));
            }
            for(var c =0; c < ng.connections.length; c++)
            {
                var conn = ng.connections[c];
                var other = connections[c];
                other.weight = parseFloat(other.weight);

                conn.gid.should.equal((other['innov-id']))
                parseFloat(conn.weight.toFixed(3)).should.equal(parseFloat(other.weight.toFixed(3)));
                conn.sourceID.should.equal((other['src-id']));
                conn.targetID.should.equal((other['tgt-id']));
            }

            done();
        });

        fs.readFile(__dirname  + '/exampleGenome.xml', 'utf8', function (err,data) {
            if (err) {
                console.log(err);
                throw err;
            }
            //we need to parse the data, and create some genomes!
            parser.parseString(data);//, function (err, result) {



        });
    });
});
