
//INITIAL CODE : PRESET 1
export const initialCode = `/**
 * EXAMPLE 1
 * Pattern Making Assist
 * MOD(CMD:Mac)+ENTER : START and UPDATE
 * MOD(CMD:Mac)+SHIFT+ENTRT : STOP
**/

//// model loader
//// you can access model parameter ".p"
//model(magenta_music_vae)
//.tempature(0.3)
//.gen()


//following pattern function to gen function so that ai model will generate the pattern

/**
* pattern() function will play the note
* drum patter, tone.js style
***/
pattern(
    ["0:0:0", 36],
    ["0:0:2", 36],
    ["0:1:0", 38],
    ["0:2:0", 36],
    ["0:2:2", 36],
    ["0:3:0", 38],
    ["1:0:0", 36],
    ["1:1:0", 38],
    ["1:2:0", 36],
    ["1:3:0", 38],
    ["1:3:1", 38],
    ["1:3:3", 38],
)



//generate example
//pattern.gen()

//particially generate example
//pattern.bd.gen()





`;


// PRESET 2
export const preset2Code = `// EXAMPLE 2
//Training feedback loop
//model definition
model{
    musicvae: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_2bar_humanize'
}.load()

//start coding
const music_vae = musicvae() //when finished loading, syntax will change

//drum patter, tone.js style
rhythm_pattern1 = (
    ["0:0:0", "bd"],
    ["0:1:0", "hh"],
    ["0:1:2", "bd"],
    ["0:2:0", "bd"],
    ["0:3:0", "hh"],
    ["1:0:0", "bd"],
    ["1:1:0", "hh"],
    ["1:2:0", "bd"],
    ["1:2:3", "bd"],
    ["1:3:0", "hh"],
    ["1:3:2", "bd"],
    ["1:3:2", "hh"]
)

//bd generate example
rhythm.bd.gen()

//some train method
gen.train()   
`;

//PRESET 3
export const preset3Code = `//EXAMPLE 3 
//Mutiple Model Generation (named Polymachine)

model{
    musicvae: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/groovae_2bar_humanize'
    rhtyhmrnn: https://***
    hmm: ***
    LLM: ***
}.load()

//start coding
const music_vae = musicvae() //when finished loading, syntax will change
const rhythm_rnn = rhythmrnn()

//drum patter, tone.js style
rhythm_pattern1 = (
    ["0:0:0", "bd"],
    ["0:1:0", "hh"],
    ["0:1:2", "bd"],
    ["0:2:0", "bd"],
    ["0:3:0", "hh"],
    ["1:0:0", "bd"],
    ["1:1:0", "hh"],
    ["1:2:0", "bd"],
    ["1:2:3", "bd"],
    ["1:3:0", "hh"],
    ["1:3:2", "bd"],
    ["1:3:2", "hh"]
)

//bd generate example
rhythm.bd.gen()

//some train method
gen.train()    
`;


//PRESET 4
export const preset4Code = `//EXAMPLE 4 
// Live Coding Function
room()
gain()
tempo()
`;

//PRESET 5
export const preset5Code = `//EXAMPLE 5 
// Live Coding with Latent Space Visualization
// write some visualization technique here
`;

//PRESET 6
export const preset6Code = `EXAMPLE 6
//More intuitive rhtyhm pattern sequence
//start coding
//const music_vae = musicvae() //when finished loading, syntax will change

pitch(
    bd : 36,
    hh : 46,
    sn : 51,
)

//Define the rhythm sequence as below 
pitch[36,35,45,51]

pitch[bd bd bd bd]
`


//Preset List
export const presetList = [initialCode,preset2Code,preset3Code]