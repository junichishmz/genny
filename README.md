# Genny Strudel

Genny Strudel is an updated version of Genny that keeps the original generative-model live coding workflow while adding Strudel-style pattern notation and playback.

The original Genny repository has been archived with release tags and branches. This repository now continues the project as Genny Strudel.

## Original Genny

This repository began as the codebase for the paper [Genny: Designing and Exploring a Live Coding Interface for Generative Models](https://zenodo.org/records/7843500#.ZEAACuzP0-Q), authored by Junichi Shimizu and Rebecca Fiebrink. The paper was presented at the 7th International Conference on Live Coding (ICLC2023) in Utrecht.

Video reference: [Genny demo video](https://vimeo.com/781969647/824b802a67)

## What Changed

- Rebuilt the app with Vite, TypeScript, React, and Zustand.
- Added Strudel-compatible rhythm notation such as `s("bd ~ sn ~ bd bd sn ~").bank("808")`.
- Added a Strudel runtime path through `@strudel/transpiler` and `@strudel/webaudio`.
- Kept familiar Genny model calls such as `model()`, `gen()`, `output()`, `similar()`, and `interpolate()`.
- Added bridge examples where Strudel rhythm patterns can seed Genny model generation.
- Added syntax highlighting and completion support for Genny and Strudel-style code.
- Added a template picker with focused examples for Genny rhythm, Strudel rhythm notation, model bridging, and runtime sketches.

## Templates

- `Genny Rhythm Pattern`: original Genny time-code rhythm notation.
- `Strudel Rhythm Notation`: simple mini-notation rhythm with sample banks and gain.
- `Genny Model Bridge`: generation from a Strudel rhythm seed with a Genny model.
- `Strudel Runtime Example`: advanced Strudel code evaluated by the Strudel runtime.

## Development

Use pnpm for dependency management.

```sh
pnpm install
pnpm run type-check
pnpm run build
pnpm run dev
```

## Strudel Credit

Genny Strudel uses [Strudel](https://strudel.cc/) for pattern notation and runtime behavior. Please credit Strudel when sharing work based on this project.

This project depends on Strudel packages:

- `@strudel/core`
- `@strudel/mini`
- `@strudel/tonal`
- `@strudel/transpiler`
- `@strudel/webaudio`
- `@strudel/midi`
- `@strudel/soundfonts`

## Reference Interface / Others

- [hydra](https://github.com/ojack/hydra)
- [glicol](https://glicol.org/)
- [generative-music/theory](https://github.com/generative-music/theory)

## License Notes

Strudel is licensed under `AGPL-3.0-or-later`. Because this project depends on Strudel packages, this repository is also marked as `AGPL-3.0-or-later` in `package.json` and includes an AGPL license file. If this project is distributed or made available as a network service, keep the corresponding source code and license notices available in accordance with the AGPL.
