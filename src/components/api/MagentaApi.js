/*
Follow the tutorial
https://hello-magenta.glitch.me/#creating-new-sequences

Complete Document
https://magenta.github.io/magenta-js/music/classes/_music_vae_model_.musicvae.html

type of music vae
https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md#table

Reference
groove-drum
https://glitch.com/~groove-drums

*/

import * as mm from '@magenta/music';


const TWINKLE_TWINKLE = {
    notes: [
      {pitch: 60, startTime: 0.0, endTime: 0.5},
      {pitch: 60, startTime: 0.5, endTime: 1.0},
      {pitch: 67, startTime: 1.0, endTime: 1.5},
      {pitch: 67, startTime: 1.5, endTime: 2.0},
      {pitch: 69, startTime: 2.0, endTime: 2.5},
      {pitch: 69, startTime: 2.5, endTime: 3.0},
      {pitch: 67, startTime: 3.0, endTime: 4.0},
      {pitch: 65, startTime: 4.0, endTime: 4.5},
      {pitch: 65, startTime: 4.5, endTime: 5.0},
      {pitch: 64, startTime: 5.0, endTime: 5.5},
      {pitch: 64, startTime: 5.5, endTime: 6.0},
      {pitch: 62, startTime: 6.0, endTime: 6.5},
      {pitch: 62, startTime: 6.5, endTime: 7.0},
      {pitch: 60, startTime: 7.0, endTime: 8.0},  
    ],
    totalTime: 8
};

export async function initializeMusicRnn(){
    const music_rnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    const init = async() =>{
        await music_rnn.initialize()
    }
    await init()
    return  music_rnn
}


export async function initializeMusicVAE(){
    // const music_vae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_2bar_humanize');
    // const music_vae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
    const music_vae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_2bar_hikl_small'); 

    console.log('loading music vae')
    const init = async() =>{
        await music_vae.initialize()
        console.log('loaded')
        
    }
    await init()
    return  music_vae
}


export async function initializePlayer(){
 
    const player = new mm.Player()
    return player
}






// const music_rnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
// const melodyRnn = new mm.MusicRNN( 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');
// const melodyRnnLoaded = melodyRnn.initialize()
// const grooVae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_2bar_humanize')
// const grooVaeLoaded = grooVae.initialize()