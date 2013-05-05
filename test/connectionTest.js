var assert = require('assert');
var should = require('should');

var neatConnection = require('../genome/neatConnection.js');

describe('Creating a new connection',function(){
    var connection;

    var sourceID = 5;
    var targetID = 8;
    var gid = Math.floor(Math.random()*1000);

    var weight = .4;

    //test the other vanilla connection type
    before(function(done){

        connection = new neatConnection.NeatConnection(gid, weight, {sourceID: sourceID, targetID: targetID});
        done();
    });

    it('should have matching gid, weight, source, and target',function(){
        connection.gid.should.equal(gid);
        connection.weight.should.equal(weight);
        connection.sourceID.should.equal(sourceID);
        connection.targetID.should.equal(targetID);
    });



    //test the other vanilla connection type
    before(function(done){

        connection = new neatConnection.NeatConnection(gid, weight, {sourceID: sourceID, targetID: targetID});
        connection = neatConnection.NeatConnection.Copy(connection);
        done();
    });

    it('should have cloned gid, weight, source, and target',function(){
        connection.gid.should.equal(gid);
        connection.weight.should.equal(weight);
        connection.sourceID.should.equal(sourceID);
        connection.targetID.should.equal(targetID);
    });

});
