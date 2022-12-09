import yaml from 'js-yaml';
import * as mm from '@magenta/music';

//Load Model Config
import MusicVAE from '../model/musicvae/config.yaml'
import MusicRNN from '../model/musicrnn/config.yaml'
import { assert } from 'tone/build/esm/core/util/Debug';


const model_list = [MusicVAE,MusicRNN]


const music_vae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_hikl_small'); 
initializeMusicVAE()

export async function loadModelConfig(){

    var json_lists = []
    for(const idx in model_list){
        const response = await fetch(model_list[idx]);
        const text = await response.text();
        const json = yaml.load(text);
        json_lists.push(json)
    }
    return json_lists
}


/**
 * Determin which model API is called
 * TODO ; manually switched the API
 */
export async function dataGeneration(model,para){
    var res = []

   
    if(model.name === "magenta_music_vae") res = await tempatureSamplingMusicVAE(para)
    return res
}


async function initializeMusicVAE(){

    console.log('loading music vae')
    const init = async() =>{
        await music_vae.initialize()
        console.log('loaded')
        
    }
    await init()
    return  music_vae
}

//Music Vae Generation
//ToDo : make sure the sample method is correct
const tempatureSamplingMusicVAE = async(para) =>{
    var res = []
    var tempature = parseFloat(para[1].value)
    res = await music_vae.sample(1,tempature)
    return res
}
