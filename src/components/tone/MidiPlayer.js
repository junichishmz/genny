import React, {useEffect,useState,forwardRef,useImperativeHandle} from 'react'
import * as Tone from "tone"




const MidiPlayer = forwardRef((props, ref) => {
    
    let PartPlayer
    const leadSynth = new Tone.PolySynth();
    leadSynth.toDestination();
    const [midi, setMidi] = useState()
    // const [timeSequence,setTimeSequence] = useState(0)

    const leadSampler = new Tone.Sampler({
        urls:{
            'c2' : 'https://teropa.info/ext-assets/drumkit/kick.mp3',
            'g2' : 'https://teropa.info/ext-assets/drumkit/hatClosed.mp3',
            'f#2' : 'https://teropa.info/ext-assets/drumkit/snare3.mp3',
        },
        volume: 5,
    })    
    leadSampler.toDestination();

    useEffect(()=>{
         setMidi(props.midi)
    },[props.midi])

    //8n update
    // let time = new Tone.Loop((time) =>{Tone.Draw.schedule(() => sequenceUpdate(time), time)},'8n')


    useImperativeHandle(ref, () => {    
        return {
            playMusic: () => {
                start()
            },
        }
    });
    

    const setPlay = (time,note) =>{
        // const playNote = async () =>{
        //        await leadSynth.triggerAttackRelease(note.name, note.duration, time,0.2)
        // }
        // playNote()
        if(note.duration >= 0) leadSampler.triggerAttackRelease(note.name, note.duration, time,0.3)
        
        console.log(note)
        // data = note
        // setTimeSequence(time)
        // setCurrentNote(note)
    }




    // const playNote = () =>{
    //     start ()
    // }

    // //8n update 
    // function sequenceUpdate(time){

    //     setTimeSequence(time)
    // }

    

    const start = async () =>{

        
        // await Tone.start()
        // Tone.Transport.cancel()
        // Tone.Transport.start()
        // Tone.Transport.bpm.value = 120
        PartPlayer = new Tone.Part((time,note) => setPlay(time,note), midi)

        PartPlayer.loop = true
        // Tone.Transport.bpm.value = 95
        //playMelody()
        await PartPlayer.start()
        // await time.start()
    }

//     const onMute = () =>{
//         // stop()
//         Tone.Transport.cancel()
// //         Tone.Transport.stop()
        
//     }

//     const playerDispose = async (player) =>{
//         console.log(player)
//         if (typeof(player) === "undefined") return
//         if (player._wasDisposed) return

//         await player.stop()
//         await player.clear()
//         await player.dispose()
//     }



    return (
        <div style={{
            // marginBottom:'5px',
            paddingTop:'15px',
            textAlign: 'center',
        }}>
            {/* <div>InteractiveMidiPlayer</div> */}
            {/* <Button variant="secondary" size="sm" onClick={()=>playNote()} style={{
                // marginBottom:'5px',
                textAlign: 'center',
            }}>MIDI TEST</Button>
            <button onClick={()=>onMute()}>stop</button> */}
            {/* <buttton onClick={()=>onMute()}>MUTE</buttton> */}
        </div>
        
    )
})

export default MidiPlayer