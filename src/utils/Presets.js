//PRESET 4
export const initialCode = `// 1. Ryhthm Pattern
//pattern function is mainly using for exploring pattern not using model
// pattern definition is following tone.js style
// you need to add "play()" to play the sequence


//kick
pattern1(
    ["0:0:0", 36],
    ["0:1:0", 36],
    ["0:2:0", 36],
    ["0:3:0", 36],
    ["1:0:0", 36],
    ["1:1:0", 36],
    ["1:2:0", 36],
    ["1:3:0", 36],
).play()

//close hihat
pattern2(
    ["0:0:2", 42],
    ["0:1:2", 42],
    ["0:2:2", 42],
    ["0:3:2", 42],
    ["1:0:2", 42],
    ["1:1:2", 42],
    ["1:2:2", 42],
    ["1:3:2", 42],
)

//open hihat
pattern3(
    ["0:3:3", 46],
    ["1:3:3", 46],
)

//snare
pattern4(
    ["0:1:2", 38],
    ["0:3:2", 38],
    ["1:1:2", 38],
    ["1:3:2", 38],
)


`;




//VAE sample demo
export const templateCode2 = `// 2 : Sample code using VAE(MusicVAE) model
// you can access model parameter ".p"

model(magenta_music_vae)
.temperature(0.3)
.gen()
.output()

pattern1(
    ["0:0:0", 36],
    ["0:1:0", 36],
    ["0:2:0", 36],
    ["0:3:0", 36],
    ["1:0:0", 36],
    ["1:1:0", 36],
    ["1:2:0", 36],
    ["1:3:0", 36],
).play()
`;


//VAE sample demo
export const templateCode3 = `// 3 : Sample code using RNN(MusicRNN) model

pattern1(
    ["0:1:3", 46],
    ["0:3:3", 46],
).play()

model(magenta_rnn)
.input(pattern1)
.temperature(1.0)
.steps(4)
.gen()
.output()



`;




//----------------------------------------


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
    rhtyhmrnn: 'https://'
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
export const preset4Code = `//EXAMPLE 2
// pattern function is mainly using for exploring pattern not using model
// pattern definition is following tone.js style
// you need to add "play()" to play the sequence


//kick
pattern1(
    ["0:0:0", 36],
    ["0:1:0", 36],
    ["0:2:0", 36],
    ["0:3:0", 36],
    ["1:0:0", 36],
    ["1:1:0", 36],
    ["1:2:0", 36],
    ["1:3:0", 36],
).play()

//close hihat
pattern2(
    ["0:0:2", 42],
    ["0:1:2", 42],
    ["0:2:2", 42],
    ["0:3:2", 42],
    ["1:0:2", 42],
    ["1:1:2", 42],
    ["1:2:2", 42],
    ["1:3:2", 42],
)

//open hihat
pattern3(
    ["0:3:3", 46],
    ["1:3:3", 46],
)

//snare
pattern4(
    ["0:1:2", 38],
    ["0:3:2", 38],
    ["1:1:2", 38],
    ["1:3:2", 38],
)


`;

//PRESET 5
export const preset5Code = `//EXAMPLE 3
// Live Coding with Latent Space Visualization
// write some visualization technique here
`;

//PRESET 6
export const preset6Code = `//EXAMPLE 6
//More intuitive rhtyhm pattern sequence and particially generation example
//start coding

pitch(
    bd : 36,
    hh : 46,
    sn : 51,
)

//Define the rhythm sequence as below 
pitch[36,35,45,51]

pitch[bd bd bd bd]
`;

//Preset List
export const presetList = [initialCode, templateCode2,templateCode3];

//2 : pattern function is mainly using for exploring pattern not using model
// pattern definition is following tone.js style
// you need to add "play()" to play the sequence
// MIDI Note Number	Drum Type	GM Type
// 36	Kick	Acoustic Bass Drum
// 35	Kick	Bass Drum
// 38	Snare	Acoustic Snare
// 40	Snare	Electric Snare
// 42	Hi-hat closed	Closed Hihat
// 44	Hi-hat open	Pedal Hihat
// 46	Hi-hat open	Open Hihat
// 41	Tom low	Low floor Tom
// 45	Tom low	Low Tom
// 47	Tom mid	Low-mid Tom
// 48	Tom mid	High-mid Tom
// 43	Tom high	High Floor Tom
// 50	Tom high	High Tom
// 39	Clap	hand clap
// 51	Rim	Ride Symbal 1
// 52	Rim	Chinese Symbal
// 53	Rim	Ride Bell
// 59	Rim	Ride Symbal 2

/*
//kick
pattern1(
    ["0:0:0", 36],
    ["0:1:0", 36],
    ["0:2:0", 36],
    ["0:3:0", 36],
    ["1:0:0", 36],
    ["1:1:0", 36],
    ["1:2:0", 36],
    ["1:3:0", 36],
).

//close hihat
pattern2(
    ["0:0:2", 42],
    ["0:1:2", 42],
    ["0:2:2", 42],
    ["0:3:2", 42],
    ["1:0:2", 42],
    ["1:1:2", 42],
    ["1:2:2", 42],
    ["1:3:2", 42],
)

//open hihat
pattern3(
    ["0:3:3", 46],
    ["1:3:3", 46],
)

//snare
pattern4(
    ["0:1:2", 38],
    ["0:3:2", 38],
    ["1:1:2", 38],
    ["1:3:2", 38],
)
*/

//3 : following code is method for generate data from model input
// input() function seed the model to input
// you can input pattern sequence directly and indireclyt as using "pattern" function. e.g) input(pattern)
// output() function show the result
/*
model(magenta_music_vae)
.temperature(0.3)
.gen()
.input(pattern1)
.output()

pattern1(
    ["0:0:0", 36],
    ["0:0:2", 36],
    ["0:1:0", 38],
)
*/

//4 :Interpolation method
// pattern function can also numbering so that we can interpolate different pattern
/*
model(magenta_music_vae)
.temperature(0.3)
.gen()
.interpolate(pattern1, pattern2)

.pattern1(
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

.pattern2(
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
*/
