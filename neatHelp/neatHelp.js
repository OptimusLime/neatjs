(function(exports, selfBrowser, isBrowser){

    var neatHelp = exports;

    exports.CorrelationType =
    {
        matchedConnectionGenes : 0,
        disjointConnectionGene : 1,
        excessConnectionGene : 2
    };

    exports.CorrelationStatistics = function(){

        var self= this;
        self.matchingCount = 0;
        self.disjointConnectionCount = 0;
        self.excessConnectionCount = 0;
        self.connectionWeightDelta = 0;
    };

    exports.CorrelationItem = function(correlationType, conn1, conn2)
    {
        var self= this;
        self.correlationType = correlationType;
        self.connection1 = conn1;
        self.connection2 = conn2;
    };


    exports.CorrelationResults = function()
    {
        var self = this;

        self.correlationStatistics = new neatHelp.CorrelationStatistics();
        self.correlationList = [];

    };

    //TODO: Integrity check by GlobalID
    exports.CorrelationResults.prototype.performIntegrityCheckByInnovation = function()
    {
        var prevInnovationId= -1;

        var self = this;

        for(var i=0; i< self.correlationList.length; i++){
            var correlationItem =  self.correlationList[i];

            switch(correlationItem.correlationType)
            {
                // Disjoint and excess genes.
                case neatHelp.CorrelationType.disjointConnectionGene:
                case neatHelp.CorrelationType.excessConnectionGene:
                    // Disjoint or excess gene.
                    if(		(!correlationItem.connection1 && !correlationItem.connection2)
                        ||	(correlationItem.connection1 && correlationItem.connection2))
                    {	// Precisely one gene should be present.
                        return false;
                    }
                    if(correlationItem.connection1)
                    {
                        if(correlationItem.connection1.gid<=prevInnovationId)
                            return false;

                        prevInnovationId = correlationItem.connection1.gid;
                    }
                    else // ConnectionGene2 is present.
                    {
                        if(correlationItem.connection2.gid<=prevInnovationId)
                            return false;

                        prevInnovationId = correlationItem.connection2.gid;
                    }

                    break;
                case neatHelp.CorrelationType.matchedConnectionGenes:

                    if(!correlationItem.connection1 || !correlationItem.connection2)
                        return false;

                    if(		(correlationItem.connection1.gid != correlationItem.connection2.gid)
                        ||	(correlationItem.connection1.sourceID != correlationItem.connection2.sourceID)
                        ||	(correlationItem.connection1.targetID != correlationItem.connection2.targetID))
                        return false;

                    // Innovation ID's should be in order and not duplicated.
                    if(correlationItem.connection1.gid <=prevInnovationId)
                        return false;

                    prevInnovationId = correlationItem.connection1.gid;

                    break;
            }
        }

        return true;
    };

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatHelp']={}: exports, this, typeof exports === 'undefined'? true : false);
