"use strict";

var uniq = require('uniq');

var printFloat = function printFloat (v) {
    return (v === (v|0) ? v.toFixed(1) : v.toString(10));
};

var generateGetPosText = function generateGetPosText () {
    return [
        'vec2 getPosText(const in ivec3 position) {',
        '  float sposition = float(position.x + position.y * int(iStrideY) + position.z * int(iStrideZ));',
        '  return vec2(',
        '    mod(sposition, iTextureSize.x) / iTextureSize.x,',
        '    floor((sposition / iTextureSize.x)) / iTextureSize.x',
        '  );',
        '}'
    ].join('\n');
};

var generateGetPixelGlsl = function generateGetPixelGlsl (outOfBoundValue) {
    outOfBoundValue = outOfBoundValue || 0;

    if (outOfBoundValue === 'clamp') {
        return [
            'int getPixel(const in vec3 currentPos, const in vec3 add) {',
            '  ivec3 position = ivec3(clamp(currentPos + add, vec3(0.), iRealSize - vec3(1.)));',
            '  return unpackValue(texture2D(iBackbuffer, getPosText(position)).x);',
            '}'
        ].join('\n');
    } else if (outOfBoundValue === 'wrap') {
        return [
            'int getPixel(const in vec3 currentPos, const in vec3 add) {',
            '  ivec3 position = ivec3(mod(currentPos + add, iRealSize));',
            '  return unpackValue(texture2D(iBackbuffer, getPosText(position)).x);',
            '}'
        ].join('\n');
    } else {
        return [
            'int getPixel(const in vec3 currentPos, const in vec3 add) {',
            '  ivec3 position = ivec3(currentPos + add);',
            '  if(',
            '    position.x < 0 || position.x >= int(iRealSize.x) ||',
            '    position.y < 0 || position.y >= int(iRealSize.y) ||',
            '    position.z < 0 || position.z >= int(iRealSize.z)',
            '  ) {',
            '    return ' + outOfBoundValue + ';',
            '  } else {',
            '    return unpackValue(texture2D(iBackbuffer, getPosText(position)).x);',
            '  }',
            '}'
        ].join('\n');
    }
};

var generateGetNeighbourhood = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhood (const in vec2 currentPos) {',
        '  float sposition = float(int(currentPos.x) + int(currentPos.y) * int(iTextureSize.x));',
        '  vec3 pixelPos = vec3(',
        '    mod(sposition, iRealSize.x),',
        '    mod(floor(sposition / iStrideY), iRealSize.y),',
        '    floor(sposition / iStrideZ)',
        '  );',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(pixelPos, vec3(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ', ' + printFloat(neighbour[2]) + ')) > 0 ? 1 : 0;');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateGetNeighbourhoodCond = function (neighbourhood) {
    var glsl = [
        'int getNeighbourhoodCond (const in vec2 currentPos, const in int desiredValue) {',
        '  float sposition = float(int(currentPos.x) + int(currentPos.y) * int(iTextureSize.x));',
        '  vec3 pixelPos = vec3(',
        '    mod(sposition, iRealSize.x),',
        '    mod(floor(sposition / iStrideY), iRealSize.y),',
        '    floor(sposition / iStrideZ)',
        '  );',
        '  int sum = 0;',
        ''
    ];

    for (var i = 0; i < neighbourhood.length; i++) {
        var neighbour = neighbourhood[i];
        glsl.push('  sum += getPixel(pixelPos, vec3(' + printFloat(neighbour[0]) + ', ' + printFloat(neighbour[1]) + ', ' + printFloat(neighbour[2]) + ')) == desiredValue ? 1 : 0;');
    }

    glsl.push('', '  return sum;', '}');

    return glsl.join('\n');
};

var generateRandomFunction = function generateRandomFunction () {
    return [
        'float rand(vec2 co, float seed) {',
        '  float a = 12.9898;',
        '  float b = 78.233;',
        '  float c = 43758.5453;',
        '  float dt = dot(co.xy + vec2(seed, 0.), vec2(a,b));',
        '  float sn = mod(dt + iFrame / a, 3.14);',
        '  return fract(sin(sn) * c);',
        '}'
    ].join('\n');
};

var generateEqualityCheck = function generateEqualityCheck (values, variable) {
    var checkString = [],
        groupedValues = [],
        previousValue = null,
        i;

    variable = variable || 'sum';

    if (values && values.length) {
        values.sort(function(a, b) {
            return a - b;
        });

        uniq(values, null, true);

        for (i = 0; i < values.length; i++) {
            if (previousValue === values[i] - 1) {
                groupedValues[groupedValues.length - 1].push(values[i]);
            } else {
                groupedValues.push([values[i]]);
            }

            previousValue = values[i];
        }

        for (i = 0; i < groupedValues.length; i++) {
            if (groupedValues[i].length > 1) {
                checkString.push('(' + variable + ' >= ' + groupedValues[i][0] + ' && ' + variable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ')');
            } else {
                checkString.push(variable + ' == ' + groupedValues[i][0]);
            }
        }
    } else {
        checkString.push('false');
    }

    return checkString.length > 1 ? '(' + checkString.join(' || ') + ')' : checkString[0];
};

var generateProbabilityCheck = function generateProbabilityCheck(probabilities, sumVariable, positionVariable) {
    var checkString = [],
        groupedValues = [],
        groupProbabilities = [],
        seed = Math.random(),
        value = null,
        probability = null,
        previousValue = null,
        previousProbability = null,
        i;

    sumVariable = sumVariable || 'sum';
    positionVariable = positionVariable || 'position';

    for (i in probabilities) {
        value = parseInt(i, 10);
        probability = probabilities[i];

        if (previousValue === value - 1 && previousProbability === probability) {
            groupedValues[groupedValues.length - 1].push(value);
        } else {
            groupedValues.push([value]);
            groupProbabilities.push(probability);
        }

        previousValue = value;
        previousProbability = probability;
    }

    if (groupProbabilities.length) {
        for (i = 0; i < groupProbabilities.length; i++) {
            probability = groupProbabilities[i];

            if (probability === 1) {
                if (groupedValues[i].length > 1) {
                    checkString.push('(' + sumVariable + ' >= ' + groupedValues[i][0] + ' && ' + sumVariable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ')');
                } else {
                    checkString.push(sumVariable + ' == ' + groupedValues[i][0]);
                }
            } else if (probability > 0) {
                if (groupedValues[i].length > 1) {
                    checkString.push('(' + sumVariable + ' >= ' + groupedValues[i][0] + ' && ' + sumVariable + ' <= ' + groupedValues[i][groupedValues[i].length - 1] + ' && rand(' + positionVariable + ', ' + printFloat(seed) + ') < ' + printFloat(probability) + ')');
                } else {
                    checkString.push('(' + sumVariable + ' == ' + groupedValues[i][0] + ' && rand(' + positionVariable + ', ' + printFloat(seed) + ') < ' + printFloat(probability) + ')');
                }
            }
        }
    } else {
        checkString.push('false');
    }

    return checkString.length > 1 ? '(' + checkString.join(' || ') + ')' : checkString[0];
};

var generateProcessGlslGenerations = function generateProcessGlslGenerations (neighbourhood, stateCount, survival, birth) {
    var glsl = [
        generateGetNeighbourhoodCond(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhoodCond(position, 1);',
        '  if (currentValue == 0 && ' + generateEqualityCheck(birth) + ') {',
        '    return 1;',
        '  } else if (currentValue == 1 && ' + generateEqualityCheck(survival) + ') {',
        '    return 1;',
        '  } else if (currentValue > 0) {',
        '    return int(mod(float(currentValue + 1), ' + printFloat(stateCount) + '));',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslLife = function generateProcessGlslLife (neighbourhood, survival, birth) {
    var glsl = [
        generateGetNeighbourhood(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position);',
        '  if (currentValue == 0 && ' + generateEqualityCheck(birth) + ') {',
        '    return 1;',
        '  } else if (currentValue > 0 && ' + generateEqualityCheck(survival) + ') {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslStochastic = function generateProcessGlslStochastic (neighbourhood, survival, birth) {
    var glsl = [
        generateRandomFunction(),
        '',
        generateGetNeighbourhood(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position);',
        '  if (currentValue == 0 && ' + generateProbabilityCheck(birth) + ') {',
        '    return 1;',
        '  } else if (currentValue > 0 && ' + generateProbabilityCheck(survival) + ') {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslVote = function generateProcessGlslVote (neighbourhood, votes) {
    var glsl = [
        generateGetNeighbourhood(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position) + (currentValue > 0 ? 1 : 0);',
        '  if (' + generateEqualityCheck(votes) + ') {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslLuky = function generateProcessGlslLuky (neighbourhood, lowSurvival, highSurvival, lowBirth, highBirth) {
    var glsl = [
        generateGetNeighbourhood(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhood(position);',
        '  if (currentValue == 0 && sum >= ' + lowBirth + ' && sum <= ' + highBirth + ') {',
        '    return 1;',
        '  } else if (currentValue > 0 && sum >= ' + lowSurvival + ' && sum <= ' + highSurvival + ') {',
        '    return 1;',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslNluky = function generateProcessGlslNluky (neighbourhood, stateCount, lowSurvival, highSurvival, lowBirth, highBirth) {
    var glsl = [
        generateGetNeighbourhoodCond(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int sum = getNeighbourhoodCond(position, 1);',
        '  if (currentValue == 0 && sum >= ' + lowBirth + ' && sum <= ' + highBirth + ') {',
        '    return 1;',
        '  } else if (currentValue == 1 && sum >= ' + lowSurvival + ' && sum <= ' + highSurvival + ') {',
        '    return 1;',
        '  } else if (currentValue == 1) {',
        '    return ' + (2 % (2 + stateCount * 2)) + ';',
        '  } else if (currentValue >= 2) {',
        '    return int(mod(float(currentValue + 2), ' + printFloat(2 + stateCount * 2) + '));',
        '  }',
        '  return 0;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlslCyclic = function generateProcessGlslCyclic (neighbourhood, stateCount, threshold, greenbergHastingsModel) {
    var glsl = [
        generateGetNeighbourhoodCond(neighbourhood),
        '',
        'int process(const in int currentValue, const in vec2 position) {',
        '  int nextValue = int(mod(float(currentValue + 1), ' + printFloat(stateCount) + '));',
        '  int sum = getNeighbourhoodCond(position, nextValue);',
        '  if (sum >= ' + threshold + (greenbergHastingsModel ? ' || currentValue > 0' : '') + ') {',
        '    return nextValue;',
        '  }',
        '  return currentValue;',
        '}'
    ];

    return glsl.join('\n');
};

var generateProcessGlsl = function generateProcessGlsl (neighbourhood,rule) {

    if (rule.ruleFormat === 'debug') {
        // debug process function
        var glsl = [
            'int process(const int currentValue, const vec2 position) {',
            '  float sposition = float(int(position.x) + int(position.y) * int(iTextureSize.x));',
            '  vec3 pixelPos = vec3(',
            '    mod(sposition, iRealSize.x),',
            '    mod(floor(sposition / iStrideY), iRealSize.y),',
            '    floor(sposition / iStrideZ)',
            '  );',
            '  return int(pixelPos.y);',
            '}'
        ];

        return glsl.join('\n');
    }


    if (rule.ruleFormat === 'life' || rule.ruleFormat === 'extended-life') {
        return generateProcessGlslLife(neighbourhood, rule.survival, rule.birth);
    } else if (rule.ruleFormat === 'extended-stochastic') {
        return generateProcessGlslStochastic(neighbourhood, rule.survival, rule.birth);
    } else if (rule.ruleFormat === 'generations' || rule.ruleFormat === 'extended-generations') {
        return generateProcessGlslGenerations(neighbourhood, rule.stateCount, rule.survival, rule.birth);
    } else if (rule.ruleFormat === 'vote') {
        return generateProcessGlslVote(neighbourhood, rule.vote);
    } else if (rule.ruleFormat === 'luky') {
        return generateProcessGlslLuky(neighbourhood, rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
    } else if (rule.ruleFormat === 'nluky') {
        return generateProcessGlslNluky(neighbourhood, rule.stateCount, rule.lowSurvival, rule.highSurvival, rule.lowBirth, rule.highBirth);
    } else if (rule.ruleFormat === 'cyclic') {
        return generateProcessGlslCyclic(neighbourhood, rule.stateCount, rule.threshold, rule.greenbergHastingsModel);
    }

    throw new Error('Unsupported ruleFormat : ' + rule.ruleFormat);
};

var generateComment = function generateComment (what, rule, dimensions, outOfBoundValue) {
    var comments = [
        '/**',
        ' * ' + what + ' generated by cellular-automata-glsl 0.1.0',
        ' *',
        ' * Rule : ' + rule.ruleString,
        ' * Dimensions : ' + dimensions.length + 'D [' + dimensions.join(', ') + ']',
        ' * Out of bound value : ' + outOfBoundValue,
        ' */'
    ];

    return comments.join('\n');
};

var generateUniformsAndConstants = function generateUniformsAndConstants (dimensions, textureWidth, textureHeight) {
    return [
        'const vec3 iRealSize = vec3(' + dimensions[0] + ', ' + dimensions[1] + ', ' + dimensions[2] + ');',
        'const vec2 iTextureSize = vec2(' + textureWidth + ', ' + textureHeight + ');',
        'const float iStrideY = ' + printFloat(dimensions[0]) + ';',
        'const float iStrideZ = ' + printFloat(dimensions[0] * dimensions[1]) + ';',
        'const float iMaxPos = ' + printFloat(dimensions[0] * dimensions[1] * dimensions[2]) + ';',
        'uniform sampler2D iBackbuffer;',
        'uniform float iFrame;'
    ].join('\n');
};

module.exports = function generateShaders(rule, neighbourhood, dimensions, width, height, outOfBoundValue) {
    if (dimensions.length !== 3) {
        throw new Error('Does not support other dimension than 3D');
    }

    var fragmentGlsl = [
        generateComment('Fragment shader', rule, dimensions, outOfBoundValue),
        '',
        '#ifdef GL_ES',
        '#if GL_FRAGMENT_PRECISION_HIGH == 1',
        '  precision highp float;',
        '  precision highp int;',
        '  precision highp sampler2D;',
        '#else',
        '  precision mediump float;',
        '  precision mediump int;',
        '  precision mediump sampler2D;',
        '#endif',
        '#endif',
        '',
        generateUniformsAndConstants(dimensions, width, height),
        '',
        'int unpackValue(const in float packedValue) {',
        ' return int((packedValue * 255.) + 0.5);',
        '}',
        '',
        'float packValue(const in int unpackedValue) {',
        ' return float(unpackedValue) / 255.;',
        '}',
        '',
        generateGetPosText(),
        '',
        generateGetPixelGlsl(outOfBoundValue),
        '',
        generateProcessGlsl(neighbourhood, rule),
        '',
        'void main() {',
        '  int currentValue = unpackValue(texture2D(iBackbuffer, gl_FragCoord.xy / iTextureSize).r);',
        '  gl_FragColor = vec4(packValue(process(currentValue, gl_FragCoord.xy)));',
        '}',
        ''
    ];

    var vertexGlsl = [
        generateComment('Vertex shader', rule, dimensions, outOfBoundValue),
        '',
        'attribute vec3 aVertexPosition;',
        'void main() {',
        '  gl_Position = vec4(aVertexPosition, 1.0);',
        '}',
        ''
    ];

    //console.log(fragmentGlsl.join('\n'));

    return {
        vertexShader: vertexGlsl.join('\n'),
        fragmentShader: fragmentGlsl.join('\n')
    };
};
