//here we have everything for NSGA-II mutliobjective search and neatjs

(function(exports, selfBrowser, isBrowser){

    var multiobjective = exports;

    var cppnjs = isBrowser ? selfBrowser['common'] : require('../cppnjs/cppnjs.js');
    var neatjs = isBrowser ? selfBrowser['common'] : require('../neatjs.js');

    var utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
    var cppnActivationFactory = cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
    var cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');

    var neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');
    var neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
    var neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
    var neatParameters = neatjs.loadLibraryFile('neatjs', 'neatParameters');
    var genomeSharpToJS = neatjs.loadLibraryFile('neatjs', 'genomeSharpToJS');
    var novelty = neatjs.loadLibraryFile('neatjs', 'novelty');



    multiobjective.CheckDependencies = function()
    {
        utilities =  cppnjs.loadLibraryFile('cppnjs', 'utilities');
        cppnActivationFactory = cppnjs.loadLibraryFile('cppnjs', 'cppnActivationFactory');
        cppnNode = cppnjs.loadLibraryFile('cppnjs', 'cppnNode');

        neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');
        neatConnection = neatjs.loadLibraryFile('neatjs', 'neatConnection');
        neatNode = neatjs.loadLibraryFile('neatjs', 'neatNode');
        neatParameters = neatjs.loadLibraryFile('neatjs', 'neatParameters');
        genomeSharpToJS =neatjs.loadLibraryFile('neatjs', 'genomeSharpToJS');
        novelty = neatjs.loadLibraryFile('neatjs', 'novelty');

    };

    //information to rank each genome
    multiobjective.RankInfo = function()
    {
        var self = this;
        //when iterating, we count how many genomes dominate other genomes
        self.dominationCount = 0;
        //who does this genome dominate
        self.dominates = [];
        //what is this genome's rank (i.e. what pareto front is it on)
        self.rank = 0;
        //has this genome been ranked
        self.ranked = false;

        multiobjective.RankInfo.prototype.reset = function(){
            self.rank = 0;
            self.ranked = false;
            self.dominationCount = 0;
            self.dominates = [];
        };
    };

    //class to assign multiobjective fitness to individuals (fitness based on what pareto front they are on)
    multiobjective.Multiobjective = function(np)
    {

        var self = this;

        self.np = np;
        self.population = [];
        self.ranks = [];
        self.nov = new novelty.Novelty(10.0);
        self.doNovelty = false;
        self.generation = 0;

        self.localCompetition = false;

        multiobjective.Multiobjective.prototype.measureNovelty = function()
        {
            var count = self.population.length;

            self.nov.initialize(self.population);

            //reset locality and competition for each genome
            for(var i=0; i < count; i++)
            {
                var genome = self.population[i];

                genome.locality=0.0;
                genome.competition=0.0;

                //we measure all objectives locally -- just to make it simpler
                for(var o=0; o < genome.objectives.length; o++)
                    genome.localObjectivesCompetition[o] = 0.0;
            }

           var ng;
            var max = 0.0, min = 100000000000.0;

            for (var i = 0; i< count; i++)
            {
                ng = self.population[i];
                var fit = self.nov.measureNovelty(ng);

                //reset our fitness value to be local, yeah boyee
                //the first objective is fitness which is replaced with local fitness -- how many did you beat around you
                // # won / total number of neighbors = % competitive
                ng.objectives[0] = ng.competition / ng.nearestNeighbors;
                ng.objectives[ng.objectives.length - 2] = fit + 0.01;

                //the last local measure is the genome novelty measure
                var localGenomeNovelty = ng.localObjectivesCompetition[ng.objectives.length-1];

                //genomic novelty is measured locally as well
                console.log("Genomic Novelty: " + ng.objectives[ng.objectives.length - 1] + " After: " + localGenomeNovelty / ng.nearestNeighbors);

                //this makes genomic novelty into a local measure
                ng.objectives[ng.objectives.length - 1] = localGenomeNovelty / ng.nearestNeighbors;

                if(fit>max) max=fit;
                if(fit<min) min=fit;

            }

            console.log("nov min: "+ min + " max:" + max);
        };

        //if genome x dominates y, increment y's dominated count, add y to x's dominated list
        multiobjective.Multiobjective.prototype.updateDomination = function( x,  y,  r1, r2)
        {
            if(self.dominates(x,y)) {
                r1.dominates.push(r2);
                r2.dominationCount++;
            }
        };


        //function to check whether genome x dominates genome y, usually defined as being no worse on all
        //objectives, and better at at least one
        multiobjective.Multiobjective.prototype.dominates = function( x,  y) {
            var better=false;
            var objx = x.objectives, objy = y.objectives;

            var sz = objx.length;

            //if x is ever worse than y, it cannot dominate y
            //also check if x is better on at least one
            for(var i=0;i<sz-1;i++) {
                if(objx[i]<objy[i]) return false;
                if(objx[i]>objy[i]) better=true;
            }

            //genomic novelty check, disabled for now
            //threshold set to 0 -- Paul since genome is local
            var thresh=0.0;
            if((objx[sz-1]+thresh)<(objy[sz-1])) return false;
            if((objx[sz-1]>(objy[sz-1]+thresh))) better=true;

            return better;
        };

        //distance function between two lists of objectives, used to see if two individuals are unique
        multiobjective.Multiobjective.prototype.distance = function(x, y) {
            var delta=0.0;
            var len = x.length;
            for(var i=0;i<len;i++) {
                var d=x[i]-y[i];
                delta+=d*d;
            }
            return delta;
        };


        //Todo: Print to file
        multiobjective.Multiobjective.prototype.printDistribution = function()
        {
            var filename="dist"+    self.generation+".txt";
            var content="";

            console.log("Print to file disabled for now, todo: write in save to file!");
//            XmlDocument archiveout = new XmlDocument();
//            XmlPopulationWriter.WriteGenomeList(archiveout, population);
//            archiveout.Save(filename);
        };

        //currently not used, calculates genomic novelty objective for protecting innovation
        //uses a rough characterization of topology, i.e. number of connections in the genome
        multiobjective.Multiobjective.prototype.calculateGenomicNovelty = function() {
            var sum=0.0;
            var max_conn = 0;

            var xx, yy;

            for(var g=0; g < self.population.length; g++) {
                xx = self.population[g];
                var minDist=10000000.0;

                var difference=0.0;
                var delta=0.0;
                //double array
                var distances= [];

                if(xx.connections.length > max_conn)
                    max_conn = xx.connections.length;

                //int ccount=xx.ConnectionGeneList.Count;
                for(var g2=0; g2 < self.population.length; g2++) {
                    yy = self.population[g2];
                    if(g==g2)
                        continue;

                    //measure genomic compatability using neatparams
                    var d = xx.compat(yy, np);
                    //if(d<minDist)
                    //	minDist=d;

                    distances.push(d);
                }
                //ascending order
                //want the closest individuals
                distances.Sort(function(a,b) {return a-b;});

                //grab the 10 closest distances
                var sz=Math.min(distances.length,10);

                var diversity = 0.0;

                for(var i=0;i<sz;i++)
                    diversity+=distances[i];

                xx.objectives[xx.objectives.length-1] = diversity;
                sum += diversity;
            }
            console.log("Diversity: " + sum/population.length + " " + max_conn);
        };



        //add an existing population from hypersharpNEAT to the multiobjective population maintained in
        //this class, step taken before evaluating multiobjective population through the rank function
        multiobjective.Multiobjective.prototype.addPopulation = function(genomes)
        {

            for(var i=0;i< genomes.length;i++)
            {
                var blacklist=false;
                for(var j=0;j<self.population.length; j++)
                {
                    if(self.distance(genomes[i].behavior.objectives, self.population[j].objectives) < 0.01)
                        blacklist=true;  //reject a genome if it is very similar to existing genomes in pop
                }

                //TODO: Test if copies are needed, or not?
                if(!blacklist) {
                    //add genome if it is unique
                    //we might not need to make copies
                    //this will make a copy of the behavior
//                    var copy = new neatGenome.NeatGenome.Copy(genomes[i], genomes[i].gid);
//                    self.population.push(copy);

                    //push directly into population, don't use copy -- should test if this is a good idea?
                    self.population.push(genomes[i]);

                }

            }

        };


        multiobjective.Multiobjective.prototype.rankGenomes = function()
        {
            var size = population.length;

            self.calculateGenomicNovelty();
            if(self.doNovelty) {
                self.measure_novelty();
            }

            //reset rank information
            for(var i=0;i<size;i++) {
                if(self.ranks.length<i+1)
                    self.ranks.push(new multiobjective.RankInfo());
                else
                    self.ranks[i].reset();
            }
            //calculate domination by testing each genome against every other genome
            for(var i=0;i<size;i++) {
                for(var j=0;j<size;j++) {
                    self.updateDomination(self.population[i], self.population[j],self.ranks[i],self.ranks[j]);
                }
            }

            //successively peel off non-dominated fronts (e.g. those genomes no longer dominated by any in
            //the remaining population)
            var front = [];
            var ranked_count=0;
            var current_rank=1;
            while(ranked_count < size) {
                //search for non-dominated front
                for(var i=0;i<size;i++)
                {
                    //continue if already ranked
                    if(self.ranks[i].ranked) continue;
                    //if not dominated, add to front
                    if(self.ranks[i].dominationCount==0) {
                        front.push(i);
                        self.ranks[i].ranked=true;
                        self.ranks[i].rank = current_rank;
                    }
                }

                var front_size = front.length;
                console.log("Front " + current_rank + " size: " + front_size);

                //now take all the non-dominated individuals, see who they dominated, and decrease
                //those genomes' domination counts, because we are removing this front from consideration
                //to find the next front of individuals non-dominated by the remaining individuals in
                //the population
                for(var i=0;i<front_size;i++) {
                    var r = self.ranks[front[i]];
                    for (var dominated in r.dominates) {
                        dominated.dominationCount--;
                    }
                }

                ranked_count+=front_size;
                front = [];
                current_rank++;
            }

            //we save the last objective for potential use as genomic novelty objective
            var last_obj = self.population[0].objectives.length-1;

            //fitness = popsize-rank (better way might be maxranks+1-rank), but doesn't matter
            //because speciation is not used and tournament selection is employed
            for(var i=0;i<size;i++) {
                self.population[i].fitness = (size+1)-self.ranks[i].rank;//+population[i].objectives[last_obj]/100000.0;
        }

            //sort genomes by fitness / age -- as genomes are often sorted
            self.population.sort(function(x,y){

                var fitnessDelta = y.fitness - x.fitness;
                if (fitnessDelta < 0.0)
                    return -1;
                else if (fitnessDelta > 0.0)
                    return 1;

                var ageDelta = x.age - y.age;

                // Convert result to an int.
                if (ageDelta < 0)
                    return -1;
                else if (ageDelta > 0)
                    return 1;

                return 0;

            });

            self.generation++;

            if(self.generation%250==0)
                self.printDistribution();
        };

        //when we merge populations together, often the population will overflow, and we need to cut
        //it down. to do so, we just remove the last x individuals, which will be in the less significant
        //pareto fronts
        multiobjective.Multiobjective.prototype.truncatePopulation = function(size)
        {
            var toRemove = self.population.length - size;
            console.log("population size before: " + self.population.length);
            console.log("removing " + toRemove);

            //remove the tail after sorting
            if(toRemove > 0)
                self.population.splice(size, toRemove);

            console.log("population size after: " + self.population.length);

            return self.population;
        };

    };

})(typeof exports === 'undefined'? this['neatjs']['multiobjective']={}: exports, this, typeof exports === 'undefined'? true : false);
