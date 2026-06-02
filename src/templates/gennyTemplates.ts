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
// "coastline" @by eddyflux
// @version 1.0
// Reference: https://strudel.cc/workshop/getting-started/

samples('github:eddyflux/crate')
setcps(.75)
let chords = chord("<Bbm9 Fm9>/4").dict('ireal')
stack(
  stack( // DRUMS
    s("bd").struct("<[x*<1 2> [~@3 x]] x>"),
    s("~ [rim, sd:<2 3>]").room("<0 .2>"),
    n("[0 <1 3>]*<2!3 4>").s("hh"),
    s("rd:<1!3 2>*2").mask("<0 0 1 1>/16").gain(.5)
  ).bank('crate')
  .mask("<[0 1] 1 1 1>/16".early(.5))
  , // CHORDS
  chords.offset(-1).voicing().s("gm_epiano1:1")
  .phaser(4).room(.5)
  , // MELODY
  n("<0!3 1*2>").set(chords).mode("root:g2")
  .voicing().s("gm_acoustic_bass"),
  chords.n("[0 <4 3 <2 5>>*2](<3 5>,8)")
  .anchor("D5").voicing()
  .segment(4).clip(rand.range(.4,.8))
  .room(.75).shape(.3).delay(.25)
  .fm(sine.range(3,8).slow(8))
  .lpf(sine.range(500,1000).slow(8)).lpq(5)
  .rarely(ply("2")).chunk(4, fast(2))
  .gain(perlin.range(.6, .9))
  .mask("<0 1 1 0>/16")
)
.late("[0 .01]*4").late("[0 .01]*2").size(4)
`

export const gennyTemplates: GennyTemplate[] = [
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
  {
    id: 'genny-rhythm-pattern',
    title: 'Genny Rhythm Pattern',
    description: 'Original Genny time-code rhythm notation.',
    code: gennyRhythmPatternTemplate,
  },
]

export const defaultCode = gennyTemplates[0].code
