/**
 * Module dependencies.
 */
//none

/**
 * Expose `neatParameters`.
 */
module.exports = NeatParameters;

var	DEFAULT_POPULATION_SIZE = 150;
var  DEFAULT_P_INITIAL_POPULATION_INTERCONNECTIONS = 1.00;//DAVID 0.05F;

var DEFAULT_P_OFFSPRING_ASEXUAL = 0.5;
var DEFAULT_P_OFFSPRING_SEXUAL = 0.5;
var DEFAULT_P_INTERSPECIES_MATING = 0.01;

var DEFAULT_P_DISJOINGEXCESSGENES_RECOMBINED = 0.1;

//----- High level mutation proportions
var DEFAULT_P_MUTATE_CONNECTION_WEIGHTS = 0.988;
var DEFAULT_P_MUTATE_ADD_NODE = 0.002;
var DEFAULT_P_MUTATE_ADD_MODULE = 0.0;
var DEFAULT_P_MUTATE_ADD_CONNECTION = 0.018;
var DEFAULT_P_MUTATE_CHANGE_ACTIVATIONS = 0.001;
var DEFAULT_P_MUTATE_DELETE_CONNECTION = 0.001;
var DEFAULT_P_MUTATE_DELETE_SIMPLENEURON = 0.00;
var DEFAULT_N_MUTATE_ACTIVATION = 0.01;

//-----
var DEFAULT_COMPATIBILITY_THRESHOLD = 8 ;
var DEFAULT_COMPATIBILITY_DISJOINT_COEFF = 1.0;
var DEFAULT_COMPATIBILITY_EXCESS_COEFF = 1.0;
var DEFAULT_COMPATIBILITY_WEIGHTDELTA_COEFF = 0.05;

var DEFAULT_ELITISM_PROPORTION = 0.2;
var DEFAULT_SELECTION_PROPORTION = 0.2;

var DEFAULT_TARGET_SPECIES_COUNT_MIN = 6;
var DEFAULT_TARGET_SPECIES_COUNT_MAX = 10;

var DEFAULT_SPECIES_DROPOFF_AGE = 200;

var DEFAULT_PRUNINGPHASE_BEGIN_COMPLEXITY_THRESHOLD = 50;
var DEFAULT_PRUNINGPHASE_BEGIN_FITNESS_STAGNATION_THRESHOLD = 10;
var DEFAULT_PRUNINGPHASE_END_COMPLEXITY_STAGNATION_THRESHOLD = 15;

var DEFAULT_CONNECTION_WEIGHT_RANGE = 10.0;
//		public const double DEFAULT_CONNECTION_MUTATION_SIGMA = 0.015;

var DEFAULT_ACTIVATION_PROBABILITY = 1.0;

NeatParameters.ConnectionPerturbationType =
{
    /// <summary>
    /// Reset weights.
    /// </summary>
    reset : 0,

        /// <summary>
        /// Jiggle - even distribution
        /// </summary>
        jiggleEven :1

        /// <summary>
        /// Jiggle - normal distribution
        /// </summary>
//            jiggleND : 2
};
NeatParameters.ConnectionSelectionType =
{
    /// <summary>
    /// Select a proportion of the weights in a genome.
    /// </summary>
    proportional :0,

        /// <summary>
        /// Select a fixed number of weights in a genome.
        /// </summary>
        fixedQuantity :1
};

NeatParameters.ConnectionMutationParameterGroup = function(
     activationProportion,
     perturbationType,
     selectionType,
     proportion,
     quantity,
     perturbationFactor,
     sigma)
{
    var self = this;
    /// <summary>
    /// This group's activation proportion - relative to the totalled
    /// ActivationProportion for all groups.
    /// </summary>
    self.activationProportion = activationProportion;

    /// <summary>
    /// The type of mutation that this group represents.
    /// </summary>
    self.perturbationType = perturbationType;

    /// <summary>
    /// The type of connection selection that this group represents.
    /// </summary>
    self.selectionType = selectionType;

    /// <summary>
    /// Specifies the proportion for SelectionType.Proportional
    /// </summary>
    self.proportion=proportion ;

    /// <summary>
    /// Specifies the quantity for SelectionType.FixedQuantity
    /// </summary>
    self.quantity= quantity;

    /// <summary>
    /// The perturbation factor for ConnectionPerturbationType.JiggleEven.
    /// </summary>
    self.perturbationFactor= perturbationFactor;

    /// <summary>
    /// Sigma for for ConnectionPerturbationType.JiggleND.
    /// </summary>
    self.sigma= sigma;
};

NeatParameters.ConnectionMutationParameterGroup.Copy = function(copyFrom)
{
    return new NeatParameters.ConnectionMutationParameterGroup(
        copyFrom.ActivationProportion,
         copyFrom.PerturbationType,
           copyFrom.SelectionType,
         copyFrom.Proportion,
      copyFrom.Quantity,
       copyFrom.PerturbationFactor,
     copyFrom.Sigma
    );
};

function NeatParameters()
{
    var self = this;
    self.histogramBins = [];
    self.archiveThreshold=3.00;
    self.tournamentSize=4;
    self.noveltySearch=false;
    self.noveltyHistogram=false;
    self.noveltyFixed=false;
    self.noveltyFloat=false;
    self.multiobjective=false;

    self.allowSelfConnections = false;

    self.populationSize = DEFAULT_POPULATION_SIZE;
    self.pInitialPopulationInterconnections = DEFAULT_P_INITIAL_POPULATION_INTERCONNECTIONS;

    self.pOffspringAsexual = DEFAULT_P_OFFSPRING_ASEXUAL;
    self.pOffspringSexual = DEFAULT_P_OFFSPRING_SEXUAL;
    self.pInterspeciesMating = DEFAULT_P_INTERSPECIES_MATING;

    self.pDisjointExcessGenesRecombined = DEFAULT_P_DISJOINGEXCESSGENES_RECOMBINED;

    //----- High level mutation proportions
    self.pMutateConnectionWeights	= DEFAULT_P_MUTATE_CONNECTION_WEIGHTS;
    self.pMutateAddNode = DEFAULT_P_MUTATE_ADD_NODE;
    self.pMutateAddModule = DEFAULT_P_MUTATE_ADD_MODULE;
    self.pMutateAddConnection = DEFAULT_P_MUTATE_ADD_CONNECTION;
    self.pMutateDeleteConnection		= DEFAULT_P_MUTATE_DELETE_CONNECTION;
    self.pMutateDeleteSimpleNeuron	= DEFAULT_P_MUTATE_DELETE_SIMPLENEURON;
    self.pMutateChangeActivations = DEFAULT_P_MUTATE_CHANGE_ACTIVATIONS;
    self.pNodeMutateActivationRate = DEFAULT_N_MUTATE_ACTIVATION;

    //----- Build a default ConnectionMutationParameterGroupList.
    self.connectionMutationParameterGroupList = [];

    self.connectionMutationParameterGroupList.push(new NeatParameters.ConnectionMutationParameterGroup(0.125, NeatParameters.ConnectionPerturbationType.jiggleEven,
        NeatParameters.ConnectionSelectionType.proportional, 0.5, 0, 0.05, 0.0));

    self.connectionMutationParameterGroupList.push(new NeatParameters.ConnectionMutationParameterGroup(0.5, NeatParameters.ConnectionPerturbationType.jiggleEven,
        NeatParameters.ConnectionSelectionType.proportional, 0.1, 0, 0.05, 0.0));

    self.connectionMutationParameterGroupList.push(new NeatParameters.ConnectionMutationParameterGroup(0.125, NeatParameters.ConnectionPerturbationType.jiggleEven,
        NeatParameters.ConnectionSelectionType.fixedQuantity, 0.0, 1, 0.05, 0.0));

    self.connectionMutationParameterGroupList.push(new NeatParameters.ConnectionMutationParameterGroup(0.125, NeatParameters.ConnectionPerturbationType.reset,
        NeatParameters.ConnectionSelectionType.proportional, 0.1, 0, 0.0, 0.0));

    self.connectionMutationParameterGroupList.push(new NeatParameters.ConnectionMutationParameterGroup(0.125, NeatParameters.ConnectionPerturbationType.reset,
        NeatParameters.ConnectionSelectionType.fixedQuantity, 0.0, 1, 0.0, 0.0));

    //-----
    self.compatibilityThreshold = DEFAULT_COMPATIBILITY_THRESHOLD;
    self.compatibilityDisjointCoeff = DEFAULT_COMPATIBILITY_DISJOINT_COEFF;
    self.compatibilityExcessCoeff = DEFAULT_COMPATIBILITY_EXCESS_COEFF;
    self.compatibilityWeightDeltaCoeff = DEFAULT_COMPATIBILITY_WEIGHTDELTA_COEFF;

    self.elitismProportion = DEFAULT_ELITISM_PROPORTION;
    self.selectionProportion = DEFAULT_SELECTION_PROPORTION;

    self.targetSpeciesCountMin = DEFAULT_TARGET_SPECIES_COUNT_MIN;
    self.targetSpeciesCountMax = DEFAULT_TARGET_SPECIES_COUNT_MAX;

    self.pruningPhaseBeginComplexityThreshold = DEFAULT_PRUNINGPHASE_BEGIN_COMPLEXITY_THRESHOLD;
    self.pruningPhaseBeginFitnessStagnationThreshold = DEFAULT_PRUNINGPHASE_BEGIN_FITNESS_STAGNATION_THRESHOLD;
    self.pruningPhaseEndComplexityStagnationThreshold = DEFAULT_PRUNINGPHASE_END_COMPLEXITY_STAGNATION_THRESHOLD;

    self.speciesDropoffAge = DEFAULT_SPECIES_DROPOFF_AGE;

    self.connectionWeightRange = DEFAULT_CONNECTION_WEIGHT_RANGE;

    //DAVID
    self.activationProbabilities = [];//new double[4];
    self.activationProbabilities.push(DEFAULT_ACTIVATION_PROBABILITY);
    self.activationProbabilities.push(0);
    self.activationProbabilities.push(0);
    self.activationProbabilities.push(0);
};

NeatParameters.Copy = function(copyFrom)
{
    var self = new NeatParameters();

    //paul - joel originally
    self.noveltySearch = copyFrom.noveltySearch;
    self.noveltyHistogram = copyFrom.noveltyHistogram;
    self.noveltyFixed = copyFrom.noveltyFixed;
    self.noveltyFloat = copyFrom.noveltyFloat;
    self.histogramBins = copyFrom.histogramBins;


    self.allowSelfConnections = copyFrom.allowSelfConnections;

    self.populationSize = copyFrom.populationSize;

    self.pOffspringAsexual = copyFrom.pOffspringAsexual;
    self.pOffspringSexual = copyFrom.pOffspringSexual;
    self.pInterspeciesMating = copyFrom.pInterspeciesMating;

    self.pDisjointExcessGenesRecombined = copyFrom.pDisjointExcessGenesRecombined;

    self.pMutateConnectionWeights = copyFrom.pMutateConnectionWeights;
    self.pMutateAddNode = copyFrom.pMutateAddNode;
    self.pMutateAddModule = copyFrom.pMutateAddModule;
    self.pMutateAddConnection = copyFrom.pMutateAddConnection;
    self.pMutateDeleteConnection = copyFrom.pMutateDeleteConnection;
    self.pMutateDeleteSimpleNeuron = copyFrom.pMutateDeleteSimpleNeuron;

    // Copy the list.
    self.connectionMutationParameterGroupList = [];
    copyFrom.connectionMutationParameterGroupList.forEach(function(c){
        self.connectionMutationParameterGroupList.push(NeatParameters.ConnectionMutationParameterGroup.Copy(c));

    });

    self.compatibilityThreshold = copyFrom.compatibilityThreshold;
    self.compatibilityDisjointCoeff = copyFrom.compatibilityDisjointCoeff;
    self.compatibilityExcessCoeff = copyFrom.compatibilityExcessCoeff;
    self.compatibilityWeightDeltaCoeff = copyFrom.compatibilityWeightDeltaCoeff;

    self.elitismProportion = copyFrom.elitismProportion;
    self.selectionProportion = copyFrom.selectionProportion;

    self.targetSpeciesCountMin = copyFrom.targetSpeciesCountMin;
    self.targetSpeciesCountMax = copyFrom.targetSpeciesCountMax;

    self.pruningPhaseBeginComplexityThreshold = copyFrom.pruningPhaseBeginComplexityThreshold;
    self.pruningPhaseBeginFitnessStagnationThreshold = copyFrom.pruningPhaseBeginFitnessStagnationThreshold;
    self.pruningPhaseEndComplexityStagnationThreshold = copyFrom.pruningPhaseEndComplexityStagnationThreshold;

    self.speciesDropoffAge = copyFrom.speciesDropoffAge;

    self.connectionWeightRange = copyFrom.connectionWeightRange;

    return self;
};


