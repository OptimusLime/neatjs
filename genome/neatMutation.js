// we track mutation objects for use with winjs
// mutations are what create new structure inside of neat, we track add nodes, and add connections

(function(exports, selfBrowser, isBrowser){


    var neatMutation = exports;

    neatMutation.NeatMutation = function(gid, type, manipulatedObjects, newObjects)
    {

        var self= this;

        //keep track of unique mutations
        self.gid = gid;

        //what type of mutation are we?
        self.type = type;

        self.sourceID = manipulatedObjects.sourceID;

        //add node mutations don't have a targetid, just a source (the connection to split)
        self.targetID = manipulatedObjects.targetID;

        //what did we result in
        self.newNodes = newObjects.nodes;
        self.newConnections = newObjects.connections;

    };

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatjs']['neatMutation']={}: exports, this, typeof exports === 'undefined'? true : false);