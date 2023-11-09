/*
Follow the tutorial
https://hello-magenta.glitch.me/#creating-new-sequences

Complete Document
https://magenta.github.io/magenta-js/music/classes/_music_vae_model_.musicvae.html

type of checkpoint
https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md#table

Reference
groove-drum
https://glitch.com/~groove-drums
*/

import yaml from 'js-yaml';
import * as mm from '@magenta/music';

//Load Model Config
import MusicVAE from '../model/musicvae/config.yaml';
import MusicRNN from '../model/musicrnn/config.yaml';
import * as tf from '@tensorflow/tfjs';

const model_list = [MusicVAE, MusicRNN];

const music_vae = new mm.MusicVAE(
    'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_hikl_small'
);
initializeMusicVAE(); //TODO :  need to consider loading timing only when coder use or define the model

const music_rnn = new mm.MusicRNN(
    'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'
);
initializeMusicRNN(); //TODO :  need to consider loading timing only when coder use or define the model

/**
 *  Method for loading config
 */
export async function loadModelConfig() {
    var json_lists = [];
    for (const idx in model_list) {
        const response = await fetch(model_list[idx]);
        const text = await response.text();
        const json = yaml.load(text);
        json_lists.push(json);
    }
    return json_lists;
}

/**
 *  Determin which model API is called
 *  TODO ; manually switched the API
 */
export async function dataGeneration(model, para, calledfunc, patterns) {
    var res = [];
    if (model.name === 'magenta_music_vae') {
        res = await manageMusicVAEFunction(para, calledfunc, patterns);
        return res;
    } else if (model.name === 'magenta_rnn') {
        res = await manageMusicRNNFunction(para, calledfunc, patterns);
        return res;
    }
}

/**----------------------------   MUSIC VAE GENERATE FUNCTION --------------------- */

const manageMusicVAEFunction = async (para, calledfunc, patterns) => {
    var res;

    for (var p of calledfunc) {
        if (p.function === 'input') {
            res = await latentSampling(para, p.args, patterns);
            return res;
        } else if (p.function === 'interpolate') {
            res = await interpolateGeneration(para, p.args, patterns);
            return res;
        } else if (p.function === 'similar') {
            res = await similarSampling(para, p.args, patterns);
            return res;
        } else if (p.function === 'gen') {
            res = await tempatureSampling(para);
            return res;
        }
    }
};

async function initializeMusicVAE() {
    console.log('loading music vae');
    const init = async () => {
        await music_vae.initialize();
        console.log('loaded');
    };
    await init();
    return music_vae;
}

//Music Vae Generation
async function tempatureSampling(para) {
    console.log('music vae sampling');
    var res = [];
    var tempature = parseFloat(para[1].value);
    res = await music_vae.sample(1, tempature);

    return res;
}

/**
 * NoteSequence Template
 * DRUMS = {
  notes: [
    { pitch: 36, quantizedStartStep: 0, quantizedEndStep: 1, isDrum: true },
  ],
  quantizationInfo: {stepsPerQuarter: 4},
  tempos: [{time: 0, qpm: 120}],
  totalQuantizedSteps: 11
};
 */

//Encode the input NoteSequence into the latent vecter and decode
const latentSampling = async (para, name, pattern) => {
    console.log('music vae latent sampling');

    var tempature = parseFloat(para[1].value);
    var input = {};
    for (var p of pattern) {
        if (p.name === name) {
            input = p.noteSequence;
        }
    }

    let z = await music_vae.encode([input]);
    let result = await music_vae.decode(z, tempature, undefined, 4, 120);

    return result;
};

//Interpolate function
//ToDo: need to understand tempature meanign of interpolation
const interpolateGeneration = async (para, name, pattern) => {
    console.log('music vae interpolation');
    if (pattern.length !== 2) return;

    var names = name.split(',');

    var tempature = parseFloat(para[1].value);
    var input1 = {};
    var input2 = {};
    for (var p of pattern) {
        if (p.name === names[0]) input1 = p.noteSequence;
        if (p.name === names[1]) input2 = p.noteSequence;
    }

    var result = await music_vae.interpolate([input1, input2], 1, tempature);

    return result;
};

//similar function
/**
 * similarity: number
The degree of similarity between the generated sequences and the input sequence. 
Must be between 0 and 1, where 1 is most similar and 0 is least similar.
 * 
 */
const similarSampling = async (para, name, pattern) => {
    console.log('music vae similar sampling');
    console.log(name);
    var tempature = parseFloat(para[1].value);
    var similarirty = parseFloat(para[2].value);
    var input = {};
    for (var p of pattern) {
        if (p.name === name) {
            input = p.noteSequence;
        }
    }

    var result = await music_vae.similar(input, 1, similarirty, tempature);

    return result;
};

/**----------------------------   MUSIC RNN GENERATE FUNCTION --------------------- */
/**
 *  * This is MusicRNN function List
 * @function continue()
 */

const manageMusicRNNFunction = async (para, calledfunc, patterns) => {
    var res;
    for (var p of calledfunc) {
        if (p.function === 'input') {
            res = await continuSequence(para, p.args, patterns);
            return res;
        }
    }
};

async function initializeMusicRNN() {
    console.log('loading music rnn');
    const init = async () => {
        await music_rnn.initialize();
        console.log('loaded');
    };
    await init();
    return music_rnn;
}

const continuSequence = async (para, name, pattern) => {
    console.log('music rnn continues saquence');
    var tempature = parseFloat(para[0].value);
    var steps = parseFloat(para[1].value);

    var input = {};
    for (var p of pattern) {
        if (p.name === name) {
            input = p.noteSequence;
        }
    }

    let result = await music_rnn.continueSequence(input, steps, tempature);

    return [result];
};

/**----------------------------   COMMON GENERATE FUNCTION --------------------- */

/**
 * Common Function For Visualization
 * @function cosineDistance()
 */

/** cosine Distance*/
export async function cosineDistance(data) {
    var a = await music_vae.encode(data[0]);
    var b = await music_vae.encode(data[1]);

    var cosine = tf.losses.cosineDistance(a, b);
    return cosine.dataSync()[0];
}
