import React,{Fragment,useEffect,useRef} from 'react'

import {initializeMusicVAE,initializePlayer} from './MagentaApi'
import * as mm from '@magenta/music';


/* ToDo : API Mangerで完結できるか試してみる */

const Magenta = () => {
    
    // const music_vae = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_2bar_humanize');
    // music_vae.initialize();

    const vaePlayer = new mm.Player();

    const music_vae = useRef(null)

    function playVAE() {
      console.log('click')
      
        // music_vae.current.sample(1, 1.5).then((sample) => vaePlayer.start(sample[0]));


        //nn sequence data
        music_vae.current.sample(1,1.5).then((sample) =>{
            console.log(sample[0])
            vaePlayer.start(sample[0])            
            
        })


      }

    

    useEffect(()=>{
        initializeMusicVAE().then((data)=>{
        console.log('model loaded')
        music_vae.current = data
        })
    },[])

    // function playVAE(numSamples, temperature) {
        
     
    //     music_vae.sample(numSamples, temperature).then((sample) => {
    //       console.log(sample, sample.length);
    //     //   const concatenated = mm.sequences.concatenate(sample);
    //     //   player.start(concatenated);
    //     });
    // }

  return (
    <Fragment>
    <button className="button-30" onClick={()=>playVAE()} style={{
      marginLeft: '100px',
    }}>Magenta Generation</button>


    

    </Fragment>
  )
}

export default Magenta