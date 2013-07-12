(function(exports, selfBrowser, isBrowser){

    //if we need a node object, this is how we would do it
//    var cantorPair = isBrowser ? selfBrowser['cantorPair'] : require('../utility/cantorPair.js');
    var neatConnection = exports;


    //TODO: Add step counter
    neatConnection.NeatConnection = function(gid, weight, srcTgtObj) {

        var self = this;
        //Connection can be inferred by the cantor pair in the gid, however, in other systems, we'll need a source and target ID

        self.gid = (typeof gid === 'string' ? parseFloat(gid) : gid);
        self.weight = (typeof weight === 'string' ? parseFloat(weight) : weight);

        self.sourceID = (typeof srcTgtObj.sourceID === 'string' ? parseFloat(srcTgtObj.sourceID) : srcTgtObj.sourceID);
        self.targetID = (typeof srcTgtObj.targetID === 'string' ? parseFloat(srcTgtObj.targetID) : srcTgtObj.targetID);

        //learning rates and modulatory information contained here, not generally used or tested
        self.a =0;
        self.b =0;
        self.c =0;
        self.d =0;
        self.modConnection=0;
        self.learningRate=0;

        self.isMutated=false;
    };

    neatConnection.NeatConnection.Copy = function(connection)
    {
        return new neatConnection.NeatConnection(connection.gid, connection.weight, {sourceID: connection.sourceID, targetID: connection.targetID});
    };

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatjs']['neatConnection']={}: exports, this, typeof exports === 'undefined'? true : false);