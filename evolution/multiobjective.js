//here we have everything for NSGA-II mutliobjective search and neatjs
/**
 * Module dependencies.
 */

var NeatGenome = require('../genome/neatGenome.js');
var Novelty = require('./novelty.js');


//pull in variables from cppnjs
var cppnjs = require('cppnjs');
var utilities =  cppnjs.utilities;


/**
 * Expose `MultiobjectiveSearch`.
 */

module.exports = MultiobjectiveSearch;


//information to rank each genome
MultiobjectiveSearch.RankInfo = function()
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
};
MultiobjectiveSearch.RankInfo.prototype.reset = function(){

    var self = this;
    self.rank = 0;
    self.ranked = false;
    self.dominationCount = 0;
    self.dominates = [];
};

MultiobjectiveSearch.Help = {};

MultiobjectiveSearch.Help.SortPopulation = function(pop)
{
    //sort genomes by fitness / age -- as genomes are often sorted
    pop.sort(function(x,y){

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
};

//class to assign multiobjective fitness to individuals (fitness based on what pareto front they are on)
MultiobjectiveSearch.multiobjectiveUtilities = function(np)
{

    var self = this;

    self.np = np;
    self.population = [];
    self.populationIDs = {};
    self.ranks = [];
    self.nov = new Novelty(10.0);
    self.doNovelty = false;
    self.generation = 0;

    self.localCompetition = false;

    self.measureNovelty = function()
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
    self.updateDomination = function( x,  y,  r1, r2)
    {
        if(self.dominates(x,y)) {
            r1.dominates.push(r2);
            r2.dominationCount++;
        }
    };


    //function to check whether genome x dominates genome y, usually defined as being no worse on all
    //objectives, and better at at least one
    self.dominates = function( x,  y) {
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
    self.distance = function(x, y) {
        var delta=0.0;
        var len = x.length;
        for(var i=0;i<len;i++) {
            var d=x[i]-y[i];
            delta+=d*d;
        }
        return delta;
    };


    //Todo: Print to file
    self.printDistribution = function()
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
    self.calculateGenomicNovelty = function() {
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
    self.addPopulation = function(genomes)
    {

        for(var i=0;i< genomes.length;i++)
        {
            var blacklist=false;

            //TODO: I'm not sure this is correct, since genomes coming in aren't measured locally yet
            //so in some sense, we're comparing local measures to global measures and seeing how far
            //if they are accidentally close, this could be bad news
//                for(var j=0;j<self.population.length; j++)
//                {
//                    if(self.distance(genomes[i].behavior.objectives, self.population[j].objectives) < 0.01)
//                        blacklist=true;  //reject a genome if it is very similar to existing genomes in pop
//                }
            //no duplicates please
            if(self.populationIDs[genomes[i].gid])
                blacklist = true;

            //TODO: Test if copies are needed, or not?
            if(!blacklist) {
                //add genome if it is unique
                //we might not need to make copies
                //this will make a copy of the behavior
//                    var copy = new neatGenome.NeatGenome.Copy(genomes[i], genomes[i].gid);
//                    self.population.push(copy);

                //push directly into population, don't use copy -- should test if this is a good idea?
                self.population.push(genomes[i]);
                self.populationIDs[genomes[i].gid] = genomes[i];

            }

        }

    };



    self.rankGenomes = function()
    {
        var size = self.population.length;

        self.calculateGenomicNovelty();
        if(self.doNovelty) {
            self.measureNovelty();
        }

        //reset rank information
        for(var i=0;i<size;i++) {
            if(self.ranks.length<i+1)
                self.ranks.push(new MultiobjectiveSearch.RankInfo());
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

        //sorting based on fitness
        MultiobjectiveSearch.Help.SortPopulation(self.population);

        self.generation++;

        if(self.generation%250==0)
            self.printDistribution();
    };

    //when we merge populations together, often the population will overflow, and we need to cut
    //it down. to do so, we just remove the last x individuals, which will be in the less significant
    //pareto fronts
    self.truncatePopulation = function(size)
    {
        var toRemove = self.population.length - size;
        console.log("population size before: " + self.population.length);
        console.log("removing " + toRemove);

        //remove the tail after sorting
        if(toRemove > 0)
            self.population.splice(size, toRemove);

        //changes to population, make sure to update our lookup
        self.populationIDs = NeatGenome.Help.CreateGIDLookup(self.population);

        console.log("population size after: " + self.population.length);

        return self.population;
    };

};

function MultiobjectiveSearch(seedGenomes, genomeEvaluationFunctions, neatParameters, searchParameters)
{
    var self=this;

    //functions for evaluating genomes in a population
    self.genomeEvaluationFunctions = genomeEvaluationFunctions;

    self.generation = 0;
    self.np = neatParameters;
    self.searchParameters = searchParameters;

    //for now, we just set seed genomes as population
    //in reality, we should use seed genomes as seeds into population determined by search parameters
    //i.e. 5 seed genomes -> 50 population size
    //TODO: Turn seed genomes into full first population
    self.population = seedGenomes;

    //create genome lookup once we have population
    self.populationIDs = NeatGenome.Help.CreateGIDLookup(seedGenomes);


    //see end of multiobjective search declaration for initailization code
    self.multiobjective= new MultiobjectiveSearch.multiobjectiveUtilities(neatParameters);
    self.np.compatibilityThreshold = 100000000.0; //disable speciation w/ multiobjective

    self.initializePopulation = function()
    {
        // The GenomeFactories normally won't bother to ensure that like connections have the same ID
        // throughout the population (because it's not very easy to do in most cases). Therefore just
        // run this routine to search for like connections and ensure they have the same ID.
        // Note. This could also be done periodically as part of the search, remember though that like
        // connections occuring within a generation are already fixed - using a more efficient scheme.
        self.matchConnectionIDs();

        // Evaluate the whole population.
        self.evaluatePopulation();

        //TODO: Add in some concept of speciation for NSGA algorithm -- other than genomic novelty?
        //We don't do speciation for NSGA-II algorithm

        // Now we have fitness scores and no speciated population we can calculate fitness stats for the
        // population as a whole -- and save best genomes
        //recall that speciation is NOT part of NSGA-II
        self.updateFitnessStats();

    };

    self.matchConnectionIDs = function()
    {
        var connectionIdTable = {};

        var genomeBound = self.population.length;
        for(var genomeIdx=0; genomeIdx<genomeBound; genomeIdx++)
        {
            var genome = self.population[genomeIdx];

            //loop through all the connections for this genome
            var connectionGeneBound = genome.connections.length;
            for(var connectionGeneIdx=0; connectionGeneIdx<connectionGeneBound; connectionGeneIdx++)
            {
                var connectionGene = genome.connections[connectionGeneIdx];

                var ces = connectionGene.sourceID + "," + connectionGene.targetID;

                var existingID = connectionIdTable[ces];

                if(existingID==null)
                {	// No connection withthe same end-points has been registered yet, so
                    // add it to the table.
                    connectionIdTable[ces] = connectionGene.gid;
                }
                else
                {	// This connection is already registered. Give our latest connection
                    // the same innovation ID as the one in the table.
                    connectionGene.gid = existingID;
                }
            }
            // The connection genes in this genome may now be out of order. Therefore we must ensure
            // they are sorted before we continue.
            genome.connections.sort(function(a,b){
               return a.gid - b.gid;
            });
        }
    };

    self.incrementAges = function()
    {
        //would normally increment species age as  well, but doesn't happen in multiobjective
        for(var i=0; i < self.population.length; i++)
        {
            var ng = self.population[i];
            ng.age++;
        }
    };
    self.updateFitnessStats = function()
    {
        self.bestFitness = Number.MIN_VALUE;
        self.bestGenome = null;
        self.totalNeuronCount = 0;
        self.totalConnectionCount = 0;
        self.totalFitness = 0;
        self.avgComplexity = 0;
        self.meanFitness =0;

        //go through the genomes, find the best genome and the most fit
        for(var i=0; i < self.population.length; i++)
        {
            var ng = self.population[i];
            if(ng.realFitness > self.bestFitness)
            {
                self.bestFitness = ng.realFitness;
                self.bestGenome = ng;
            }
            self.totalNeuronCount += ng.nodes.length;
            self.totalConnectionCount += ng.connections.length;
            self.totalFitness += ng.realFitness;
        }

        self.avgComplexity = (self.totalNeuronCount + self.totalConnectionCount)/self.population.length;
        self.meanFitness = self.totalFitness/self.population.length;

    };

    self.tournamentSelect = function(genomes)
    {
        var bestFound= 0.0;
        var bestGenome=null;
        var bound = genomes.length;

        //grab the best of 4 by default, can be more attempts than that
        for(var i=0;i<self.np.tournamentSize;i++) {
            var next= genomes[utilities.next(bound)];
            if (next.fitness > bestFound) {
                bestFound=next.fitness;
                bestGenome=next;
            }
        }

        return bestGenome;
    };


    self.evaluatePopulation= function()
    {
        //for each genome, we need to check if we should evaluate the individual, and then evaluate the individual

        //default everyone is evaluated
        var shouldEvaluate = self.genomeEvaluationFunctions.shouldEvaluateGenome || function(){return true;};
        var defaultFitness = self.genomeEvaluationFunctions.defaultFitness || 0.0001;

        if(!self.genomeEvaluationFunctions.evaluateGenome)
            throw new Error("No evaluation function defined, how are you supposed to run evolution?");

        var evaluateGenome = self.genomeEvaluationFunctions.evaluateGenome;

        for(var i=0; i < self.population.length; i++)
        {
            var ng = self.population[i];

            var fit = defaultFitness;

            if(shouldEvaluate(ng))
            {
                fit = evaluateGenome(ng, self.np);
            }

            ng.fitness = fit;
            ng.realFitness = fit;
        }

    };

    self.performOneGeneration = function()
    {
        //No speciation in multiobjective
        //therefore no species to check for removal

        //----- Stage 1. Create offspring / cull old genomes / add offspring to population.
        var regenerate = false;

        self.multiobjective.addPopulation(self.population);
        self.multiobjective.rankGenomes();


        //cut the population down to the desired size
        self.multiobjective.truncatePopulation(self.population.length);
        //no speciation necessary

        //here we can decide if we want to save to WIN

        self.updateFitnessStats();

        if(!regenerate)
        {
            self.createOffSpring();

            //we need to trim population to the elite count, then replace
            //however, this doesn't affect the multiobjective population -- just the population held in search at the time
            MultiobjectiveSearch.Help.SortPopulation(self.population);
            var eliteCount = Math.floor(self.np.elitismProportion*self.population.length);

            //remove everything but the most elite!
            self.population.splice(eliteCount, self.population.length - eliteCount);

            // Add offspring to the population.
            var genomeBound = self.offspringList.length;
            for(var genomeIdx=0; genomeIdx<genomeBound; genomeIdx++)
                self.population.push(self.offspringList[genomeIdx]);
        }

        //----- Stage 2. Evaluate genomes / Update stats.
        self.evaluatePopulation();
        self.updateFitnessStats();

        self.incrementAges();
        self.generation++;

    };


    self.createOffSpring = function()
    {
        self.offspringList = [];

        // Create a new lists so that we can track which connections/neurons have been added during this routine.
        self.newConnectionTable = [];
        self.newNodeTable = [];

        //now create chunk of offspring asexually
        self.createMultipleOffSpring_Asexual();
        //then the rest sexually
        self.createMultipleOffSpring_Sexual();
    };
    self.createMultipleOffSpring_Asexual = function()
    {
        //function for testing if offspring is valid
        var validOffspring = self.genomeEvaluationFunctions.isValidOffspring || function() {return true;};
        var attemptValid = self.genomeEvaluationFunctions.validOffspringAttempts || 5;

        var eliteCount = Math.floor(self.np.elitismProportion*self.population.length);


        //how many asexual offspring? Well, the proportion of asexual * total number of desired new individuals
        var offspringCount = Math.max(1, Math.round((self.population.length - eliteCount)*self.np.pOffspringAsexual));

        // Add offspring to a seperate genomeList. We will add the offspring later to prevent corruption of the enumeration loop.
        for(var i=0; i<offspringCount; i++)
        {
            var parent=null;

            //tournament select in multiobjective search
            parent = self.tournamentSelect(self.population);

            var offspring = parent.createOffspringAsexual(self.newNodeTable, self.newConnectionTable, self.np);
            var testCount = 0, maxTests = attemptValid;

            //if we have a valid genotype test function, it should be used for generating this individual!
            while (!validOffspring(offspring, self.np) && testCount++ < maxTests)
                offspring = parent.createOffspringAsexual(self.newNodeTable, self.newConnectionTable, self.np);

            //we have a valid offspring, send it away!
            self.offspringList.push(offspring);
        }
    };

    self.createMultipleOffSpring_Sexual = function()
    {
        //function for testing if offspring is valid
        var validOffspring = self.genomeEvaluationFunctions.isValidOffspring || function() {return true;};
        var attemptValid = self.genomeEvaluationFunctions.validOffspringAttempts || 5;

        var oneMember=false;
        var twoMembers=false;

        if(self.population.length == 1)
        {
            // We can't perform sexual reproduction. To give the species a fair chance we call the asexual routine instead.
            // This keeps the proportions of genomes per species steady.
            oneMember = true;
        }
        else if(self.population.length==2)
            twoMembers = true;

        // Determine how many sexual offspring to create.
        var eliteCount = Math.floor(self.np.elitismProportion*self.population.length);

        //how many sexual offspring? Well, the proportion of sexual * total number of desired new individuals
        var matingCount = Math.round((self.population.length - eliteCount)*self.np.pOffspringSexual);

        for(var i=0; i<matingCount; i++)
        {
            var parent1;
            var parent2=null;
            var offspring;

            if(utilities.nextDouble() < self.np.pInterspeciesMating)
            {	// Inter-species mating!
                //System.Diagnostics.Debug.WriteLine("Inter-species mating!");
                if(oneMember)
                    parent1 = self.population[0];
                else  {
                    //tournament select in multiobjective search
                    parent1 = self.tournamentSelect(self.population);
                }

                // Select the 2nd parent from the whole popualtion (there is a chance that this will be an genome
                // from this species, but that's OK).
                var j=0;
                do
                {
                    parent2  = self.tournamentSelect(self.population);
                }

                while(parent1==parent2 && j++ < 4);	// Slightly wasteful but not too bad. Limited by j.
            }
            else
            {	// Mating within the current species.
                //System.Diagnostics.Debug.WriteLine("Mating within the current species.");
                if(oneMember)
                {	// Use asexual reproduction instead.
                    offspring = self.population[0].createOffspringAsexual(self.newNodeTable, self.newConnectionTable, self.np);

                    var testCount = 0; var maxTests = attemptValid;
                    //if we have an assess function, it should be used for generating this individual!
                    while (!validOffspring(offspring) && testCount++ < maxTests)
                        offspring = self.population[0].createOffspringAsexual(self.newNodeTable, self.newConnectionTable, self.np);

                    self.offspringList.push(offspring);
                    continue;
                }

                if(twoMembers)
                {
                    offspring = self.population[0].createOffspringSexual(self.population[1], self.np);

                    var testCount = 0; var maxTests = attemptValid;

                    //if we have an assess function, it should be used for generating this individual!
                    while (!validOffspring(offspring) && testCount++ < maxTests)
                        offspring = self.population[0].createOffspringSexual(self.population[1], self.np);

                    self.offspringList.push(offspring);
                    continue;
                }

                parent1 = self.tournamentSelect(self.population);

                var j=0;
                do
                {
                    parent2 = self.tournamentSelect(self.population);
                }
                while(parent1==parent2 && j++ < 4);	// Slightly wasteful but not too bad. Limited by j.
            }

            if(parent1 != parent2)
            {
                offspring = parent1.createOffspringSexual(parent2, self.np);

                var testCount = 0; var maxTests = attemptValid;
                //if we have an assess function, it should be used for generating this individual!
                while (!validOffspring(offspring) && testCount++ < maxTests)
                    offspring = parent1.createOffspringSexual(parent2, self.np);

                self.offspringList.push(offspring);
            }
            else
            {	// No mating pair could be found. Fallback to asexual reproduction to keep the population size constant.
                offspring = parent1.createOffspringAsexual(self.newNodeTable, self.newConnectionTable,self.np);

                var testCount = 0; var maxTests = attemptValid;
                //if we have an assess function, it should be used for generating this individual!
                while (!validOffspring(offspring) && testCount++ < maxTests)
                    offspring = parent1.createOffspringAsexual(self.newNodeTable, self.newConnectionTable,self.np);

                self.offspringList.push(offspring);
            }
        }

    };



    //finishing initalizatgion of object
    self.initializePopulation();


}
