(function(exports, selfBrowser, isBrowser){

    var novelty = exports;

    var cppnjs = isBrowser ? selfBrowser['common'] : require('cppn');
    var neatjs = isBrowser ? selfBrowser['common'] : require('../neatjs.js');

    var utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
    var neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');


    novelty.CheckDependencies = function()
    {
        utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
        neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');

    };

    novelty.Behavior = function()
    {
        var self =this;
        self.behaviorList = null;
        self.objectives = null;

        novelty.Behavior.BehaviorCopy = function(copyFrom)
        {
            var behavior = new novelty.Behavior();
            if(copyFrom.behaviorList)
            {
                //copy the behavior over
                behavior.behaviorList = copyFrom.behaviorList.slice(0);
            }
            //if you have objectives filled out, take those too
            if(copyFrom.objectives)
            {
                behavior.objectives = copyFrom.objectives.slice(0);
            }
            //finished copying behavior
            return behavior;
        };

        novelty.Behavior.distance = function(x, y)
        {
            var dist = 0.0;

            if(!x.behaviorList || !y.behaviorList)
                throw new Error("One of the behaviors is empty, can't compare distance!");

            //simple calculation, loop through double array and sum up square differences
            for(var k=0;k<x.behaviorList.length;k++)
            {
                var delta = x.behaviorList[k]-y.behaviorList[k];
                dist += delta*delta;
            }

            //return square distance of behavior
            return dist;
        };


    };

    novelty.Novelty = function(threshold)
    {
        var self = this;

        self.nearestNeighbors = 20;
        self.initialized = false;
        self.archiveThreshold = threshold;
        self.measureAgainst = [];
        self.archive = [];
        self.pendingAddition = [];

        self.maxDistSeen = Number.MIN_VALUE;

        novelty.Novelty.prototype.addPending = function()
        {
            var length = self.pendingAddition.length;

            if(length === 0)
            {
                self.archiveThreshold *= .95;
            }
            if(length > 5)
            {
                self.archiveThreshold *= 1.3;
            }

            //for all of our additions to the archive,
            //check against others to see if entered into archive
            for(var i=0; i < length; i++)
            {
                if(self.measureAgainstArchive(self.pendingAddition[i], false))
                    self.archive.push(self.pendingAddition[i]);
            }

            //clear it all out
            self.pendingAddition = [];
        };

        novelty.Novelty.prototype.measureAgainstArchive = function(neatgenome, addToPending)
        {

            for(var genome in self.archive)
            {
                var dist = novelty.Behavior.distance(neatgenome.behavior, genome.behavior);

                if(dist > self.maxDistSeen)
                {
                    self.maxDistSeen = dist;
                    console.log('Most novel dist: ' + self.maxDistSeen);
                }

                if(dist < self.archiveThreshold)
                    return false;

            }

            if(addToPending)
            {
                self.pendingAddition.push(neatgenome);
            }

            return true;
        };

        //measure the novelty of an organism against the fixed population
        novelty.Novelty.prototype.measureNovelty = function(neatgenome)
        {
            var sum = 0.0;

            if(!self.initialized)
                return Number.MIN_VALUE;

            var noveltyList = [];

            for(var genome in self.measureAgainst)
            {
                noveltyList.push(
                    {distance: novelty.Behavior.distance(genome, neatgenome.behavior),
                    genome: genome}
                );
            }

            for(var genome in self.archive)
            {
                noveltyList.push(
                    {distance: novelty.Behavior.distance(genome, neatgenome.behavior),
                        genome: genome}
                );
            }

            //see if we should add this genome to the archive
            self.measureAgainstArchive(neatgenome,true);

            noveltyList.sort(function(a,b){return b.distance - a.distance});
            var nn = self.nearestNeighbors;
            if(noveltyList.length < self.nearestNeighbors) {
                nn=noveltyList.length;
            }

            neatgenome.nearestNeighbors = nn;

            //Paul - reset local competition and local genome novelty -- might have been incrementing over time
            //Not sure if that's the intention of the algorithm to keep around those scores to signify longer term success
            //this would have a biasing effect on individuals that have been around for longer
//            neatgenome.competition = 0;
//            neatgenome.localGenomeNovelty = 0;

            //TODO: Verify this is working - are local objectives set up, is this measuring properly?
            for (var x = 0; x < nn; x++)
            {
                sum += noveltyList[x].distance;

                if (neatgenome.realFitness > noveltyList[x].genome.realFitness)
                    neatgenome.competition += 1;

                //compare all the objectives, and locally determine who you are beating
                for(var o =0; o < neatgenome.objectives.length; o++)
                {
                    if(neatgenome.objectives[o] > noveltyList[x].genome.objectives[o])
                        neatgenome.localObjectivesCompetition[o] += 1;
                }

                noveltyList[x].genome.locality += 1;
                // sum+=10000.0; //was 100
            }
            //neatgenome.locality = 0;
            //for(int x=0;x<nn;x++)
            //{
            //    sum+=noveltyList[x].First;

            //    if(neatgenome.RealFitness>noveltyList[x].Second.RealFitness)
            //        neatgenome.competition+=1;

            //    noveltyList[x].Second.locality+=1;
            //    //Paul: This might not be the correct meaning of locality, but I am hijacking it instead
            //    //count how many genomes we are neighbored to
            //    //then, if we take neatgenome.competition/neatgenome.locality - we get percentage of genomes that were beaten locally!
            //    neatgenome.locality += 1;
            //    // sum+=10000.0; //was 100
            //}
            return Math.max(sum, .0001);
        }

        //Todo REFINE... adding highest fitness might
        //not correspond with most novel?
        novelty.Novelty.prototype.add_most_novel = function(genomes)
        {
            var max_novelty =0;
            var best= null;

            for(var i=0;i<genomes.length;i++)
            {
                if(genomes[i].fitness > max_novelty)
                {
                    best = genomes[i];
                    max_novelty = genomes[i].fitness;
                }
            }
            self.archive.push(best);
        };


        novelty.Novelty.prototype.initialize = function(genomes)
        {
            self.initialized = true;

            self.measureAgainst = [];

            if(genomes !=null){
                for(var i=0;i<genomes.length;i++)
                {
                    //we might not need to make copies
                    //Paul: removed copies to make it easier to read the realfitness from the indiviudals, without making a million update calls
                    self.measureAgainst.push(genomes[i]);//new NeatGenome.NeatGenome((NeatGenome.NeatGenome)p[i],i));
                }
            }
        };

        //update the measure population by intelligently sampling
        //the current population + archive + fixed population
        novelty.Novelty.prototype.update_measure = function(genomes)
        {
            var total = [];

            //we concatenate copies of the genomes, the measureagainst and archive array
            var total = genomes.slice(0).concat(self.measureAgainst.slice(0), self.archive.slice(0));

            self.mergeTogether(total, genomes.length);

            console.log("Size: " + self.measureAgainst.length);
        }

        novelty.Novelty.prototype.mergeTogether = function(list, size)
        {
            console.log("total count: "+ list.length);

//            Random r = new Random();
            var newList = [];



            //bool array
            var dirty = [];
            //doubles
            var closest = [];

            //set default values
            for(var x=0;x<list.length;x++)
            {
                dirty.push(false);
                closest.push(Number.MAX_VALUE);
            }
            //now add the first individual randomly to the new population
            var last_added = utilities.next(list.length);
            dirty[last_added] = true;
            newList.push(list[last_added]);

            while(newList.length < size)
            {
                var mostNovel = 0.0;
                var mostNovelIndex = 0;
                for(var x=0;x<list.length;x++)
                {
                    if (dirty[x])
                        continue;
                    var dist_to_last = novelty.Behavior.distance(list[x].behavior,
                    list[last_added].behavior);

                    if (dist_to_last < closest[x])
                        closest[x] = dist_to_last;

                    if (closest[x] > mostNovel)
                    {
                        mostNovel = closest[x];
                        mostNovelIndex = x;
                    }
                }

                dirty[mostNovelIndex] = true;
                newList.push(new neatGenome.NeatGenome.Copy(list[mostNovelIndex],0));
                last_added = mostNovelIndex;
            }

            self.measureAgainst = newList;
        };

        novelty.Novelty.prototype.updatePopulationFitness = function(genomes)
        {
            for (var i = 0; i < genomes.length; i++)
            {
                //we might not need to make copies
                self.measureAgainst[i].realFitness = genomes[i].realFitness;
            }
        };

    };

})(typeof exports === 'undefined'? this['neatjs']['novelty']={}: exports, this, typeof exports === 'undefined'? true : false);
