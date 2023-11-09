import React, { createContext, useState, useEffect } from 'react';

import { initialCode } from '../utils/Presets';

//Model Config Loader
import { loadModelConfig } from '../core/Model';

export const ApiContext = createContext();

const ApiContextProvider = props => {
    //current code
    const [code, setCode] = useState(initialCode);

    //modelConfig
    const [modelConfigList, setModelConfigList] = useState([]);

    //modelAutoCompletion
    const [modelAutoCompletionDic, setModelAutoCompletion] = useState([]);

    //each model parameter dic
    const [modelParaDic, setModelParaDic] = useState([]);

    //currentModel
    const [currentModelPara, setCurrentModelPara] = useState();

    //Output log
    const [log, setLog] = useState('output log');

    //Similarity
    const [similarityDis, setSimilarityDis] = useState(0);

    /**Loading the model config */
    useEffect(() => {
        loadModelConfig().then(res => {
            setModelConfigList(res);
            var dic_array = [];
            for (const [idx, model] of res.entries()) {
                var dic = {};
                var modelName = model.model.name;
                dic['label'] = 'model';
                dic['type'] = 'variable';
                dic['apply'] = 'model(' + modelName + ')';
                dic['detail'] = 'loading ' + modelName;
                dic['loaded'] = false;
                dic['genMode'] = false;
                dic['currentCompletion'] = false;
                dic['id'] = idx;
                dic['modelLineStart'] = 0; //determin which line input can use for model control
                dic['name'] = modelName; //not use
                dic_array.push(dic);
            }
            setModelAutoCompletion(dic_array);
            loadModelParameter(res);
            //ToDo : add function autocompletion
            // loadModelFunctionParameter(res)
        });
    }, []);

    function loadModelParameter(config) {
        var dic_array = [];
        var model_para_array = [];
        for (const model of config) {
            var para = model.model.parameter;

            dic_array = [];

            for (const [idx, p] of para.entries()) {
                var dic = {};
                var key = Object.keys(p);

                var value;
                if (typeof p[key] === 'string') {
                    value = "('" + p[key] + "')";
                } else {
                    value = '(' + p[key] + ')';
                }

                dic['label'] = 'p';
                dic['type'] = 'variable';
                dic['apply'] = key[0] + value;
                dic['detail'] = key[0];
                dic['id'] = idx;
                dic['value'] = p[key];

                dic_array.push(dic);
            }
            model_para_array.push(dic_array);
        }
        setModelParaDic(model_para_array);
    }

    return (
        <ApiContext.Provider
            value={{
                code,
                setCode,
                modelConfigList,
                modelAutoCompletionDic,
                modelParaDic,
                currentModelPara,
                setCurrentModelPara,
                log,
                setLog,
                similarityDis,
                setSimilarityDis,
            }}
        >
            {props.children}
        </ApiContext.Provider>
    );
};

export default ApiContextProvider;
