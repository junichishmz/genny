# Sample Files Directory

This directory contains audio samples for Genny 2.0's sound banks.

## Directory Structure

```
samples/
├── RolandTR808/    # Classic 808 drum machine samples
│   ├── bd.wav      # Bass Drum
│   ├── sd.wav      # Snare Drum
│   ├── hh.wav      # Hi-Hat
│   ├── oh.wav      # Open Hi-Hat
│   ├── cp.wav      # Clap
│   ├── rim.wav     # Rimshot
│   ├── lt.wav      # Low Tom
│   ├── mt.wav      # Mid Tom
│   ├── ht.wav      # High Tom
│   ├── cym.wav     # Cymbal
│   └── cb.wav      # Cowbell
│
├── RolandTR909/    # Classic 909 drum machine samples
│   ├── bd.wav      # Bass Drum
│   ├── sd.wav      # Snare Drum
│   ├── hh.wav      # Hi-Hat
│   ├── oh.wav      # Open Hi-Hat
│   ├── cp.wav      # Clap
│   ├── rim.wav     # Rimshot
│   ├── lt.wav      # Low Tom
│   ├── mt.wav      # Mid Tom
│   ├── ht.wav      # High Tom
│   ├── crash.wav   # Crash Cymbal
│   └── ride.wav    # Ride Cymbal
│
└── piano/          # Piano samples (future)
    └── ...

```

## Adding Sample Files

To add actual sample files:

1. **Option 1: Use free samples**
   - Download from https://github.com/tidalcycles/Dirt-Samples
   - Or from Freesound.org (with appropriate licenses)

2. **Option 2: Generate samples**
   - Use a DAW to create drum sounds
   - Export as 44.1kHz, 16-bit WAV files

3. **File Requirements**
   - Format: WAV (preferred) or MP3
   - Sample Rate: 44.1kHz recommended
   - Bit Depth: 16-bit or 24-bit
   - Length: Keep short (< 2 seconds for drums)

## Placeholder Files

Currently, these directories contain placeholder entries. 
You'll need to add actual WAV files for the samples to work.

## Testing Samples

Once you've added sample files, test them with:

```javascript
// Test 808 samples
s("bd sd hh sd").bank('808').play()

// Test 909 samples  
s("bd ~ sd ~").bank('909').play()
```

## License

Make sure any samples you add are either:
- Created by you
- Public domain
- Licensed for use (CC0, CC-BY, etc.)