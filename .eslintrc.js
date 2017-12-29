module.exports = {
  "env": {
    // http://guowenfh.github.io/2016/08/07/ESLint-Rules/
    "browser": true,
    "node": true,
    "es6": true,
    "commonjs": true,
    "amd": true,
    "mocha":true
  },
  "rules": {
    "curly": [2, "multi-line"],
    "consistent-return": 0,
    "quotes": [2, "single"],
    "semi": [2, "never"],
    "strict": 0,
    "camelcase": 0,
    "no-debugger": 2,
    "no-alert": 0,
    "no-underscore-dangle": 0,
    "new-cap": [2, {
      "capIsNewExceptions": [
        "Jcrop",
        "Link",
        "Router",
        "Bar"
      ]
    }],
    "no-use-before-define": [2, "nofunc"],
    "space-before-blocks": [2, "always"],
    "no-unused-vars": [2, {"vars": "all", "args": "none"}]
  },
  "globals": { // Globals variables.
    "jQuery": true,
    "requirejs": true,
    "next": true,
    "node": true,
    "Handlebars": true,
    "define": true,
    "$": true
  }
};