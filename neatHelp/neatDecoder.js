(function(exports, selfBrowser, isBrowser){


    var fastConnectionArray = [];
    var activationFunctionArray = [];

    var neatDecoder = exports;
    var cppnNode = isBrowser ? selfBrowser['cppnNode'] : require('../../CPPN.js/components/cppnNode.js');
    var cppns = isBrowser ? selfBrowser['cppn'] : require('../../CPPN.js/cppns/cppn.js');
    var cppnConnection = isBrowser ? selfBrowser['cppnConnection'] : require('../../CPPN.js/components/cppnConnection.js');
    var neatGenome = isBrowser ? selfBrowser['neatGenome'] : require('../genome/neatGenome.js');


    neatDecoder.DecodeToFloatFastConcurrentNetwork = function(ng, activationFunction)
    {
        var outputNeuronCount = ng.outputNeuronCount;
        var neuronGeneCount = ng.nodes.length;

        // Slightly inefficient - determine the number of bias nodes. Fortunately there is not actually
        // any reason to ever have more than one bias node - although there may be 0.

        activationFunctionArray = [];
        for(var i=0; i < neuronGeneCount; i++){
            activationFunctionArray.push("");
        }

        var nodeIdx=0;
        for(; nodeIdx<neuronGeneCount; nodeIdx++)
        {
            activationFunctionArray[nodeIdx] = ng.nodes[nodeIdx].activationFunction;
            if(ng.nodes[nodeIdx].type !=  cppnNode.NodeType.bias)
                break;
        }
        var biasNodeCount = nodeIdx;
        var inputNeuronCount = ng.inputNodeCount;
        for (; nodeIdx < neuronGeneCount; nodeIdx++)
        {
            activationFunctionArray[nodeIdx] = ng.nodes[nodeIdx].activationFunction;
        }

        // ConnectionGenes point to a neuron ID. We need to map this ID to a 0 based index for
        // efficiency.

        // Use a quick heuristic to determine which will be the fastest technique for mapping the connection end points
        // to neuron indexes. This is heuristic is not 100% perfect but has been found to be very good in in real word
        // tests. Feel free to perform your own calculation and create a more intelligent heuristic!
        var  connectionCount= ng.connections.length;

        fastConnectionArray = [];
        for(var i=0; i< connectionCount; i++){
            fastConnectionArray.push(new cppnConnection.CPPNConnection(0,0,0));
        }

        var nodeTable = {};// neuronIndexTable = new Hashtable(neuronGeneCount);
        for(var i=0; i<neuronGeneCount; i++)
            nodeTable[ng.nodes[i].gid] = i;

        for(var connectionIdx=0; connectionIdx<connectionCount; connectionIdx++)
        {
            //fastConnectionArray[connectionIdx] = new FloatFastConnection();
            //Note. Binary search algorithm assume that neurons are ordered by their innovation Id.
            var connection = ng.connections[connectionIdx];
            fastConnectionArray[connectionIdx].sourceIdx = nodeTable[connection.sourceID];
            fastConnectionArray[connectionIdx].targetIdx = nodeTable[connection.targetID];

            //save this for testing!
//                System.Diagnostics.Debug.Assert(fastConnectionArray[connectionIdx].sourceNeuronIdx>=0 && fastConnectionArray[connectionIdx].targetNeuronIdx>=0, "invalid idx");

            fastConnectionArray[connectionIdx].weight = connection.weight;
            fastConnectionArray[connectionIdx].learningRate = connection.learningRate;
            fastConnectionArray[connectionIdx].a = connection.a;
            fastConnectionArray[connectionIdx].b = connection.b;
            fastConnectionArray[connectionIdx].c = connection.c;

//                connectionIdx++;
        }

        // Now sort the connection array on sourceNeuronIdx, secondary sort on targetNeuronIdx.
        // Using Array.Sort is 10 times slower than the hand-coded sorting routine. See notes on that routine for more
        // information. Also note that in tests that this sorting did no t actually improve the speed of the network!
        // However, it may have a benefit for CPUs with small caches or when networks are very large, and since the new
        // sort takes up hardly any time for even large networks, it seems reasonable to leave in the sort.
        //Array.Sort(fastConnectionArray, fastConnectionComparer);
        //if(fastConnectionArray.Length>1)
        //	QuickSortFastConnections(0, fastConnectionArray.Length-1);

        return new cppns.CPPN(biasNodeCount, inputNeuronCount,
            outputNeuronCount, neuronGeneCount,
            fastConnectionArray, activationFunctionArray);

    };


    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatDecoder']={}: exports, this, typeof exports === 'undefined'? true : false);
