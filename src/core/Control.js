import React,{Fragment,forwardRef,useImperativeHandle,useEffect,useState,useContext,useRef} from 'react'
import * as Tone from "tone"

//initial drum  midi and sound data
import DrumMidi from '../asset/midi/drum.mid'
import {defaultPitch} from '../utils/DefaultPitchPreset'

//utils
import {midiParser} from './MidiParser'

//context
import { ApiContext } from '../contexts/ApiContext';

//Code Parser Function
import { rhythmParser,modelParaParser,activateGenFunction} from './CodeParser'

//Model Generation Method
import  {dataGeneration} from './Model'



const Control = forwardRef((props, ref) => {
    const [midi,setMidi] = useState()
    
    const {code,modelAutoCompletionDic,modelParaDic,currentModelPara,setCurrentModelPara} = useContext(ApiContext)

    const [started, setStarted] = useState(false)

    const drumPlayer = new Tone.Players(defaultPitch).toDestination()
    drumPlayer.volume.value = -12 //need to make async function though

    //Sequence data
    const time = new Tone.Loop((time) =>{Tone.Draw.schedule(() => updateSequence(time), time)},'4n')

    
    // const PartPlayer = new Tone.Part((time,note) => setPlay(time,note), rhythm)

    const drumPatternPlayer = useRef(null)



    /** We don't use this */
    useEffect(() => {
        midiParser(DrumMidi).then((data) =>{
            setMidi(data)
            // console.log(data)
        })
    }, [])


    /** Initial Parser form preset  */
    useEffect(()=>{
        rhythmParser(code).then((res)=>{
            drumPatternPlayer.current = new Tone.Part((time,note) => setPlay(time,note), res)
            drumPatternPlayer.current.loop = true
            drumPatternPlayer.current.loopStart = 0
            drumPatternPlayer.current.loopEnd = '2m'
        })
    },[])




    useImperativeHandle(ref, () => {    
        return {
            exec: () => {
                if(!started){
                    onStart() //call onece
                    setStarted(true)
                    console.log('start')
                }else{
                    updateCode()
                    console.log('update')
                }
            },
            pause: () =>{
                if(!started) return
                onMute()
                // setStarted(false)
            },
            update: (line) =>{
                updateLineData(line)
              
            }
        }
    });

    /**-------------------------------------------------
     * START FUNCTION
     *  call only once when you start playing
     * -------------------------------------------------
    */
    const onStart = async () =>{
        await Tone.start()
        Tone.Transport.cancel()
        Tone.Transport.start()
        Tone.Transport.bpm.value = 120
        start()
        // timeStart()
   }

     /**-------------------------------------------------
     * UPDATE FUNCTION
     * MOD + ENTER function
     * -------------------------------------------------
    */
      const updateCode = async() =>{
        await generation()
        await rhythmPatternPlay()

        // modelPatternParser()
    }

    /**-------------------------------------------------
     * Line UPDATE FUNCTION
     * get current line number and text, update model dic to determin model is loaded or not
     * -------------------------------------------------
    */
     const updateLineData = (data) =>{
        // console.log(data.line.text)
        var regex = /^\/\//; //when start // which means coment out, 
        const commentout = data.line.text.match(regex)
        if(commentout !== null) return

        //judge model is loading or not
        for(const [idx,model] of modelAutoCompletionDic.entries()){
            var currentText = data.line.text
            var modelName = model.name
            const matches = currentText.match(modelName)


            //when there is no model() code found 
            if(matches === null) {
                model.genMode = false 
            }

            //when model() code found
            if(matches  !==  null ) {
              model.currentCompletion = true
              model.modelLineStart = data.line.number //update model position
              //   console.log(modelName + ' autocompletion on')
             setCurrentModelPara(modelParaDic[idx])
            }

            //TODO : need to think model range that can change model parameter, define model line start and end position
            //when deleted model, model loader will be false
            if(model.currentCompletion && model.modelLineStart === data.line.number && matches === null) {
                    model.currentCompletion = false
                    // console.log(modelName + ' autocompletion off')
            }


            //Write Model Parameter Update!!!!
            if(model.currentCompletion) {
                updatingModelPara(model,currentModelPara,data.line.text)
            }
        }  
    }


    function updatingModelPara(model,dic,line){
        if(dic === undefined) return
        for(const p of dic){
            var pattern = p['detail']
            var res = modelParaParser(pattern,line)
            // console.log(line)
            
            if(res !== undefined){
                p.value = res //Parameter Update
            }
        }


        //when model is loading, we search "gen()" to activated
        activateGenFunction(model,code)
        

     

        //model gen function is activated
       
        // console.log(currentModel[0])
        // console.log(line)
    }

    




 
    /**
     * Extract and Play rhythm pattern
     */
     async function rhythmPatternPlay(){
        rhythmParser(code).then((res)=>{
            drumPatternPlayer.current.clear()
            let sec = Tone.Time('2n').toTicks()
           for (let tmp of res){
               drumPatternPlayer.current.at(Tone.Time(tmp[0]).toTicks() / sec,tmp[1])
            //    console.log(Tone.Time(tmp[0]).toTicks() / sec)
           }
        })       
    }


    /**
     * Generation Method 
     */
    async function generation(){
        for(const [idx,model] of modelAutoCompletionDic.entries()){
            if(model.genMode){
                console.log("generating...")
                dataGeneration(model,modelParaDic[idx]).then((res)=>{
                    convertGenDataToRhythm(res)
                })
            } 
        }
   }

   function convertGenDataToRhythm(res){
        if(res !== undefined){
            drumPatternPlayer.current.clear()
            let sec = Tone.Time('128n').toTicks()
            for(const r of res[0].notes){
                drumPatternPlayer.current.at(r.quantizedStartStep / sec,r.pitch)
            }
        }
   }





   const setPlay = (time,note) =>{
    //volume setting of drum player 
    drumPlayer.player(note).start(time)    

}

   const start = async () =>{
    await drumPatternPlayer.current.start()
}


    const onMute = () =>{
        Tone.Transport.cancel()
//         Tone.Transport.stop()
    }


    /* Tone Time Function */

    function updateSequence(time){
    }

    const timeStart = async ()=>{
        await time.start()
   }

    
    //write some code for error handle
    // function errorHandle(){
    // }


  




  return (
    <Fragment>

    </Fragment>
  )
})

export default Control