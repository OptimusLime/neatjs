var neatjs = {};

//export the cppn library
module.exports = neatjs;

//nodes and connections!
neatjs.neatNode = require('./genome/neatNode.js');
neatjs.neatConnection = require('./genome/neatConnection.js');

//all the activations your heart could ever hope for
neatjs.iec = require('./evolution/iec.js');
neatjs.multiobjective = require('./evolution/multiobjective.js');
neatjs.novelty = require('./evolution/novelty.js');

//neatHelp
neatjs.neatDecoder = require('./neatHelp/neatDecoder.js');
neatjs.neatHelp = require('./neatHelp/neatHelp.js');
neatjs.neatParameters = require('./neatHelp/neatParameters.js');

//and the utilities to round it out!
neatjs.genomeSharpToJS = require('./utility/genomeSharpToJS.js');

//exporting the node type
neatjs.NodeType = require('./types/nodeType.js');


