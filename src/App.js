import './App.css';

import ApiContextProvider from './contexts/ApiContext';

import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import CodeMirrorView from './components/View/CodeMirrorView';
import Header from './components/View/Header';
import ConsoleView from './components/View/ConsoleView';
import GlslView from './components/View/GlslView';

const StyledGrid = styled(Grid)(() => ({
    // backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    // ...theme.typography.body2,
    // padding: theme.spacing(1),
    textAlign: 'left',
    fontSize: 'calc(8px + 1vmin)',
    zIndex: '1',
    // color: theme.palette.text.secondary,
}));

const OutputLogGrid = styled(Grid)(() => ({
    position: 'relative',
    top: '80vh',
    fontSize: 'calc(8px + 1vmin)',
}));

function App() {
    return (
        <ApiContextProvider>
            <div className="App">
                <Header />

                <StyledGrid container spacing={0}>
                    <StyledGrid xs={12}>
                        <CodeMirrorView />
                    </StyledGrid>

                    <div className="glsl">
                        <GlslView />
                    </div>

                    <OutputLogGrid>
                        <ConsoleView />
                    </OutputLogGrid>
                </StyledGrid>
            </div>
        </ApiContextProvider>
    );
}

export default App;
