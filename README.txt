NeuroEvolution for Augmenting Topologies (NEAT) written in Javascript (for browser or nodejs) tested using Mocha.

Library is currently in development, and is 95% well tested. Genomes are well functioning, and mutation/crossover are well defined.

Left to be tested: evolution - IEC/NSGA-II/Novelty search with local competition. These will all be created in the near future.

Another library - neat-ui will be created for using neatjs in a browser environment or a node environment with UI elements for visualization.

NPM Usage- 

var neatjs = require('neatjs');

var neatGenome = neatjs.loadLibraryFile('neatjs', 'neatGenome');

//real documentation to come soon...

