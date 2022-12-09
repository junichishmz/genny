/**
 * Library
 * Licence : MIT
 * react-codemirror : https://uiwjs.github.io/react-codemirror/
 */

import React,{useContext,useRef,Fragment,useState} from 'react'
import CodeMirror from "@uiw/react-codemirror";
import { sublime } from '@uiw/codemirror-theme-sublime';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';

import { ApiContext } from '../../contexts/ApiContext';

//Layout
import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';


//Code mirror
// import * as events from '@uiw/codemirror-extensions-events';
import { vscodeDark, vscodeDarkInit } from '@uiw/codemirror-theme-vscode';

import { createTheme, CreateThemeOptions  } from '@uiw/codemirror-themes';

import { tags as t } from '@lezer/highlight';
// import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
// import { defaultKeymap } from '@codemirror/commands';
import { keymap } from "@codemirror/view";
import Control from '../../core/Control';


//Auto Completion Function
// import { myCompletions } from '../../utils/AutoCompletion';


const myTheme = createTheme({
    theme: 'dark',
    settings: {
      background: '#ffffff',
      foreground: '#75baff',
      caret: '#5d00ff',
      selection: '#036dd626',
      selectionMatch: '#036dd626',
      lineHighlight: '#8a91991a',
      gutterBackground: '#fff',
      gutterForeground: '#8a919966',
    },
    styles: [
      { tag: t.comment, color: '#787b8099' },
      { tag: t.variableName, color: '#0080ff' },
      { tag: [t.string, t.special(t.brace)], color: '#5c6166'  },
      { tag: t.number, color: '#5c6166' },
      { tag: t.bool, color: '#5c6166' },
      { tag: t.null, color: '#5c6166' },
      { tag: t.keyword, color: '#5c6166' },
      { tag: t.operator, color: '#5c6166' },
      { tag: t.className, color: '#5c6166' },
      { tag: t.definition(t.typeName), color: '#5c6166' },
      { tag: t.typeName, color: '#5c6166' },
      { tag: t.angleBracket, color: '#5c6166' },
      { tag: t.tagName, color: '#5c6166' },
      { tag: t.attributeName, color: '#5c6166' },
    ],
  });


  
  const StyledGrid = styled(Grid)(() => ({
    position: 'absolute',
    zIndex: '0',
    transition: 'backgroundColor 1s',
  }));
  
  const FlashStyledGrid = styled(Grid)(() => ({
    backgroundColor:'rgba(255,255,255,0.4)',
    height: '80vh',
    position: 'relative',
    zIndex: '1',
   transitionDuration: '5s',
  }));




const CodeMirrorView = () => {

  const {code, setCode,modelAutoCompletionDic,modelParaDic,currentModelPara} = useContext(ApiContext)

  

  const [running,setRunning] = useState(false)
  const ref = useRef(null)
  const controlRef = useRef(null)



  const onChange = React.useCallback((value, viewUpdate) => {
    // viewUpdate.editable = false
    // console.log('value:', value);
    setCode(value)
    // console.log(viewUpdate)
  }, []);

//   const key_extention = events.dom({
//     keydown:(evn) =>{
//         if(evn.ctrlKey && evn.key === 'Enter') console.log(ref.current)
//         // console.log(ref.current.state.selection)
//     },

//   })



  //https://github.com/uiwjs/react-codemirror/issues/356
  const key_extention = [
    keymap.of([
      /**START Function */
      {
        key: "Mod-Enter",
        // preventDefault: true,
        run: () => {
            setRunning(true)
            controlRef.current.exec()            
            
            // console.log(modelParaDic)
            setInterval(function() {
                setRunning(false)
            }, 160);
            // console.log(code)
        }
      },
      /**For checking model loading or not */
      {
        key: "Enter",
        run: () =>{
          // console.log(modelAutoCompletionDic)
        }
      },
      /**PAUSE Function */
      {
        key: "Mod-Shift-Enter",
        // preventDefault: true,
        run: () => {
            setRunning(true)
            console.log('pause')
            controlRef.current.pause()
            setInterval(function() {
                setRunning(false)
            }, 160);
        //   alert("exec command");
        //   return true
        }
      },
    ])
  ];

function flashOverView(){
    if(running){
        return(
        <FlashStyledGrid/>
        )
    }
}

/**
 * Get current line number and data to send Control.js
 */
function getLineNumber(data){
  controlRef.current.update(data)
}


/**
 * Model Autoompletion 
 */
function modelCompletions(context) {

  let word = context.matchBefore(/\w*/)
  if (word.from === word.to && !context.explicit) return null

  return {
    from: word.from,
    options: modelAutoCompletionDic
  }
}



function modelParaCompletions(context){
  let word = context.matchBefore(/\w*/)
  if (word.from === word.to && !context.explicit) return null

  if(currentModelPara === undefined) return

  
  return {
    from: word.from,
    options:currentModelPara
  }
}


  return (

    <Fragment>
    <StyledGrid xs={12}>

        <CodeMirror
          ref={ref}
          value={code}
          theme={sublime}
          height="80vh"
          extensions={[javascript({ jsx: true }),key_extention,autocompletion({override: [modelCompletions,modelParaCompletions]})]}
          onChange={onChange} 
          editable={true}
          spellCheck={false}
          
          onStatistics={(data) => {
            getLineNumber(data);
          }}

          basicSetup={{
            autocompletion: false,
            defaultKeymap: false,
            highlightActiveLine: false //highlight option : https://github.com/uiwjs/react-codemirror/issues/424
          }}            
        />
        </StyledGrid>

        {flashOverView()}

        <Control 
        ref={controlRef}/>

        </Fragment>

  )
}

EditorView.contentAttributes.of({spellCheck: 'false'})

export default CodeMirrorView