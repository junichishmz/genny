import React ,{useState,Fragment,useRef,useEffect} from 'react'

//util
import {midiTrackExporter} from './MidiExporter'
//sample midi
import SampleMidi from '../../asset/midi/drum.mid'
import MidiPlayer from './MidiPlayer'
import * as Tone from "tone"


import { ReactComponent as Play } from "../../asset/gui/play.svg"
import { ReactComponent as Pause } from "../../asset/gui/pause.svg";

const PlayManger = () => {      
      const [midi,setMidi] = useState()


      const playerRef = useRef(null)

      const [playpauseToggle,setPlayPauseToggle] = useState(false)


      useEffect(() => {
            midiTrackExporter(SampleMidi).then((data) =>{
                  // setMidi([])
                  setMidi(data)
              })
        }, [])
    

       const onStart = async () =>{
            await Tone.start()
            Tone.Transport.cancel()
            Tone.Transport.start()
            Tone.Transport.bpm.value = 120


            playerRef.current.playMusic()

            setPlayPauseToggle(true)

       }

       const onMute = () =>{
            Tone.Transport.cancel()      
            setPlayPauseToggle(false)
        }



        function playpauseBtn(){
           if(playpauseToggle){
                  return(
                        <button
                        type="button"
                        onClick={()=>onMute()}
                        style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        
                        }}
            >
            <Pause />
            </button>
                  )
           }else{
            return(
                  <button
                  type="button"
                  onClick={()=>onStart()}
                  style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",            
                  }}
                  >
                  <Play />
                  </button>
           
            )
                  
        }
      }




      return (
      <Fragment>
            <MidiPlayer
                  ref={playerRef}
                  midi={midi}/>

            {/* <button onClick={()=>onGetMidi()}>
                  set midi
            </button> */}

            {/* <button onClick={()=>onStart()}>
                  start
            </button>

            <button onClick={()=>onMute()}>
                  stop
            </button> */}

            {playpauseBtn()}

      </Fragment>
      )
}

export default PlayManger
