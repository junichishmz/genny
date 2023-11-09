import React, { useContext } from 'react';
import { ApiContext } from '../../contexts/ApiContext';

const ConsoleView = () => {
    const { log } = useContext(ApiContext);

    return (
        <div>
            <p
                style={{
                    paddingLeft: '10px',
                }}
            >
                console : generated data
            </p>

            <p
                style={{
                    paddingLeft: '10px',
                }}
            >
                {log}
            </p>
        </div>
    );
};

export default ConsoleView;
