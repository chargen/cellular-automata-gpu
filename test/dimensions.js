"use strict";

var GCA = require('../'),
    should = require('chai').should();

describe('Using different dimensions', function () {
    it('should support 2D', function () {
        var ca = new GCA([3,3]);

        ca.dimension.should.equal(2);

        ca.array.set(1, 1, 1);

        ca.apply('1/1V', 1);
        ca.finalize();

        // 0 1 0
        ca.array.get(0, 0).should.equal(0);
        ca.array.get(1, 0).should.equal(1);
        ca.array.get(2, 0).should.equal(0);

        // 1 0 1
        ca.array.get(0, 1).should.equal(1);
        ca.array.get(1, 1).should.equal(0);
        ca.array.get(2, 1).should.equal(1);

        // 0 1 0
        ca.array.get(0, 2).should.equal(0);
        ca.array.get(1, 2).should.equal(1);
        ca.array.get(2, 2).should.equal(0);
    });

    it('should support 3D', function () {
        var ca = new GCA([3,3,3]);

        ca.dimension.should.equal(3);

        ca.array.set(1, 1, 1, 1);

        ca.apply('1/1V', 1);
        ca.finalize();

        // 0 0 0
        ca.array.get(0, 0, 0).should.equal(0);
        ca.array.get(1, 0, 0).should.equal(0);
        ca.array.get(2, 0, 0).should.equal(0);

        // 0 1 0
        ca.array.get(0, 1, 0).should.equal(0);
        ca.array.get(1, 1, 0).should.equal(1);
        ca.array.get(2, 1, 0).should.equal(0);

        // 0 0 0
        ca.array.get(0, 2, 0).should.equal(0);
        ca.array.get(1, 2, 0).should.equal(0);
        ca.array.get(2, 2, 0).should.equal(0);



        // 0 1 0
        ca.array.get(0, 0, 1).should.equal(0);
        ca.array.get(1, 0, 1).should.equal(1);
        ca.array.get(2, 0, 1).should.equal(0);

        // 1 0 1
        ca.array.get(0, 1, 1).should.equal(1);
        ca.array.get(1, 1, 1).should.equal(0);
        ca.array.get(2, 1, 1).should.equal(1);

        // 0 1 0
        ca.array.get(0, 2, 1).should.equal(0);
        ca.array.get(1, 2, 1).should.equal(1);
        ca.array.get(2, 2, 1).should.equal(0);



        // 0 0 0
        ca.array.get(0, 0, 2).should.equal(0);
        ca.array.get(1, 0, 2).should.equal(0);
        ca.array.get(2, 0, 2).should.equal(0);

        // 0 1 0
        ca.array.get(0, 1, 2).should.equal(0);
        ca.array.get(1, 1, 2).should.equal(1);
        ca.array.get(2, 1, 2).should.equal(0);

        // 0 0 0
        ca.array.get(0, 2, 2).should.equal(0);
        ca.array.get(1, 2, 2).should.equal(0);
        ca.array.get(2, 2, 2).should.equal(0);
    });
});
