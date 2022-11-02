// @ts-check
import glob from 'glob';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const watcher = (globs) => ({
  buildStart() {
    for (const item of globs) {
      glob.sync(path.resolve(__dirname, item)).forEach((filename) => {
        this.addWatchFile(filename);
      });
    }
  },
});

export default {
  input: './assets/sample.ts',
  output: [
    {
      file: `./assets/build/bundle.js`,
      format: 'es',
      strict: true,
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
    commonjs(),
    json(),
    serve({ contentBase: './assets', open: true, port: "8080" }),
    watcher(['./assets/index.html', './assets/styles.css']),
    livereload(),
  ],
};