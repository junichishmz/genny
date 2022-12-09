import React,{useContext} from 'react'
// import AppBar from '@mui/material/AppBar';
// import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
// import PlayManger from '../tone/PlayManger';
// import Magenta from '../api/Magenta';

//context
import { ApiContext } from '../../contexts/ApiContext';

import {presetList} from '../../utils/Presets'


export default function Header() {

  const {setCode} = useContext(ApiContext)



  const onShuffle = () =>{
    var idx = Math.floor( Math.random() * 3);
    setCode(presetList[idx])
  }



  return (

        <Toolbar style={{
          backgroundColor: '#434e62',
          height: '40px',
        }}>
          <h2 className="title">Live Coding with Generative Model</h2>

          {/* <Magenta/> */}

          <button className="button-30" onClick={()=>onShuffle()} style={{
            marginLeft: '50px',
          }}>SAMPLE</button>

          
          {/* <div className='play-pause-button'>
          <PlayManger/>
          </div> */}
          
        </Toolbar>
   
  );
}
