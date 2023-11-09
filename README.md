# Genny

This repostiroy for the paper [Genny: Designing and Exploring a Live Coding Interface for Generative Models](https://zenodo.org/records/7843500#.ZEAACuzP0-Q) authored by Junichi Shimizu and Rebecca Fiebrink. This paper was presented at the 7th International Conference on Live Coding (ICLC2023) in Utrecht.

## Video 
[Link to Video](https://vimeo.com/781969647/824b802a67)


## Dependencies

### Code Editor / Visual

-   [react-codemirror](https://github.com/uiwjs/react-codemirror)
-   [glsl-canvas](https://github.com/actarian/glsl-canvas) : might not use
-   babel-plugin-glsl
-   three.js
-   react-three/drei
-   react-three/fiber
-   Dropfile
-   [Material UI](https://mui.com/)
-   Parser : [@lezer/highlight](https://github.com/lezer-parser/highlight)
-   Config : [js-yaml](https://www.npmjs.com/package/js-yaml)

### Sound MIDI Control

-   tone.js
-   tone.js/midi

### Sound/ML API

-   tensorflow.js
-   magenta.js

## Reference Interface / Others

-   [hydra](https://github.com/ojack/hydra)
-   [glicol](https://glicol.org/)
-   [generative-music/theory](https://github.com/generative-music/theory)

## Genny 2.0
Current genny's code is really complex. I am thinking to update the code to make it more readable and maintainable.

-   support repricate API? and audio generation?
-   convert to typescript
-   bug fix some web audio api
-   update latest react-code mirror
-   multiple model running simultaneously
-   redefine rhythm pattern representation and allow to upload own sound file
-   show model loading state
