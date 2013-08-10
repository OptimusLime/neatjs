(function(exports, selfBrowser, isBrowser){

    var iec = exports;

    var cppnjs = isBrowser ? selfBrowser['common'] : require('cppn');
    var neatjs = isBrowser ? selfBrowser['common'] : require('../neatjs.js');

    var utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
    var cppnActivationFactory = cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
    var cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');

    var neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');
    var neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
    var neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
    var neatParameters = neatjs.loadLibraryFile('neatjs', 'neatParameters');
    var genomeSharpToJS =neatjs.loadLibraryFile('neatjs', 'genomeSharpToJS');



    iec.CheckDependencies = function()
    {
        utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
        cppnActivationFactory = cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
        cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');

        neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');
        neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
        neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
        neatParameters = neatjs.loadLibraryFile('neatjs', 'neatParameters');
        genomeSharpToJS =neatjs.loadLibraryFile('neatjs', 'genomeSharpToJS');

    };

    //seeds are required -- and are expected to be the correct neatGenome types
    iec.GenericIEC = function(np, seeds, iecOptions)
    {
        var self = this;

        self.options = iecOptions || {};
        self.np = np;

        //we keep track of new nodes and connections for the session
        self.newNodes = {};
        self.newConnections = {};

        //we can send in a seed genome -- to create generic objects when necessary
        self.seeds = seeds;

        for(var s=0; s < seeds.length; s++)
        {
            var seed = seeds[s];
            for(var c =0; c < seed.connections.length; c++)
            {
                var sConn = seed.connections[c];
                var cid = '(' + sConn.sourceID + ',' + sConn.targetID + ')';
                self.newConnections[cid] = sConn;
            }
        }


        iec.GenericIEC.prototype.cloneSeed = function(){

            var seedIx = utilities.next(self.seeds.length);

            var seedCopy = neatGenome.NeatGenome.Copy(self.seeds[seedIx]);
            if(self.options.seedMutationCount)
            {
                for(var i=0; i < self.options.seedMutationCount; i++)
                    seedCopy.mutate(self.newNodes, self.newConnections, self.np);
            }
            return seedCopy;
        };

        //this function handles creating a genotype from sent in parents.
        //it's pretty simple -- however many parents you have, select a random number of them, and attempt to mate them
        iec.GenericIEC.prototype.createNextGenome = function(parents)
        {
            //IF we have 0 parents, we create a genome with the default configurations
            var ng;
            var initialMutationCount = self.options.initialMutationCount || 0,
                postXOMutationCount = self.options.postMutationCount || 0;

            var responsibleParents = [];

            switch(parents.length)
            {
                case 0:

                    //parents are empty -- start from scratch!
                    ng = self.cloneSeed();

                    for(var m=0; m < initialMutationCount; m++)
                        ng.mutate(self.newNodes, self.newConnections, self.np);

                    //no responsible parents

                    break;
                case 1:

                    //we have one parent
                    //asexual reproduction
                    ng = parents[0].createOffspringAsexual(self.newNodes, self.newConnections, self.np);

                    //parent at index 0 responsible
                    responsibleParents.push(0);

                    break;
                default:
                    //greater than 1 individual as a possible parent

                    //at least 1 parent, and at most self.activeParents.count # of parents
                    var parentCount = 1 + utilities.next(parents.length);

                    if(parentCount == 1)
                    {
                        //select a single parent for offspring
                        var rIx = utilities.next(parents.length);

                        ng = parents[rIx].createOffspringAsexual(self.newNodes, self.newConnections, self.np);
                        //1 responsible parent at index 0
                        responsibleParents.push(rIx);
                        break;
                    }

                    //we expect active parents to be small, so we grab parentCount number of parents from a small array of parents
                    var parentIxs = utilities.RouletteWheel.selectXFromSmallObject(parentCount, parents);

                    var p1 = parents[parentIxs[0]], p2;
                    //if I have 3 parents, go in order composing the objects

                    responsibleParents.push(parentIxs[0]);

                    //p1 mates with p2 to create o1, o1 mates with p3, to make o2 -- p1,p2,p3 are all combined now inside of o2
                    for(var i=1; i < parentIxs.length; i++)
                    {
                        p2 = parents[parentIxs[i]];
                        ng = p1.createOffspringSexual(p2, self.np);
                        p1 = ng;
                        responsibleParents.push(parentIxs[i]);
                    }

                    for(var m=0; m < postXOMutationCount; m++)
                        ng.mutate(self.newNodes, self.newConnections, self.np);


                    break;
            }

            //we have our genome, let's send it back

            //the reason we don't end it inisde the switch loop is that later, we might be interested in saving this genome from some other purpose
            return {offspring: ng, parents: responsibleParents};
        };

    };


    iec.BasicIEC = function(genomeSettings, genomeFunctions)
    {
        var self = this;

        //we need to keep track of our genome objects
        self.genomeObjects = {};

        //currently activate parents for creating new genomes
        self.activeParents = {count:0};
        self.parentList = [];

        //Keep track of new mutations locally -- some form of global consistency follows using WIN
        self.existingConnectionIDs = {};
        self.newNodes = {};
        self.newConnections = {};

        //basic paramters for iec, can be adjusted
        self.np = new neatParameters.NeatParameters();
        self.np.pMutateAddConnection = .03;
        self.np.pMutateAddNode = .03;
        self.np.pMutateDeleteConnection = .01;
        self.np.pMutateConnectionWeights = .93;
        self.np.disallowRecurrence = true;

        self.np.connectionWeightRange = genomeSettings.connectionWeightRange || self.np.connectionWeightRange;

        //what activation functions, and equal probability of selection
        if(genomeSettings.activationFunctions)
        {
            var aFunc = {};
            var prob = 1/genomeSettings.activationFunctions.length;
            genomeSettings.activationFunctions.forEach(function(func){
                //every function equally likely to happen
                aFunc[func] = prob;
            });

            cppnActivationFactory.Factory.setProbabilities(aFunc);
        }
        //removed UI setup, no UI in this class


        //a seed genome too perhaps?
        if(genomeSettings.seed)
        {
            self.seed= genomeSettings.seed;
            self.inputCount = self.seed.inputNeuronCount;
            self.outputCount = self.seed.outputNeuronCount;
        }
        //in xml format also welcome
        else if(genomeSettings.seedGenomeXML)
        {
            self.seed = genomeSharpToJS.ConvertCSharpToJS(genomeSettings.seedGenomeXML); // = load seed gneome here

            self.inputCount = self.seed.inputNeuronCount;
            self.outputCount = self.seed.outputNeuronCount;
        }
        //otherwise, create basic seed -- connected according to neat params
        else
        {
            self.inputCount = genomeSettings.inputCount;
            self.outputCount = genomeSettings.outputCount;

            self.seed = self.createSimpleGenome(self.inputCount, self.outputCount, self.np.connectionWeightRange, self.np.pInitialPopulationInterconnections, self.existingConnectionIDs);
        }

        //how many times to mutate a genome after creating before returning to processs
        self.seedMutationCount = genomeSettings.seedMutationCount;

        self.genomeFunctions = genomeFunctions;

    };

    iec.BasicIEC.prototype.createDragHelper = function(i)
    {
        var self = this;
        return self.genomeFunctions.createDragHelper(i);
    };

    iec.BasicIEC.prototype.preAddHTML = function(i)
    {
        var self = this;

//        console.log('pre-ing html');
//        console.log(self);

        //nothing to do on our end, just pass info along
        return self.genomeFunctions.preAddHTML(i);
    };

    iec.BasicIEC.prototype.postAddHTML = function(i, $html)
    {
        var self = this;

//        console.log('posting html');
//        console.log(self);

        //we've just added an html object, we should generate a genome object
        var ng = self.genomeObjects[i];

        if(!ng)
        {
            //if we don't have anything cached, create a new one!
            ng = self.createNextGenome();
            self.genomeObjects[i] = ng;
        }

        //pass along the genome we created for this object
        return self.genomeFunctions.postAddHTML(ng, i, $html);

    };

    iec.BasicIEC.prototype.preRemoveHTML = function(i)
    {
        var self = this;
        return self.genomeFunctions.preRemoveHTML(i);
    };

    iec.BasicIEC.prototype.postRemoveHTML = function(i)
    {
        var self = this;
        return self.genomeFunctions.postRemoveHTML(i);
    };

    iec.BasicIEC.prototype.removeParent = function(id)
    {

        //parent has been removed
        //remove from active
        if(this.activeParents[id])
        {
            var findIx;
            for(var i=0; i< this.parentList.length; i++)
            {
                if(this.parentList[i] === this.activeParents[id].genome)
                {
                    findIx = i;
                    break;
                }
            }
            this.parentList.splice(findIx,1);
            delete this.activeParents[id];
            this.activeParents.count--;

        }

    };

    iec.BasicIEC.prototype.settingParentGenome = function(i, id)
    {
        var self = this;
        var ng = self.genomeObjects[i];

        //are we overwriting a previous parent???
        if(self.activeParents[id])
        {
            //find our genome in the parent list
            var findIx;
            for(var s=0; s< self.parentList.length; s++)
            {
                if(this.parentList[s] === self.activeParents[id].genome)
                {
                    findIx = s;
                    break;
                }
            }
            self.parentList.splice(findIx,1);
            self.activeParents.count--;
        }

        //this is now a parent
        self.activeParents[id] = {genome: ng, parentIx: self.parentList.length};
        self.parentList.push(ng);
        self.activeParents.count++;

        //return the genome of the now active parent
        return ng;
    };

    iec.BasicIEC.prototype.createSimpleGenome = function(ins, outs, weightRange, connProp, existing){

        return neatGenome.Help.CreateGenomeByInnovation(ins,
            outs, {connectionProportion: connProp, connectionWeightRange: weightRange}, existing);
    };

    iec.BasicIEC.prototype.cloneSeed = function(){
        var seedCopy = neatGenome.NeatGenome.Copy(this.seed);
        if(this.seedMutationCount)
        {

            for(var i=0; i < this.seedMutationCount; i++)
                seedCopy.mutate(this.newNodes, this.newConnections, this.np);
        }
        return seedCopy;

    };

    //this function handles creating a genotype from currently selected parents.
    //it's pretty simple -- however many parents you have, select a random number of them, and attempt to mate them
    iec.BasicIEC.prototype.createNextGenome = function()
    {
        //right now, we just use our helper function, but in reality, we'll pull from the parents
        //and create a new individual
        var self = this;
        //IF we have 0 parents, we create a genome with the default configurations
        var ng,
            initialMutationCount = 2,
            postXOMutationCount = 2;

        switch(self.activeParents.count)
        {
            case 0:
                ng = self.cloneSeed();

                for(var m=0; m < initialMutationCount; m++)
                    ng.mutate(self.newNodes, self.newConnections, self.np);

                break;
            case 1:
                ng = self.parentList[0].createOffspringAsexual(self.newNodes, self.newConnections, self.np);
                break;
            default:
                //greater than 1 individual as a possible parent

                //at least 1 parent, and at most self.activeParents.count # of parents
                var parentCount = 1 + utilities.next(self.activeParents.count);

                if(parentCount == 1)
                {
                    //before, we selected first object as parent -- should be random ix
                    var rIx = utilities.next(self.parentList.length);
                    ng = self.parentList[rIx].createOffspringAsexual(self.newNodes, self.newConnections, self.np);
                    break;
                }

                //we expect active parents to be small, so we grab parentCount number of parents from a small array of parents
                var parentIxs = utilities.RouletteWheel.selectXFromSmallObject(parentCount, self.activeParents);

                var p1 = self.parentList[parentIxs[0]], p2;
                //if I have 3 parents, go in order composing the objects

                //p1 mates with p2 to create o1, o1 mates with p3, to make o2 -- p1,p2,p3 are all combined now inside of o2
                for(var i=1; i < parentIxs.length; i++)
                {
                    p2 = self.parentList[parentIxs[i]];
                    ng = p1.createOffspringSexual(p2, self.np);
                    p1 = ng;
                }

//                console.log('P1');
//                console.log(self.parentList[parentIxs[0]]);
//                console.log('P2');
//                console.log(self.parentList[parentIxs[1]]);
//                console.log('END');

                for(var m=0; m < postXOMutationCount; m++)
                    ng.mutate(self.newNodes, self.newConnections, self.np);


                break;
        }

        //we have our genome, let's send it back

        //the reason we don't end it inisde the switch loop is that later, we might be interested in saving this genome from some other purpose
        return ng;
    };

    iec.CreateSeed = function(seedParameters)
    {
        //we need nodes, connections, incount, outcount

        var nid = 0;

        var nodes = [], connections = [];

        //no such thing as zero bias thank you!
        var bCount = seedParameters.biasCount || 1;
        //create the bias node(s)
        for(var i=0; i < bCount; i++)
            nodes.push(new neatNode.NeatNode(nid++, "NullFn", 0, {type: cppnNode.NodeType.bias}));

        var iCount = seedParameters.inputCount || 3;

        //create input nodes
        for(var i=0; i < iCount; i++)
            nodes.push(new neatNode.NeatNode(nid++, "NullFn", 0, {type: cppnNode.NodeType.input}));

        //create the output nodes
        var oCount = seedParameters.outputCount || 3;

        var defaultActivation = seedParameters.defaultActivation ||  "BipolarSigmoid";

        var specificActivation = seedParameters.outputActivations;


        //create the output nodes
        for(var i=0; i < oCount; i++)
            nodes.push(
                new neatNode.NeatNode(
                    nid++,
                    (specificActivation ? specificActivation[i] : defaultActivation),
                    10,
                    {type: cppnNode.NodeType.output}));


        var hCount = seedParameters.hiddenCount;
        specificActivation = seedParameters.hiddenActivations;

        for(var i=0; i < hCount; i++)
        {
            nodes.push(
                new neatNode.NeatNode(
                    nid++,
                    (specificActivation ? specificActivation[i] : defaultActivation),
                    5,
                    {type: cppnNode.NodeType.hidden}));
        }


        //we have all our nodes! now let's create our connections

        var totalInputs = bCount + iCount;
        var hiddenStart = totalInputs + oCount;


        if(seedParameters.connectInputsOutputs)
        {
            for(var i=0; i < totalInputs; i++)
            {
                for(var o=0; o < oCount; o++)
                {
                    var io = i + ',' + (o + totalInputs);
                    var weight = seedParameters.connectInputsOutputs[io] !== undefined ? seedParameters.connectInputsOutputs[io] : utilities.nextDouble();
                    console.log('Looking for: ' + io + ' found: ' + weight)

                    connections.push(
                        new neatConnection.NeatConnection(
                            nid++,
                            weight,
                            {sourceID: i, targetID:(o + totalInputs)}
                        ));

                }
            }
        }

        if(seedParameters.specificConnections)
        {
            for(var i=0; i < seedParameters.specificConnections.length; i++)
            {
                var conn = seedParameters.specificConnections[i];
                connections.push(
                    new neatConnection.NeatConnection(
                        nid++,
                        conn.weight,
                        {sourceID: conn.sourceID, targetID:conn.targetID}
                    ));
            }
        }

        return new neatGenome.NeatGenome(neatGenome.Help.nextGenomeID(), nodes, connections, iCount, oCount, false);


    }


})(typeof exports === 'undefined'? this['neatjs']['iec']={}: exports, this, typeof exports === 'undefined'? true : false);
