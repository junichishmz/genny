import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

export async function midiParser(midiFile) {
    var data = [];
    const fetchData = async () => {
        const midi = await Midi.fromUrl(midiFile);
        midi.tracks.forEach(track => {
            const notes = track.notes;
            notes.forEach(note => {
                var m = {
                    midi: note.midi,
                    name: note.name,
                    time: note.time,
                    duration: note.duration,
                    ticks: note.ticks,
                };
                data.push(m);
            });
        });
    };
    await fetchData();
    return data;
}

/**
 * arg : midi parse input
 * retrun : sequence data for MusicVae
 */
export function seedSequence(pattern) {
    let sixteenthNoteTicks = Tone.Time('16n').toTicks();
    let data = {
        notes: pattern.map(([time, drum]) => ({
            pitch: pattern.get(drum),
            quantizedStartStep: Tone.Time(time).toTicks() / sixteenthNoteTicks,
            quantizedEndStep:
                Tone.Time(time).toTicks() / sixteenthNoteTicks + 1,
        })),
        totalQuantizedSteps: 32,
        quantizationInfo: { stepsPerQuarter: 4 },
    };

    return data;
}
