"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/country-flag-icons";
exports.ids = ["vendor-chunks/country-flag-icons"];
exports.modules = {

/***/ "(ssr)/./node_modules/country-flag-icons/modules/unicode.js":
/*!************************************************************!*\
  !*** ./node_modules/country-flag-icons/modules/unicode.js ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ getCountryFlag)\n/* harmony export */ });\n/**\r\n * Creates Unicode flag from a two-letter ISO country code.\r\n * https://stackoverflow.com/questions/24050671/how-to-put-japan-flag-character-in-a-string\r\n * @param  {string} country — A two-letter ISO country code (case-insensitive).\r\n * @return {string}\r\n */\nfunction getCountryFlag(country) {\n  return getRegionalIndicatorSymbol(country[0]) + getRegionalIndicatorSymbol(country[1]);\n}\n/**\r\n * Converts a letter to a Regional Indicator Symbol.\r\n * @param  {string} letter\r\n * @return {string}\r\n */\n\nfunction getRegionalIndicatorSymbol(letter) {\n  return String.fromCodePoint(0x1F1E6 - 65 + letter.toUpperCase().charCodeAt(0));\n}\n//# sourceMappingURL=unicode.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvY291bnRyeS1mbGFnLWljb25zL21vZHVsZXMvdW5pY29kZS5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0EsWUFBWSxRQUFRO0FBQ3BCLFlBQVk7QUFDWjtBQUNlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFFBQVE7QUFDcEIsWUFBWTtBQUNaOztBQUVBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY2xpZW50LWRhc2hib2FyZC8uL25vZGVfbW9kdWxlcy9jb3VudHJ5LWZsYWctaWNvbnMvbW9kdWxlcy91bmljb2RlLmpzPzRjYzAiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZXMgVW5pY29kZSBmbGFnIGZyb20gYSB0d28tbGV0dGVyIElTTyBjb3VudHJ5IGNvZGUuXHJcbiAqIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzI0MDUwNjcxL2hvdy10by1wdXQtamFwYW4tZmxhZy1jaGFyYWN0ZXItaW4tYS1zdHJpbmdcclxuICogQHBhcmFtICB7c3RyaW5nfSBjb3VudHJ5IOKAlCBBIHR3by1sZXR0ZXIgSVNPIGNvdW50cnkgY29kZSAoY2FzZS1pbnNlbnNpdGl2ZSkuXHJcbiAqIEByZXR1cm4ge3N0cmluZ31cclxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZXRDb3VudHJ5RmxhZyhjb3VudHJ5KSB7XG4gIHJldHVybiBnZXRSZWdpb25hbEluZGljYXRvclN5bWJvbChjb3VudHJ5WzBdKSArIGdldFJlZ2lvbmFsSW5kaWNhdG9yU3ltYm9sKGNvdW50cnlbMV0pO1xufVxuLyoqXHJcbiAqIENvbnZlcnRzIGEgbGV0dGVyIHRvIGEgUmVnaW9uYWwgSW5kaWNhdG9yIFN5bWJvbC5cclxuICogQHBhcmFtICB7c3RyaW5nfSBsZXR0ZXJcclxuICogQHJldHVybiB7c3RyaW5nfVxyXG4gKi9cblxuZnVuY3Rpb24gZ2V0UmVnaW9uYWxJbmRpY2F0b3JTeW1ib2wobGV0dGVyKSB7XG4gIHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludCgweDFGMUU2IC0gNjUgKyBsZXR0ZXIudG9VcHBlckNhc2UoKS5jaGFyQ29kZUF0KDApKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXVuaWNvZGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/country-flag-icons/modules/unicode.js\n");

/***/ })

};
;