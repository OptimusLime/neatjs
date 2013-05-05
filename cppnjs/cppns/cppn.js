(function(exports, selfBrowser, isBrowser){

    var cppn = exports;

    var utilities = isBrowser ? selfBrowser['utilities'] : require('../utility/utilities.js');

    cppn.CPPN = function( biasNeuronCount,
                          inputNeuronCount,
                          outputNeuronCount,
                          totalNeuronCount,
                          connections,
                          biasList,
                          activationFunctions){

        var self = this;

        self.a = 0;
        self.b = 0;
        self.c = 0;
        self.d = 0;
        self.learningRate = 0;
        self.pre = 0;
        self.post = 0;

        self.adaptable = false;
        self.modulatory = false;

        // must be in the same order as neuronSignals. Has null entries for neurons that are inputs or outputs of a module.
        self.activationFunctions = activationFunctions;

        // The modules and connections are in no particular order; only the order of the neuronSignals is used for input and output methods.
        //floatfastconnections
        self.connections = connections;

        /// The number of bias neurons, usually one but sometimes zero. This is also the index of the first input neuron in the neuron signals.
        self.biasNeuronCount = biasNeuronCount;
        /// The number of input neurons.
        self.inputNeuronCount = inputNeuronCount;
        /// The number of input neurons including any bias neurons. This is also the index of the first output neuron in the neuron signals.
        self.totalInputNeuronCount = self.biasNeuronCount + self.inputNeuronCount;
        /// The number of output neurons.
        self.outputNeuronCount = outputNeuronCount;


        // For the following array, neurons are ordered with bias nodes at the head of the list,
        // then input nodes, then output nodes, and then hidden nodes in the array's tail.
        self.neuronSignals = [];
        self.modSignals = [];

        // This array is a parallel of neuronSignals, and only has values during SingleStepInternal().
        // It is declared here to avoid having to reallocate it for every network activation.
        self.neuronSignalsBeingProcessed = [];

        //initialize the neuron,mod, and processing signals
        for(var i=0; i < totalNeuronCount; i++){
            //either you are 1 for bias, or 0 otherwise
            self.neuronSignals.push(i < self.biasNeuronCount ? 1 : 0);
            self.modSignals.push(0);
            self.neuronSignalsBeingProcessed.push(0);
        }

        self.biasList = biasList;

        // For recursive activation, marks whether we have finished this node yet
        self.activated = [];
        // For recursive activation, makes whether a node is currently being calculated. For recurrant connections
        self.inActivation = [];
        // For recursive activation, the previous activation for recurrent connections
        self.lastActivation = [];


        self.adjacentList = [];
        self.reverseAdjacentList = [];
        self.adjacentMatrix = [];


        //initialize the activated, in activation, previous activation
        for(var i=0; i < totalNeuronCount; i++){
            self.activated.push(false);
            self.inActivation.push(false);
            self.lastActivation.push(0);

            //then we initialize our list of lists!
            self.adjacentList.push([]);
            self.reverseAdjacentList.push([]);

            self.adjacentMatrix.push([]);
            for(var j=0; j < totalNeuronCount; j++)
            {
                self.adjacentMatrix[i].push(0);
            }
        }

//        console.log(self.adjacentList.length);

        //finally
        // Set up adjacency list and matrix
        for (var i = 0; i < self.connections.length; i++)
        {
            var crs = self.connections[i].sourceIdx;
            var crt = self.connections[i].targetIdx;

            // Holds outgoing nodes
            self.adjacentList[crs].push(crt);

            // Holds incoming nodes
            self.reverseAdjacentList[crt].push(crs);

            self.adjacentMatrix[crs][crt] = connections[i].weight;
        }
    };
    /// <summary>
    /// This function carries out a single network activation.
    /// It is called by all those methods that require network activations.
    /// </summary>
    /// <param name="maxAllowedSignalDelta">
    /// The network is not relaxed as long as the absolute value of the change in signals at any given point is greater than this value.
    /// Only positive values are used. If the value is less than or equal to 0, the method will return true without checking for relaxation.
    /// </param>
    /// <returns>True if the network is relaxed, or false if not.</returns>
    cppn.CPPN.prototype.singleStepInternal = function(maxAllowedSignalDelta)
    {
        var isRelaxed = true;	// Assume true.
        var self = this;
        // Calculate each connection's output signal, and add the signals to the target neurons.
        for (var i = 0; i < self.connections.length; i++) {

            if (self.adaptable)
            {
                if (self.connections[i].modConnection <= 0.0)   //Normal connection
                {
                    self.neuronSignalsBeingProcessed[self.connections[i].targetIdx] += self.neuronSignals[self.connections[i].sourceIdx] * self.connections[i].weight;
                }
            else //modulatory connection
                {
                    self.modSignals[self.connections[i].targetIdx] += self.neuronSignals[self.connections[i].sourceIdx] * self.connections[i].weight;

                }
            }
            else
            {
                self.neuronSignalsBeingProcessed[self.connections[i].targetIdx] += self.neuronSignals[self.connections[i].sourceIdx] * self.connections[i].weight;

            }
        }

        // Pass the signals through the single-valued activation functions.
        // Do not change the values of input neurons or neurons that have no activation function because they are part of a module.
        for (var i = self.totalInputNeuronCount; i < self.neuronSignalsBeingProcessed.length; i++) {
            self.neuronSignalsBeingProcessed[i] = self.activationFunctions[i].calculate(self.neuronSignalsBeingProcessed[i]+self.biasList[i]);
            if (self.modulatory)
            {
                //Make sure it's between 0 and 1
                self.modSignals[i] += 1.0;
                if (self.modSignals[i]!=0.0)
                self.modSignals[i] = utilities.tanh(self.modSignals[i]);//Tanh(modSignals[i]);//(Math.Exp(2 * modSignals[i]) - 1) / (Math.Exp(2 * modSignals[i]) + 1));
            }
        }
        //TODO Modules not supported in this implementation - don't care


        /*foreach (float f in neuronSignals)
         HyperNEATParameters.distOutput.Write(f.ToString("R") + " ");
         HyperNEATParameters.distOutput.WriteLine();
         HyperNEATParameters.distOutput.Flush();*/

        // Move all the neuron signals we changed while processing this network activation into storage.
        if (maxAllowedSignalDelta > 0) {
            for (var i = self.totalInputNeuronCount; i < self.neuronSignalsBeingProcessed.length; i++) {

                // First check whether any location in the network has changed by more than a small amount.
                isRelaxed &= (Math.abs(self.neuronSignals[i] - self.neuronSignalsBeingProcessed[i]) > maxAllowedSignalDelta);

                self.neuronSignals[i] = self.neuronSignalsBeingProcessed[i];
                self.neuronSignalsBeingProcessed[i] = 0.0;
            }
        } else {
            for (var i = self.totalInputNeuronCount; i < self.neuronSignalsBeingProcessed.length; i++) {
                self.neuronSignals[i] = self.neuronSignalsBeingProcessed[i];
                self.neuronSignalsBeingProcessed[i] = 0.0;
            }
        }

        // Console.WriteLine(inputNeuronCount);

        if (self.adaptable)//CPPN != null)
        {
            var coordinates = new float[4];
            var modValue;
            var weightDelta;
            for (var i = 0; i < self.connections.length; i++)
            {
                if (self.modulatory)
                {
                    self.pre = self.neuronSignals[self.connections[i].sourceIdx];
                    self.post = self.neuronSignals[self.connections[i].targetIdx];
                    modValue = self.modSignals[self.connections[i].targetIdx];

                    self.a = self.connections[i].a;
                    self.b = self.connections[i].b;
                    self.c = self.connections[i].c;
                    self.d = self.connections[i].d;

                    self.learningRate = self.connections[i].learningRate;
                    if (modValue != 0.0 && (self.connections[i].modConnection <= 0.0))        //modulate target neuron if its a normal connection
                    {
                        self.connections[i].weight += modValue*self.learningRate * (self.a * self.pre * self.post + self.b * self.pre + self.c * self.post + self.d);
                    }

                    if (Math.abs(self.connections[i].weight) > 5.0)
                    {
                        self.connections[i].weight = 5.0 * utilities.sign(self.connections[i].weight);
                    }
                }
                else
                {
                    self.pre = self.neuronSignals[self.connections[i].sourceIdx];
                    self.post = self.neuronSignals[self.connections[i].targetIdx];
                    self.a = self.connections[i].a;
                    self.b = self.connections[i].b;
                    self.c = self.connections[i].c;

                    self.learningRate = self.connections[i].learningRate;

                    weightDelta = self.learningRate * (self.a * self.pre * self.post + self.b * self.pre + self.c * self.post);
                    connections[i].weight += weightDelta;

                    //   Console.WriteLine(pre + " " + post + " " + learningRate + " " + A + " " + B + " " + C + " " + weightDelta);

                    if (Math.abs(self.connections[i].weight) > 5.0)
                    {
                        self.connections[i].weight = 5.0 * utilities.sign(self.connections[i].weight);
                    }
                }
            }
        }

        for (var i = self.totalInputNeuronCount; i < self.neuronSignalsBeingProcessed.length; i++)
        {
            self.modSignals[i] = 0.0;
        }

        return isRelaxed;

    };


    cppn.CPPN.prototype.singleStep = function(finished)
    {
        var self = this;
        self.singleStepInternal(0.0); // we will ignore the value of this function, so the "allowedDelta" argument doesn't matter.
        if (finished)
        {
            finished(null);
        }
    };

    cppn.CPPN.prototype.multipleSteps = function(numberOfSteps)
    {
        var self = this;
        for (var i = 0; i < numberOfSteps; i++) {
            self.singleStep();
        }
    };

    /// <summary>
    /// Using RelaxNetwork erodes some of the perofrmance gain of FastConcurrentNetwork because of the slightly
    /// more complex implemementation of the third loop - whe compared to SingleStep().
    /// </summary>
    /// <param name="maxSteps"></param>
    /// <param name="maxAllowedSignalDelta"></param>
    /// <returns></returns>
    cppn.CPPN.prototype.relaxNetwork = function(maxSteps, maxAllowedSignalDelta)
    {
        var self = this;
        var isRelaxed = false;
        for (var j = 0; j < maxSteps && !isRelaxed; j++) {
            isRelaxed = self.singleStepInternal(maxAllowedSignalDelta);
        }
        return isRelaxed;
    };

    cppn.CPPN.prototype.setInputSignal = function(index, signalValue)
    {
        var self = this;
        // For speed we don't bother with bounds checks.
        self.neuronSignals[self.biasNeuronCount + index] = signalValue;
    };

    cppn.CPPN.prototype.setInputSignals = function(signalArray)
    {
        var self = this;
        // For speed we don't bother with bounds checks.
        for (var i = 0; i < signalArray.length; i++)
            self.neuronSignals[self.biasNeuronCount + i] = signalArray[i];
    };

    //we can dispense of this by accessing neuron signals directly
    cppn.CPPN.prototype.getOutputSignal = function(index)
    {
        var self = this;
        // For speed we don't bother with bounds checks.
        return self.neuronSignals[self.totalInputNeuronCount + index];
    };

    //we can dispense of this by accessing neuron signals directly
    cppn.CPPN.prototype.clearSignals = function()
    {
        var self = this;
        // Clear signals for input, hidden and output nodes. Only the bias node is untouched.
        for (var i = self.biasNeuronCount; i < self.neuronSignals.length; i++)
            self.neuronSignals[i] = 0.0;
    };

//    cppn.CPPN.prototype.TotalNeuronCount = function(){ return this.neuronSignals.length;};

    cppn.CPPN.prototype.recursiveActivation = function(){

        var self = this;
        // Initialize boolean arrays and set the last activation signal, but only if it isn't an input (these have already been set when the input is activated)
        for (var i = 0; i < self.neuronSignals.length; i++)
        {
            // Set as activated if i is an input node, otherwise ensure it is unactivated (false)
            self.activated[i] = (i < self.totalInputNeuronCount) ? true : false;
            self.inActivation[i] = false;
            if (i >= self.totalInputNeuronCount)
                self.lastActivation[i] = self.neuronSignals[i];
        }

        // Get each output node activation recursively
        // NOTE: This is an assumption that genomes have started minimally, and the output nodes lie sequentially after the input nodes
        for (var i = 0; i < self.outputNeuronCount; i++)
            self.recursiveActivateNode(self.totalInputNeuronCount + i);

    };


    cppn.CPPN.prototype.recursiveActivateNode = function(currentNode)
    {
        var self = this;
        // If we've reached an input node we return since the signal is already set
        if (self.activated[currentNode])
        {
            self.inActivation[currentNode] = false;
            return;
        }

        // Mark that the node is currently being calculated
        self.inActivation[currentNode] = true;

        // Set the presignal to 0
        self.neuronSignalsBeingProcessed[currentNode] = 0;

        // Adjacency list in reverse holds incoming connections, go through each one and activate it
        for (var i = 0; i < self.reverseAdjacentList[currentNode].length; i++)
        {
            var crntAdjNode = self.reverseAdjacentList[currentNode][i];

            //{ Region recurrant connection handling - not applicable in our implementation
            // If this node is currently being activated then we have reached a cycle, or recurrant connection. Use the previous activation in this case
            if (self.inActivation[crntAdjNode])
            {
                self.neuronSignalsBeingProcessed[currentNode] += self.lastActivation[crntAdjNode]*self.adjacentMatrix[crntAdjNode][currentNode];
//                    parseFloat(
//                    parseFloat(self.lastActivation[crntAdjNode].toFixed(9)) * parseFloat(self.adjacentMatrix[crntAdjNode][currentNode].toFixed(9)).toFixed(9));
            }

            // Otherwise proceed as normal
            else
            {
                // Recurse if this neuron has not been activated yet
                if (!self.activated[crntAdjNode])
                    self.recursiveActivateNode(crntAdjNode);

                // Add it to the new activation
                self.neuronSignalsBeingProcessed[currentNode] +=  self.neuronSignals[crntAdjNode] *self.adjacentMatrix[crntAdjNode][currentNode];
//                    parseFloat(
//                    parseFloat(self.neuronSignals[crntAdjNode].toFixed(9)) * parseFloat(self.adjacentMatrix[crntAdjNode][currentNode].toFixed(9)).toFixed(9));
            }
            //} endregion
        }

        // Mark this neuron as completed
        self.activated[currentNode] = true;

        // This is no longer being calculated (for cycle detection)
        self.inActivation[currentNode] = false;

        // Set this signal after running it through the activation function
        self.neuronSignals[currentNode] = self.activationFunctions[currentNode].calculate(self.neuronSignalsBeingProcessed[currentNode]);
//            parseFloat((self.activationFunctions[currentNode].calculate(parseFloat(self.neuronSignalsBeingProcessed[currentNode].toFixed(9)))).toFixed(9));

    };

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['cppn']={}: exports, this, typeof exports === 'undefined'? true : false);
