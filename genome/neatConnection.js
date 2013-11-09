
/**
 * Module dependencies.
 */
//none

/**
 * Expose `NeatConnection`.
 */

module.exports = NeatConnection;

/**
 * Initialize a new NeatConnection.
 *
 * @param {String} gid
 * @param {Number} weight
 * @param {Object} srcTgtObj
 * @api public
 */

function NeatConnection(gid, weight, srcTgtObj) {

    var self = this;
    //Connection can be inferred by the cantor pair in the gid, however, in other systems, we'll need a source and target ID

    self.gid = (typeof gid === 'string' ? parseFloat(gid) : gid);
    self.weight = (typeof weight === 'string' ? parseFloat(weight) : weight);

    self.sourceID = (typeof srcTgtObj.sourceID === 'string' ? parseFloat(srcTgtObj.sourceID) : srcTgtObj.sourceID);
    self.targetID = (typeof srcTgtObj.targetID === 'string' ? parseFloat(srcTgtObj.targetID) : srcTgtObj.targetID);

    //learning rates and modulatory information contained here, not generally used or tested
    self.a =0;
    self.b =0;
    self.c =0;
    self.d =0;
    self.modConnection=0;
    self.learningRate=0;

    self.isMutated=false;
}


NeatConnection.Copy = function(connection)
{
    return new NeatConnection(connection.gid, connection.weight, {sourceID: connection.sourceID, targetID: connection.targetID});
};