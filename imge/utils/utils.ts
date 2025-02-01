/**
 * Logs arguments to the console.
 * @param args - Any number of arguments to log
 */
export function print(...args: unknown[]): void {
    console.log(...args);
}

/**
 * Converts a string to Proper Case (capitalize first letter of each word).
 * @param str - The input string
 * @returns The string in Proper Case
 */
export function toProperCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Formats a date according to the provided format.
 * Supported format tokens: yyyy, yy, MM, M, dd, d, HH, H, mm, m, ss, s, a
 * @param inputDate - The date to format
 * @param format - The format string
 * @returns The formatted date as a string
 */
export function formatDate(inputDate: string | Date, format: string): string {
    const date = new Date(inputDate);

    if (isNaN(date.getTime())) {
        return "Invalid date";
    }

    const options: Record<string, string | number> = {
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
        a: date.getHours() < 12 ? "AM" : "PM",
    };

    return format.replace(/yyyy|yy|MM|M|dd|d|HH|H|mm|m|ss|s|a/g, (match) => String(options[match]));
}

/**
 * Returns a description of the language based on its code.
 * @param language_code - The language code (e.g., 'en', 'tr', 'es')
 * @returns The language description or an empty string if not found
 */
export function getLanguageDescription(language_code: string): string {
    const language_map: Record<string, string> = {
        en: "This article is written in English.",
        tr: "This article is written in Turkish.",
        es: "This article is written in Spanish.",
        fr: "This article is written in French.",
        de: "This article is written in German.",
        it: "This article is written in Italian.",
        pt: "This article is written in Portuguese.",
        ru: "This article is written in Russian.",
        zh: "This article is written in Chinese.",
    };

    return language_map[language_code] || "";
}
