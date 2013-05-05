(function(exports, selfBrowser, isBrowser){

    var utilities = exports;

    exports.stringToFunction = function(str) {
        var arr = str.split(".");

        var fn = (window || this);
        for (var i = 0, len = arr.length; i < len; i++) {
            fn = fn[arr[i]];
        }

        if (typeof fn !== "function") {
            throw new Error("function not found");
        }

        return  fn;
    };

    exports.nextDouble = function()
    {
        return Math.random();
    };

    exports.next = function(range)
    {
       return Math.floor((Math.random()*range));
    };

    exports.tanh = function(arg) {
        // sinh(number)/cosh(number)
        return (Math.exp(arg) - Math.exp(-arg)) / (Math.exp(arg) + Math.exp(-arg));
    };

    exports.sign = function(input)
    {
        if (input < 0) {return -1};
        if (input > 0) {return 1};
        return 0;
    };

    //ROULETTE WHEEL class


    //if we need a node object, this is how we would do it
//    var neatNode = isNodejs ? self['neatNode'] : require('./neatNode.js');
    exports.RouletteWheel =
    {

    };

    /// <summary>
    /// A simple single throw routine.
    /// </summary>
    /// <param name="probability">A probability between 0..1 that the throw will result in a true result.</param>
    /// <returns></returns>
    exports.RouletteWheel.singleThrow = function(probability)
    {
        return (utilities.nextDouble() <= probability);
    };



    /// <summary>
    /// Performs a single throw for a given number of outcomes with equal probabilities.
    /// </summary>
    /// <param name="numberOfOutcomes"></param>
    /// <returns>An integer between 0..numberOfOutcomes-1. In effect this routine selects one of the possible outcomes.</returns>

    exports.RouletteWheel.singleThrowEven = function(numberOfOutcomes)
    {
        var probability= 1.0 / numberOfOutcomes;
        var accumulator=0;
        var throwValue = utilities.nextDouble();

        for(var i=0; i<numberOfOutcomes; i++)
        {
            accumulator+=probability;
            if(throwValue<=accumulator)
                return i;
        }
        //throw exception in javascript
        throw "PeannutLib.Maths.SingleThrowEven() - invalid outcome.";
    };

    /// <summary>
    /// Performs a single thrown onto a roulette wheel where the wheel's space is unevenly divided.
    /// The probabilty that a segment will be selected is given by that segment's value in the 'probabilities'
    /// array. The probabilities are normalised before tossing the ball so that their total is always equal to 1.0.
    /// </summary>
    /// <param name="probabilities"></param>
    /// <returns></returns>
    exports.RouletteWheel.singleThrowArray = function(aProbabilities)
    {
        if(typeof aProbabilities === 'number')
            throw new Error("Send Array to singleThrowArray!");
        var pTotal=0;	// Total probability

        //-----
        for(var i=0; i<aProbabilities.length; i++)
            pTotal+= aProbabilities[i];

        //----- Now throw the ball and return an integer indicating the outcome.
        var throwValue = utilities.nextDouble() * pTotal;
        var accumulator=0;

        for(var j=0; j< aProbabilities.length; j++)
        {
            accumulator+= aProbabilities[j];

            if(throwValue<=accumulator)
                return j;
        }

        throw "PeannutLib.Maths.singleThrowArray() - invalid outcome.";
    };

    /// <summary>
    /// Similar in functionality to SingleThrow(double[] probabilities). However the 'probabilities' array is
    /// not normalised. Therefore if the total goes beyond 1 then we allow extra throws, thus if the total is 10
    /// then we perform 10 throws.
    /// </summary>
    /// <param name="probabilities"></param>
    /// <returns></returns>
    exports.RouletteWheel.multipleThrows = function(aProbabilities)
    {
        var pTotal=0;	// Total probability
        var numberOfThrows;

        //----- Determine how many throws of the ball onto the wheel.
        for(var i=0; i<aProbabilities.length; i++)
            pTotal+=aProbabilities[i];

        // If total probabilty is > 1 then we take this as meaning more than one throw of the ball.
        var pTotalInteger = Math.floor(pTotal);
        var pTotalRemainder = pTotal - pTotalInteger;
        numberOfThrows = Math.floor(pTotalInteger);

        if(utilities.nextDouble() <= pTotalRemainder)
            numberOfThrows++;

        //----- Now throw the ball the determined number of times. For each throw store an integer indicating the outcome.
        var outcomes = [];//new int[numberOfThrows];
        for(var a=0; a < numberOfThrows; a++)
            outcomes.push(0);

        for(var i=0; i<numberOfThrows; i++)
        {
            var throwValue = utilities.nextDouble() * pTotal;
            var accumulator=0;

            for(var j=0; j<aProbabilities.length; j++)
            {
                accumulator+=aProbabilities[j];

                if(throwValue<=accumulator)
                {
                    outcomes[i] = j;
                    break;
                }
            }
        }

        return outcomes;
    };


    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['utilities']={}: exports, this, typeof exports === 'undefined'? true : false);

//function namespace(namespaceString) {
//    var parts = namespaceString.split('.'),
//        parent = window,
//        currentPart = '';
//
//    for(var i = 0, length = parts.length; i < length; i++) {
//        currentPart = parts[i];
//        parent[currentPart] = parent[currentPart] || {};
//        parent = parent[currentPart];
//    }
//
//    return parent;
//};
