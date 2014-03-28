/**
* Module dependencies.
*/
var uuid = require('win-utils').cuid;
/**
* Expose `neatHelp`.
*/

var neatHelp = {};

module.exports = neatHelp;

//define helper types!
neatHelp.CorrelationType =
{
    matchedConnectionGenes : 0,
    disjointConnectionGene : 1,
    excessConnectionGene : 2
};

neatHelp.CorrelationStatistics = function(){

    var self= this;
    self.matchingCount = 0;
    self.disjointConnectionCount = 0;
    self.excessConnectionCount = 0;
    self.connectionWeightDelta = 0;
};

neatHelp.CorrelationItem = function(correlationType, conn1, conn2)
{
    var self= this;
    self.correlationType = correlationType;
    self.connection1 = conn1;
    self.connection2 = conn2;
};


neatHelp.CorrelationResults = function()
{
    var self = this;

    self.correlationStatistics = new neatHelp.CorrelationStatistics();
    self.correlationList = [];

};

//TODO: Integrity check by GlobalID
neatHelp.CorrelationResults.prototype.performIntegrityCheckByInnovation = function()
{
    var prevInnovationId= "";

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
                    if(uuid.isLessThan(correlationItem.connection1.gid, prevInnovationId) || correlationItem.connection1.gid == prevInnovationId)
                        return false;

                    prevInnovationId = correlationItem.connection1.gid;
                }
                else // ConnectionGene2 is present.
                {
                    if(uuid.isLessThan(correlationItem.connection2.gid, prevInnovationId) || correlationItem.connection2.gid == prevInnovationId)
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
                if(uuid.isLessThan(correlationItem.connection1.gid, prevInnovationId) || correlationItem.connection1.gid == prevInnovationId)
                    return false;

                prevInnovationId = correlationItem.connection1.gid;

                break;
        }
    }

    return true;
};
