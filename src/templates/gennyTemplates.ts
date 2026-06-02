export type GennyTemplate = {
  id: string
  title: string
  description: string
  code: string
}

export const gennyRhythmPatternTemplate = `/**
* MOD(CMD:Mac)+ENTER : START and UPDATE
* MOD(CMD:Mac)+SHIFT+ENTER : STOP
**/

// Genny Rhythm Pattern
// Original Genny rhythm uses time-code events:
// ["bar:beat:sixteenth", midiNote]
// 36 = kick, 38 = snare, 42 = closed hat

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

pattern2(
    ["0:0:2", 42],
    ["0:1:2", 42],
    ["0:2:2", 42],
    ["0:3:2", 42],
    ["1:0:2", 42],
    ["1:1:2", 42],
    ["1:2:2", 42],
    ["1:3:2", 42],
).play()

pattern3(
    ["0:1:2", 38],
    ["0:3:2", 38],
    ["1:1:2", 38],
    ["1:3:2", 38],
).play()
`

export const strudelRhythmNotationTemplate = `// Strudel Rhythm Notation
// This is the basic genny-strudel rhythm style.
// Words such as bd, sn, and hh are sample names.
// Spaces move through the pattern, and ~ is a rest.
// .bank("808") selects the sample bank, and .gain(...) changes volume.

s("bd ~ sn ~ bd bd sn ~").bank("808")
s("~ hh ~ hh ~ hh hh ~").bank("808").gain(0.35)
s("cp ~ cp ~").bank("808").gain(0.25)
`

export const gennyModelBridgeTemplate = `// Genny Model Bridge
// Select a Genny model, then use a Strudel rhythm as the generation seed.
// output() writes the generated rhythm back as mini-notation.

model(magenta_music_vae)

s("bd ~ sn ~ bd bd sn ~")
    .bank("808")
    .temperature(0.4)
    .gen()
    .output()

// Try changing the rhythm seed or temperature, then run again.
`

export const strudelRuntimeTemplate = `// Strudel Runtime Example
// Advanced Strudel code is evaluated by @strudel/transpiler + @strudel/webaudio.

samples('github:tidalcycles/dirt-samples')
setcps(0.75)

stack(
    stack(
        s("bd").struct("<[x*<1 2> [~@3 x]] x>"),
        s("~ [rim, sd:<2 3>]").room("<0 .2>"),
        n("[0 <1 3>]*<2!3 4>").s("hh"),
        s("cp ~").mask("<0 1 1 0>/16").gain(0.5)
    ).bank("808"),
    chord("<Am7 Dm7 G7 Cmaj7>").dict("ireal").voicing().s("gm_epiano1").gain(0.45),
    n("0 2 4 7").scale("A:minor").s("gm_acoustic_bass").gain(0.55)
)
`

export const gennyTemplates: GennyTemplate[] = [
  {
    id: 'genny-rhythm-pattern',
    title: 'Genny Rhythm Pattern',
    description: 'Original Genny time-code rhythm notation.',
    code: gennyRhythmPatternTemplate,
  },
  {
    id: 'strudel-rhythm-notation',
    title: 'Strudel Rhythm Notation',
    description: 'Simple mini-notation rhythm with banks and gain.',
    code: strudelRhythmNotationTemplate,
  },
  {
    id: 'genny-model-bridge',
    title: 'Genny Model Bridge',
    description: 'Generate from a Strudel rhythm seed with a Genny model.',
    code: gennyModelBridgeTemplate,
  },
  {
    id: 'strudel-runtime-example',
    title: 'Strudel Runtime Example',
    description: 'Run advanced Strudel code through the Strudel transpiler/runtime.',
    code: strudelRuntimeTemplate,
  },
]

export const defaultCode = gennyTemplates[0].code
