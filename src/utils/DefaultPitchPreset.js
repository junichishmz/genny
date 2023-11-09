// import kick from '../asset/drum/kick/kick.wav'
// import snare from '../asset/drum/snare/snare.wav'
// import closehat from '../asset/drum/openhat/openhat.wav'
// import openhat from '../asset/drum/openhat/openhat.wav'
// import tom from '../asset/drum/openhat/openhat.wav'
// import clap from '../asset/drum/openhat/openhat.wav'
// import rim from '../asset/drum/openhat/openhat.wav'

import kick from '../asset/demo/kick_deep.wav';
import snare from '../asset/demo/snare.wav';
import closehat from '../asset/demo/closehat.wav';
import openhat from '../asset/demo/open.wav';
import tom from '../asset/demo/tom.wav';
import clap from '../asset/demo/clap.wav';
import rim from '../asset/demo/rim.wav';

export const defaultPitch = {
    35: kick,
    36: kick,
    37: kick,
    38: snare,
    39: clap,
    40: snare,
    41: tom,
    42: closehat,
    43: tom,
    44: openhat,
    45: tom,
    46: openhat,
    47: tom,
    48: tom,
    49: kick,
    50: tom,
    51: rim,
    52: rim,
    53: rim,
    54: openhat,
    55: openhat,
    59: rim,
};

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
