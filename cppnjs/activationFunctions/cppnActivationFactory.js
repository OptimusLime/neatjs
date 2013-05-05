(function(exports, selfBrowser, isBrowser){

    var utilities = isBrowser ? selfBrowser['utilities'] : require('../utility/utilities.js');
    var neatActivationFunctions = isBrowser ? selfBrowser['neatActivationFunctions'] : require('./cppnActivationFunctions.js');
    var neatActivationFactory = exports;

    neatActivationFactory.Factory =
    {
    };

    neatActivationFactory.Factory.probabilities = [];
    neatActivationFactory.Factory.functions = [];
    neatActivationFactory.Factory.functionTable= {};

    neatActivationFactory.Factory.createActivationFunction = function(functionID)
    {
        if(!neatActivationFunctions[functionID])
            throw new Error("Activation Function doesn't exist!");
        // For now the function ID is the name of a class that implements IActivationFunction.
        return new neatActivationFunctions[functionID]();

    };

    neatActivationFactory.Factory.getActivationFunction = function(functionID)
    {
        var activationFunction = neatActivationFactory.Factory.functionTable[functionID];
        if(!activationFunction)
        {
//            console.log('Creating: ' + functionID);
//            console.log('ActivationFunctions: ');
//            console.log(neatActivationFunctions);

            activationFunction = neatActivationFactory.Factory.createActivationFunction(functionID);
            neatActivationFactory.Factory.functionTable[functionID] = activationFunction;
        }
        return activationFunction;

    };

    neatActivationFactory.Factory.setProbabilities = function(oProbs)
    {
        neatActivationFactory.Factory.probabilities = [];//new double[probs.Count];
        neatActivationFactory.Factory.functions = [];//new IActivationFunction[probs.Count];
        var counter = 0;

        for(var key in oProbs)
        {
            neatActivationFactory.Factory.probabilities.push(oProbs[key]);
            neatActivationFactory.Factory.functions.push(neatActivationFactory.Factory.getActivationFunction(key));
            counter++;
        }

    };

    neatActivationFactory.Factory.defaultProbabilities = function()
    {
        var oProbs = {'BipolarSigmoid' :.25, 'Sine':.25, 'Gaussian':.25, 'Linear':.25};
        neatActivationFactory.Factory.setProbabilities(oProbs);
    };
    neatActivationFactory.Factory.getRandomActivationFunction = function()
    {
        if(neatActivationFactory.Factory.probabilities.length == 0)
            neatActivationFactory.Factory.defaultProbabilities();

        return neatActivationFactory.Factory.functions[utilities.RouletteWheel.singleThrowArray(neatActivationFactory.Factory.probabilities)];
    };


    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['cppnActivationFactory']={}: exports, this, typeof exports === 'undefined'? true : false);
