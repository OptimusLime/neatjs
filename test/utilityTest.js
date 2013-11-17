var assert = require('assert');
var should = require('should');

var cppnjs = require('cppnjs');
var utilities = cppnjs.utilities;

describe('Testing utilities.next()',function(){

    it('next should correctly generate random numbers', function(done){
        var randomMax = 10;
        var testLength = randomMax*100;

        for(var i=0; i < testLength; i++)
        {
            var guess = utilities.next(randomMax);
            guess.should.be.lessThan(randomMax);
        }

        done();
    });

    it('RouletteWheel.singleThrowArray(): single throw should correctly generate guesses from array', function(done){

        var probabilities = [];

        var pLength, selection;
        var randomMax = 10;
        var testLength = 5000;

        for(var i=0; i < testLength; i++)
        {

            pLength = utilities.next(randomMax) + 3;
            probabilities = [];
            selection = utilities.next(pLength);

            for(var p =0; p< pLength; p++)
            {
                probabilities.push(( p == selection ? 1 : 0));
            }

            var guess = utilities.RouletteWheel.singleThrowArray(probabilities);
            guess.should.be.equal(selection);

            probabilities = [];
            selection = utilities.next(pLength);
            var selection2 = utilities.next(pLength);

            while(pLength > 1 && selection2 == selection)
                selection2 = utilities.next(pLength);

            for(var p =0; p< pLength; p++)
            {
                probabilities.push((p == selection || p == selection2 ? .5 : 0));
            }

            guess = utilities.RouletteWheel.singleThrowArray(probabilities);
            (guess == selection || guess == selection2).should.be.equal(true);
        }

        done();
    });
    it('RouletteWheel.singleThrow(): should generate bool', function(done){

        var testLength = 2000;
        for(var i=0; i< testLength; i++){
            utilities.RouletteWheel.singleThrow(1).should.equal(true);
        }

        for(var i=0; i< testLength; i++){
            utilities.RouletteWheel.singleThrow(0).should.equal(false);
        }

        done();
    });
//

//    it('cantor pair should maybe not get super big', function(done){
//        var randomMax = 100;
//        var testLength = 1000;//randomMax*100;
//
//        var startX =100000, startY =100000;
//        var lastGuess = cantorPair.xy2cp(startX,startX);
//
//        for(var i=0; i < testLength; i++)
//        {
//            var guess = cantorPair.xy2cp(startX,startY);
//            isFinite(guess).should.be.equal(isFinite(1));
//            console.log(guess);
//            lastGuess = guess;
//            startX+= 1;
//            startY +=1;
//        }
//
//        lastGuess.should.be.greaterThan(randomMax);
//
//
//        done();
//    })
});