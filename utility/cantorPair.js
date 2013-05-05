(function(exports, selfBrowser, isBrowser){

    //if we need a node object, this is how we would do it
//    var neatNode = isNodejs ? self['neatNode'] : require('./neatNode.js');
    exports.xy2cp = function(x, y)
    {
        return ((x + y) * (x + y + 1)) / 2 + y;
    };

    exports.cp2xy = function(z)
    {
        var t = Math.floor((-1 + Math.sqrt(1 + 8 * z))/2);
        var x = t * (t + 3) / 2 - z;
        var y = z - t * (t + 1) / 2;
        return {x: x, y:y};
    };

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['cantorPair']={}: exports, this, typeof exports === 'undefined'? true : false);
