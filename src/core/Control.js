import React, {
    Fragment,
    forwardRef,
    useImperativeHandle,
    useEffect,
    useState,
    useContext,
    useRef,
} from 'react';
import * as Tone from 'tone';

import { defaultPitch } from '../utils/DefaultPitchPreset';
//context
import { ApiContext } from '../contexts/ApiContext';

//Code Parser Function
import {
    rhythmParser,
    modelParaParser,
    activateGenFunction,
    extractModelFunctionParser,
    noteToToneRhythm,
    updateCodeEditor,
} from './CodeParser';

//Model Generation Method
import { dataGeneration, cosineDistance } from './Model';

const Control = forwardRef((props, ref) => {
    const [allPattern, setAllPattern] = useState([]);

    const {
        code,
        setCode,
        modelAutoCompletionDic,
        modelParaDic,
        currentModelPara,
        setCurrentModelPara,
        setLog,
        setSimilarityDis,
    } = useContext(ApiContext);

    const [started, setStarted] = useState(false);

    const [dataArray, setDataArray] = useState([]);



    const drumPlayer = new Tone.Players(defaultPitch).toDestination();
    drumPlayer.volume.value = -5; //TODO : need to make async function though

    const modelPlayer = new Tone.Players(defaultPitch).toDestination();
    modelPlayer.volume.value = -5; //TODO : need to make async function though

    //Sequence data
    const timeManger = useRef(null);

    const drumPatternPlayer = useRef(null);
    const modelPatternPlayer = useRef(null);

    useEffect(() => {
        if (dataArray.length === 2) {
            cosineDistance(dataArray).then(res => {
                var dic = Math.abs(res);
                setSimilarityDis(dic);
            });
        }

        if (dataArray.length === 3) {
            const data = dataArray.filter((dataArray, index) => index !== 0);
            setDataArray(data);
        }
    }, [dataArray]);

    /** Initial Parser form preset  */
    useEffect(() => {
        //drum player Initialize
        drumPatternPlayer.current = new Tone.Part((time, note) =>{
            setPlay(time, note)
        });
        drumPatternPlayer.current.loop = true;
        drumPatternPlayer.current.loopStart = 0;
        drumPatternPlayer.current.loopEnd = '2m';

        modelPatternPlayer.current = new Tone.Part((time, note) =>
            setPlayModel(time, note)
        );
        modelPatternPlayer.current.loop = true;
        modelPatternPlayer.current.loopStart = 0;
        modelPatternPlayer.current.loopEnd = '2m';
    }, []);

    useImperativeHandle(ref, () => {
        return {
            exec: () => {
                if (!started) {
                    onStart(); //call onece
                    setStarted(true);
                    setLog('start');
                } else {
                    updateCode();
                    setLog('update');
                }
            },
            pause: () => {
                if (!started) return;
                onMute();
                setLog('stop');
            },
            update: line => {
                updateLineData(line);
            },
        };
    });

    /**-------------------------------------------------
     * START FUNCTION
     *  call only once when you start playing
     * -------------------------------------------------
     */
    const onStart = async () => {
        await Tone.start();
        Tone.Transport.cancel();
        Tone.Transport.start();
        Tone.Transport.bpm.value = 120;
        start();
        // timeStart()
    };

    /**-------------------------------------------------
     * UPDATE FUNCTION
     * MOD + ENTER function
     * -------------------------------------------------
     */
    const updateCode = async () => {
        drumPatternPlayer.current.clear();
        await rhythmPatternPlay();
        
        modelPatternPlayer.current.clear();
        await generation();
        // await timeStart()

        // modelPatternParser()
    };

    /**-------------------------------------------------
     * Line UPDATE FUNCTION
     * get current line number and text, update model,parameter dic
     * -------------------------------------------------
     */
    const updateLineData = data => {
        // console.log(data.line.text)
        var regex = /^\/\//; //when start // which means coment out,
        const commentout = data.line.text.match(regex);
        if (commentout !== null) return;

        //judge model is loading or not
        for (const [idx, model] of modelAutoCompletionDic.entries()) {
            var currentText = data.line.text;
            var modelName = model.name;
            const matches = currentText.match(modelName);

            //when there is no model() code found
            if (matches === null) model.genMode = false;
            

            //when model() code found
            if (matches !== null) {
                model.currentCompletion = true;
                model.modelLineStart = data.line.number; //update model position
                //   console.log(modelName + ' autocompletion on')
                setCurrentModelPara(modelParaDic[idx]);
            }

            //TODO : need to think model range that can change model parameter, define model line start and end position
            //when deleted model, model loader will be false
            if (
                model.currentCompletion &&
                model.modelLineStart === data.line.number &&
                matches === null
            ) {
                model.currentCompletion = false;
                // console.log(modelName + ' autocompletion off')
            }

            //Write Model Parameter Update!!!!
            if (model.currentCompletion) updatingModelPara(model, currentModelPara, data.line.text);
            

            //when model is loading, we search "gen()" to activated
            activateGenFunction(model, code);
        }
    };

    function updatingModelPara(model, dic, line) {
        if (dic === undefined) return;
        for (const p of dic) {
            var pattern = p['detail'];
            var res = modelParaParser(pattern, line);
            // console.log(line)

            if (res !== undefined) {
                p.value = res; //Parameter Update
            }
        }
    }

    /**
     *------------------------------- Rhythm Representation Converter Method ------------------
     */
    // TODO : Thease input converter code might implement each model core part, note Control.js.
    /**
     * Extract and Play rhythm pattern
     */
    async function rhythmPatternPlay() {
        rhythmParser(code).then(res => {
            if (res.length === 0) return;

            convertRhythmToNoteSequence(res);
            
            for (var pattern of res) {
                if (pattern.play === true) { //determin defined pattern has play() or not
                    // setPlayingRyhthmPattern(pattern.data);
                    for (let tmp of pattern.data) {
                        drumPatternPlayer.current.add(tmp[0], tmp[1]);
                    }
                }
            }
        });
    }

    /** Setting rhythm pattern */
    // function setPlayingRyhthmPattern(res) {
    //     for (let tmp of res) {
    //         drumPatternPlayer.current.add(tmp[0], tmp[1]);
    //     }
    // }

    /** Convert Rhythm Pattern to NoteSequence for magenta manner*/
    function convertRhythmToNoteSequence(patterns) {
        var sixteenthNoteTicks = Tone.Time('16n').toTicks();
        for (var p of patterns) {
            var noteSequence = {};
            var note_array = [];
            for (var d of p.data) {
                var n_dic = {};
                n_dic.pitch = d[1];
                n_dic.quantizedStartStep =
                    Tone.Time(d[0]).toTicks() / sixteenthNoteTicks;
                n_dic.quantizedEndStep =
                    Tone.Time(d[0]).toTicks() / sixteenthNoteTicks + 1;
                n_dic.isDrum = true;
                note_array.push(n_dic);
            }
            noteSequence['notes'] = note_array;
            noteSequence['totalQuantizedSteps'] = 32; //ToDo : currently fixing 2 measure = 32 subdivision
            noteSequence['quantizationInfo'] = { stepsPerQuarter: 4 };
            p['noteSequence'] = noteSequence;
        }
        //update
        setAllPattern(patterns);
    }

    /**
     *------------------------------- Generation Method ------------------
     */
    async function generation() {
        for (const [idx, model] of modelAutoCompletionDic.entries()) {
            //When model code is defining "gen() function, it will called here"
            if (model.genMode) {
                setLog('generating...');

                //Extract following model function
                var modelFuncDic = await extractModelFunctionParser(
                    model,
                    code
                );
                let outputData;

                dataGeneration(
                    model,
                    modelParaDic[idx],
                    modelFuncDic,
                    allPattern
                ).then(res => {
                    setDataArray([...dataArray, res]);
                    outputData = updateGenDataToRhythm(res);

                    var newcode = updateCodeEditor(
                        model,
                        code,
                        outputData
                    );
                    setCode(newcode);
                });
            }
        }
    }

    function updateGenDataToRhythm(res) {
        if (res !== undefined) {
            // drumPatternPlayer.current.clear()
            var note_log = [];

            // Get model generation result and update the rhythm
            var secondsPerBeat = 60 / Tone.Transport.bpm.value;
            var subdivision = 4;
            var secondsPerSubdivision = secondsPerBeat / subdivision;

            var gen_dic = [];

            for (const r of res[0].notes) {
                var dic = {};
                modelPatternPlayer.current.add(
                    r.quantizedStartStep * secondsPerSubdivision,
                    r.pitch
                );
                note_log.push(
                    'time: ' +
                        r.quantizedStartStep * secondsPerSubdivision +
                        ', note : ' +
                        r.pitch
                );
                note_log.push(' | ');

                dic.time = r.quantizedStartStep * secondsPerSubdivision;
                dic.pitch = r.pitch;
                gen_dic.push(dic);
            }
            var res_array = noteToToneRhythm(gen_dic);
            setLog('generated');
            setLog(note_log);

            return res_array;
        }
    }

    /**
     *------------------------- Tone.js Player -------------------------
     */

    //TODO : Fix the problem : Uncaught Error: Start time must be strictly greater than previous start time
    const setPlay = (time, note) => {
        // console.log(note)
        try {
            drumPlayer.player(note).start(time);
        } catch (error) {}
    };

    const setPlayModel = (time, note) => {
        try {
            modelPlayer.player(note).start(time);
        } catch (error) {}
    };

    const start = async () => {
        await drumPatternPlayer.current.start();
        await modelPatternPlayer.current.start();
    };

    //ToDO chaneged the never stopping for time manager
    const onMute = () => {
        // drumPatternPlayer.current.clear()
        Tone.Transport.cancel();
    };



    return <Fragment></Fragment>;
});

export default Control;
