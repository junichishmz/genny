/**
 * this is the groove vae API for live coding
 * reference 
 * official document : https://magenta.tensorflow.org/groovae
 * example code : https://glitch.com/~groove-drums
 * */

 import * as mm from '@magenta/music';

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