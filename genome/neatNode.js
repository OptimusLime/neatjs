/**
 * Module dependencies.
 */
//none

/**
 * Expose `NeatNode`.
 */

module.exports = NeatNode;

/**
 * Initialize a new NeatNode.
 *
 * @param {String} gid
 * @param {Object,String} aFunc
 * @param {Number} layer
 * @param {Object} typeObj
 * @api public
 */
function NeatNode(gid, aFunc, layer, typeObj) {

    var self = this;

    //gids are strings not numbers -- make it so
    self.gid =  typeof gid === "number" ? "" + gid : gid;
    //we only story the string of the activation funciton
    //let cppns deal with actual act functions
    self.activationFunction = aFunc.functionID || aFunc;

    self.nodeType = typeObj.type;

    self.layer = (typeof layer === 'string' ? parseFloat(layer) : layer);

    //TODO: Create step tests, include in constructor
    self.step = 0;

    self.bias = 0;
}

NeatNode.INPUT_LAYER = 0.0;
NeatNode.OUTPUT_LAYER = 10.0;

NeatNode.Copy = function(otherNode)
{
    return new NeatNode(otherNode.gid, otherNode.activationFunction, otherNode.layer, {type: otherNode.nodeType});
};