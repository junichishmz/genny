import { ParserDictionary } from "./CodeParserDictionary";



export async function rhythmParser(code){
    //Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    var removeCommentOut = code.replace(regex, "");

    const pattern = /pattern\(.*?\)/s;
    const matches = removeCommentOut.match(pattern);
    
    var result
    if(matches !== null){
        result = toneRyhthmPattern(matches)    
    }
    return result
}


export function modelParaParser(value,code){

    //Comment Out
    var regex = /(?<!\*\/)\/\/.*$|\/\*[\s\S]*?\*\//gm;
    var removeCommentOut = code.replace(regex, "");

    //match the pattern and extract  of value()
    var pattern = new RegExp(value + "\\(([^)]*)\\)");
    var match = removeCommentOut.match(pattern);
    var res
    if (match) {
     res = match[1]; 
    }
    return res
}


/**
 * Find the gen() function to activate model
 * when you find the model() function code we will read the line until break, 
 * and determin gen() function is written or not
 */
export function activateGenFunction(model, code){

    const lines = code.split("\n");
    var activate = false
    var modelIdx = 0
    var gen = false
    for(const [idx,l] of lines.entries()){
        var modelName = model.name
        const matches = l.match(modelName)
        if(matches && l.startsWith("//") === false) {
            activate = true
            modelIdx = idx
        }
    }

    if(!activate) return

    for(var i = modelIdx; i < lines.length; i++){
        if (lines[i].includes(".gen()")) {
            gen = true
        } 
        //finish the line
        if(lines[i] === "") {
            model.genMode = gen
            return
        }
    }
    


}






/**
 * 
 * @param matches : '<measure> : <beat> : <subdivision>' : <pitch> or <string>
 * @returns 
 */
function toneRyhthmPattern(matches){
    const regex2 = /\["\d+:\d+:\d+", (\d+|"[^"]+")\]/g;
    
    const m = matches[0].match(regex2)
    const array = m.map(match => match.split(","));
    
    const res_array = []
    for(const key in array){
        const value = array[key];
        const result = value.map(item => item.replace(/^[\[\"\s]+|[\"\]\s]+$/g, ""));
        result[1] = parseInt(result[1])
        res_array.push(result)
    }

    return res_array

}






function splitChar(code){
    const string = 'pattern( ["0:0:0", "bd"], ["1:3:2", "hh"] )';

    const array = string.replace(/pattern\(|\)/g, '')
    // console.log(array)

    // console.log(instName)

    // const id = instName[0]
    const index = ParserDictionary.findIndex((v) => v.name === 'pattern')
    // console.log(index)
    

    // // var color
    // if(index === -1){
    //     var color = colorPallet[11].color
    // } else{
    //     var color = colorPallet[index].color
    // }

    // return color
}

