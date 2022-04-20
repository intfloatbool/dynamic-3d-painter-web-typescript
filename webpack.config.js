const path = require('path');

module.exports = {
    mode: "development",
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            }
        ],
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },

    output: {
        filename: 'bundle.js',
        path: path.join(__dirname, "./out/")
    },

    devServer: {
        static: {
            directory: path.join(__dirname, "./out/")
        },
        compress: true,
        port: 9000
    },
};