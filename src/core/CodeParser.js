import { ToneTransportConverter } from './CodeParserDictionary';

/**
 *
 * Rhythm pattern parser
 * this function find the "pattern()" and extract the args
 */
export async function rhythmParser(code) {
    //Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    var removeCommentOut = code.replace(regex, '');
    var patternData = extractPattern(removeCommentOut);
    return patternData;
}

/**
 *
 * Pattern Extract function
 * this function find the "pattern()" and extract the args
 */
function extractPattern(str) {
    const pattern = /pattern(\d*)\(([^)]*)\)/g;
    var result;
    var result_array = [];
    while ((result = pattern.exec(str)) !== null) {
        var dic = {};
        var pattern_number = result[1]; //extract pattern number
        var res = toneRyhthmPattern(result[2]); //extract ()
        var name = 'pattern' + pattern_number;

        dic['number'] = pattern_number;
        dic['data'] = res;
        dic['name'] = name;
        var play = findPatternPlay(result.input, name);
        dic['play'] = play;
        result_array.push(dic);
    }
    return result_array;
}

/**
 * When "play()" function is following the pattern(), it will trigger
 */
function findPatternPlay(input, patternName) {
    var play = false;
    const lines = input.split('\n');

    var modelIdx = 0;

    for (const [idx, l] of lines.entries()) {
        var matches = l.match(patternName);
        if (matches) modelIdx = idx;
        continue;
    }

    for (var i = modelIdx; i < lines.length; i++) {
        if (lines[i].includes('.play()')) {
            // console.log("find the play function !")
            play = true;
        }
        //finish the line
        if (lines[i] === '') {
            return play;
        }
    }
}

/**
 * Find the model parameter of model
 * and update parameter dictionary
 */
export function modelParaParser(value, code) {
    //Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    var removeCommentOut = code.replace(regex, '');

    //match the pattern and extract  of value()
    var pattern = new RegExp(value + '\\(([^)]*)\\)');
    var match = removeCommentOut.match(pattern);
    var res;
    if (match) {
        res = match[1];
    }
    return res;
}

/**
 * Find the gen() function to activate model
 * when you find the model() function code we will read the line until break,
 * and determin gen() function is written or not
 */
export function activateGenFunction(model, code) {
    //Remove all Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    code = code.replace(regex, '');

    const lines = code.split('\n');
    var activate = false;
    var modelIdx = 0;
    var gen = false;

    for (const [idx, l] of lines.entries()) {
        var modelName = model.name;
        const matches = l.match(modelName);
        if (matches) {
            modelIdx = idx;
            activate = true;
        }
        continue;
    }

    if (!activate) return;

    for (var i = modelIdx; i < lines.length; i++) {
        if (lines[i].includes('.gen()')) {
            gen = true;
        }
        //finish the line
        if (lines[i] === '') {
            model.genMode = gen;
            return;
        }
    }
}

/**
 * Extract the additional model function such as input(), output() etc..
 * @returns {"function name", "args(option)"}
 */
export async function extractModelFunctionParser(model, code) {
    //Remove all Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    code = code.replace(regex, '');

    const lines = code.split('\n');
    var modelIdx = 0;
    var modelName;

    for (const [idx, l] of lines.entries()) {
        modelName = model.name;
        var matches = l.match(modelName);
        if (matches) modelIdx = idx;
        continue;
    }

    var functon_array = [];
    //Extract the pattern with " ".***() "
    const definedRegex = /\.(\w+)\(([^)]*)\)/;

    for (var i = modelIdx; i < lines.length; i++) {
        var detected = lines[i].match(definedRegex);

        if (detected) {
            var dic = {};
            dic['function'] = detected[1];
            dic['args'] = detected[2];
            functon_array.push(dic);
        }
        //read line until finish the line
        if (lines[i] === '') return functon_array;
    }
}

/**
 *
 * @param matches : '<measure> : <beat> : <subdivision>' : <pitch> or <string>
 * @returns
 */
function toneRyhthmPattern(matches) {
    const regex2 = /\["\d+:\d+:\d+", (\d+|"[^"]+")\]/g;

    const m = matches.match(regex2);
    const array = m.map(match => match.split(','));

    const res_array = [];
    for (const key in array) {
        const value = array[key];
        const result = value.map(item =>
            item.replace(/^[\[\"\s]+|[\"\]\s]+$/g, '')
        );
        result[1] = parseInt(result[1]);
        res_array.push(result);
    }

    return res_array;
}

//ToDo: think about data arrangement format
export function noteToToneRhythm(data) {
    var res_array = [];
    for (const [idx, input] of data.entries()) {
        var index = ToneTransportConverter.findIndex(
            v => v.time === input.time
        );
        res_array.push(
            '[' + ToneTransportConverter[index].tone + ', ' + input.pitch + ']'
        );
    }

    return res_array;
}

export function updateCodeEditor(model, code, updatedData) {
    const lines = code.split('\n');
    var modelIdx = 0;
    var modelName;
    var comOutLine = false;

    for (const [idx, l] of lines.entries()) {
        if (comOutLine) {
            if (l.includes('*/')) comOutLine = false;
        }
        if (l.includes('//')) continue;
        if (l.includes('/*')) comOutLine = true;
        if (comOutLine) continue;
        modelName = model.name;
        var matches = l.match(modelName);
        if (matches) {
            modelIdx = idx;
        }
        continue;
    }

    var outputStr = [];

    for (var i = modelIdx; i < lines.length; i++) {
        outputStr.push(lines[i]);
        //read line until finish the line
        if (lines[i] === '') {
            for (var j = 0; j < outputStr.length; j++) {
                if (outputStr[j].includes('output(')) {
                    var index = outputStr[j].indexOf(')');
                    if (index >= 0) {
                        // console.log(') found')
                        outputStr[j] = outputStr[j].replace(
                            outputStr[j],
                            '.output(' + updatedData + ')'
                        );
                    } else {
                        console.log(') not found');
                        outputStr[j] = outputStr[j].replace(
                            outputStr[j],
                            '.output(' + updatedData
                        );
                        outputStr.splice(j + 1, outputStr.length - j);
                    }
                }
            }
            var tmpIdx = modelIdx + outputStr.length;
            lines.splice(modelIdx, outputStr.length);

            //add output data
            for (const [idx2, d] of outputStr.entries()) {
                lines.splice(modelIdx + idx2, 0, d);
            }
            var finalRes = lines.join('\n');

            return finalRes;
        }
    }
}
