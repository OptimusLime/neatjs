(function(exports, selfBrowser, isBrowser){

    var neatGenome = exports;
    //we've defined our top level holder of things, in nodejs or browser

    //load dependencies first!
    var cppnjs = isBrowser ? selfBrowser['common'] : require('../cppnjs/cppnjs.js');
    var neatjs = isBrowser ? selfBrowser['common'] : require('../neatjs.js');

    //load cppnjs objects
    var cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');
    var cppnActivationFactory =  cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
    var utilities = cppnjs.loadLibraryFile('cppnjs', 'utilities');

    //load neatjs objects, order doesn't matter, just organized this way
    var neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
    var neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
    var neatHelp =  neatjs.loadLibraryFile('neatjs', 'neatHelp');
    var neatParameters =  neatjs.loadLibraryFile('neatjs', 'neatParameters');


//var ngNSS = "Neat.Genome";
//var ngNS = namespace(ngNSS);
    exports.CheckDependencies = function()
    {
        //load cppnjs objects
        cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');
        cppnActivationFactory =  cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
        utilities = cppnjs.loadLibraryFile('cppnjs', 'utilities');

        //laod our neatjs objects now
        neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
        neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
        neatHelp =  neatjs.loadLibraryFile('neatjs', 'neatHelp');
        neatParameters =  neatjs.loadLibraryFile('neatjs', 'neatParameters');
    };


    exports.NeatGenome = function(localID, nodes, connections, incount, outcount, debug) {

        var self = this;

        self.localID = localID;
        self.fitness = 0;

    // From C#: Ensure that the connectionGenes are sorted by innovation ID at all times.
        self.nodes = nodes;
        self.connections = connections;

        self.debug = debug;





        self.meta = {};

        //TODO: Hash nodes, connections, and meta to make a global ID! 128-bit md5 hash?
        //WIN will assign a globalID or gid
//        self.gid = //get hash


    // From C#: For efficiency we store the number of input and output neurons. These two quantities do not change
// throughout the life of a genome. Note that inputNeuronCount does NOT include the bias neuron! use inputAndBiasNeuronCount.
// We also keep all input(including bias) neurons at the start of the neuronGeneList followed by
// the output neurons.
    self.inputNodeCount= incount;
    self.inputAndBiasNodeCount= incount+1;
    self.outputNodeCount= outcount;
    self.inputBiasOutputNodeCount= self.inputAndBiasNodeCount + self.outputNodeCount;
    self.inputBiasOutputNodeCountMinus2= self.inputBiasOutputNodeCount -2;



    self.networkAdaptable= false;
    self.networkModulatory= false;
    // Temp tables.
    self.connectionLookup = null;
    self.nodeLookup = null;

        /// From C#: A table that keeps a track of which connections have added to the sexually reproduced child genome.
        /// This is cleared on each call to CreateOffspring_Sexual() and is only declared at class level to
        /// prevent having to re-allocate the table and it's associated memory on each invokation.
//        self.newConnectionTable = null;
//        self.newNodeTable= null;
//        self.newConnectionList= null;

        self.parent = null;

};


    //Define the helper functions here!
    neatGenome.Help = {};

    var genomeCount = 0;

    neatGenome.Help.nextGenomeID = function()
    {
        return genomeCount++;
    };
    neatGenome.Help.currentGenomeID = function(){
       return genomeCount;
    };
    neatGenome.Help.resetGenomeID = function(value){
        if(value ===undefined ){
            genomeCount = 0;
            return;
        }
        genomeCount = value;
    };


    var innovationCount = 0;
    var lastID = -1;
    var previousTick = -2;
    var hitCount = 0;
    //wouldn't work with multithreaded/multi-process environment
    neatGenome.Help.nextInnovationID = function(ix)
    {
        if(ix !== undefined)
            return ix;

        var id = 1000*(new Date().valueOf());//innovationCount++;
        if(lastID === id)
            hitCount++;
        else
            hitCount = 0;


        lastID = id;
        return id + (hitCount%1000);
    };

    neatGenome.Help.currentInnovationID = function(){
        return innovationCount;
    };
    neatGenome.Help.resetInnovationID = function(value){
        if(value === undefined ){
            innovationCount = 0;
            return;
        }

        innovationCount = value;
    };


    neatGenome.Help.insertByInnovation = function(connection, connectionList)
    {
        var self = connectionList;
        // Determine the insert idx with a linear search, starting from the end
        // since mostly we expect to be adding genes that belong only 1 or 2 genes
        // from the end at most.
        var idx= connectionList.length-1;
        for(; idx>-1; idx--)
        {
            if(self[idx].gid < connection.gid)
            {	// Insert idx found.
                break;
            }
        }
        connectionList.splice(idx+1, 0, connection);
    };

    neatGenome.Help.CreateGIDLookup = function(arObject)
    {
        var lookup = {};
        arObject.forEach(function(o)
        {
            lookup[o.gid] = o;
        });

        return lookup;

    };


    //NeuronGene creator
    /// <summary>
    /// Create a default minimal genome that describes a NN with the given number of inputs and outputs.
    /// </summary>
    /// <returns></returns>
    //{connectionWeightRange: val, connectionProportion: val}
    exports.Help.CreateGenomeByInnovation = function(ins, outs, connParams, existing)
    {
        //existing is for seing if a connection innovation id already exists according to local believers/shamans
        existing = existing || {};
        //create our ins and outs,
        var inputNodeList = [], outputNodeList = [], nodeList = [], connectionList = [];

        var aFunc = cppnActivationFactory.Factory.getActivationFunction('NullFn');

        var iCount = 0;

        // IMPORTANT NOTE: The neurons must all be created prior to any connections. That way all of the genomes
        // will obtain the same innovation ID's for the bias,input and output nodes in the initial population.
        // Create a single bias neuron.
        var node = new neatNode.NeatNode(neatGenome.Help.nextInnovationID(iCount++), aFunc, neatNode.INPUT_LAYER, {type: cppnNode.NodeType.bias});
          //null, idGenerator.NextInnovationId, NeuronGene.INPUT_LAYER, NeuronType.Bias, actFunct, stepCount);
        inputNodeList.push(node);
        nodeList.push(node);


        // Create input neuron genes.
        aFunc = cppnActivationFactory.Factory.getActivationFunction('NullFn');
        for(var i=0; i<ins; i++)
        {
            //TODO: DAVID proper activation function change to NULL?
            node = new neatNode.NeatNode(neatGenome.Help.nextInnovationID(iCount++), aFunc, neatNode.INPUT_LAYER, {type: cppnNode.NodeType.input});
            inputNodeList.push(node);
            nodeList.push(node);
        }

        // Create output neuron genes.
        aFunc = cppnActivationFactory.Factory.getActivationFunction('BipolarSigmoid');
        for(var i=0; i<outs; i++)
        {
            //TODO: DAVID proper activation function change to NULL?
            node = new neatNode.NeatNode(neatGenome.Help.nextInnovationID(iCount++), aFunc, neatNode.OUTPUT_LAYER, {type: cppnNode.NodeType.output});
            outputNodeList.push(node);
            nodeList.push(node);
        }

        // Loop over all possible connections from input to output nodes and create a number of connections based upon
        // connectionProportion.
        outputNodeList.forEach(function(targetNode){

            inputNodeList.forEach(function(sourceNode){
            // Always generate an ID even if we aren't going to use it. This is necessary to ensure connections
                // between the same neurons always have the same ID throughout the generated population.

                if(utilities.nextDouble() < connParams.connectionProportion )
                {

                    var cIdentifier = '(' + sourceNode.gid + "," + targetNode.gid + ')';

                    // Ok lets create a connection.
                    //if it already exists, we can use the existing innovation ID
                    var connectionInnovationId = existing[cIdentifier] || neatGenome.Help.nextInnovationID();

                    //if we didn't have one before, we do now! If we did, we simply overwrite with the same innovation id
                    existing[cIdentifier] = connectionInnovationId;

                    connectionList.push(new neatConnection.NeatConnection(connectionInnovationId,
                        (utilities.nextDouble() * connParams.connectionWeightRange ) - connParams.connectionWeightRange/2.0,
                        {sourceID: sourceNode.gid, targetID: targetNode.gid}));

                }
            });
        });

        // Don't create any hidden nodes at this point. Fundamental to the NEAT way is to start minimally!
        return new neatGenome.NeatGenome(neatGenome.Help.nextGenomeID(), nodeList, connectionList, ins, outs);
//            NeatGenome(idGenerator.NextGenomeId, neuronGeneList, connectionGeneList, inputNeuronCount, outputNeuronCount);

    };


    exports.NeatGenome.Copy = function(genome, gid)
    {

        var nodeCopy = [], connectionCopy = [];
        genome.nodes.forEach(function(node)
        {
           nodeCopy.push(neatNode.NeatNode.Copy(node));
        });
        genome.connections.forEach(function(conn)
        {
            connectionCopy.push(neatConnection.NeatConnection.Copy(conn));
        });

        //not debuggin
        var gCopy = new exports.NeatGenome((gid !== undefined ? gid : genome.gid), nodeCopy, connectionCopy, genome.inputNodeCount, genome.outputNodeCount, false);
        console.log('Yet to implement genome behavior copying');
    //    if(genome.Behavior)
    //        gCopy.Behavior
        return gCopy;
    };


/// Asexual reproduction with built in mutation.
    exports.NeatGenome.prototype.createOffspringAsexual = function(newNodeTable, newConnectionTable, np)
    {
        var self = this;
        //copy the genome, then mutate
        var genome = exports.NeatGenome.Copy(self, neatGenome.Help.nextGenomeID());

        //mutate genome before returning
        genome.mutate(newNodeTable, newConnectionTable, np);

        return genome;
    };



    /// <summary>
    /// Adds a connection to the list that will eventually be copied into a child of this genome during sexual reproduction.
    /// A helper function that is only called by CreateOffspring_Sexual_ProcessCorrelationItem().
    /// </summary>
    /// <param name="connectionGene">Specifies the connection to add to this genome.</param>
    /// <param name="overwriteExisting">If there is already a connection from the same source to the same target,
    /// that connection is replaced when overwriteExisting is true and remains (no change is made) when overwriteExisting is false.</param>
    //TODO: Use gid or innovationID?
    neatGenome.Help.createOffspringSexual_AddGene  = function(connectionList, connectionTable, connection, overwriteExisting)
    {

        var conKey = connection.gid;

        // Check if a matching gene has already been added.
        var oIdx = connectionTable[conKey];

        if(oIdx==null)
        {	// No matching gene has been added.
            // Register this new gene with the newConnectionGeneTable - store its index within newConnectionGeneList.
            connectionTable[conKey] = connectionList.length;

            // Add the gene to the list.
            connectionList.push(new neatConnection.NeatConnection.Copy(connection));
        }
        else if(overwriteExisting)
        {
            // Overwrite the existing matching gene with this one. In fact only the weight value differs between two
            // matching connection genes, so just overwrite the existing genes weight value.

            // Remember that we stored the gene's index in newConnectionGeneTable. So use it here.
            connectionList[oIdx].weight = connection.weight;
        }
    };

    /// <summary>
    /// Given a description of a connection in two parents, decide how to copy it into their child.
    /// A helper function that is only called by CreateOffspring_Sexual().
    /// </summary>
    /// <param name="correlationItem">Describes a connection and whether it exists on one parent, the other, or both.</param>
    /// <param name="fitSwitch">If this is 1, then the first parent is more fit; if 2 then the second parent. Other values are not defined.</param>
    /// <param name="combineDisjointExcessFlag">If this is true, add disjoint and excess genes to the child; otherwise, leave them out.</param>
    /// <param name="np">Not used.</param>
    neatGenome.Help.createOffspringSexual_ProcessCorrelationItem
        = function(connectionList, connectionTable, correlationItem, fitSwitch, combineDisjointExcessFlag)
    {
        switch(correlationItem.correlationType)
        {
            // Disjoint and excess genes.
            case neatHelp.CorrelationType.disjointConnectionGene:
            case neatHelp.CorrelationType.excessConnectionGene:
            {
                // If the gene is in the fittest parent then override any existing entry in the connectionGeneTable.
                if(fitSwitch==1 && correlationItem.connection1!=null)
                {
                    neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection1, true);
                    return;
                }

                if(fitSwitch==2 && correlationItem.connection2!=null)
                {
                    neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection2, true);
                    return;
                }

                // The disjoint/excess gene is on the less fit parent.
                //if(Utilities.NextDouble() < np.pDisjointExcessGenesRecombined)	// Include the gene n% of the time from whichever parent contains it.
                if(combineDisjointExcessFlag)
                {
                    if(correlationItem.connection1!=null)
                    {
                        neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection1, false);
                        return;
                    }
                    if(correlationItem.connection2!=null)
                    {
                        neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection2, false);
                        return;
                    }
                }
                break;
            }

            case neatHelp.CorrelationType.matchedConnectionGenes:
            {
                if(utilities.RouletteWheel.singleThrow(0.5))
                {
                    // Override any existing entries in the table.
                    neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection1, true);
                }
                else
                {
                    // Override any existing entries in the table.
                    neatGenome.Help.createOffspringSexual_AddGene(connectionList, connectionTable, correlationItem.connection2, true);
                }
                break;
            }
        }
    };


    /// <summary>
    /// Correlate the ConnectionGenes within the two ConnectionGeneLists - based upon innovation number.
    /// Return an ArrayList of ConnectionGene[2] structures - pairs of matching ConnectionGenes.
    /// </summary>
    /// <param name="list1"></param>
    /// <param name="list2"></param>
    /// <returns>Resulting correlation</returns>
    exports.Help.correlateConnectionListsByInnovation
        = function(list1, list2)
    {
        var correlationResults = new neatHelp.CorrelationResults();

        //----- Test for special cases.
        if(!list1.length && !list2.length)
        {	// Both lists are empty!
            return correlationResults;
        }

        if(!list1.length)
        {	// All list2 genes are excess.
            correlationResults.correlationStatistics.excessConnectionCount = list2.length;

            list2.forEach(function(connection){
                //add a bunch of excess genes to our new creation!
                correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.excessConnectionGene, null, connection));
            });
            //done with correlating al; genes since list1 is empty
            return correlationResults;
        }

        // i believe there is a bug in the C# code, but it's completely irrelevant cause you'll never have 0 connections and for it to be sensical!
        if(!list2.length)
        {	// All list1 genes are excess.
            correlationResults.correlationStatistics.excessConnectionCount  = list1.length;

            list1.forEach(function(connection){
                //add a bunch of excess genes to our new creation!
                correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.excessConnectionGene, connection, null));
            });

            //done with correlating al; genes since list2 is empty
            return correlationResults;
        }

        //----- Both ConnectionGeneLists contain genes - compare the contents.
        var list1Idx=0;
        var list2Idx=0;
        var connection1 = list1[list1Idx];
        var connection2 = list2[list2Idx];

        for(;;)
        {

            if(connection2.gid < connection1.gid)
            {
                // connectionGene2 is disjoint.
                correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.disjointConnectionGene, null, connection2));
                correlationResults.correlationStatistics.disjointConnectionCount++;

                // Move to the next gene in list2.
                list2Idx++;
            }
            else if(connection1.gid == connection2.gid)
            {
                correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.matchedConnectionGenes, connection1, connection2));
                correlationResults.correlationStatistics.connectionWeightDelta += Math.abs(connection1.weight-connection2.weight);
                correlationResults.correlationStatistics.matchingCount++;

                // Move to the next gene in both lists.
                list1Idx++;
                list2Idx++;
            }
            else // (connectionGene2.InnovationId > connectionGene1.InnovationId)
            {
                // connectionGene1 is disjoint.
                correlationResults.correlationList.push(new  neatHelp.CorrelationItem(neatHelp.CorrelationType.disjointConnectionGene, connection1, null));
                correlationResults.correlationStatistics.disjointConnectionCount++;

                // Move to the next gene in list1.
                list1Idx++;
            }

            // Check if we have reached the end of one (or both) of the lists. If we have reached the end of both then
            // we execute the first if block - but it doesn't matter since the loop is not entered if both lists have
            // been exhausted.
            if(list1Idx >= list1.length)
            {
                // All remaining list2 genes are excess.
                for(; list2Idx<list2.length; list2Idx++)
                {
                    correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.excessConnectionGene, null, list2[list2Idx]));
                    correlationResults.correlationStatistics.excessConnectionCount++;
                }
                return correlationResults;
            }

            if(list2Idx >= list2.length)
            {
                // All remaining list1 genes are excess.
                for(; list1Idx<list1.length; list1Idx++)
                {
                    correlationResults.correlationList.push(new neatHelp.CorrelationItem(neatHelp.CorrelationType.excessConnectionGene, list1[list1Idx], null));
                    correlationResults.correlationStatistics.excessConnectionCount++;
                }
                return correlationResults;
            }

            connection1 = list1[list1Idx];
            connection2 = list2[list2Idx];
        }
    };



    //NeuronGene creator
    exports.NeatGenome.prototype.createOffspringSexual
        = function(otherParent, np)
    {
        var self = this;

        if (otherParent == null || otherParent === undefined)
            return null;

        // Build a list of connections in either this genome or the other parent.
        var correlationResults = neatGenome.Help.correlateConnectionListsByInnovation(self.connections, otherParent.connections);

        if(self.debug && !correlationResults.performIntegrityCheckByInnovation())
            throw "CorrelationResults failed innovation integrity check.";

        //----- Connection Genes.
        // We will temporarily store the offspring's genes in newConnectionGeneList and keeping track of which genes
        // exist with newConnectionGeneTable. Here we ensure these objects are created, and if they already existed
        // then ensure they are cleared. Clearing existing objects is more efficient that creating new ones because
        // allocated memory can be re-used.

        // Key = connection key, value = index in newConnectionGeneList.
        var newConnectionTable = {};

        //TODO: No 'capacity' constructor on CollectionBase. Create modified/custom CollectionBase.
        // newConnectionGeneList must be constructed on each call because it is passed to a new NeatGenome
        // at construction time and a permanent reference to the list is kept.
        var newConnectionList = [];

        // A switch that stores which parent is fittest 1 or 2. Chooses randomly if both are equal. More efficient to calculate this just once.
        var fitSwitch;
        if(self.fitness > otherParent.fitness)
            fitSwitch = 1;
        else if(self.fitness < otherParent.fitness)
            fitSwitch = 2;
        else
        {	// Select one of the parents at random to be the 'master' genome during crossover.
            if(utilities.nextDouble() < 0.5)
                fitSwitch = 1;
            else
                fitSwitch = 2;
        }

        var combineDisjointExcessFlag = utilities.nextDouble() < np.pDisjointExcessGenesRecombined;

        // Loop through the correlationResults, building a table of ConnectionGenes from the parents that will make it into our
        // new [single] offspring. We use a table keyed on connection end points to prevent passing connections to the offspring
        // that may have the same end points but a different innovation number - effectively we filter out duplicate connections.
//        var idxBound = correlationResults.correlationList.length;
        correlationResults.correlationList.forEach(function(correlationItem)
        {
            neatGenome.Help.createOffspringSexual_ProcessCorrelationItem(newConnectionList, newConnectionTable, correlationItem, fitSwitch, combineDisjointExcessFlag);
        });



        //----- Neuron Genes.
        // Build a neuronGeneList by analysing each connection's neuron end-point IDs.
        // This strategy has the benefit of eliminating neurons that are no longer connected too.
        // Remember to always keep all input, output and bias neurons though!
        var newNodeList = [];

        // Keep a table of the NeuronGene ID's keyed by ID so that we can keep track of which ones have been added.
        // Key = innovation ID, value = null for some reason.

        var newNodeTable = {};

        // Get the input/output neurons from this parent. All Genomes share these neurons, they do not change during a run.
//        idxBound = neuronGeneList.Count;

        self.nodes.forEach(function(node)
        {
            if(node.type != cppnNode.NodeType.hidden)
            {
                newNodeList.push(new neatNode.NeatNode.Copy(node));
                newNodeTable[node.gid] = node;
            }
//            else
//            {	// No more bias, input or output nodes. break the loop.
//                break;
//            }
        });

        // Now analyse the connections to determine which NeuronGenes are required in the offspring.
        // Loop through every connection in the child, and add to the child those hidden neurons that are sources or targets of the connection.
//        idxBound = newConnectionGeneList.Count;


        var nodeLookup = neatGenome.Help.CreateGIDLookup(self.nodes);
        var otherNodeLookup = neatGenome.Help.CreateGIDLookup(otherParent.nodes);
//        var connLookup =  neatGenome.Help.CreateGIDLookup(self.connections);

        newConnectionList.forEach(function(connection)
        {
            var node;

            if(!newNodeTable[connection.sourceID])
            {
                //TODO: DAVID proper activation function
                // We can safely assume that any missing NeuronGenes at this point are hidden heurons.
                node = nodeLookup[connection.sourceID];
                if (node)
                    newNodeList.push(new neatNode.NeatNode.Copy(node));
                else
                    newNodeList.push(new neatNode.NeatNode.Copy(otherNodeLookup[connection.sourceID]));
                //newNeuronGeneList.Add(new NeuronGene(connectionGene.SourceNeuronId, NeuronType.Hidden, ActivationFunctionFactory.GetActivationFunction("SteepenedSigmoid")));
                newNodeTable[connection.sourceID] = node;
            }

            if(!newNodeTable[connection.targetID])
            {
                //TODO: DAVID proper activation function
                // We can safely assume that any missing NeuronGenes at this point are hidden heurons.
                node = nodeLookup[connection.targetID];
                if (node != null)
                    newNodeList.push(new neatNode.NeatNode.Copy(node));
                else
                    newNodeList.push(new neatNode.NeatNode.Copy(otherNodeLookup[connection.targetID]));
                //newNeuronGeneList.Add(new NeuronGene(connectionGene.TargetNeuronId, NeuronType.Hidden, ActivationFunctionFactory.GetActivationFunction("SteepenedSigmoid")));
                newNodeTable[connection.targetID] = node;
            }
        });

        // TODO: Inefficient code?
        newNodeList.sort(function(a,b){return a.gid- b.gid});

        // newConnectionGeneList is already sorted because it was generated by passing over the list returned by
        // CorrelateConnectionGeneLists() - which is always in order.
        return new neatGenome.NeatGenome(neatGenome.Help.nextGenomeID(), newNodeList,newConnectionList, self.inputNodeCount, self.outputNodeCount, self.debug);

        //No module support in here

        // Determine which modules to pass on to the child in the same way.
        // For each module in this genome or in the other parent, if it was referenced by even one connection add it and all its dummy neurons to the child.
//        List<ModuleGene> newModuleGeneList = new List<ModuleGene>();
//
//        // Build a list of modules the child might have, which is a union of the parents' module lists, but they are all copies so we can't just do a union.
//        List<ModuleGene> unionParentModules = new List<ModuleGene>(moduleGeneList);
//        foreach (ModuleGene moduleGene in otherParent.moduleGeneList) {
//        bool alreadySeen = false;
//        foreach (ModuleGene match in unionParentModules) {
//            if (moduleGene.InnovationId == match.InnovationId) {
//                alreadySeen = true;
//                break;
//            }
//        }
//        if (!alreadySeen) {
//            unionParentModules.Add(moduleGene);
//        }
//    }

//        foreach (ModuleGene moduleGene in unionParentModules) {
//        // Examine each neuron in the child to determine whether it is part of a module.
//        foreach (List<long> dummyNeuronList in new List<long>[] { moduleGene.InputIds, moduleGene.OutputIds })
//        {
//            foreach (long dummyNeuronId in dummyNeuronList)
//            {
//                if (newNeuronGeneTable.ContainsKey(dummyNeuronId)) {
//                    goto childHasModule;
//                }
//            }
//        }
//
//        continue; // the child does not contain this module, so continue the loop and check for the next module.
//        childHasModule: // the child does contain this module, so make sure the child gets all the nodes the module requires to work.
//
//            // Make sure the child has all the neurons in the given module.
//            newModuleGeneList.Add(new ModuleGene(moduleGene));
//        foreach (List<long> dummyNeuronList in new List<long>[] { moduleGene.InputIds, moduleGene.OutputIds })
//        {
//            foreach (long dummyNeuronId in dummyNeuronList)
//            {
//                if (!newNeuronGeneTable.ContainsKey(dummyNeuronId)) {
//                    newNeuronGeneTable.Add(dummyNeuronId, null);
//                    NeuronGene neuronGene = this.neuronGeneList.GetNeuronById(dummyNeuronId);
//                    if (neuronGene != null) {
//                        newNeuronGeneList.Add(new NeuronGene(neuronGene));
//                    } else {
//                        newNeuronGeneList.Add(new NeuronGene(otherParent.NeuronGeneList.GetNeuronById(dummyNeuronId)));
//                    }
//                }
//            }
//        }
//    }



    };


    /// <summary>
/// Decode the genome's 'DNA' into a working network.
/// </summary>
/// <returns></returns>
    exports.NeatGenome.prototype.networkDecode = function(activationFn)
    {
        var self = this;
        var neatDecoder =  neatjs.loadLibraryFile('neatjs', 'neatDecoder');

        return neatDecoder.DecodeToFloatFastConcurrentNetwork(self, activationFn);
    };


    /// <summary>
    /// Clone this genome.
    /// </summary>
    /// <returns></returns>
    exports.NeatGenome.prototype.clone = function()
    {
        var self = this;
        return neatGenome.NeatGenome.Copy(self, neatGenome.Help.nextGenomeID());
    };

    exports.NeatGenome.prototype.compatFormer = function(comparisonGenome, np) {
        /* A very simple way of implementing this routine is to call CorrelateConnectionGeneLists and to then loop
         * through the correlation items, calculating a compatibility score as we go. However, this routine
         * is heavily used and in performance tests was shown consume 40% of the CPU time for the core NEAT code.
         * Therefore this new routine has been rewritten with it's own version of the logic within
         * CorrelateConnectionGeneLists. This allows us to only keep comparing genes up to the point where the
         * threshold is passed. This also eliminates the need to build the correlation results list, this difference
         * alone is responsible for a 200x performance improvement when testing with a 1664 length genome!!
         *
         * A further optimisation is achieved by comparing the genes starting at the end of the genomes which is
         * where most disparities are located - new novel genes are always attached to the end of genomes. This
         * has the result of complicating the routine because we must now invoke additional logic to determine
         * which genes are excess and when the first disjoint gene is found. This is done with an extra integer:
         *
         * int excessGenesSwitch=0; // indicates to the loop that it is handling the first gene.
         *						=1;	// Indicates that the first gene was excess and on genome 1.
         *						=2;	// Indicates that the first gene was excess and on genome 2.
         *						=3;	// Indicates that there are no more excess genes.
         *
         * This extra logic has a slight performance hit, but this is minor especially in comparison to the savings that
         * are expected to be achieved overall during a NEAT search.
         *
         * If you have trouble understanding this logic then it might be best to work through the previous version of
         * this routine (below) that scans through the genomes from start to end, and which is a lot simpler.
         *
         */
        var self = this;

        //this can be replaced with the following code:




        var list1 = self.connections;
        var list2 = comparisonGenome.connections;

//
//        var compatibility = 0;
//        var correlation = neatGenome.Help.correlateConnectionListsByInnovation(list1, list2);
//        compatibility += correlation.correlationStatistics.excessConnectionCount*np.compatibilityExcessCoeff;
//        compatibility += correlation.correlationStatistics.disjointConnectionCount*np.compatibilityDisjointCoeff;
//        compatibility += correlation.correlationStatistics.connectionWeightDelta*np.compatibilityWeightDeltaCoeff;
//        return compatibility;


        var excessGenesSwitch=0;

        // Store these heavily used values locally.
        var list1Count = list1.length;
        var list2Count = list2.length;

        //----- Test for special cases.
        if(list1Count==0 && list2Count==0)
        {	// Both lists are empty! No disparities, therefore the genomes are compatible!
            return 0.0;
        }

        if(list1Count==0)
        {	// All list2 genes are excess.
            return ((list2.length * np.compatibilityExcessCoeff));
        }

        if(list2Count==0)
        {
            // All list1 genes are excess.
            return ((list1Count * np.compatibilityExcessCoeff));
        }

        //----- Both ConnectionGeneLists contain genes - compare the contents.
        var compatibility = 0.0;
        var list1Idx=list1Count-1;
        var list2Idx=list2Count-1;
        var connection1 = list1[list1Idx];
        var connection2 = list2[list2Idx];
        for(;;)
        {
            if(connection2.gid > connection1.gid)
            {
                // Most common test case(s) at top for efficiency.
                if(excessGenesSwitch==3)
                {	// No more excess genes. Therefore this mismatch is disjoint.
                    compatibility += np.compatibilityDisjointCoeff;
                }
                else if(excessGenesSwitch==2)
                {	// Another excess gene on genome 2.
                    compatibility += np.compatibilityExcessCoeff;
                }
                else if(excessGenesSwitch==1)
                {	// We have found the first non-excess gene.
                    excessGenesSwitch=3;
                    compatibility += np.compatibilityDisjointCoeff;
                }
                else //if(excessGenesSwitch==0)
                {	// First gene is excess, and is on genome 2.
                    excessGenesSwitch = 2;
                    compatibility += np.compatibilityExcessCoeff;
                }

                // Move to the next gene in list2.
                list2Idx--;
            }
            else if(connection1.gid == connection2.gid)
            {
                // No more excess genes. It's quicker to set this every time than to test if is not yet 3.
                excessGenesSwitch=3;

                // Matching genes. Increase compatibility by weight difference * coeff.
                compatibility += Math.abs(connection1.weight-connection2.weight) * np.compatibilityWeightDeltaCoeff;

                // Move to the next gene in both lists.
                list1Idx--;
                list2Idx--;
            }
            else // (connectionGene2.InnovationId < connectionGene1.InnovationId)
            {
                // Most common test case(s) at top for efficiency.
                if(excessGenesSwitch==3)
                {	// No more excess genes. Therefore this mismatch is disjoint.
                    compatibility += np.compatibilityDisjointCoeff;
                }
                else if(excessGenesSwitch==1)
                {	// Another excess gene on genome 1.
                    compatibility += np.compatibilityExcessCoeff;
                }
                else if(excessGenesSwitch==2)
                {	// We have found the first non-excess gene.
                    excessGenesSwitch=3;
                    compatibility += np.compatibilityDisjointCoeff;
                }
                else //if(excessGenesSwitch==0)
                {	// First gene is excess, and is on genome 1.
                    excessGenesSwitch = 1;
                    compatibility += np.compatibilityExcessCoeff;
                }

                // Move to the next gene in list1.
                list1Idx--;
            }


            // Check if we have reached the end of one (or both) of the lists. If we have reached the end of both then
            // we execute the first 'if' block - but it doesn't matter since the loop is not entered if both lists have
            // been exhausted.
            if(list1Idx < 0)
            {
                // All remaining list2 genes are disjoint.
                compatibility +=  (list2Idx+1) * np.compatibilityDisjointCoeff;
                return (compatibility); //< np.compatibilityThreshold);
            }

            if(list2Idx < 0)
            {
                // All remaining list1 genes are disjoint.
                compatibility += (list1Idx+1) * np.compatibilityDisjointCoeff;
                return (compatibility); //< np.compatibilityThreshold);
            }

            connection1 = list1[list1Idx];
            connection2 = list2[list2Idx];
        }
    };

    exports.NeatGenome.prototype.compat = function(comparisonGenome, np) {

        var self = this;
        var list1 = self.connections;
        var list2 = comparisonGenome.connections;

        var compatibility = 0;
        var correlation = neatGenome.Help.correlateConnectionListsByInnovation(list1, list2);
        compatibility += correlation.correlationStatistics.excessConnectionCount*np.compatibilityExcessCoeff;
        compatibility += correlation.correlationStatistics.disjointConnectionCount*np.compatibilityDisjointCoeff;
        compatibility += correlation.correlationStatistics.connectionWeightDelta*np.compatibilityWeightDeltaCoeff;
        return compatibility;

    };

    exports.NeatGenome.prototype.isCompatibleWithGenome= function(comparisonGenome, np)
    {
        var self = this;

        return (self.compat(comparisonGenome, np) < np.compatibilityThreshold);
    };

    exports.Help.InOrderInnovation = function(aObj)
    {
        var prevId = 0;

        for(var i=0; i< aObj.length; i++){
            var connection = aObj[i];
            if(connection.gid < prevId)
                return false;
            prevId = connection.gid;
        }

        return true;
    };


    /// <summary>
    /// For debug purposes only.
    /// </summary>
    /// <returns>Returns true if genome integrity checks out OK.</returns>
    exports.NeatGenome.prototype.performIntegrityCheck = function()
    {
        var self = this;
        return neatGenome.Help.InOrderInnovation(self.connections);
    };


    exports.NeatGenome.prototype.mutate = function(newNodeTable, newConnectionTable, np)
    {
        var self = this;

        // Determine the type of mutation to perform.
        var probabilities = [];
        probabilities.push(np.pMutateAddNode);
        probabilities.push(0);//np.pMutateAddModule);
        probabilities.push(np.pMutateAddConnection);
        probabilities.push(np.pMutateDeleteConnection);
        probabilities.push(np.pMutateDeleteSimpleNeuron);
        probabilities.push(np.pMutateConnectionWeights);

        var outcome = utilities.RouletteWheel.singleThrowArray(probabilities);

        switch(outcome)
        {
            case 0:
                self.mutate_AddNode(newNodeTable);
                return 0;
            case 1:
//               self.mutate_Ad Mutate_AddModule(ea);
            case 2:
                self.mutate_AddConnection(newConnectionTable,np);
                return 2;
            case 3:
                self.mutate_DeleteConnection();
                return 3;
            case 4:
                self.mutate_DeleteSimpleNeuronStructure(newConnectionTable, np);
                return 4;
            case 5:
                self.mutate_ConnectionWeights(np);
                return 5;
        }
    };



    //NeuronGene creator
    /// <summary>
    /// Add a new node to the Genome. We do this by removing a connection at random and inserting
    /// a new node and two new connections that make the same circuit as the original connection.
    ///
    /// This way the new node is properly integrated into the network from the outset.
    /// </summary>
    /// <param name="ea"></param>
    exports.NeatGenome.prototype.mutate_AddNode = function(newNodeTable, connToSplit)
    {
        var self = this;

        if(!self.connections.length)
            return null;

        // Select a connection at random.
        var connectionToReplaceIdx = Math.floor(utilities.nextDouble() * self.connections.length);
        var connectionToReplace =  connToSplit || self.connections[connectionToReplaceIdx];

        // Delete the existing connection. JOEL: Why delete old connection?
        //connectionGeneList.RemoveAt(connectionToReplaceIdx);

        // Check if this connection has already been split on another genome. If so then we should re-use the
        // neuron ID and two connection ID's so that matching structures within the population maintain the same ID.
        var existingNeuronGeneStruct = newNodeTable[connectionToReplace.gid];

        var newNode;
        var newConnection1;
        var newConnection2;
        var actFunct;

        var nodeLookup = neatGenome.Help.CreateGIDLookup(self.nodes);



        if(!existingNeuronGeneStruct)
        {	// No existing matching structure, so generate some new ID's.

            //TODO: DAVID proper random activation function
            // Replace connectionToReplace with two new connections and a neuron.
            actFunct= cppnActivationFactory.Factory.getRandomActivationFunction();
            //newNeuronGene = new NeuronGene(ea.NextInnovationId, NeuronType.Hidden, actFunct);

            var nextID = neatGenome.Help.nextInnovationID();//connectionToReplace.gid);

            newNode = new neatNode.NeatNode(nextID, actFunct,
                (nodeLookup[connectionToReplace.sourceID].layer + nodeLookup[connectionToReplace.targetID].layer)/2.0,
                {type: cppnNode.NodeType.hidden});

            nextID = neatGenome.Help.nextInnovationID();
            newConnection1 = new neatConnection.NeatConnection(nextID, 1.0, {sourceID: connectionToReplace.sourceID, targetID:newNode.gid});

            nextID = neatGenome.Help.nextInnovationID();
            newConnection2 =  new neatConnection.NeatConnection(nextID, connectionToReplace.weight, {sourceID: newNode.gid, targetID: connectionToReplace.targetID});

            // Register the new ID's with NewNeuronGeneStructTable.
            newNodeTable[connectionToReplace.gid] = {node: newNode, connection1: newConnection1, connection2: newConnection2};
        }
        else
        {	// An existing matching structure has been found. Re-use its ID's

            //TODO: DAVID proper random activation function
            // Replace connectionToReplace with two new connections and a neuron.
            actFunct = cppnActivationFactory.Factory.getRandomActivationFunction();
            var tmpStruct = existingNeuronGeneStruct;
            //newNeuronGene = new NeuronGene(tmpStruct.NewNeuronGene.InnovationId, NeuronType.Hidden, actFunct);
            newNode = neatNode.NeatNode.Copy(tmpStruct.node);
            newNode.type = cppnNode.NodeType.hidden;
             //new NeuronGene(null, tmpStruct.NewNeuronGene.gid, tmpStruct.NewNeuronGene.Layer, NeuronType.Hidden, actFunct, this.step);

            newConnection1 = new neatConnection.NeatConnection(tmpStruct.connection1.gid, 1.0, {sourceID: connectionToReplace.sourceID, targetID:newNode.gid});
//                new ConnectionGene(tmpStruct.NewConnectionGene_Input.gid, connectionToReplace.SourceNeuronId, newNeuronGene.gid, 1.0);
            newConnection2 = new neatConnection.NeatConnection(tmpStruct.connection2.gid, connectionToReplace.weight, {sourceID: newNode.gid, targetID: connectionToReplace.targetID});
//                new ConnectionGene(tmpStruct.NewConnectionGene_Output.gid, newNeuronGene.gid, connectionToReplace.TargetNeuronId, connectionToReplace.Weight);
        }

        // Add the new genes to the genome.
        self.nodes.push(newNode);
        neatGenome.Help.insertByInnovation(newConnection1, self.connections);
        neatGenome.Help.insertByInnovation(newConnection2, self.connections);

        //in javascript, we return the new node and connections created, since it's so easy!
//        return {node: newNode, connection1: newConnection1, newConnection2: newConnection2};

    };

    //Modules not implemented
//    exports.NeatGenome.prototype.mutate_AddModule = function(np)
//    {
//    }

    exports.NeatGenome.prototype.testForExistingConnectionInnovation = function(sourceID, targetID)
    {
        var self = this;
//        console.log('looking for source: ' + sourceID + ' target: ' + targetID);

        for(var i=0; i< self.connections.length; i++){
            var connection = self.connections[i];
            if(connection.sourceID == sourceID && connection.targetID == targetID){
                return connection;
            }
        }

        return null;
    };

    //add a connection, sourcetargetconnect specifies the source, target or both nodes you'd like to connect (optionally)
    exports.NeatGenome.prototype.mutate_AddConnection = function(newConnectionTable, np, sourceTargetConnect)
    {
        //if we didn't send specifics, just create an empty object
        sourceTargetConnect = sourceTargetConnect || {};

        var self = this;
        // We are always guaranteed to have enough neurons to form connections - because the input/output neurons are
        // fixed. Any domain that doesn't require input/outputs is a bit nonsensical!

        // Make a fixed number of attempts at finding a suitable connection to add.

        if(self.nodes.length>1)
        {	// At least 2 neurons, so we have a chance at creating a connection.

            for(var attempts=0; attempts<5; attempts++)
            {
                // Select candidate source and target neurons. Any neuron can be used as the source. Input neurons
                // should not be used as a target
                var srcNeuronIdx;
                var tgtNeuronIdx;



                // Find all potential inputs, or quit if there are not enough.
                // Neurons cannot be inputs if they are dummy input nodes of a module.
                var potentialInputs = [];

                self.nodes.forEach(function(n)
                {
                    if(n.activationFunction.functionID !== 'ModuleInputNeuron')
                        potentialInputs.push(n);
                });


                if (potentialInputs.length < 1)
                    return false;

                var potentialOutputs = [];

                // Find all potential outputs, or quit if there are not enough.
                // Neurons cannot be outputs if they are dummy input or output nodes of a module, or network input or bias nodes.
                self.nodes.forEach(function(n)
                {
                    if(n.type != cppnNode.NodeType.bias && n.type != cppnNode.NodeType.input &&
                        n.activationFunction.functionID !== 'ModuleInputNeuron'
                        &&  n.activationFunction.functionID !== 'ModuleOutputNeuron')
                        potentialOutputs.push(n);
                });

                if (potentialOutputs.length < 1)
                    return false;

                var sourceNeuron = sourceTargetConnect.source || potentialInputs[utilities.next(potentialInputs.length)];
                var targetNeuron = sourceTargetConnect.target || potentialOutputs[utilities.next(potentialOutputs.length)];

                // Check if a connection already exists between these two neurons.
                var sourceID = sourceNeuron.gid;
                var targetID = targetNeuron.gid;

                //we don't allow recurrent connections, we can't let the target layers be <= src
                if(np.disallowRecurrence && targetNeuron.layer <= sourceNeuron.layer)
                    continue;

                if(!self.testForExistingConnectionInnovation(sourceID, targetID))
                {
                    // Check if a matching mutation has already occured on another genome.
                    // If so then re-use the connection ID.
                    var connectionKey = "(" + sourceID + "," + targetID + ")";
                    var existingConnection = newConnectionTable[connectionKey];
                    var newConnection;
                    var nextID = neatGenome.Help.nextInnovationID();
                    if(existingConnection==null)
                    {	// Create a new connection with a new ID and add it to the Genome.
                        newConnection = new neatConnection.NeatConnection(nextID,
                             (utilities.nextDouble()*np.connectionWeightRange/4.0) - np.connectionWeightRange/8.0,
                            {sourceID: sourceID, targetID: targetID});

//                            new ConnectionGene(ea.NextInnovationId, sourceID, targetID,
//                            (Utilities.NextDouble() * ea.NeatParameters.connectionWeightRange/4.0) - ea.NeatParameters.connectionWeightRange/8.0);

                        // Register the new connection with NewConnectionGeneTable.
                        newConnectionTable[connectionKey] = newConnection;

                        // Add the new gene to this genome. We have a new ID so we can safely append the gene to the end
                        // of the list without risk of breaking the innovation ID order.
                        self.connections.push(newConnection);
                    }
                    else
                    {	// Create a new connection, re-using the ID from existingConnection, and add it to the Genome.
                        newConnection = new neatConnection.NeatConnection(existingConnection.gid,
                            (utilities.nextDouble()*np.connectionWeightRange/4.0) -  np.connectionWeightRange/8.0,
                            {sourceID: sourceID, targetID: targetID});

//                            new ConnectionGene(existingConnection.InnovationId, sourceId, targetID,
//                            (Utilities.NextDouble() * ea.NeatParameters.connectionWeightRange/4.0) - ea.NeatParameters.connectionWeightRange/8.0);

                        // Add the new gene to this genome. We are re-using an ID so we must ensure the connection gene is
                        // inserted into the correct position (sorted by innovation ID).
                        neatGenome.Help.insertByInnovation(newConnection, self.connections);
//                        connectionGeneList.InsertIntoPosition(newConnection);
                    }

                    return true;
                }
            }
        }

        // We couldn't find a valid connection to create. Instead of doing nothing lets perform connection
        // weight mutation.
        self.mutate_ConnectionWeights(np);

        return false;
    };

    exports.NeatGenome.prototype.mutate_ConnectionWeights = function(np)
    {
        var self = this;
        // Determine the type of weight mutation to perform.
        var probabilties = [];

        np.connectionMutationParameterGroupList.forEach(function(connMut){
           probabilties.push(connMut.activationProportion);
        });

        // Get a reference to the group we will be using.
        var paramGroup = np.connectionMutationParameterGroupList[utilities.RouletteWheel.singleThrowArray(probabilties)];

        // Perform mutations of the required type.
        if(paramGroup.selectionType== neatParameters.ConnectionSelectionType.proportional)
        {
            var mutationOccured=false;
            var connectionCount = self.connections.length;
            self.connections.forEach(function(connection){

                if(utilities.nextDouble() < paramGroup.proportion)
                {
                    self.mutateConnectionWeight(connection, np, paramGroup);
                    mutationOccured = true;
                }

            });

            if(!mutationOccured && connectionCount>0)
            {	// Perform at least one mutation. Pick a gene at random.
                self.mutateConnectionWeight(self.connections[utilities.next(connectionCount)], // (Utilities.NextDouble() * connectionCount)],
                    np,
                    paramGroup);
            }
        }
        else // if(paramGroup.SelectionType==ConnectionSelectionType.FixedQuantity)
        {
            // Determine how many mutations to perform. At least one - if there are any genes.
            var connectionCount = self.connections.length;

            var mutations = Math.min(connectionCount, Math.max(1, paramGroup.quantity));
            if(mutations==0) return;

            // The mutation loop. Here we pick an index at random and scan forward from that point
            // for the first non-mutated gene. This prevents any gene from being mutated more than once without
            // too much overhead. In fact it's optimal for small numbers of mutations where clashes are unlikely
            // to occur.
            for(var i=0; i<mutations; i++)
            {
                // Pick an index at random.
                var index = utilities.next(connectionCount);
                var connection = self.connections[index];

                // Scan forward and find the first non-mutated gene.
                while(self.connections[index].isMutated)
                {	// Increment index. Wrap around back to the start if we go off the end.
                    if(++index==connectionCount)
                        index=0;
                }

                // Mutate the gene at 'index'.
                self.mutateConnectionWeight(self.connections[index], np, paramGroup);
                self.connections[index].isMutated = true;
            }

            self.connections.forEach(function(connection){
                //reset if connection has been mutated, in case we go to do more mutations...
                connection.isMutated = false;
            });

        }
    };

    exports.NeatGenome.prototype.mutateConnectionWeight = function(connection, np, paramGroup)
    {
        switch(paramGroup.perturbationType)
        {
            case neatParameters.ConnectionPerturbationType.jiggleEven:
            {
                connection.weight += (utilities.nextDouble()*2-1.0) * paramGroup.perturbationFactor;

                // Cap the connection weight. Large connections weights reduce the effectiveness of the search.
                connection.weight = Math.max(connection.weight, -np.connectionWeightRange/2.0);
                connection.weight = Math.min(connection.weight, np.connectionWeightRange/2.0);
                break;
            }
                //Paul - not implementing cause Randlib.gennor is a terribel terrible function
                //if i need normal distribution, i'll find another javascript source
//            case neatParameters.ConnectionPerturbationType.jiggleND:
//            {
//                connectionGene.weight += RandLib.gennor(0, paramGroup.Sigma);
//
//                // Cap the connection weight. Large connections weights reduce the effectiveness of the search.
//                connectionGene.weight = Math.max(connectionGene.weight, -np.connectionWeightRange/2.0);
//                connectionGene.weight = Math.min(connectionGene.weight, np.connectionWeightRange/2.0);
//                break;
//            }
            case neatParameters.ConnectionPerturbationType.reset:
            {
                // TODO: Precalculate connectionWeightRange / 2.
                connection.weight = (utilities.nextDouble()*np.connectionWeightRange) - np.connectionWeightRange/2.0;
                break;
            }
            default:
            {
                throw "Unexpected ConnectionPerturbationType";
            }
        }
    };

    /// <summary>
/// If the neuron is a hidden neuron and no connections connect to it then it is redundant.
/// No neuron is redundant that is part of a module (although the module itself might be found redundant separately).
/// </summary>
    exports.NeatGenome.prototype.isNeuronRedundant=function(nodeLookup, nid)
    {
         var self = this;
        var node = nodeLookup[nid];
        if (node.type != cppnNode.NodeType.hidden
            || node.activationFunction.functionID === 'ModuleInputNeuron'
    || node.activationFunction.functionID === 'ModuleOutputNeuron')
        return false;

        return !self.isNeuronConnected(nid);
    };

    exports.NeatGenome.prototype.isNeuronConnected = function(nid)
    {
        var self = this;
        for(var i=0; i < self.connections.length; i++)
        {
            var connection =  self.connections[i];

            if(connection.sourceID == nid)
                return true;
            if(connection.targetID == nid)
                return true;

        }

        return false;
    };


    exports.NeatGenome.prototype.mutate_DeleteConnection = function(connection)
    {
        var self = this;
        if(self.connections.length ==0)
            return;

        self.nodeLookup = neatGenome.Help.CreateGIDLookup(self.nodes);

        // Select a connection at random.
        var connectionToDeleteIdx = utilities.next(self.connections.length);

        if(connection){
            for(var i=0; i< self.connections.length; i++){
                if(connection.gid == self.connections[i].gid)
                {
                    connectionToDeleteIdx = i;
                    break;
                }
            }
        }

        var connectionToDelete = connection || self.connections[connectionToDeleteIdx];

        // Delete the connection.
        self.connections.splice(connectionToDeleteIdx,1);

        var srcIx = -1;
        var tgtIx = -1;

        self.nodes.forEach(function(node,i){

            if(node.sourceID == connectionToDelete.sourceID)
                srcIx = i;

            if(node.targetID == connectionToDelete.targetID)
                tgtIx = i;
        });

        // Remove any neurons that may have been left floating.
        if(self.isNeuronRedundant(self.nodeLookup ,connectionToDelete.sourceID)){
            self.nodes.splice(srcIx,1);//(connectionToDelete.sourceID);
        }

        // Recurrent connection has both end points at the same neuron!
        if(connectionToDelete.sourceID !=connectionToDelete.targetID){
            if(self.isNeuronRedundant(self.nodeLookup, connectionToDelete.targetID))
                self.nodes.splice(tgtIx,1);//neuronGeneList.Remove(connectionToDelete.targetID);
        }
    };

    exports.NeatGenome.BuildNeuronConnectionLookupTable_NewConnection = function(nodeConnectionLookup,nodeTable, gid, connection, inOrOut)
    {
        // Is this neuron already known to the lookup table?
        var lookup = nodeConnectionLookup[gid];

        if(lookup==null)
        {	// Creae a new lookup entry for this neuron Id.
            lookup = {node: nodeTable[gid], incoming: [], outgoing: [] };
            nodeConnectionLookup[gid] = lookup;
        }

        // Register the connection with the NeuronConnectionLookup object.
        lookup[inOrOut].push(connection);
    };
    exports.NeatGenome.prototype.buildNeuronConnectionLookupTable = function()
    {
         var self = this;
        self.nodeLookup = neatGenome.Help.CreateGIDLookup(self.nodes);

        var nodeConnectionLookup = {};

        self.connections.forEach(function(connection){

            //what node is this connections target? That makes this an incoming connection
            neatGenome.NeatGenome.BuildNeuronConnectionLookupTable_NewConnection(nodeConnectionLookup,
                self.nodeLookup,connection.targetID, connection, 'incoming');

            //what node is this connectino's source? That makes this an outgoing connection for the node
            neatGenome.NeatGenome.BuildNeuronConnectionLookupTable_NewConnection(nodeConnectionLookup,
                self.nodeLookup, connection.sourceID, connection, 'outgoing');
        });

        return nodeConnectionLookup;
    };

    /// <summary>
    /// We define a simple neuron structure as a neuron that has a single outgoing or single incoming connection.
    /// With such a structure we can easily eliminate the neuron and shift it's connections to an adjacent neuron.
    /// If the neuron's non-linearity was not being used then such a mutation is a simplification of the network
    /// structure that shouldn't adversly affect its functionality.
    /// </summary>
    exports.NeatGenome.prototype.mutate_DeleteSimpleNeuronStructure = function(newConnectionTable, np)
    {

        var self = this;

        // We will use the NeuronConnectionLookupTable to find the simple structures.
        var nodeConnectionLookup = self.buildNeuronConnectionLookupTable();


        // Build a list of candidate simple neurons to choose from.
        var simpleNeuronIdList = [];

        for(var lookupKey in nodeConnectionLookup)
        {
            var lookup = nodeConnectionLookup[lookupKey];


            // If we test the connection count with <=1 then we also pick up neurons that are in dead-end circuits,
            // RemoveSimpleNeuron is then able to delete these neurons from the network structure along with any
            // associated connections.
            // All neurons that are part of a module would appear to be dead-ended, but skip removing them anyway.
            if (lookup.node.type == cppnNode.NodeType.hidden
                && !(lookup.node.activationFunction.functionID == 'ModuleInputNeuron')
        && !(lookup.node.activationFunction.functionID == 'ModuleOutputNeuron') ) {
            if((lookup.incoming.length<=1) || (lookup.outgoing.length<=1))
                simpleNeuronIdList.push(lookup.node.gid);
        }
        }

        // Are there any candiate simple neurons?
        if(simpleNeuronIdList.length==0)
        {	// No candidate neurons. As a fallback lets delete a connection.
            self.mutate_DeleteConnection();
            return false;
        }

        // Pick a simple neuron at random.
        var idx = utilities.next(simpleNeuronIdList.length);//Math.floor(utilities.nextDouble() * simpleNeuronIdList.length);
        var nid = simpleNeuronIdList[idx];
        self.removeSimpleNeuron(nodeConnectionLookup, nid, newConnectionTable, np);

        return true;
    };

    exports.NeatGenome.prototype.removeSimpleNeuron = function(nodeConnectionLookup, nid, newConnectionTable, np)
    {
        var self = this;
        // Create new connections that connect all of the incoming and outgoing neurons
        // that currently exist for the simple neuron.
        var lookup = nodeConnectionLookup[nid];

        lookup.incoming.forEach(function(incomingConnection)
        {
           lookup.outgoing.forEach(function(outgoingConnection){

               if(!self.testForExistingConnectionInnovation(incomingConnection.sourceID, outgoingConnection.targetID))
               {	// Connection doesnt already exists.

                   // Test for matching connection within NewConnectionGeneTable.
                   var connectionKey =  "(" + incomingConnection.sourceID + "," + outgoingConnection.targetID + ")";

                       //new ConnectionEndpointsStruct(incomingConnection.SourceNeuronId,
//                   outgoi//ngConnection.TargetNeuronId);
                   var existingConnection = newConnectionTable[connectionKey];
                   var newConnection;
                   var nextID = neatGenome.Help.nextInnovationID();
                   if(existingConnection==null)
                   {	// No matching connection found. Create a connection with a new ID.
                       newConnection = new neatConnection.NeatConnection(nextID,
                           (utilities.nextDouble() * np.connectionWeightRange) - np.connectionWeightRange/2.0,
                           {sourceID:incomingConnection.sourceID, targetID: outgoingConnection.targetID});
//                           new ConnectionGene(ea.NextInnovationId,
//                           incomingConnection.SourceNeuronId,
//                           outgoingConnection.TargetNeuronId,
//                           (Utilities.NextDouble() * ea.NeatParameters.connectionWeightRange) - ea.NeatParameters.connectionWeightRange/2.0);

                       // Register the new ID with NewConnectionGeneTable.
                       newConnectionTable[connectionKey] = newConnection;

                       // Add the new gene to the genome.
                       self.connections.push(newConnection);
                   }
                   else
                   {	// Matching connection found. Re-use its ID.
                       newConnection = new neatConnection.NeatConnection(existingConnection.gid,
                           (utilities.nextDouble() * np.connectionWeightRange) - np.connectionWeightRange/2.0,
                           {sourceID:incomingConnection.sourceID, targetID: outgoingConnection.targetID});

                       // Add the new gene to the genome. Use InsertIntoPosition() to ensure we don't break the sort
                       // order of the connection genes.
                       neatGenome.Help.insertByInnovation(newConnection, self.connections);
                   }

               }

           });

        });


        lookup.incoming.forEach(function(incomingConnection, inIx)
        {
            for(var i=0; i < self.connections.length; i++)
            {
                if(self.connections[i].gid == incomingConnection.gid)
                {
                    self.connections.splice(i,1);
                    break;
                }
            }
        });

        lookup.outgoing.forEach(function(outgoingConnection, inIx)
        {
            if(outgoingConnection.targetID != nid)
            {
                for(var i=0; i < self.connections.length; i++)
                {
                    if(self.connections[i].gid == outgoingConnection.gid)
                    {
                        self.connections.splice(i,1);
                        break;
                    }
                }
            }
        });

        // Delete the simple neuron - it no longer has any connections to or from it.
        for(var i=0; i < self.nodes.length; i++)
        {
            if(self.nodes[i].gid == nid)
            {
                self.nodes.splice(i,1);
                break;
            }
        }


    };

    //oy-vey that was hard porting that whole class...

    //gotta test everything against the C# class

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatjs']['neatGenome']={}: exports, this, typeof exports === 'undefined'? true : false);

//C# code that was not included

//class NeuronConnectionLookup
//{
//    public NeuronGene neuronGene;
//    public ConnectionGeneList incomingList = new ConnectionGeneList();
//    public ConnectionGeneList outgoingList = new ConnectionGeneList();
//}

//
//public override void Write(XmlNode parentNode)
//{
//    XmlGenomeWriterStatic.Write(parentNode, this);
//}

//public void FixConnectionWeights()
//{
//    int bound = connectionGeneList.Count;
//    for(int i=0; i<bound; i++)
//    connectionGeneList[i].FixedWeight = true;
//
//    // This will now be out of date. Although it should not need to be used after calling FixConnectionWeights.
//    mutableConnectionGeneList=null;
//}
