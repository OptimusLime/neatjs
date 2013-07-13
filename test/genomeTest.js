var assert = require('assert');
var should = require('should');


console.log('Testing Neat Genome function by function')




describe('Creating a new genome',function(){

    var neatGenome = require('../genome/neatGenome.js');
    var neatNode = require('../genome/neatNode.js');
    var neatConnection = require('../genome/neatConnection.js');
    var cantorPair = require('../utility/cantorPair');
    var cppnActivationFactory = require('../cppnjs/activationFunctions/cppnActivationFactory.js');
    var neatParameters = require('../neatHelp/neatParameters.js');
    var utilities = require('../cppnjs/utility/utilities.js');
    var neatHelp = require('../neatHelp/neatHelp.js');
    var cppnNode = require('../cppnjs/components/cppnNode.js');

    var crNode = function(gid){
        return new neatNode.NeatNode(gid,
            cppnActivationFactory.Factory.getRandomActivationFunction(),
            10, {inCount:1, outCount:1});
    };
    var crConnection = function(gid)
    {
        return new neatConnection.NeatConnection(gid, Math.random(), utilities.next(100), utilities.next(100));
    };

    var createRandomObject = function(previous, objFunction)
    {
        var gid = Math.floor(Math.random()*100000);
        while(previous[gid])
            gid = Math.floor(Math.random()*100000);


        var node = objFunction(gid);
        previous[gid] = node;
        return node;
    };


    var createNodesAndConnections = function(nodeCount, connectionCount)
    {
        var previousNodes = {};
        var previousConns = {};
        var nodeList = [], connectionList = [];

        for(var i=0; i < nodeCount;i++)
        {
            var node = createRandomObject(previousNodes, crNode);
            nodeList.push(node);
        }

        for(var i=0; i < connectionCount;i++)
        {
            var connection = createRandomObject(previousConns, crConnection);
            connectionList.push(connection);
        }

        return {nodes: nodeList, connections: connectionList};
    };

    var createSimpleGenome = function(ins, outs, weightRange, connProp, existing){
        return neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connProp, connectionWeightRange: weightRange}, existing);
    };

    var verifyNodesAndConnections = function(ng, weightRange)
    {
        var bias = 0, ins = 0, outs = 0;
        ng.nodes.forEach(function(node){
            (typeof node.gid).should.equal('number');
            (typeof node.activationFunction).should.equal('string');
            (typeof node.layer).should.equal('number');
            (typeof node.type).should.equal('string');
            if(node.type == cppnNode.NodeType.input)
                ins++;
            else if(node.type == cppnNode.NodeType.output)
                outs++;
            else if(node.type == cppnNode.NodeType.bias)
                bias++;

        });

        //number of input nodes is correct
        ins.should.equal(ng.inputNodeCount);
        //number of output nodes is correct
        outs.should.equal(ng.outputNodeCount);
        //one bias node
        bias.should.equal(1);

        ng.connections.forEach(function(connection){
            (typeof connection.gid).should.equal('number');
            (typeof connection.sourceID).should.equal('number');
            (typeof connection.targetID).should.equal('number');
            (typeof connection.weight).should.equal('number');

            connection.weight.should.be.within(-weightRange/2, weightRange/2);

        });



    };

    //Need to test
//   done - neatGenome.Help.nextGenomeID()
//   done - neatGenome.Help.nextInnovationID()
//   done - neatGenome.Help.insertByInnovation()
//   done - neatGenome.Help.CreateGIDLookup()

    it('nextGenomeID/currentGenomeID/resetGenome(): GenomeID generator should not equal previous genomeid', function(done){

        var lastID = neatGenome.Help.nextGenomeID();
        var currentID;

        var testLength = 100;
        for(var i=0; i < testLength;i++)
        {
            currentID = neatGenome.Help.nextGenomeID();
            currentID.should.not.equal(lastID);
            currentID.should.equal(neatGenome.Help.currentGenomeID()-1);
            lastID = currentID;
        }

        var reset = Math.floor(Math.random()*300);
        neatGenome.Help.resetGenomeID(reset);
        neatGenome.Help.currentGenomeID().should.equal(reset);

        done();
    });


    it('nextInnovationID/currentInnovation/resetInnovation(): InnovationID should not equal previous innovation ', function(done){

        var startIx = 0;

        var lastID = neatGenome.Help.nextInnovationID();//startIx++);
        var currentID;

        var testLength = 1010;
        for(var i=0; i < testLength;i++)
        {
            currentID = neatGenome.Help.nextInnovationID();//startIx++);
            currentID.should.not.equal(lastID);
//            currentID.should.equal(startIx-1);//neatGenome.Help.currentInnovationID()-1);
            lastID = currentID;
        }

        var reset = Math.floor(Math.random()*300);
        neatGenome.Help.resetInnovationID(reset);
        neatGenome.Help.currentInnovationID().should.equal(reset);
        done();
    });

    it('insertByInnovation(): insertByInnovation should insert correctly', function(done){


        var connection;
        var connectionList = [];
        var testConnectionLength = 10;
        var gid, sourceID, targetID;

        var previousConns = {};

        for(var i=0; i < testConnectionLength;i++)
        {
            connection = createRandomObject(previousConns, crConnection);
            neatGenome.Help.insertByInnovation(connection, connectionList);

//            console.log('Conn Length: ' + connectionList.length);
            //we should have added an object to the list
            connectionList.length.should.equal(i+1);

            //should have at least 1 item inside, but above operations!
            var lastID = connectionList[0].gid;

            for(var j=1; j< connectionList.length; j++)
            {
                connectionList[j].gid.should.be.above(lastID);
                lastID = connectionList[j].gid;
            }
        }
        done();

    });


    it('CreateGIDLookup(): CreateGIDLookup should create an object indexing a gid array', function(done){
//        var lastID = neatGenome.Help.nextInnovationID();
//        var currentID;

        var previousNodes = {};
        var node;
        var nodeList = [];

        //test with nodes
        var testLength = 20;
        for(var i=0; i < testLength;i++)
        {
            var node = createRandomObject(previousNodes, crNode);
            nodeList.push(node);

            var lookup = neatGenome.Help.CreateGIDLookup(nodeList);
            for(var n=0; n < nodeList.length; n++)
            {
                var nobj = nodeList[n];
                should.exist(lookup[nobj.gid]);
            }
        }
        //then test with connections
        var connection;
        var connectionList = [];
        var previousConns = {};

        testLength = 20;
        for(var i=0; i < testLength;i++)
        {
            var connection = createRandomObject(previousConns, crConnection);
            connectionList.push(connection);

            var lookup = neatGenome.Help.CreateGIDLookup(connectionList);
            for(var n=0; n < connectionList.length; n++)
            {
                var cobj = connectionList[n];
                should.exist(lookup[cobj.gid]);
            }
        }
        done();

    });

    //    need to test - neatGenome.NeatGenome()
    //    neatGenome.NeatGenome.Copy()
    it('NeatGenome(): NeatGenome should create valid neatgenome', function(done){
//        var lastID = neatGenome.Help.nextInnovationID();
        var currentID;

        var nodeCount= Math.floor(20*Math.random() + 3);
        var connectionCount = Math.floor(20*Math.random() + 3);
        var nodesAndConns = createNodesAndConnections(nodeCount,connectionCount);
//        console.log('testing genome with: ' + nodesAndConns.nodes.length + ' nodes and ' + nodesAndConns.connections.length + ' connections');

        var gid = neatGenome.Help.nextGenomeID();
        var ins = 2, outs = 2;
        var genome = new neatGenome.NeatGenome(gid, nodesAndConns.nodes, nodesAndConns.connections, ins, outs);

        genome.gid.should.equal(gid);
        genome.nodes.length.should.equal(nodeCount);
        genome.connections.length.should.equal(connectionCount);

        genome.nodes.should.equal(nodesAndConns.nodes);
        genome.connections.should.equal(nodesAndConns.connections);

        genome.inputNodeCount.should.equal(ins);
        genome.inputAndBiasNodeCount.should.equal(ins+1);
        genome.outputNodeCount.should.equal(outs);
        genome.inputBiasOutputNodeCount.should.equal(genome.inputAndBiasNodeCount + genome.outputNodeCount);
        genome.inputBiasOutputNodeCountMinus2.should.equal(genome.inputBiasOutputNodeCount -2);
        done();

    });


    //test minimal genome function
    it('CreateGenomeByInnovation(): Creating a fully connected minimal genome', function(done){

        var weightRange = 2;
        var connectionProportion = 1;
        var ins = 2;
        var outs = 1;

        //clear out genome IDs and innovation IDs
        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});



        //This should create a fully connected genome

        var totalIn = ins +1, totalOut = outs;
//        console.log('total: ' + totalIn*totalOut + ' conlen: ' + ng.connections.length);
        ng.nodes.length.should.equal(totalIn+ totalOut);
        //number of inputs+bias x number of outputs is the connection count for conProp = 1
        ng.connections.length.should.equal(totalIn*totalOut);

        ng.connections.forEach(function(connection)
        {
            connection.weight.should.be.within(-weightRange/2, weightRange/2);
        });

        //we should have created all nodes with new innovation IDs and all connections with IDs
//        neatGenome.Help.currentInnovationID().should.equal(ng.nodes.length + ng.connections.length);
        neatGenome.Help.nextInnovationID(ng.nodes.length + ng.connections.length).should.equal(ng.nodes.length + ng.connections.length);
        done();

    });

    //test minimal genome function
    it('CreateGenomeByInnovation(): Create a zero-connection minimal genome', function(done){

        //clear out genome IDs and innovation IDs
        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();
        //want to test another connectionProportion -- only way to not fail is 0 proportion
        //nothing should be created
        var weightRange = 2;
        var connectionProportion = 0;
        var ins = 2;
        var outs = 1;
        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});

        //This should create a zero-connected genome
        var totalIn = ins +1, totalOut = outs;
        ng.nodes.length.should.equal(totalIn+ totalOut);
        //number of inputs+bias x number of outputs is the connection count for conProp = 1
        ng.connections.length.should.equal(0);

        //we should have created all nodes with new innovation IDs and all connections with IDs
        neatGenome.Help.nextInnovationID(ng.nodes.length + ng.connections.length).should.equal(ng.nodes.length + ng.connections.length);
//        neatGenome.Help.currentInnovationID().should.equal(ng.nodes.length + ng.connections.length);

        done();
    });

    //testing neat paramters is skipped, cause it's just checking default for no reason
    //Basically too many numbers
//    it('NeatParamters(): Create default neatparameters', function(done){
//
//    });


    it('mutate_AddNode(): should add node to genome', function(done){

        var weightRange = 2;
        var connectionProportion = 1;
        var ins = 2;
        var outs = 1;
        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});

        var np = neatParameters.NeatParameters();
        var newNodeTable = {} ,connectionLookup, nodeLookup;

        var testCount = 50;
        for(var i=0; i < testCount; i++)
        {
            var prevNodeCount = ng.nodes.length;
            var prevConnCount = ng.connections.length;

            //created a minimal genome, now let's add a node!
            ng.mutate_AddNode(newNodeTable);

            nodeLookup = neatGenome.Help.CreateGIDLookup(ng.nodes);
            connectionLookup = neatGenome.Help.CreateGIDLookup(ng.connections);

            for(var key in newNodeTable){
                //you should be half of your src/tgt layers!
                newNodeTable[key].node.layer.should.equal((nodeLookup[connectionLookup[key].sourceID].layer + nodeLookup[connectionLookup[key].targetID].layer)/2);
            }

            //we added a node
            ng.nodes.length.should.equal(prevNodeCount +1);
            //we added 2 connections
            ng.connections.length.should.equal(prevConnCount + 2);



            for(var nKey in nodeLookup){
                nodeLookup[nKey] = 0;
            }

            var duplicates = 0;
            ng.nodes.forEach(function(node){
                nodeLookup[node.gid]++;

                //if there is a duplicate count it
                if(nodeLookup[node.gid] > 1)
                    duplicates++;

            });

            var keyCount = 0;
            for(var key in newNodeTable)
            {
                keyCount++;
//                console.log(key);
            }

            //we should either have a new key, or a duplicate -- together, this equals node count
            (keyCount+duplicates).should.equal(i+1);

            //when we add nodes, they get tacked onto nodes, and we added a node, so it should be a hidden node
            ng.nodes[ng.nodes.length-1].type.should.equal(cppnNode.NodeType.hidden);

        }


        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);


        done();

    });
    it('mutateConnectionWeight(): should mutate a connection weight', function(done){

        var weightRange = 2;
        var connectionProportion = 1;
        var ins = 2;
        var outs = 1;
        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});

        ng.connections.forEach(function(connection)
        {
            connection.weight.should.be.within(-weightRange/2, weightRange/2);
        });

        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        for(var i=0; i < np.connectionMutationParameterGroupList.length; i++)
        {
            var randomConnection = ng.connections[utilities.next(ng.connections.length)];
            var prevWeight = randomConnection.weight;
            ng.mutateConnectionWeight(randomConnection, np, np.connectionMutationParameterGroupList[i]);
            randomConnection.should.not.equal(prevWeight);
        }

        ng.connections.forEach(function(connection)
        {
            connection.weight.should.be.within(-weightRange/2, weightRange/2);
        });


        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();

    });

    it('mutate_ConnectionWeights(): should mutate many connection weights', function(done){

        var weightRange = 2;
        var connectionProportion = 1;
        var ins = 2;
        var outs = 1;
        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});



        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        var setCMPGProperties = function(neatp, pert, pertFact, sel, prop, quantity){
            //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
            //no matter what
            for(var c=0; c< neatp.connectionMutationParameterGroupList.length; c++){
                var cmpg = neatp.connectionMutationParameterGroupList[c];
                cmpg.perturbationType = pert;
                cmpg.perturbationFactor = pertFact;

                cmpg.selectionType =sel;
                cmpg.proportion = prop;
                cmpg.quantity = quantity;
            }
        };

        var diffCount = function(connections, connLookup){
            var dif = 0;

            connections.forEach(function(connection){
                if(connection.weight !== connLookup[connection.gid])
                    dif++;
            });

            return dif;
        };

        var checkMutationAndRange = function(connections){
            connections.forEach(function(connection){
                connection.isMutated.should.equal(false);
                connection.weight.should.be.within(-weightRange/2, weightRange/2);
            });
        };


        var connLookup, different,fixed;
        var tests = 500;
        for(var i=0; i < tests; i++)
        {
            //weights should be changed, we need to keep track of all connections
            connLookup = neatGenome.Help.CreateGIDLookup(ng.connections);

            //reprogram lookup to have original connection weight
            for(var cKey in connLookup) { connLookup[cKey] = connLookup[cKey].weight;}

            switch(i%6)
            {
                case 0:

                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.jiggleEven, .05,
                                        neatParameters.ConnectionSelectionType.proportional, 1, 0);

                    //now let's call mutate connections, knowing that our type is proportional, and
                    //chance of mutation is 100%
                    ng.mutate_ConnectionWeights(np);

                    //EVERY connection should be mutated, make sure of this
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != ng.connections.length){
                        var maxedOutCount = 0;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOutCount++;
                            }

                        }
                        //our different weights, and our maxed out weights should some to all connections
                        (different + maxedOutCount).should.equal(ng.connections.length);
                    }
                    else{
                        different.should.equal(ng.connections.length);
                    }

                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
                case 1:

                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.jiggleEven,.05,
                        neatParameters.ConnectionSelectionType.proportional, 0, 0);

                    //now let's call mutate connections, knowing that our type is proportional, and
                    //chance of mutation is 0%, we expect 1 connection to be mutated
                    ng.mutate_ConnectionWeights(np);

                    //ONLY ONE connection should be mutated, make sure of this
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != 1){
                        var maxedOut = false;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOut = true;
                                break;
                            }

                        }
                        maxedOut.should.equal(true);
                    }
                    else{
                        //number of different connections should be equal to 1,
                        //since we used proportional with 0 proportion chance
                        different.should.equal(1);
                    }
                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
                case 2:

                    fixed = Math.floor(ng.connections.length/2);
                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.jiggleEven,.05,
                        neatParameters.ConnectionSelectionType.fixedQuantity, 0, fixed);

                    ng.connections.length.should.not.equal(0);
                    fixed.should.not.equal(0);

                    //now let's call mutate connections, knowing that our type is fixedQuantity, and
                    //fixed number of connections will be changed
                    ng.mutate_ConnectionWeights(np);

                    //check number of differences
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails, any idea why?

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != fixed){
                        var maxedOut = false;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOut = true;
                                break;
                            }

                        }
                        maxedOut.should.equal(true);
                    }
                    else{
                        //number of different connections should be equal to quantity for fixed quantity
                        different.should.equal(fixed);
                    }

                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
                case 3:

                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.reset, .05,
                        neatParameters.ConnectionSelectionType.proportional, 1, 0);

                    //now let's call mutate connections, knowing that our type is proportional, and
                    //chance of mutation is 100%
                    ng.mutate_ConnectionWeights(np);

                    //EVERY connection should be mutated, make sure of this
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != ng.connections.length){
                        var maxedOutCount = 0;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOutCount++;
                            }

                        }
                        //our different weights, and our maxed out weights should some to all connections
                        (different + maxedOutCount).should.equal(ng.connections.length);
                    }
                    else{
                        different.should.equal(ng.connections.length);
                    }

                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
                case 4:

                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.reset,.05,
                        neatParameters.ConnectionSelectionType.proportional, 0, 0);

                    //now let's call mutate connections, knowing that our type is proportional, and
                    //chance of mutation is 0%, we expect 1 connection to be mutated
                    ng.mutate_ConnectionWeights(np);

                    //ONLY ONE connection should be mutated, make sure of this
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != 1){
                        var maxedOut = false;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOut = true;
                                break;
                            }

                        }
                        maxedOut.should.equal(true);
                    }
                    else{
                        //number of different connections should be equal to 1,
                        //since we used proportional with 0 proportion chance
                        different.should.equal(1);
                    }

                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
                case 5:

                    fixed = Math.floor(ng.connections.length/2);
                    //there is a roulette wheel inside of the mutate connection function, make sure it picks the same thing
                    //no matter what
                    setCMPGProperties(np, neatParameters.ConnectionPerturbationType.reset,.05,
                        neatParameters.ConnectionSelectionType.fixedQuantity, 0, fixed);

                    //now let's call mutate connections, knowing that our type is fixedQuantity, and
                    //fixed number of connections will be changed
                    ng.mutate_ConnectionWeights(np);

                    //check number of differences
                    different = diffCount(ng.connections, connLookup);

                    //this occasionally fails because somthing that's at the weight range limit, might be mutated
                    //but it's still psat the range, and gets reset
                    if(different != fixed){
                        var maxedOut = false;
                        for(var c=0; c< ng.connections.length; c++)
                        {
                            if(ng.connections[c].weight == -np.connectionWeightRange/2 || ng.connections[c].weight == np.connectionWeightRange/2)
                            {
                                maxedOut = true;
                                break;
                            }

                        }
                        maxedOut.should.equal(true);
                    }
                    else{
                        //number of different connections should be equal to quantity for fixed quantity
                        different.should.equal(fixed);
                    }

                    //check range and if the connections are marked not mutated
                    checkMutationAndRange(ng.connections);

                    break;
            }
        }

        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();

    });


    //Test mustations!
//    done- genome.mutate_AddNode(newNodeTable, np);
//    mutate_ConnectionWeights()
//    mutateConnectionWeight()
//    genome.mutate_AddConnection(newConnectionTable,np);


    it('mutate_AddConnection(): should add connection to genome', function(done){

        var weightRange = 2;
        var connectionProportion = 1;
        var ins = 2;
        var outs = 1;
        var ng = neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connectionProportion, connectionWeightRange: weightRange});

        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        var newConnectionTable = {};
        var testCount = 20;
        var addCount = 0;
        for(var i=0; i < testCount; i++)
        {
            var prevConnCount = ng.connections.length;
            var prevConnectionTableCount = 0;
            for(var ckey in newConnectionTable){prevConnectionTableCount++;}

            //created a minimal genome, now let's add a connection!
            var addedConnection = ng.mutate_AddConnection(newConnectionTable, np);

            if(addedConnection)
            {
                addCount++;
                //we added a connection
                ng.connections.length.should.equal(prevConnCount + 1);


                var ctCount = 0;
                for(var ckey in newConnectionTable){ctCount++;}
                ctCount.should.equal(addCount);
            }
            //else
            // we mutated, which we already test above, no worries here!

        }

        //be pure chance, this should be true!
        addCount.should.be.greaterThan(0);

        ng.connections.forEach(function(connection){
            connection.isMutated.should.equal(false);
            connection.weight.should.be.within(-weightRange/2, weightRange/2);
        });
        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();

    });


    it('testForExistingConnectionInnovation(): should find previous connection to genome', function(done){

        var ng = createSimpleGenome(2,1, 2, 1);

        var randomConnection = ng.connections[utilities.next(ng.connections.length)];
        var testCount = ng.connections.length;
        for(var i=0; i < testCount; i++){
            //make sure we can find a connection selected at random
            ng.testForExistingConnectionInnovation(randomConnection.sourceID, randomConnection.targetID).should.equal(randomConnection);
        }
        //do a fake test for negative innovation (not possible)
         var isNull = (ng.testForExistingConnectionInnovation(-2,-2) == null);
        isNull.should.equal(true);

        done();
    });

//    isNeuronConnected
    it('isNeuronConnected(): check for connected neuron', function(done){

        var ng = createSimpleGenome(4,2, 2, 1);

        //add a hidden node! We don't care about keeping track.
        ng.mutate_AddNode({});

        //all nodes should be connected!
        ng.nodes.forEach(function(node){
            ng.isNeuronConnected(node.gid).should.equal(true);
        });

        //now we create a genome with no connections, everything should be disconnected
        ng = createSimpleGenome(4,2, 2, 0);

        //all nodes should be connected!
        ng.nodes.forEach(function(node){
            ng.isNeuronConnected(node.gid).should.equal(false);
        });


        done();
    });
//    isNeuronRedundant
    it('isNeuronRedundant(): check for redundant neuron', function(done){

        var ng = createSimpleGenome(4,2, 2, 1);
        //add a hidden node!
        ng.mutate_AddNode({});

        //create lookup for node checking
        var nodeLookup = neatGenome.Help.CreateGIDLookup(ng.nodes);

        //all nodes should be connected, therefore, there are no redundant connections
        ng.nodes.forEach(function(node){
            ng.isNeuronRedundant(nodeLookup,node.gid).should.equal(false);
        });

        //now we create a genome with no connections, everything should be disconnected
        ng = createSimpleGenome(4,2, 2, 1);


        //add a hidden node!
        ng.mutate_AddNode({});

        //no more connections, bye!
        ng.connections = [];

        //create lookup for node checking
        nodeLookup = neatGenome.Help.CreateGIDLookup(ng.nodes);

        ng.nodes.forEach(function(node){
            //all hidden nodes should be redundant because there aren't any connections
            if(node.type == cppnNode.NodeType.hidden)
                ng.isNeuronRedundant(nodeLookup,node.gid).should.equal(true);
            //all input/output will be not redundant by constrcution (can't remove inputs/outputs duh!)
            else
                ng.isNeuronRedundant(nodeLookup,node.gid).should.equal(false);
        });

        done();
    });



//    done- genome.mutate_DeleteConnection();
//    genome.mutate_DeleteSimpleNeuronStructure(newConnectionTable, np);
//    genome.mutate_ConnectionWeights(np);
    it('mutate_DeleteConnection(): should delete connection from genome', function(done){

        var weightRange= 2;
        var ng = createSimpleGenome(2,1, weightRange, 1);

        //add a hidden node!
        ng.mutate_AddNode({});

        var hiddenNode;
        var hiddenGid;
        var hiddenConnections = [];
        for(var i=ng.nodes.length-1; i >= 0; i--)
        {
            if(ng.nodes[i].type == cppnNode.NodeType.hidden)
            {
                hiddenNode = ng.nodes[i];
                hiddenGid = ng.nodes[i].gid;
                break;
            }
        }
        ng.connections.forEach(function(connection){

            if(connection.sourceID == hiddenNode.gid || connection.targetID == hiddenNode.gid)
                hiddenConnections.push(connection);
        });

        //now we know which one is the hidden node, lets remove all connections to and from the hidden node, thereby deleting it!

        var withHiddenNode = ng.nodes.length;
        var prevLength = ng.connections.length;
        while(hiddenConnections.length){

            ng.mutate_DeleteConnection(hiddenConnections[0]);

//            console.log('Delete: ');
//            console.log(hiddenConnections[0]);
//            console.log(' From: ');
//            console.log(ng.connections);
            //none of our connections should equal what we removed!
            ng.connections.forEach(function(connection){
                connection.gid.should.not.equal(hiddenConnections[0].gid);
            });

            //cut out the hidden connetions, since we removed them!
            hiddenConnections.splice(0,1);

            //make sure we've removed some connection!
            ng.connections.length.should.equal(prevLength-1);
            prevLength = ng.connections.length;
        }

        //we deleted the hidden node!
        ng.nodes.length.should.equal(withHiddenNode-1);

        //check that it's deleted
        ng.nodes.forEach(function(node){
            node.gid.should.not.equal(hiddenGid);
        });

        //then proceed to delete connections until there aren't any left!
        var nodeCount = ng.nodes.length;

        while((prevLength = ng.connections.length)){

            //let's delete connections forever!
            //remove random connections
            ng.mutate_DeleteConnection();

            //obviously we have one less connection duhhhhh
            ng.connections.length.should.equal(prevLength-1);
        }

        //everything that's not a hidden node can't be deleted, so we should have the same node count
        ng.nodes.length.should.equal(nodeCount);
        //this should do nothing!
        ng.mutate_DeleteConnection();

        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();
    });

    it('buildNeuronConnectionLookupTable(): should build node lookup with incoming/outgoing connections', function(done){

        var ins = 3;
        var outs = 2;
        var weightRange = 2;
        //fully conencted simple genome, 3 inputs 2 outputs, -1,1 weight range, chance of connection = 100%
        var ng = createSimpleGenome(ins, outs, weightRange, 1);
        //need some parameters
        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        //add a hidden node!
        var hiddenInfo = {}, hiddenNodeInfo;
        ng.mutate_AddNode(hiddenInfo);
        for(var key in hiddenInfo){hiddenNodeInfo = hiddenInfo[key];}

        (hiddenNodeInfo.node == null).should.not.equal(true);
        (hiddenNodeInfo.connection1 == null).should.not.equal(true);
        (hiddenNodeInfo.connection2 == null).should.not.equal(true);

        var connectionInfo = {}, selfConn;
        //add a self connection for the hidden node!
        ng.mutate_AddConnection(connectionInfo, np, {source:hiddenNodeInfo.node, target: hiddenNodeInfo.node});
        for(var key in connectionInfo){selfConn = connectionInfo[key];}

        (selfConn == null).should.not.equal(true);

        var lookup = ng.buildNeuronConnectionLookupTable();

        var nodeLookup = neatGenome.Help.CreateGIDLookup(ng.nodes);
        var info;

        var count =0;
        for(var lKey in lookup){

            count++;

            var node = nodeLookup[lKey];
            info = lookup[lKey];

            switch(node.type)
            {
                //only 1 hidden node!
                case cppnNode.NodeType.hidden:

                    info.node.should.equal(hiddenNodeInfo.node);
                    //two incoming, one for the self connection, and one for the connection made during add node
                    info.incoming.length.should.equal(2);

                    info.incoming.forEach(function(inConn){
                        (inConn.gid == hiddenNodeInfo.connection1.gid
                            || inConn.gid == selfConn.gid ).should.equal(true);
                    });

                    //two outgoing - same reason, one for the self connection, and one for the connection made during add node
                    info.outgoing.length.should.equal(2);

                    info.outgoing.forEach(function(outConn){
                        (outConn.gid == hiddenNodeInfo.connection2.gid
                            || outConn.gid == selfConn.gid ).should.equal(true);
                    });

                    break;
                case cppnNode.NodeType.bias:
                case cppnNode.NodeType.input:

                    //check our incoming connections = 0, and outgoing = number of outputs || number of outputs +1
                    info.incoming.length.should.equal(0);
                    (info.outgoing.length == outs || info.outgoing.length == outs +1).should.equal(true);

                    break;
                case cppnNode.NodeType.output:

                    //check our incoming connections = number of inputs + bias || number of inputs + bias + 1,
                    (info.incoming.length == ins +1 || info.incoming.length == (ins+2)).should.equal(true);
                    //and outgoing = 0
                    info.outgoing.length.should.equal(0);

                    break;
                default:
                    throw new Error("Unknown Node Type");
            }
        }

        //make sure we have as many keys as we do nodes, duh!
        count.should.equal(ng.nodes.length);

        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();
    });

    it('removeSimpleNeuron(): should delete neuron and structure from genome', function(done){

        var weightRange = 2;
        //fully conencted simple genome, 3 inputs 2 outputs, -1,1 weight range, chance of connection = 100%
        var ng = createSimpleGenome(3, 2, weightRange, 1);

        //add a hidden node!
        var hiddenInfo = {};
        ng.mutate_AddNode(hiddenInfo);

        var hiddenNode;
        var hiddenGid;
        var hiddenConnections = [];
        for(var key in hiddenInfo){
            hiddenNode = hiddenInfo[key].node;
            hiddenGid = hiddenNode.gid;
            hiddenConnections.push( hiddenInfo[key].connection1);
            hiddenConnections.push( hiddenInfo[key].connection2);
            break;
        }

        hiddenNode.type.should.equal(cppnNode.NodeType.hidden);

        //need some parameters
        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        var connectionInfo = {};
        var selfCon ;
        //add a self connection for the hidden node!
        ng.mutate_AddConnection(connectionInfo, np, {source:hiddenNode, target: hiddenNode});

        //go grab the self connections
        for(var key in connectionInfo){
            selfCon = connectionInfo[key];
            break;
        }

        selfCon.sourceID.should.equal(hiddenNode.gid);
        selfCon.targetID.should.equal(hiddenNode.gid);


        var prevLength = ng.nodes.length;
        var prevConnLength = ng.connections.length;
        connectionInfo = neatGenome.Help.CreateGIDLookup(ng.connections);
        var nodeConnLookup = ng.buildNeuronConnectionLookupTable();
        //so now we want to remove our hidden node
        //we expect all the hidden connections to be removed, and the self connection as well
        ng.removeSimpleNeuron(nodeConnLookup, hiddenNode.gid, connectionInfo, np);

        ng.nodes.forEach(function(node)
        {
            node.gid.should.not.equal(hiddenNode.gid);
        });

        ng.nodes.length.should.equal(prevLength -1);


        //none of our connections should exist between the hidden node, and the self connection should be gone too
        ng.connections.forEach(function(connection){
            hiddenConnections.forEach(function(hConn){
                connection.gid.should.not.equal(hConn.gid);
            });
           connection.gid.should.not.equal(selfCon.gid);
        });

        //remove all hidden
        ng.connections.length.should.equal(prevConnLength - hiddenConnections.length - 1);

        //make sure gid and variables were assigned correctly
        verifyNodesAndConnections(ng, weightRange);

        done();
    });

//    genome.mutate_DeleteSimpleNeuronStructure(newConnectionTable, np);
    //removeSimpleNeuron
    it('mutate_DeleteSimpleNeuronStructure(): should delete neuron and structure from genome', function(done){

        var weightRange = 2;
        //fully conencted simple genome, 3 inputs 2 outputs, -1,1 weight range, chance of connection = 100%
        var ng = createSimpleGenome(3, 2, weightRange, 1);

        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        var newConnectionTable = {};

        //we need to create a simple structure for deleting!
        //add a hidden node!
        var hiddenInfo = {}, hiddenNodeInfo;
        ng.mutate_AddNode(hiddenInfo);
        for(var key in hiddenInfo){hiddenNodeInfo = hiddenInfo[key];}

        (hiddenNodeInfo.node == null).should.not.equal(true);
        (hiddenNodeInfo.connection1 == null).should.not.equal(true);
        (hiddenNodeInfo.connection2 == null).should.not.equal(true);

        var connectionInfo = {}, selfConn;
        //add a self connection for the hidden node!
        ng.mutate_AddConnection(connectionInfo, np, {source:hiddenNodeInfo.node, target: hiddenNodeInfo.node});
        for(var key in connectionInfo){selfConn = connectionInfo[key];}
        (selfConn == null).should.not.equal(true);

        hiddenInfo = {};
        //now, in order to create a simple node (1 input/1 output) we can simply split the self connection - mwahaha!
        ng.mutate_AddNode(hiddenInfo, selfConn);

        //again, we track down the hidden node we created!
        for(var key in hiddenInfo){hiddenNodeInfo = hiddenInfo[key];}
        (hiddenNodeInfo.node == null).should.not.equal(true);
        (hiddenNodeInfo.connection1 == null).should.not.equal(true);
        (hiddenNodeInfo.connection2 == null).should.not.equal(true);

        //this is what we expect to delete in the next step!
        var didDelete = ng.mutate_DeleteSimpleNeuronStructure(newConnectionTable, np);

        //first of all, we should have triggered a deletion given our above structure
        didDelete.should.equal(true);

        //we also need to verify that the node no longer exists, nor do connections referencing the node
        ng.nodes.forEach(function(node){
           node.gid.should.not.equal(hiddenNodeInfo.node.gid);
        });

        ng.connections.forEach(function(connection){
            connection.gid.should.not.equal(hiddenNodeInfo.connection1.gid);
            connection.gid.should.not.equal(hiddenNodeInfo.connection2.gid);
            connection.sourceID.should.not.equal(hiddenNodeInfo.node.gid);
            connection.targetID.should.not.equal(hiddenNodeInfo.node.gid);
        });


        //run delete check again
        //this time, there isn't a simple structure to remove, so we should remove a connection, check for that
        var prevLength = ng.connections.length;
        didDelete = ng.mutate_DeleteSimpleNeuronStructure(newConnectionTable, np);

        didDelete.should.equal(false);
        ng.connections.length.should.equal(prevLength-1);

        //all tested, final step as usual
        //make sure gid and variables were assigned correctly -- i.e. we still have a valid genome
        verifyNodesAndConnections(ng, weightRange);

        done();
    });
    //mutate -- make sure at least 1 mutation happens!
    it('mutate(): should do at least 1 mutation, that means weight change, add/delete connection, or add/delete node', function(done){


        var frozenConnections = {};
        var frozenNodes = {};
        var metaInformation = {};

        var snapShotGenome = function(genome, snapNodes, snapConnections, meta)
        {
            var nCount= 0;
            var cCount = 0;
            genome.nodes.forEach(function(node){
                snapNodes[node.gid] = {gid: node.gid, type: node.type, activationFunction: node.activationFunction.functionID, layer: node.layer};
                nCount++;
            });

            genome.connections.forEach(function(connection){
                snapConnections[connection.gid] = {gid: connection.gid, sourceID: connection.sourceID, targetID: connection.targetID, weight: connection.weight};
                cCount ++;
            });

            meta.nodeCount = nCount; meta.connectionCount = cCount;
        };


        var ins = 3;
        var outs = 2;
        var weightRange = 2;
        //simple fully connected genome with "ins" number of inputs (+ 1 for bias), "outs" number of outputs
        var ng = createSimpleGenome(ins, outs,weightRange, 1);

        //need some parameters to do some mutating yo, keep it standard
        var np = new neatParameters.NeatParameters();
        np.connectionWeightRange = weightRange;

        var testLength = 500;
        var newNodeTable = {};
        var newConnectionTable = {};
        var lastMutation;
        //we've going to modify the neuron testLength number of times, and check what happens each time! Making sure SOMETHING happened
        for(var i=0; i< testLength; i++)
        {

            //take a snapshot of the genome characteristics, we'll use this to check for a mutation at all!
            snapShotGenome(ng, frozenNodes, frozenConnections, metaInformation);

            //now do the dirty deed of mutating
            lastMutation = ng.mutate(newNodeTable, newConnectionTable, np);

            //we check if something happened
            var mutationOccured = false;

            //if the connections or nodes have increased, a quick easy way to determine if mutation happened!
            mutationOccured = ng.nodes.length != metaInformation.nodeCount || ng.connections.length != metaInformation.connectionCount;

            if(!mutationOccured)
            {
                var weightMax = false;
                //we have to go through the connections looking for weight changes
                ng.connections.forEach(function(connection)
                {
                    mutationOccured = mutationOccured || connection.weight != frozenConnections[connection.gid].weight;

                    weightMax = weightMax || connection.weight == -weightRange/2 || connection.weight == weightRange/2;
                });

                //if no mutation occurred, there should be a weight that's at the max
                mutationOccured = mutationOccured || weightMax;
            }

            //obviously, something should have happened!
            mutationOccured.should.equal(true);

            //prep these guys for going again!
            frozenNodes = {}; frozenConnections = {}; metaInformation = {};
        }

        //all tested, final step as usual
        //make sure gid and variables were assigned correctly -- i.e. we still have a valid genome
        verifyNodesAndConnections(ng, weightRange);

        done();
    });

    //createOffspringAsexual -- make sure our id is different
    //mutate is tested above, so this function comes for free!
    it('createOffspringAsexual(): should create a new genome with correct mutation', function(done){

        var np = new neatParameters.NeatParameters();
        //3 in, 2 out, 2 weightRange, 100% connected
        var ng = createSimpleGenome(3,2,np.connectionWeightRange,1);

        var cloneChange = ng.createOffspringAsexual({},{},np);

        //Please don't duplicate genome ids!
        cloneChange.gid.should.not.equal(ng.gid);

        verifyNodesAndConnections(ng, np.connectionWeightRange);

        done();
    });


    it('createOffspringSexual_AddGene(): should add a gene to the connection table', function(done){

        var np = new neatParameters.NeatParameters();
        //3 in, 2 out, 2 weightRange, 0% connected
        var ng = createSimpleGenome(3,2,np.connectionWeightRange,0);

        var connectionList =[], connectionTable = {};

        var weight = (2*utilities.nextDouble()-1)*np.connectionWeightRange/2;
        var input = utilities.next(ng.inputAndBiasNodeCount);
        var output = utilities.next(ng.outputNodeCount) + ng.inputAndBiasNodeCount;



        //create a new connection between two nodes, no big deal
        var connection = new neatConnection.NeatConnection(neatGenome.Help.nextInnovationID(), weight, {sourceID: ng.nodes[input].gid, targetID:ng.nodes[output].gid});
        connection.cat = true;
        //this should add connection to connectionTable
        neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, connection);

        var cCount = 0;
        for(var key in connectionTable){
            cCount++;
            //our length should equal 0 -- only have 1 addition
            connectionTable[key].should.equal(0);
        }

        //only added one connection
        cCount.should.equal(1);
        connectionList.length.should.equal(1);
        connectionList[0].weight.should.equal(weight);
        //we should not have stored the connection object directly
        //we create a copy
        (connectionList[0].cat === undefined).should.equal(true);

        var cloneWeight = (2*utilities.nextDouble()-1)*np.connectionWeightRange/2;
        //this should come into contact with a previous connection, and with overwrite, should be overwritten
        var cloneConnection = neatConnection.NeatConnection.Copy(connection);
        cloneConnection.weight = cloneWeight;
        cloneConnection.monkey = true;


        //nothing should happen here! We already exist, and we're not changing jack!
        neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, cloneConnection, false);

        //we check again
        cCount = 0;
        for(var key in connectionTable){
            cCount++;
            //our length should equal 0 -- only have 1 addition
            connectionTable[key].should.equal(0);
        }
        //only added one connection
        cCount.should.equal(1);
        connectionList.length.should.equal(1);
        //we shouldn't have overridden the weight
        connectionList[0].weight.should.equal(weight);
        //we shouldn't be the same OBJECT
        (connectionList[0].monkey === undefined).should.equal(true);


        neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, cloneConnection, true);

        //we check again
        cCount = 0;
        for(var key in connectionTable){
            cCount++;
            //our length should equal 0 -- only have 1 addition
            connectionTable[key].should.equal(0);
        }
        //only added one connection
        cCount.should.equal(1);
        connectionList.length.should.equal(1);
        //we should have overridden the weight
        connectionList[0].weight.should.equal(cloneWeight);
        //we shouldn't be the same OBJECT
        (connectionList[0].monkey === undefined).should.equal(true);

        verifyNodesAndConnections(ng, np.connectionWeightRange);

        done();
    });

    it('correlateConnectionListsByInnovation(): Part 1- should correlate two connection lists using gid', function(done){

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        var np = new neatParameters.NeatParameters();
        var ins = 3, outs = 2;
        var existing = {};


        //fully connected simple network
        var ng1 = createSimpleGenome(ins, outs, np.connectionWeightRange, 1,existing);

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();
        var ng2 = createSimpleGenome(ins, outs, np.connectionWeightRange, 1,existing);

        //equal conns and nodes, should be!
        ng1.connections.length.should.equal(ng2.connections.length);
        ng1.nodes.length.should.equal(ng2.nodes.length);


        //Should create identical network- in terms of connections and nodes
        //first we test the correlation list with identical objects, from each genome
        var correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);
        var correlationBackwards =  neatGenome.Help.correlateConnectionListsByInnovation(ng2.connections, ng1.connections);

        //everything should come back matched for this, with connections being saved correctly

        var deltaWeight = 0;
        correlation.correlationList.forEach(function(correlationItem){
            correlationItem.correlationType.should.equal(neatHelp.CorrelationType.matchedConnectionGenes);
            correlationItem.connection1.gid.should.equal(correlationItem.connection2.gid);
            deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
        });

        correlation.correlationStatistics.excessConnectionCount.should.equal(0);
        correlation.correlationStatistics.disjointConnectionCount.should.equal(0);
        correlation.correlationStatistics.matchingCount.should.equal(ng1.connections.length);
        correlation.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);

        //we repeat for the backwards version, making sure everything is okey-dokey in reverse order
        deltaWeight = 0;
        correlationBackwards.correlationList.forEach(function(correlationItem){
            correlationItem.correlationType.should.equal(neatHelp.CorrelationType.matchedConnectionGenes);
            correlationItem.connection1.gid.should.equal(correlationItem.connection2.gid);
            deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
        });

        correlationBackwards.correlationStatistics.excessConnectionCount.should.equal(0);
        correlationBackwards.correlationStatistics.disjointConnectionCount.should.equal(0);
        correlationBackwards.correlationStatistics.matchingCount.should.equal(ng1.connections.length);
        correlationBackwards.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);
        //should be the same, forwards and backwards since our nodes/connections are completely matched!


        //now we remove a connection on one genome, but not the other, rerun our tests
        var ixToRemove = utilities.next(ng1.connections.length);
        var removeConn1 = ng1.connections[ixToRemove];

//        var removeConn2 = ng2.connections[ixToRemove];
//        //same order for teh connections, should imply same index => same gid
//        removeConn1.gid.should.equal(removeConn2.gid);

        ng1.mutate_DeleteConnection(removeConn1);

        //a quick check to make sure our connection was removed
        (ng1.connections[ixToRemove] === undefined || ng1.connections[ixToRemove].gid != removeConn1.gid).should.equal(true);


        //now run it, should have 1 disjoint or excess depending on who you're asking
        correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);
        correlationBackwards =  neatGenome.Help.correlateConnectionListsByInnovation(ng2.connections, ng1.connections);




        //we look at the changes in the correlation lists
        deltaWeight = 0;
        correlation.correlationList.forEach(function(correlationItem){
            if(correlationItem.correlationType == neatHelp.CorrelationType.matchedConnectionGenes)
            {
                deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
            }
            else
            {
                //the shorter list ends first, and connection is excess
                (correlationItem.connection1 == null).should.equal(true);
                //we're either excess or disjoint, either way, we should equal the connection we removed above
                correlationItem.connection2.gid.should.equal(removeConn1.gid);
            }
        });

        var maxLength = Math.max(ng1.connections.length, ng2.connections.length);
        (correlation.correlationStatistics.excessConnectionCount + correlation.correlationStatistics.disjointConnectionCount + correlation.correlationStatistics.matchingCount).should.equal(maxLength);

        //either 1 is disjoint or the other is excess
        (correlation.correlationStatistics.excessConnectionCount == 1 || correlation.correlationStatistics.disjointConnectionCount == 1).should.equal(true);
        (correlation.correlationStatistics.excessConnectionCount + correlation.correlationStatistics.disjointConnectionCount).should.equal(1);

        //1 should be off from matching!
        correlation.correlationStatistics.matchingCount.should.equal(maxLength-1);
        //still summing the weight correclty (checking)
        correlation.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);


        //we repeat for the backwards version, making sure everything is okey-dokey in reverse order
        deltaWeight = 0;
        correlationBackwards.correlationList.forEach(function(correlationItem){
            if(correlationItem.correlationType == neatHelp.CorrelationType.matchedConnectionGenes)
            {
                deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
            }
            else
            {
                //we're either excess or disjoint, either way, we should equal the connection we removed above
                correlationItem.connection1.gid.should.equal(removeConn1.gid);

                //the shorter list ends first, and connection is excess
                (correlationItem.connection2 == null).should.equal(true);
            }
        });

        //these characteristics should be true, forwards and backwards
        maxLength = Math.max(ng1.connections.length, ng2.connections.length);
        (correlationBackwards.correlationStatistics.excessConnectionCount + correlationBackwards.correlationStatistics.disjointConnectionCount + correlationBackwards.correlationStatistics.matchingCount).should.equal(maxLength);

        (correlationBackwards.correlationStatistics.excessConnectionCount + correlationBackwards.correlationStatistics.disjointConnectionCount).should.equal(1);

        //either 1 is disjoint or the other is excess
        (correlationBackwards.correlationStatistics.excessConnectionCount == 1 || correlationBackwards.correlationStatistics.disjointConnectionCount == 1).should.equal(true);

        //1 should be off from matching!
        correlationBackwards.correlationStatistics.matchingCount.should.equal(maxLength-1);
        //still summing the weight correclty (checking)
        correlationBackwards.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);


        done();
    });


    it('correlateConnectionListsByInnovation(): Part 2- should correlate two connection lists using gid', function(done){

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        var np = new neatParameters.NeatParameters();
        var ins = 3, outs = 2;
        var existing = {};
        //fully connected simple network
        var ng1 = createSimpleGenome(ins, outs, np.connectionWeightRange, 1, existing);

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();
        var ng2 = createSimpleGenome(ins, outs, np.connectionWeightRange, 1, existing);

        //equal conns and nodes, should be!
        ng1.connections.length.should.equal(ng2.connections.length);
        ng1.nodes.length.should.equal(ng2.nodes.length);

        //now we remove a connection on one genome, and a distinct one from the other, rerun our tests
        var ixToRemove = utilities.next(ng1.connections.length);
        var ixToRemove2 = utilities.next(ng2.connections.length);
        while(ixToRemove2 == ixToRemove)
            ixToRemove2 = utilities.next(ng2.connections.length);

        var removeConn1 = ng1.connections[ixToRemove];
        var removeConn2 = ng2.connections[ixToRemove2];

        var originalLength = ng1.connections.length;

//        var removeConn2 = ng2.connections[ixToRemove];
//        //same order for teh connections, should imply same index => same gid
//        removeConn1.gid.should.equal(removeConn2.gid);

        ng1.mutate_DeleteConnection(removeConn1);
        ng2.mutate_DeleteConnection(removeConn2);

        //a quick check to make sure our connections were removed
        (ng1.connections[ixToRemove] === undefined || ng1.connections[ixToRemove].gid != removeConn1.gid).should.equal(true);
        (ng2.connections[ixToRemove2] === undefined || ng2.connections[ixToRemove2].gid != removeConn2.gid).should.equal(true);

        ng1.connections.length.should.equal(ng2.connections.length);

        //now run it, should have 1 disjoint AND 1 excess depending on who you're asking, and what was removed
        var correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);
        var correlationBackwards =  neatGenome.Help.correlateConnectionListsByInnovation(ng2.connections, ng1.connections);

        //we repeat for the backwards version, making sure everything is okey-dokey in reverse order
        var deltaWeight = 0;
        correlation.correlationList.forEach(function(correlationItem){
            if(correlationItem.correlationType == neatHelp.CorrelationType.matchedConnectionGenes)
            {
                deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
            }
            else
            {
                //either way, one should be null
                (correlationItem.connection1 == null || correlationItem.connection2 == null).should.equal(true);

                // if conn1 is null, then it's an excess/disjoint connection2, therefore it must be correlated with the connection
                //we removed from the first genome!
                if(correlationItem.connection1 == null)
                {
                    correlationItem.connection2.gid.should.equal(removeConn1.gid);
                }
                else if(correlationItem.connection2 == null)
                {
                    correlationItem.connection1.gid.should.equal(removeConn2.gid);
                }

            }
        });

        //all summed up, we should have the correct number of connections (max of the two lists)
        (correlation.correlationStatistics.excessConnectionCount + correlation.correlationStatistics.disjointConnectionCount + correlation.correlationStatistics.matchingCount).should.equal(originalLength);

        //either 1 is disjoint and 1 excess, OR 2 disjoint connections == sum must be two though
        ((correlation.correlationStatistics.excessConnectionCount == 1 && correlation.correlationStatistics.disjointConnectionCount == 1)
            || (correlation.correlationStatistics.disjointConnectionCount == 2)).should.equal(true);

        //2 should be off from matching, 1 different per genome!
        correlation.correlationStatistics.matchingCount.should.equal(originalLength-2);
        //still summing the weight correclty (checking)
        correlation.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);

        (correlation.correlationStatistics.excessConnectionCount + correlation.correlationStatistics.disjointConnectionCount).should.equal(2);

        //we repeat for the backwards version, making sure everything is okey-dokey in reverse order
        deltaWeight = 0;
        correlationBackwards.correlationList.forEach(function(correlationItem){
            if(correlationItem.correlationType == neatHelp.CorrelationType.matchedConnectionGenes)
            {
                deltaWeight += Math.abs(correlationItem.connection1.weight -  correlationItem.connection2.weight);
            }
            else
            {
                //either way, one should be null
                (correlationItem.connection1 == null || correlationItem.connection2 == null).should.equal(true);

                // if conn1 is null, then it's an excess/disjoint connection2, therefore it must be correlated with the connection
                //we removed from the first genome! -- flipped for being backwards
                if(correlationItem.connection1 == null)
                {
                    correlationItem.connection2.gid.should.equal(removeConn2.gid);
                }
                else if(correlationItem.connection2 == null)
                {
                    correlationItem.connection1.gid.should.equal(removeConn1.gid);
                }

            }
        });

        //all summed up, we should have the correct number of connections before the mutations
        (correlationBackwards.correlationStatistics.excessConnectionCount + correlationBackwards.correlationStatistics.disjointConnectionCount + correlationBackwards.correlationStatistics.matchingCount)
            .should.equal(originalLength);

        //either 1 is disjoint and 1 excess, OR 2 disjoint connections == sum must be two though
        ((correlationBackwards.correlationStatistics.excessConnectionCount == 1 && correlationBackwards.correlationStatistics.disjointConnectionCount == 1)
            || (correlationBackwards.correlationStatistics.disjointConnectionCount == 2)).should.equal(true);

        //1 should be off from matching!
        correlationBackwards.correlationStatistics.matchingCount.should.equal(originalLength-2);
        //still summing the weight correclty (checking)
        correlationBackwards.correlationStatistics.connectionWeightDelta.should.equal(deltaWeight);

        (correlationBackwards.correlationStatistics.excessConnectionCount + correlationBackwards.correlationStatistics.disjointConnectionCount).should.equal(2);

        done();
    });



    it('correlateConnectionListsByInnovation(): Part 3- should correlate with empty lists', function(done){

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        var np = new neatParameters.NeatParameters();
        var ins = 3, outs = 2;

        //fully connected simple network
        var ng = createSimpleGenome(ins, outs, np.connectionWeightRange, 1);
        var emptyConnections = [];

        //now run it, using some empties
        var correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng.connections, emptyConnections);
        var correlationBackwards =  neatGenome.Help.correlateConnectionListsByInnovation(emptyConnections, ng.connections);

        //all supposed to be excess
        correlation.correlationList.forEach(function(correlationItem){
            correlationItem.correlationType.should.equal(neatHelp.CorrelationType.excessConnectionGene);
            (correlationItem.connection1 != null).should.equal(true);
            (correlationItem.connection2 == null).should.equal(true);
        });

        correlation.correlationStatistics.excessConnectionCount.should.equal(ng.connections.length);

        //all excess genomes
        correlationBackwards.correlationList.forEach(function(correlationItem){
            correlationItem.correlationType.should.equal(neatHelp.CorrelationType.excessConnectionGene);
            (correlationItem.connection1 == null).should.equal(true);
            (correlationItem.connection2 != null).should.equal(true);
        });

        correlationBackwards.correlationStatistics.excessConnectionCount.should.equal(ng.connections.length);

        var emptyResults =  neatGenome.Help.correlateConnectionListsByInnovation([],[]);
        emptyResults.correlationList.length.should.equal(0);
        emptyResults.correlationStatistics.excessConnectionCount.should.equal(0);
        emptyResults.correlationStatistics.disjointConnectionCount.should.equal(0);
        emptyResults.correlationStatistics.matchingCount.should.equal(0);


        done();
    });

    it('createOffspringSexual_ProcessCorrelationItem(): should add a gene to the connection table', function(done){

//        connectionList, connectionTable, correlationItem, fitSwitch, combineDisjointExcessFlag)

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        var existing = {};

        //lets create a genome
        var np = new neatParameters.NeatParameters();
        //3 ins, 2 outs, 100% connected
        var ng1 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        //3 ins, 2 outs, 100% connected
        var ng2 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);


        var ixToRemove1 = utilities.next(ng1.connections.length);
        var ixToRemove2 = utilities.next(ng2.connections.length);
        while(ixToRemove2 == ixToRemove1)
            ixToRemove2 = utilities.next(ng2.connections.length);

        ng1.mutate_DeleteConnection(ng1.connections[ixToRemove1]);
        ng2.mutate_DeleteConnection(ng2.connections[ixToRemove2]);

        //create a corrlation list (tested above)
        var correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);


        // Key = connection key, value = index in newConnectionGeneList.
        var newConnectionTable = {};

        //TODO: No 'capacity' constructor on CollectionBase. Create modified/custom CollectionBase.
        // newConnectionGeneList must be constructed on each call because it is passed to a new NeatGenome
        // at construction time and a permanent reference to the list is kept.
        var newConnectionList = [];

        ng1.fitness = 1;

        // A switch that stores which parent is fittest 1 or 2. Chooses randomly if both are equal. More efficient to calculate this just once.
        var fitSwitch;
        if(ng1.fitness > ng2.fitness)
            fitSwitch = 1;
        else if(ng1.fitness < ng2.fitness)
            fitSwitch = 2;
        else
        {	// Select one of the parents at random to be the 'master' genome during crossover.
            if(utilities.nextDouble() < 0.5)
                fitSwitch = 1;
            else
                fitSwitch = 2;
        }

        //fitswitch should be 1
        //ng1 is better than ng2!
        fitSwitch.should.equal(1);

        //we combine disjoint/excess genes
        var combineDisjointExcessFlag = true;// utilities.nextDouble() < np.pDisjointExcessGenesRecombined;
        var connectionList = [], connectionTable = {};
        var lastAdd;
        //all correlations are matchedGenes
        correlation.correlationList.forEach(function(correlationItem){
            //each time, will add a gene
            neatGenome.Help.createOffspringSexual_ProcessCorrelationItem(connectionList,connectionTable, correlationItem, fitSwitch,combineDisjointExcessFlag);
            lastAdd = connectionList[connectionList.length-1];

            if(correlationItem.correlationType == neatHelp.CorrelationType.matchedConnectionGenes){
                //we absorbed either connection1 or connection to into the connectionList
                    //we took one or the other!
                (lastAdd.gid == correlationItem.connection1.gid || lastAdd.gid == correlationItem.connection2.gid).should.equal(true);
            }
            else
            {
                //otherwise we're disjoint/excess, we've done something a little different
                //if we're from the fit parent, and we're disjoint, then we'll be added
                if(fitSwitch == 1 &&  correlationItem.connection1 != null)
                {
                    lastAdd.gid.should.equal(correlationItem.connection1.gid);
                    lastAdd.weight.should.equal(correlationItem.connection1.weight);
                }
                else if(fitSwitch == 2 &&  correlationItem.connection2 != null)
                {
                    lastAdd.gid.should.equal(correlationItem.connection2.gid);
                    lastAdd.weight.should.equal(correlationItem.connection2.weight);
                }
                else
                {
                    //since combineDisjointExcessFlag = true, then we do the combine
                    if(correlationItem.connection1 != null)
                        lastAdd.gid.should.equal(correlationItem.connection1.gid);
                    else if(correlationItem.connection2 != null)
                        lastAdd.gid.should.equal(correlationItem.connection2.gid);
                }
            }
        });

        done();
    });

    it('InOrderInnovation(): should ensure list is sorted by gid', function(done){

        //first we'll construct a fake version
        //then we will test against a mutated genome for trying to break things

        var brokenConnections = [], fakeConnections = [];

        for(var i =0; i < 20; i++)
        {
            brokenConnections.push({gid: utilities.next(100)});
            fakeConnections.push({gid: i});
        }

        neatGenome.Help.InOrderInnovation(fakeConnections).should.equal(true);
        neatGenome.Help.InOrderInnovation(brokenConnections).should.equal(false);


        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        //fully connected, simple genome
        var ng = createSimpleGenome(4,3, 2, 1);

        var np = new neatParameters.NeatParameters();
        var nodeTable = {}, connTable = {};
        var mutationCount = 50;

        for(var i=0; i< mutationCount; i++)
        {
            ng.mutate(nodeTable, connTable, np);
        }

        //check it's connections are in order, and it's nodes
        //as well
        neatGenome.Help.InOrderInnovation(ng.nodes);
        neatGenome.Help.InOrderInnovation(ng.connections);
        done();
    });

//
    it('performIntegrityCheck(): should ensure connections are sorted properly', function(done){

        neatGenome.Help.resetGenomeID();
        neatGenome.Help.resetInnovationID();

        //fully connected, simple genome
        var ng = createSimpleGenome(4,3, 2, 1);

        var np = new neatParameters.NeatParameters();
        var nodeTable = {}, connTable = {};
        var mutationCount = 150;

        for(var i=0; i< mutationCount; i++)
        {
            ng.mutate(nodeTable, connTable, np);
        }

        //this is safe, and keeps things in order, test that it's integrity is maintained
        ng.performIntegrityCheck().should.equal(true);

        var brokenConnections = [], fakeConnections = [];

        for(var i =0; i < 20; i++)
        {
            brokenConnections.push({gid: utilities.next(100)});
            fakeConnections.push({gid: i});
        }
        //these connections are surely out of order!
        ng.connections = brokenConnections;
        ng.performIntegrityCheck().should.equal(false);

        //these connections are not out of order
        ng.connections = fakeConnections;
        ng.performIntegrityCheck().should.equal(true);

        done();
    });
    it('createOffspringSexual(): should combine two genomes like a boss', function(done){

        var testCombinations = 100;
        for(var i=0 ; i < testCombinations; i++){
            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();
            var existing = {};

            //lets create a genome
            var np = new neatParameters.NeatParameters();
            //3 ins, 2 outs, 100% connected
            var ng1 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);

            var originalLength = ng1.connections.length;

            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();

            //3 ins, 2 outs, 100% connected
            var ng2 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);


            var ixToRemove1 = utilities.next(ng1.connections.length);
            var ixToRemove2 = utilities.next(ng2.connections.length);
            while(ixToRemove2 == ixToRemove1)
                ixToRemove2 = utilities.next(ng2.connections.length);

            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove1]);
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove2]);

            //create a corrlation list (tested above)
            var correlation =  neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);


            // Key = connection key, value = index in newConnectionGeneList.
            var newConnectionTable = {};

            //TODO: No 'capacity' constructor on CollectionBase. Create modified/custom CollectionBase.
            // newConnectionGeneList must be constructed on each call because it is passed to a new NeatGenome
            // at construction time and a permanent reference to the list is kept.
            var newConnectionList = [];

            //fitswitch should be 1
            ng1.fitness = 1;
            ng2.fitness = .1;

            //implies disjoint will be added from weaker genomes ALWAYS
            //therefore final connection count of child = originalLength
            np.pDisjointExcessGenesRecombined = 1;

            //let's combine ng1 and ng2 to make an offspring

            var offspring12 = ng1.createOffspringSexual(ng2, np);
            var offspring21 = ng2.createOffspringSexual(ng1, np);


            //according to our disjoint measurements, we should combine to be back to the original length, no matter who's watching

            offspring12.connections.length.should.equal(originalLength);
            //make sure that we don't accidentally cause that
            offspring12.connections.length.should.not.equal(ng1.connections.length);
            offspring21.connections.length.should.equal(originalLength);
//
//            if(!offspring12.performIntegrityCheck())
//                console.log(offspring12.connections);

            offspring12.performIntegrityCheck().should.equal(true);
            offspring21.performIntegrityCheck().should.equal(true);



            np.pDisjointExcessGenesRecombined = 0;
            offspring12 = ng1.createOffspringSexual(ng2, np);
            offspring21 = ng2.createOffspringSexual(ng1, np);

            //according to our disjoint measurements, we won't take the weaker genes, implying we'll take the stronger genome's genes
            offspring12.connections.length.should.equal(ng1.connections.length);
            //make sure that we don't accidentally cause that
            offspring12.connections.length.should.not.equal(originalLength);
            offspring21.connections.length.should.equal(ng1.connections.length);

            offspring12.performIntegrityCheck().should.equal(true);
            offspring21.performIntegrityCheck().should.equal(true);

            //TODO: More thorough testing of creatingOffspring sexually
        }

        done();
    });


    it('compat- compatFormer(): new measurer of compat should == old measurer', function(done){
        var testCombinations = 100;
        for(var i=0 ; i < testCombinations; i++){
            //We're going to create 2 genomes by hand, remove 2 connections from each, and measure their compatibility
            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();
            var existing = {};

            //lets create a genome
            var np = new neatParameters.NeatParameters();
            np.connectionWeightRange = 2;

            //3 ins, 2 outs, 100% connected
            var ng1 = createSimpleGenome(5,3, np.connectionWeightRange, 1, existing);

            var originalLength = ng1.connections.length;

            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();

            //3 ins, 2 outs, 100% connected
            var ng2 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);


            var ixToRemove11 = utilities.next(ng1.connections.length);
            var ixToRemove12 = utilities.next(ng1.connections.length);

            while(ixToRemove12 == ixToRemove11)
                ixToRemove12 = utilities.next(ng1.connections.length);

            var ixToRemove21 = utilities.next(ng2.connections.length);

            while(ixToRemove21 == ixToRemove11 || ixToRemove21 == ixToRemove12)
                ixToRemove21 = utilities.next(ng2.connections.length);


            var ixToRemove22 = utilities.next(ng2.connections.length);

            while(ixToRemove22 == ixToRemove11 || ixToRemove22 == ixToRemove12 || ixToRemove22 == ixToRemove21)
                ixToRemove22 = utilities.next(ng2.connections.length);


            //now we have 4 unique connections to remove!
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove11]);
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove12]);

            //tada!
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove21]);
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove22]);

            //let's calculate our differences

            var previousCompat12 = parseFloat(ng1.compatFormer(ng2, np).toFixed(10));
            var currentCompat12 = parseFloat(ng1.compat(ng2, np).toFixed(10));

            previousCompat12.should.equal(currentCompat12);

            var previousCompat21 = parseFloat(ng2.compatFormer(ng1, np).toFixed(10));
            var currentCompat21 = parseFloat(ng2.compat(ng1, np).toFixed(10));

            previousCompat21.should.equal(currentCompat21);

            //
        }

        done();
    });



    it('compat(): should measure compatibility between genomes', function(done){

        var testCombinations = 100;
        for(var i=0 ; i < testCombinations; i++){
            //We're going to create 2 genomes by hand, remove 2 connections from each, and measure their compatibility
            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();
            var existing = {};

            //lets create a genome
            var np = new neatParameters.NeatParameters();
            np.connectionWeightRange = 2;

            //3 ins, 2 outs, 100% connected
            var ng1 = createSimpleGenome(5,3, np.connectionWeightRange, 1, existing);

            var originalLength = ng1.connections.length;

            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();

            //3 ins, 2 outs, 100% connected
            var ng2 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);


            var ixToRemove11 = utilities.next(ng1.connections.length);
            var ixToRemove12 = utilities.next(ng1.connections.length);

            while(ixToRemove12 == ixToRemove11)
                ixToRemove12 = utilities.next(ng1.connections.length);

            var ixToRemove21 = utilities.next(ng2.connections.length);

            while(ixToRemove21 == ixToRemove11 || ixToRemove21 == ixToRemove12)
                ixToRemove21 = utilities.next(ng2.connections.length);


            var ixToRemove22 = utilities.next(ng2.connections.length);

            while(ixToRemove22 == ixToRemove11 || ixToRemove22 == ixToRemove12 || ixToRemove22 == ixToRemove21)
                ixToRemove22 = utilities.next(ng2.connections.length);


            //now we have 4 unique connections to remove!
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove11]);
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove12]);

            //tada!
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove21]);
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove22]);

            //let's calculate our differences

            var compatibility = 0;

            var correlation = neatGenome.Help.correlateConnectionListsByInnovation(ng1.connections, ng2.connections);
            compatibility += correlation.correlationStatistics.excessConnectionCount*np.compatibilityExcessCoeff;
            compatibility += correlation.correlationStatistics.disjointConnectionCount*np.compatibilityDisjointCoeff;
            compatibility += correlation.correlationStatistics.connectionWeightDelta*np.compatibilityWeightDeltaCoeff;

            //accurate out to 10 decimals is fine for us
            compatibility = parseFloat(compatibility.toFixed(10));

            parseFloat(ng1.compat(ng2, np).toFixed(10)).should.equal(compatibility);
            parseFloat(ng2.compat(ng1, np).toFixed(10)).should.equal(compatibility);

            //you are not differen than yourself, ever!
            ng1.compat(ng1,np).should.equal(0);
            ng2.compat(ng2,np).should.equal(0);
            //
        }

        done();
    });


    it('isCompatibleWithGenomeInnovation(): should create boolean measure of compatibility between genomes', function(done){

        var testCombinations = 100;
        for(var i=0 ; i < testCombinations; i++){
            //We're going to create 2 genomes by hand, remove 2 connections from each, and measure their compatibility
            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();
            var existing = {};
            //lets create a genome
            var np = new neatParameters.NeatParameters();
            np.connectionWeightRange = 2;

            //3 ins, 2 outs, 100% connected
            var ng1 = createSimpleGenome(5,3, np.connectionWeightRange, 1, existing);

            var originalLength = ng1.connections.length;

            neatGenome.Help.resetGenomeID();
            neatGenome.Help.resetInnovationID();

            //3 ins, 2 outs, 100% connected
            var ng2 = createSimpleGenome(3,2, np.connectionWeightRange, 1, existing);


            var ixToRemove11 = utilities.next(ng1.connections.length);
            var ixToRemove12 = utilities.next(ng1.connections.length);

            while(ixToRemove12 == ixToRemove11)
                ixToRemove12 = utilities.next(ng1.connections.length);

            var ixToRemove21 = utilities.next(ng2.connections.length);

            while(ixToRemove21 == ixToRemove11 || ixToRemove21 == ixToRemove12)
                ixToRemove21 = utilities.next(ng2.connections.length);


            var ixToRemove22 = utilities.next(ng2.connections.length);

            while(ixToRemove22 == ixToRemove11 || ixToRemove22 == ixToRemove12 || ixToRemove22 == ixToRemove21)
                ixToRemove22 = utilities.next(ng2.connections.length);


            //now we have 4 unique connections to remove!
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove11]);
            ng1.mutate_DeleteConnection(ng1.connections[ixToRemove12]);

            //tada!
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove21]);
            ng2.mutate_DeleteConnection(ng2.connections[ixToRemove22]);

            //let's calculate our differences
            np.compatibilityThreshold =  ng1.compat(ng2, np);
            ng1.isCompatibleWithGenome(ng2, np).should.equal(false);

            np.compatibilityThreshold +=1;
            ng1.isCompatibleWithGenome(ng2, np).should.equal(true);

            //reverse it and do it again
            //let's calculate our differences
            np.compatibilityThreshold =  ng2.compat(ng1, np);
            ng2.isCompatibleWithGenome(ng1, np).should.equal(false);

            np.compatibilityThreshold +=1;
            ng2.isCompatibleWithGenome(ng1, np).should.equal(true);

        }

        done();
    });



    //Missing function calls for testing
    //Decoding to CPPN for testing purposes! Code should be written, but untested in the CPPN.js library!
    //networkDecode
    //performIntegrityCheckByInnovation -- on correlation results




//
//    it('neatGenome.NeatGenome.Copy(): neatGenome.NeatGenome.Copy should copy valid neatgenome', function(){
//        var lastID = neatGenome.Help.nextInnovationID();
//        var currentID;
//        neatGenome.NeatGenome.Copy
//        var nodesAndConns = createNodesAndConnections(Math.floor(20*Math.random() + 3),Math.floor(20*Math.random() + 3));
//        console.log('testing genome with: ' + nodesAndConns.nodes.length + ' nodes and ' + nodesAndConns.connections.length + ' connections');
//
//        var gid = neatGenome.Help.nextGenomeID();
//        var ins = 2, outs = 2;
//        var genome = new neatGenome.NeatGenome(gid, nodesAndConns.nodes, nodesAndConns.connections, ins, outs);
//
//        genome.gid.should.equal(gid);
//        genome.nodes.length.should.equal(nodesAndConns.nodes.length);
//        genome.connections.length.should.equal(nodesAndConns.connections.length);
//
//        genome.nodes.should.equal(nodesAndConns.nodes);
//        genome.connections.should.equal(nodesAndConns.connections);
//
//        genome.inputNodeCount.should.equal(ins);
//        genome.inputAndBiasNodeCount.should.equal(ins+1);
//        genome.outputNodeCount.should.equal(outs);
//        genome.inputBiasOutputNodeCount.should.equal(genome.inputAndBiasNodeCount + genome.outputNodeCount);
//        genome.inputBiasOutputNodeCountMinus2.should.equal(genome.inputBiasOutputNodeCount -2);
//
//    });




});