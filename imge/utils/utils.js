// ~/utils/print.js
export function print(...args) {
    console.log(...args);
}

export function toProperCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

export function formatDate(inputDate, format) {
    const date = new Date(inputDate);
    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    const options = {
        yyyy: date.getFullYear(),
        yy: String(date.getFullYear()).slice(-2),
        MM: String(date.getMonth() + 1).padStart(2, '0'),
        M: date.getMonth() + 1,
        dd: String(date.getDate()).padStart(2, '0'),
        d: date.getDate(),
        HH: String(date.getHours()).padStart(2, '0'),
        H: date.getHours(),
        mm: String(date.getMinutes()).padStart(2, '0'),
        m: date.getMinutes(),
        ss: String(date.getSeconds()).padStart(2, '0'),
        s: date.getSeconds(),
        a: date.getHours() < 12 ? "AM" : "PM"
    };

    return format.replace(/yyyy|yy|MM|M|dd|d|HH|H|mm|m|ss|s|a/g, match => options[match]);
}

export function getLanguageDescription(language_code) {
    console.log('test')
    const language_map = {
        "en": "This article is written in English.",
        "tr": "This article is written in Turkish.",
        "es": "This article is written in Spanish.",
        "fr": "This article is written in French.",
        "de": "This article is written in German.",
        "it": "This article is written in Italian.",
        "pt": "This article is written in Portuguese.",
        "ru": "This article is written in Russian.",
        "zh": "This article is written in Chinese."
    }
    return language_map[language_code] || "";
}