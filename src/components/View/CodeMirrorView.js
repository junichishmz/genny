/**
 * Library
 * Licence : MIT
 * react-codemirror : https://uiwjs.github.io/react-codemirror/
 */

import React, { useContext, useRef, Fragment, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sublime } from '@uiw/codemirror-theme-sublime';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';

import { ApiContext } from '../../contexts/ApiContext';

//Layout
import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

import { createTheme } from '@uiw/codemirror-themes';

import { tags as t } from '@lezer/highlight';
// import { Extension } from "@codemirror/state";
import { EditorView } from '@codemirror/view';
// import { defaultKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import Control from '../../core/Control';

const glslTheme = createTheme({
    theme: 'dark',
    settings: {
        background: 'rgba(0,0,0,0.0)',
        foreground: '#75baff',
        caret: '#5d00ff',
        selection: '#036dd626',
        selectionMatch: '#036dd626',
        lineHighlight: '#8a91991a',
        gutterBackground: '#282c34',
        gutterForeground: '#rgba(0,0,0,0.3)',
    },
    styles: [
        { tag: t.comment, color: '#94a6a6' },
        { tag: t.variableName, color: '#0080ff' },
        { tag: [t.string, t.special(t.brace)], color: '#fff' },
        { tag: t.number, color: '#fff' },
        { tag: t.bool, color: '#fff' },
        { tag: t.null, color: '#fff' },
        { tag: t.keyword, color: '#fff' },
        { tag: t.operator, color: '#fff' },
        { tag: t.className, color: '#5c6166' },
        { tag: t.definition(t.typeName), color: '#5c6166' },
        { tag: t.typeName, color: '#5c6166' },
        { tag: t.angleBracket, color: '#5c6166' },
        { tag: t.tagName, color: '#5c6166' },
        { tag: t.attributeName, color: '#5c6166' },
    ],
});

const StyledGrid = styled(Grid)(() => ({
    position: 'absolute',
    zIndex: '0',
    transition: 'backgroundColor 1s',
}));

const FlashStyledGrid = styled(Grid)(() => ({
    backgroundColor: 'rgba(255,255,255,0.4)',
    height: '80vh',
    position: 'relative',
    zIndex: '1',
    transitionDuration: '5s',
}));

const CodeMirrorView = () => {
    const {
        code,
        setCode,
        modelAutoCompletionDic,
        currentModelPara,
    } = useContext(ApiContext);

    const [running, setRunning] = useState(false);
    const ref = useRef(null);
    const controlRef = useRef(null);

    const onChange = React.useCallback((value, viewUpdate) => {
        setCode(value);
    }, []);

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function setRunningAsync() {
        await delay(10);
        setRunning(false);
    }

    //https://github.com/uiwjs/react-codemirror/issues/356
    const key_extention = [
        keymap.of([
            /**START Function */
            {
                key: 'Mod-Enter',
                // preventDefault: true,
                run: () => {
                    setRunning(true);
                    controlRef.current.exec();
                    setRunningAsync();
              
                },
            },
            /**For checking model loading or not */
            {
                key: 'Enter',
                run: () => {
                    // console.log(modelAutoCompletionDic)
                },
            },
            /**PAUSE Function */
            {
                key: 'Mod-Shift-Enter',
                // preventDefault: true,
                run: () => {
                    // setRunning(true);
                    console.log('pause');
                    controlRef.current.pause();
                    // setInterval(function () {
                    //     setRunning(false);
                    // }, 40);
                    //   alert("exec command");
                    //   return true
                },
            },
        ]),
    ];

    function flashOverView() {
        if (running) {
            return <FlashStyledGrid />;
        }
    }

    /**
     * Get current line number and data to send Control.js
     */
    function getLineNumber(data) {
        controlRef.current.update(data);
    }

    /**
     * Model Autoompletion
     */
    function modelCompletions(context) {
        let word = context.matchBefore(/\w*/);
        if (word.from === word.to && !context.explicit) return null;

        return {
            from: word.from,
            options: modelAutoCompletionDic,
        };
    }

    function modelParaCompletions(context) {
        let word = context.matchBefore(/\w*/);
        if (word.from === word.to && !context.explicit) return null;

        if (currentModelPara === undefined) return;

        return {
            from: word.from,
            options: currentModelPara,
        };
    }

    return (
        <Fragment>
            <StyledGrid xs={12}>
                <CodeMirror
                    ref={ref}
                    value={code}
                    theme={glslTheme} //glslTheme or sublime
                    height="80vh"
                    extensions={[
                        javascript({ jsx: true }),
                        key_extention,
                        autocompletion({
                            override: [modelCompletions, modelParaCompletions],
                        }),
                    ]}
                    onChange={onChange}
                    editable={true}
                    spellCheck={false}
                    onStatistics={data => {
                        getLineNumber(data);
                    }}
                    basicSetup={{
                        autocompletion: false,
                        defaultKeymap: false,
                        highlightActiveLine: false, //highlight option : https://github.com/uiwjs/react-codemirror/issues/424
                    }}
                />
            </StyledGrid>

            {flashOverView()}

            <Control ref={controlRef} />
        </Fragment>
    );
};

EditorView.contentAttributes.of({ spellCheck: 'false' });

export default CodeMirrorView;
