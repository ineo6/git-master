const path = require('path');
const webpack = require('webpack');
const ZipPlugin = require('zip-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WriteWebpackPlugin = require('write-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader');
const ExtensionReloader = require('webpack-extension-reloader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { argv } = require('yargs');
const wextManifest = require('./scripts/wext-manifest');
const manifestInput = require('./src/manifest');

const viewsPath = path.join(__dirname, 'views');
const sourcePath = path.join(__dirname, 'src');
const destPath = path.join(__dirname, 'extension');
const nodeEnv = process.env.NODE_ENV || 'development';
const targetBrowser = process.env.TARGET_BROWSER;
const manifest = wextManifest[targetBrowser](manifestInput);

const extensionReloaderPlugin =
  nodeEnv === 'development'
    ? new ExtensionReloader({
      port: 9090,
      reloadPage: true,
      entries: {
        // TODO: reload manifest on update
        contentScript: 'contentScript',
        background: 'background',
        extensionPage: ['popup', 'options'],
      },
    })
    : () => {
      this.apply = () => {};
    };

const analyzerPlugin = function() {
  if (nodeEnv === 'production' && !!argv.analyzer) {
    // eslint-disable-next-line global-require
    const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    return new BundleAnalyzerPlugin({
      analyzerPort: 9191,
    });
  } else {
    return () => {
      this.apply = () => {};
    };
  }
};

const getExtensionFileType = browser => {
  if (browser === 'opera') {
    return 'crx';
  }

  if (browser === 'firefox') {
    return 'xpi';
  }

  return 'zip';
};

const extPath = {
  chrome: 'chrome-extension://__MSG_@@extension_id__',
  firefox: 'moz-extension://__MSG_@@extension_id__',
  opera: 'chrome-extension://__MSG_@@extension_id__',
  safari: 'chrome-extension://__MSG_@@extension_id__',
};

function getLessVar() {
  const theme = {};

  if (targetBrowser) {
    const ePath = extPath[targetBrowser];

    if (ePath) {
      theme.ICON_PATH = "'" + ePath + "'";
    } else {
      theme.ICON_PATH = '.';
    }
  }

  return theme;
}

module.exports = {
  mode: nodeEnv,

  entry: {
    background: path.join(sourcePath, 'Background', 'index.ts'),
    contentScript: path.join(sourcePath, 'ContentScript', 'index.ts'),
    popup: path.join(sourcePath, 'Popup', 'index.tsx'),
    options: path.join(sourcePath, 'Options', 'index.tsx'),
  },

  output: {
    filename: 'js/[name].bundle.js',
    path: path.join(destPath, targetBrowser),
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: {
      'webextension-polyfill-ts': path.resolve(path.join(__dirname, 'node_modules', 'webextension-polyfill-ts')),
      'webextension-polyfill': path.resolve(path.join(__dirname, './src/common/libs/webextension-polyfill.js')),
      'webextension-polyfill-origin': path.resolve(path.join(__dirname, 'node_modules', 'webextension-polyfill')),
      key: path.resolve(path.join(__dirname, './src/common/libs/keymaster.js')),
      '@': path.resolve(__dirname, 'src'),
    },
  },

  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)?$/,
        loader: 'awesome-typescript-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          {
            loader: 'css-loader', // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader', // For autoprefixer
            options: {
              ident: 'postcss',
              // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
              plugins: [require('autoprefixer')()],
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          {
            loader: 'css-loader', // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'postcss-loader', // For autoprefixer
            options: {
              ident: 'postcss',
              // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
              plugins: [require('autoprefixer')()],
            },
          },
          'less-loader',
          {
            loader: 'less-loader',
            options: {
              javascriptEnabled: true,
              modifyVars: getLessVar(),
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        use: [
          {
            loader: 'file-loader',
            options: { name: 'fonts/[name].[hash:8].[ext]' },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'img/[name].[hash:7].[ext]',
        },
      },
    ],
  },

  plugins: [
    // for awesome-typescript-loader
    new CheckerPlugin(),
    // environmental variables
    new webpack.EnvironmentPlugin(['NODE_ENV', 'TARGET_BROWSER']),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      'jquery-pjax': 'jquery-pjax',
      jstree: 'jstree',
      key: 'key',
      TEMPLATE: path.join(__dirname, './src/common/template/template.js'),
    }),
    // delete previous build files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        path.join(process.cwd(), `extension/${targetBrowser}`),
        path.join(process.cwd(), `extension/${targetBrowser}.${getExtensionFileType(targetBrowser)}`),
      ],
      cleanStaleWebpackAssets: false,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, 'popup.html'),
      inject: 'body',
      chunks: ['popup'],
      filename: 'popup.html',
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, 'options.html'),
      inject: 'body',
      chunks: ['options'],
      filename: 'options.html',
    }),
    // write css file(s) to build folder
    new MiniCssExtractPlugin({ filename: 'css/[name].css' }),
    // copy static assets
    new CopyWebpackPlugin([
      {
        from: 'src/assets',
        to: 'assets',
      },
      {
        from: 'views/inject.js',
        to: 'inject.js',
      },
      {
        from: 'node_modules/@ineo6/file-icons/lib/fonts',
        to: 'fonts',
      },
      {
        from: 'views/libs/fonts/mastericons.woff2',
        to: 'fonts/mastericons.woff2',
      },
      {
        from: 'views/_locales',
        to: '_locales',
      },
      {
        from: 'views/assets',
        to: 'assets',
      },
    ]),
    // write manifest.json
    new WriteWebpackPlugin([
      {
        name: manifest.name,
        data: Buffer.from(manifest.content),
      },
    ]),
    // plugin to enable browser reloading in development mode
    extensionReloaderPlugin,
    analyzerPlugin(),
  ],

  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
      }),
      new ZipPlugin({
        path: destPath,
        extension: `${getExtensionFileType(targetBrowser)}`,
        filename: `${targetBrowser}`,
      }),
    ],
  },
};
