// ~/utils/print.js
export function print(...args) {
    console.log(...args);
}

export function toProperCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}