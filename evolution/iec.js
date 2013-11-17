/**
 * Module dependencies.
 */

var NeatGenome = require('../genome/neatGenome.js');

//pull in variables from cppnjs
var cppnjs = require('cppn');
var utilities =  cppnjs.utilities;

/**
 * Expose `iec objects`.
 */
module.exports = GenericIEC;

//seeds are required -- and are expected to be the correct neatGenome types
function GenericIEC(np, seeds, iecOptions)
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

    self.cloneSeed = function(){

        var seedIx = utilities.next(self.seeds.length);

        var seedCopy = NeatGenome.Copy(self.seeds[seedIx]);
        if(self.options.seedMutationCount)
        {
            for(var i=0; i < self.options.seedMutationCount; i++)
                seedCopy.mutate(self.newNodes, self.newConnections, self.np);
        }
        return seedCopy;
    };

    self.markParentConnections = function(parents){

        for(var s=0; s < parents.length; s++)
        {
            var parent = parents[s];
            for(var c =0; c < parent.connections.length; c++)
            {
                var sConn = parent.connections[c];
                var cid = '(' + sConn.sourceID + ',' + sConn.targetID + ')';
                self.newConnections[cid] = sConn;
            }
        }

    };


        //this function handles creating a genotype from sent in parents.
    //it's pretty simple -- however many parents you have, select a random number of them, and attempt to mate them
    self.createNextGenome = function(parents)
    {
        self.markParentConnections(parents);
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

                for(var m=0; m < postXOMutationCount; m++)
                    ng.mutate(self.newNodes, self.newConnections, self.np);

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

