
/* Add auto completion example
https://github.com/uiwjs/react-codemirror/issues/298

official example
https://codemirror.net/examples/autocompletion/

*/


/**
 * ToDo : refactoring from CodeMirrorView 
 */
export function myCompletions(context) {
     let word = context.matchBefore(/\w*/)
    if (word.from === word.to && !context.explicit)
        return null
    return {
        from: word.from,
        options: [
        {label: "match", type: "keyword"},
        {label: "hello", type: "variable", info: "(World)"},
        {label: "magic", type: "text", apply: "⠁⭒*.✩.*⭒⠁", detail: "macro"},
        {label: "p", type: "text", apply: "tempature", detail: "temparture"},
        {label: "p", type: "text", apply: "hoge", detail: "hoge"},
        {label: "model", type: "text", apply: "model()", detail: "model loading function"},
        {label: "config", type: "variable",  detail: "music vae"},
        {label: "checkpoint", type: "variable",  detail: "music vae"},
        ]
    }
}
