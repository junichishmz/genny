# Sample Banks Documentation

## Overview

Genny 2.0 includes a comprehensive sample library based on the Dirt-Samples collection, providing hundreds of high-quality samples for live coding. The system supports Strudel-compatible sample management with lazy loading, bank switching, and sample selection.

## Available Sample Banks

### Classic Drum Machines

#### Roland TR-808
- **Bank names**: `808`, `tr808`, `TR808`, `RolandTR808`
- **Sounds available**: bd, sd, hh, oh, cp, rim, lt, mt, ht, cym, cb, ma, rs
- **Usage**: `s("bd sd hh sd").bank("808")`
- **Variants**: Multiple velocity layers and tuning variations

#### Roland TR-909  
- **Bank names**: `909`, `tr909`, `TR909`, `RolandTR909`
- **Sounds available**: bd, sd, hh, oh, cp, rim, lt, mt, ht, crash, ride
- **Usage**: `s("bd sd hh sd").bank("909")`

#### Roland DR-55
- **Bank names**: `dr55`, `DR55`
- **Sounds available**: kick, hihat, rimshot, snare
- **Usage**: `s("bd ~ sn ~").bank("dr55")`

#### Roland DR-110/DR-2
- **Bank names**: `dr2`, `DR2`, `dr110`
- **Sounds available**: CHT, CLP, CYM, KIK, OHT, SNR
- **Usage**: `s("bd ~ sn ~").bank("dr2")`

#### DrumTraks
- **Bank names**: `drumtraks`, `DrumTraks`, `dt`
- **Sounds available**: Cabasa, Claps, Cowbell, Crash, Hat Closed, Hat Open, Kick, Ride, Rimshot, Snare, Tambourine, Tom1, Tom2
- **Usage**: `s("bd ~ sn ~").bank("drumtraks")`

### Electronic & Breakbeat Collections

#### Elektron-style
- **Bank names**: `electro1`, `electro`
- **Sounds**: closedhh, crash, hit1, hit2, hit3, kick1, kick2, openhh, perc1, perc2, ride, snare1, snare2
- **Usage**: `s("bd ~ sn ~").bank("electro")`

#### Bass2/Hardcore Bass
- **Bank names**: `bass2`
- **Sounds**: hardcore-bass-1 through hardcore-bass-5
- **Usage**: `s("bass2:0 ~ bass2:1 ~").gain(0.8)` (use colon notation for variants)

#### Auto/Breaks
- **Bank names**: `auto`
- **Sounds**: break-kick, break-ride, break-sd, cymrev, kick, kick-ambient, sd, sd-ambient, shake1, shake2, shake3
- **Usage**: `s("bd ~ sn ~").bank("auto")`

### Acoustic Drum Kits

#### Gretsch Kit
- **Bank names**: `gretsch`
- **Sounds**: brushhitom, brushlotom, brushsnare, brushsnareghost, closedhat, closedhathard, cowbell, cymbalgrab, cymbalrub, flam, foothat, foothat2, hitom, kick, kicksnare, lotom, openclosedhat, openhat, ridebell, ridecymbal, snare, snareghost, snarehard, snareslack
- **Usage**: `s("bd ~ sn ~").bank("gretsch")`

#### Feel Kit
- **Bank names**: `feel`
- **Sounds**: BD 04 d, HH 003b, hihat029a, Sd 139, Sd 180, Sd 223, sub
- **Usage**: `s("bd ~ sn ~").bank("feel")`

#### DB/DBS12 Kit
- **Bank names**: `db`, `dbs12`
- **Sounds**: closedhh, crash, hit1, hit2, hit3, kick1, kick2, openhh, perc1, perc2, ride, snare1, snare2
- **Usage**: `s("bd ~ sn ~").bank("db")`

#### AB/AB2 Kit
- **Bank names**: `ab`, `ab2`
- **Sounds**: closedhh, crash, hit1, hit2, kick1, kick2, openhh, perc1, perc2, ride, snare1, snare2
- **Usage**: `s("bd ~ sn ~").bank("ab")`

### Breakbeat Collections

#### Amen Break (152 BPM)
- **Bank names**: `breaks152`, `amen`
- **Usage**: `s("~ ~ ~ ~").bank("amen")` (full break)

#### Various Breaks
- **Bank names**: `breaks125`, `breaks157`, `breaks165`
- **Usage**: `s("~ ~ ~ ~").bank("breaks125")`

### Generic Collections

#### Drum Kit
- **Bank names**: `drum`, `drums`, `kit`
- **Usage**: `s("bd ~ sn ~").bank("drums")`

## Individual Sound Categories

### Basic Drum Sounds (No Bank Required)
- **bd** (bass drum/kick) - 24 variants
- **sn/sd** (snare drum) - Multiple variants
- **hh** (closed hi-hat) - Multiple variants  
- **oh** (open hi-hat)
- **cp** (clap) - Multiple variants
- **cr** (crash) - Multiple variants
- **cb** (cowbell)
- **cc** (crash cymbal)

### Melodic & Tonal Sounds
- **arp** (arpeggios) - 2 variants
- **arpy** (arpeggio sequences) - 11 variants
- **bass** (bass sounds) - 4 variants + bass0, bass1, bass2, bass3 collections
- **piano** (synthesized piano)
- **sine**, **square**, **sawtooth**, **triangle** (oscillator synths)

### Percussion & Effects
- **bleep** (electronic bleeps) - 13 variants
- **blip** (short electronic sounds) - 2 variants  
- **click** (click sounds) - 4 variants
- **crow** (crow/bird sounds) - 4 variants
- **glitch** (glitch sounds) - 8 variants
- **noise** (white noise generator)
- **bubble** (bubble sounds) - 8 variants
- **bottle** (bottle percussion) - 13 variants
- **can** (can sounds) - 14 variants

### Vocal & Speech
- **alphabet** (A-Z letter sounds) - 26 variants
- **blue** (vocal samples) - 2 variants

### Instrumental
- **cbow** (cello bowed) - 18 variants with different pitches
- **cpluck** (cello plucked) - 15 variants
- **flbass** (fretless bass) - Multiple variants
- **gtr** (guitar) - Clean, overdrive, distorted

## Sample Selection

### Using n() Method
```javascript
// Select specific sample variants
s("hh*8").n("0 1 2 3")           // Cycle through first 4 variants
s("bd").n("2")                   // Use 3rd variant (0-indexed)
s("arp ~ arp ~").n("1 0 1 0")    // Alternate between variants
```

### Using Colon Notation
```javascript
// Direct sample selection in pattern
s("hh:0 hh:1 hh:2 hh:3")         // Same as n() but inline
s("bd:2 ~ sn:1 ~")               // Mix different variants
s("arp:0 ~ arp:1 ~ arp:0 ~")     // Specific arp variants
```

### Sample Index Wrapping
If you specify an index higher than available samples, it wraps around:
```javascript
s("hh").n("0 1 2 3 4 5 6 7")     // If hh has 4 samples, 4-7 repeat 0-3
```

## AI-Generated Patterns with Sample Banks

### Using AI with Different Drum Banks

```javascript
// Generate AI patterns with different drum banks
m = model("magenta_music_vae")
m.temperature(0.9).gen()
note(m).s("808")     // AI generates MIDI, plays as 808 drums

m1 = model("magenta_music_vae") 
m1.temperature(0.5).gen()
note(m1).s("909")    // Same AI model, different drum bank

m2 = model("magenta_music_vae")
m2.temperature(1.2).gen()  
note(m2).s("gretsch")  // Acoustic drums with AI patterns

// Multiple AI patterns simultaneously
m3 = model("magenta_music_vae")
m3.temperature(0.7).gen()
note(m3).s("electro1").gain(0.8)

m4 = model("magenta_music_vae")  
m4.temperature(1.1).gen()
note(m4).s("drumtraks").room(0.3)
```

**How It Works:**
When you call `.gen()`, the model instance immediately gets a placeholder pattern so `note(m).s("808")` works right away. The actual AI-generated pattern replaces this placeholder once generation completes (usually within a second).

### How AI-to-Drums Conversion Works

When you use `note(ai_model).s("bank_name")`, the system:

1. **Detects Bank**: Recognizes that the sound name is actually a sample bank
2. **Converts MIDI**: Transforms the AI-generated MIDI pattern to drum mini-notation using standard GM drum mapping:
   - MIDI 36 (C1) → bd (bass drum)
   - MIDI 38 (D1) → sn (snare)
   - MIDI 42 (F#1) → hh (closed hi-hat)
   - MIDI 46 (A#1) → oh (open hi-hat)
   - And many more...
3. **Applies Bank**: Uses the specified sample bank for all drum sounds
4. **Preserves Effects**: Transfers any effects like `.room()`, `.gain()`, etc.

### Traditional Melodic AI (Still Works)

```javascript
// Traditional melodic generation continues to work
m = model("magenta_music_vae")
m.temperature(0.9).gen()
note(m).s("piano")   // Plays as melodic piano
note(m).s("synth")   // Plays as synthesizer
note(m).s("sine")    // Plays as sine wave
```

## Usage Examples

### Basic Patterns
```javascript
// Simple drum pattern
s("bd ~ sn ~")

// With repetition
s("bd*2 ~ sn ~ bd ~ sn*2 ~")

// With rests and groups
s("bd ~ [sn cp] ~")
```

### Bank Switching
```javascript
// Classic 808 sound
s("bd sd hh sd").bank("808")

// Switch to 909
s("bd sd hh sd").bank("909")

// Electronic style
s("bd ~ sn ~").bank("electro1")

// Acoustic kit
s("bd ~ sn ~").bank("gretsch")
```

### Advanced Sample Selection
```javascript
// Cycle through hi-hat variants
s("hh*16").n("0 1 2 3").gain(0.3)

// Mix different bass variants
s("bass:0 ~ bass:2 bass:1").gain(0.8)

// Complex pattern with sample selection
s("bd:0 bd:1 sn:2 bd:0").bank("808").n("0 1 0 1")
```

### Volume & Effects
```javascript
// Volume control
s("hh*8").gain(0.5)

// Speed control  
s("bd sn").speed(1.2)

// Stereo panning
s("hh*8").pan("-1 0 1 0")

// Room reverb
s("sn ~ sn ~").room(0.5)

// Delay
s("bd ~ ~ ~").delay(0.3)
```

### Loading Custom Samples
```javascript
// Load from URL
samples('https://example.com/my-samples.json')

// Load from GitHub
samples('github:username/sample-repo')

// Load from object
samples({
  'my_kick': 'kick.wav',
  'my_snare': ['snare1.wav', 'snare2.wav', 'snare3.wav']
}, 'https://example.com/samples/')
```

## Sound Discovery

### List Available Samples
```javascript
// Get all available sample names
listSamples()

// Get samples by category
getSamplesByCategory('bass')  // Returns bass, bass0, bass1, bass2, bass3

// Check if sample exists
hasSample('bd')              // Returns true

// Get sample count
getSampleCount('arp')        // Returns 2
```

### Explore Banks
```javascript
// List all available banks
// This would show: 808, 909, dr55, dr2, drumtraks, electro1, etc.
```

## Performance Tips

1. **Lazy Loading**: Samples are only loaded when first played, so initial pattern creation is fast
2. **Caching**: Once loaded, samples are cached for subsequent use
3. **Variants**: Use sample variants (`n()` or `:`) to add variety without extra loading
4. **Banks**: Bank switching is instant as it's just prefix mapping

## Troubleshooting

### Common Issues
- **Sample not found**: Check spelling and ensure sample exists with `hasSample()`
- **No sound**: Verify audio context is initialized and volume levels
- **Loading errors**: Check network connection for remote sample loading

### Error Messages
- `Sound not found: <name>` - Sample doesn't exist in library
- `Failed to load audio file` - Network or file format issue
- `AudioContext not initialized` - Audio system not ready

## Technical Details

- **Format Support**: WAV, MP3, OGG
- **Sample Rate**: Adaptive (matches AudioContext)
- **Channels**: Mono and stereo supported
- **Loading**: Lazy loading with fetch API
- **Caching**: In-memory AudioBuffer cache
- **Bank System**: String prefix mapping with aliases