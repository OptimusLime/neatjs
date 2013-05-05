(function(exports, selfBrowser, isBrowser){

    var cppnNode = exports;



    cppnNode.NodeType =
    {
        bias : "Bias",
        input: "Input",
        output: "Output",
        hidden: "Hidden",
        other : "Other"
    };

    cppnNode.CPPNNeuron = function(actFn, neurType, nid){

        var self = this;

        self.neuronType = neurType;
        self.id = nid;
        self.outputValue = (self.neuronType == cppnNode.NodeType.bias ? 1.0 : 0.0);
        self.activationFunction = actFn;
        self.outputRecalc = 0; // The recalculated output is not updated immediately. A complete pass of the network is
        // done using the existing output values, and then we switch the network over to the the
        // recalced values in a second pass. This way we simulate the workings of a parallel network.

        self.incomingConnectionList = [];// All of the incoming connections to a neuron. The neuron can recalculate it's own output value by iterating throgh this collection.

        //methods for returning computed variables
        self.outputDelta = function() { return Math.abs(self.outputValue - self.outputRecalc)};

        /// <summary>
        /// Recalculate this neuron's output value.
        /// </summary>
        self.recalc = function(){

            // No recalculation required for input or bias nodes.
            if(self.neuronType==cppnNode.NodeType.input || self.neuronType==cppnNode.NodeType.bias)
                return;

            // Iterate the connections and total up the input signal from all of them.
            var accumulator=0;
            var loopBound = self.incomingConnectionList.length;
            for(var i=0; i<loopBound; i++)
            {
                var connection = self.incomingConnectionList[i];
                //this doesn't work with fast connections, did you know that?
                accumulator += connection.sourceNeuron.outputValue* connection.weight;
            }

            self.outputRecalc = self.activationFunction.calculate(accumulator);
        };

        self.useRecalculatedValue = function(){
            // No recalculation required for input or bias nodes.
            if(self.neuronType==cppnNode.NodeType.input || self.neuronType==cppnNode.NodeType.bias)
                return;

            self.outputValue = self.outputRecalc;
        };
    };



    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['cppnNode']={}: exports, this, typeof exports === 'undefined'? true : false);
