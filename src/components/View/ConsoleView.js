import React,{useState} from 'react'

const ConsoleView = () => {
    const [log,setLog] = useState('output log ')




  return (
    <div>
    <p>console :</p>
    <p>{log}</p>
    
    </div>
  )
}

export default ConsoleView