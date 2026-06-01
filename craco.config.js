const path = require('path');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // tone の "browser" フィールドが UMD バンドル (build/Tone.js) を指すため、
            // ESM ビルドに直接エイリアスして webpack-in-webpack 問題を回避する
            webpackConfig.resolve.alias['tone'] = path.resolve(
                __dirname,
                'node_modules/tone/build/esm/index.js'
            );

            // エイリアス先が node_modules 内のため ModuleScopePlugin の制限を解除する
            webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
                plugin => plugin.constructor && plugin.constructor.name !== 'ModuleScopePlugin'
            );

            // tone の ESM ファイルは拡張子なしの import を使っているため
            // fullySpecified の強制を tone パッケージのみ無効化する
            webpackConfig.module.rules.push({
                test: /\.js$/,
                include: /node_modules\/tone/,
                resolve: {
                    fullySpecified: false,
                },
            });

            return webpackConfig;
        },
    },
};
