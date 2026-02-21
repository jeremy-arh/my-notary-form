"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_lib_utils_funnelStatus_ts";
exports.ids = ["_rsc_lib_utils_funnelStatus_ts"];
exports.modules = {

/***/ "(rsc)/./lib/utils/funnelStatus.ts":
/*!***********************************!*\
  !*** ./lib/utils/funnelStatus.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   shouldUpdateFunnelStatus: () => (/* binding */ shouldUpdateFunnelStatus)\n/* harmony export */ });\n/**\r\n * Helper pour funnel_status - workflow identique à l'ancienne version.\r\n */ const FUNNEL_ORDER = {\n    started: 1,\n    services_selected: 2,\n    documents_uploaded: 3,\n    delivery_method_selected: 4,\n    personal_info_completed: 5,\n    summary_viewed: 6,\n    payment_pending: 7,\n    payment_completed: 8,\n    submission_completed: 9\n};\nfunction shouldUpdateFunnelStatus(currentStatus, newStatus) {\n    if (!newStatus) return false;\n    const currentOrder = FUNNEL_ORDER[currentStatus ?? \"\"] ?? 0;\n    const newOrder = FUNNEL_ORDER[newStatus] ?? 0;\n    return newOrder > currentOrder;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvdXRpbHMvZnVubmVsU3RhdHVzLnRzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Q0FFQyxHQUVELE1BQU1BLGVBQXVDO0lBQzNDQyxTQUFTO0lBQ1RDLG1CQUFtQjtJQUNuQkMsb0JBQW9CO0lBQ3BCQywwQkFBMEI7SUFDMUJDLHlCQUF5QjtJQUN6QkMsZ0JBQWdCO0lBQ2hCQyxpQkFBaUI7SUFDakJDLG1CQUFtQjtJQUNuQkMsc0JBQXNCO0FBQ3hCO0FBRU8sU0FBU0MseUJBQ2RDLGFBQTRCLEVBQzVCQyxTQUF3QjtJQUV4QixJQUFJLENBQUNBLFdBQVcsT0FBTztJQUN2QixNQUFNQyxlQUFlYixZQUFZLENBQUNXLGlCQUFpQixHQUFHLElBQUk7SUFDMUQsTUFBTUcsV0FBV2QsWUFBWSxDQUFDWSxVQUFVLElBQUk7SUFDNUMsT0FBT0UsV0FBV0Q7QUFDcEIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jbGllbnQtZGFzaGJvYXJkLy4vbGliL3V0aWxzL2Z1bm5lbFN0YXR1cy50cz80YmE1Il0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBIZWxwZXIgcG91ciBmdW5uZWxfc3RhdHVzIC0gd29ya2Zsb3cgaWRlbnRpcXVlIMOgIGwnYW5jaWVubmUgdmVyc2lvbi5cclxuICovXHJcblxyXG5jb25zdCBGVU5ORUxfT1JERVI6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgc3RhcnRlZDogMSxcclxuICBzZXJ2aWNlc19zZWxlY3RlZDogMixcclxuICBkb2N1bWVudHNfdXBsb2FkZWQ6IDMsXHJcbiAgZGVsaXZlcnlfbWV0aG9kX3NlbGVjdGVkOiA0LFxyXG4gIHBlcnNvbmFsX2luZm9fY29tcGxldGVkOiA1LFxyXG4gIHN1bW1hcnlfdmlld2VkOiA2LFxyXG4gIHBheW1lbnRfcGVuZGluZzogNyxcclxuICBwYXltZW50X2NvbXBsZXRlZDogOCxcclxuICBzdWJtaXNzaW9uX2NvbXBsZXRlZDogOSxcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRVcGRhdGVGdW5uZWxTdGF0dXMoXHJcbiAgY3VycmVudFN0YXR1czogc3RyaW5nIHwgbnVsbCxcclxuICBuZXdTdGF0dXM6IHN0cmluZyB8IG51bGxcclxuKTogYm9vbGVhbiB7XHJcbiAgaWYgKCFuZXdTdGF0dXMpIHJldHVybiBmYWxzZTtcclxuICBjb25zdCBjdXJyZW50T3JkZXIgPSBGVU5ORUxfT1JERVJbY3VycmVudFN0YXR1cyA/PyBcIlwiXSA/PyAwO1xyXG4gIGNvbnN0IG5ld09yZGVyID0gRlVOTkVMX09SREVSW25ld1N0YXR1c10gPz8gMDtcclxuICByZXR1cm4gbmV3T3JkZXIgPiBjdXJyZW50T3JkZXI7XHJcbn1cclxuIl0sIm5hbWVzIjpbIkZVTk5FTF9PUkRFUiIsInN0YXJ0ZWQiLCJzZXJ2aWNlc19zZWxlY3RlZCIsImRvY3VtZW50c191cGxvYWRlZCIsImRlbGl2ZXJ5X21ldGhvZF9zZWxlY3RlZCIsInBlcnNvbmFsX2luZm9fY29tcGxldGVkIiwic3VtbWFyeV92aWV3ZWQiLCJwYXltZW50X3BlbmRpbmciLCJwYXltZW50X2NvbXBsZXRlZCIsInN1Ym1pc3Npb25fY29tcGxldGVkIiwic2hvdWxkVXBkYXRlRnVubmVsU3RhdHVzIiwiY3VycmVudFN0YXR1cyIsIm5ld1N0YXR1cyIsImN1cnJlbnRPcmRlciIsIm5ld09yZGVyIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/utils/funnelStatus.ts\n");

/***/ })

};
;