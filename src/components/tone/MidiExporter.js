import { Midi } from '@tonejs/midi'


export  async function midiTrackExporter(midiFile){
      var data = []
      const fetchData = async () =>{
            const midi = await Midi.fromUrl(midiFile) 
            midi.tracks.forEach(track => {
                  const notes = track.notes
                  notes.forEach(note => {
                        var idx = getIndex(note)
                        var m ={
                              midi: note.midi,
                              name: note.name,
                              time: note.time,
                              duration: note.duration,
                              idx: idx,
                        }
                    data.push(m)
                })
            })
        }
        await fetchData()
        return data
}

function getIndex(note){
      var idx = 0
      for(const n of GridIndex){
          if(note.name === n.name){
              idx = n.idx
          }
      }
      return idx
}


const GridIndex = [
      {name: 'B5',idx: 0},
      {name: 'A#5',idx: 1},
      {name: 'A5',idx: 2},
      {name: 'G#5',idx: 3},
      {name: 'G5',idx: 4},
      {name: 'F#5',idx: 5},
      {name: 'F5',idx: 6},
      {name: 'E5',idx: 7},
      {name: 'D#5',idx: 8},
      {name: 'D5',idx: 9},
      {name: 'C#5',idx: 10},
      {name: 'C5',idx: 11},
  
      {name: 'B4',idx: 12},
      {name: 'A#4',idx: 13},
      {name: 'A4',idx: 14},
      {name: 'G#4',idx: 15},
      {name: 'G4',idx: 16},
      {name: 'F#4',idx: 17},
      {name: 'F4',idx: 18},
      {name: 'E4',idx: 19},
      {name: 'D#4',idx: 20},
      {name: 'D4',idx: 21},
      {name: 'C#4',idx: 22},
      {name: 'C4',idx: 23},

      {name: 'B3',idx: 24},
      {name: 'A#3',idx: 25},
      {name: 'A3',idx: 26},
      {name: 'G#3',idx: 27},
      {name: 'G3',idx: 28},
      {name: 'F#3',idx: 29},
      {name: 'F3',idx: 30},
      {name: 'E3',idx:  31},
      {name: 'D#3',idx: 32},
      {name: 'D3',idx: 33},
      {name: 'C#3',idx: 34},
      {name: 'C3',idx: 35},

      {name: 'B2',idx: 36},
      {name: 'A#2',idx: 37},
      {name: 'A2',idx: 38},
      {name: 'G#2',idx: 39},
      {name: 'G2',idx: 40},
      {name: 'F#2',idx: 41},
      {name: 'F2',idx: 42},
      {name: 'E2',idx: 43},
      {name: 'D#2',idx: 44},
      {name: 'D2',idx: 45},
      {name: 'C#2',idx: 46},
      {name: 'C2',idx: 47},
  ]