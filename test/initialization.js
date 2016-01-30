"use strict";

var GCA = require('../'),
    should = require('chai').should();

describe('Initialization', function () {
    describe('Constructor', function () {
        it('should support 2d grid', function () {
            var ca = new GCA([4, 3]);

            ca.dimension.should.equal(2);
            ca.shape.should.deep.equal([4, 3]);
            ca.array.data.length.should.equal(12);
        });

        it('should support 3d grid', function () {
            var ca = new GCA([4, 3, 2]);

            ca.dimension.should.equal(3);
            ca.shape.should.deep.equal([4, 3, 2]);
            ca.array.data.length.should.equal(24);
        });

        it('should by default initialize the grid to 0 values', function () {
            var ca = new GCA([2, 2]);

            ca.array.get(0,0).should.equal(0);
            ca.array.get(0,1).should.equal(0);
            ca.array.get(1,0).should.equal(0);
            ca.array.get(1,1).should.equal(0);
        });

        it('should allow to specify a default value for the grid', function () {
            var ca = new GCA([2, 2], 5);

            ca.array.get(0,0).should.equal(5);
            ca.array.get(0,1).should.equal(5);
            ca.array.get(1,0).should.equal(5);
            ca.array.get(1,1).should.equal(5);
        });
    });

    describe('fillWithDistribution', function () {
        it('should accept an optional rng function', function () {
            var ca = new GCA([3,3]);

            var callToRiggedRng = 0;

            var riggedRng = function riggedRng () {
                callToRiggedRng++;
                return Math.random();
            };

            ca.fillWithDistribution([[0,50], [1,50]], riggedRng);

            callToRiggedRng.should.equal(9);
        });

        it('should return the instance of the CellularAutomata', function () {
            var ca = new GCA([3,3]);

            ca.fillWithDistribution([[0,50], [1,50]]).should.equal(ca);
        });

        it('should not affect the grid with null values', function () {
            var ca = new GCA([1,1], 1);

            ca.fillWithDistribution([[null,100]]);
            ca.array.get(0,0).should.equal(1);
        });
    });
});
