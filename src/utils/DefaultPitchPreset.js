import kick from '../asset/drum/kick/kick.wav'
import snare from '../asset/drum/snare/snare.wav'
import openhat from '../asset/drum/openhat/openhat.wav'

export const defaultPitch = {
    35: kick,
    36: kick,
    37: kick,
    38: snare,
    40: openhat,
    42: snare,
    43: snare,
    44: openhat,
    45: openhat,
    46: openhat,
    47: kick,
    48: kick,
    49: kick,
    50: snare,
    51: openhat,
    52: snare,
    53: snare,
    54: openhat,
    55: openhat,
}


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