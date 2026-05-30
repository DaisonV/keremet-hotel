const KAZAKHSTAN_TIMEZONE = "Asia/Almaty";
const KAZAKHSTAN_OFFSET = "+05:00";

/* ── Timezone offset map (for datetime-local input parsing) ── */
const TZ_OFFSETS: Record<string, string> = {
    "Asia/Almaty": "+05:00",
    "Asia/Astana": "+05:00", // alias
};

const offsetForTz = (tz?: string) => TZ_OFFSETS[tz ?? KAZAKHSTAN_TIMEZONE] ?? KAZAKHSTAN_OFFSET;

const defaultDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: KAZAKHSTAN_TIMEZONE,
});

const inputFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: KAZAKHSTAN_TIMEZONE,
});

const ensureDate = (value: Date | string | number) => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const appendTimezone = (value: string, tz?: string) => {
    if (!value) {
        return value;
    }
    return value.includes("+") || value.endsWith("Z") ? value : `${value}${offsetForTz(tz)}`;
};

export const formatKazakhstanDateTime = (
    value?: Date | string | number | null,
    options?: Intl.DateTimeFormatOptions,
    fallback = "—",
) => {
    if (value == null) {
        return fallback;
    }
    const date = ensureDate(value);
    if (!date) {
        return fallback;
    }
    if (!options) {
        return defaultDateTimeFormatter.format(date);
    }
    return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: KAZAKHSTAN_TIMEZONE }).format(date);
};

/* ── Timezone-aware formatting (per-hotel) ── */

export const formatDateTime = (
    value?: Date | string | number | null,
    tz?: string,
    options?: Intl.DateTimeFormatOptions,
    fallback = "—",
) => {
    if (value == null) return fallback;
    const date = ensureDate(value);
    if (!date) return fallback;
    const timeZone = tz || KAZAKHSTAN_TIMEZONE;
    if (!options) {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone,
        }).format(date);
    }
    return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone }).format(date);
};

export const formatInputValue = (value?: Date | string | number | null, tz?: string) => {
    if (value == null) return "";
    const date = ensureDate(value);
    if (!date) return "";
    const timeZone = tz || KAZAKHSTAN_TIMEZONE;
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
    }).formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
};

export const parseInputValue = (value?: string | null, tz?: string) => {
    if (!value?.trim()) return undefined;
    const normalized = value.includes(":") && value.length >= 16 ? value : `${value}:00`;
    const date = new Date(appendTimezone(normalized, tz));
    return Number.isNaN(date.getTime()) ? undefined : date;
};

export const parseDateOnly = (value?: string | null, endOfDay = false, tz?: string) => {
    if (!value?.trim()) return undefined;
    const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
    const date = new Date(`${value}${suffix}${offsetForTz(tz)}`);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

/* ── Currency formatting ── */

export const formatMoney = (value: number, currency?: string) => {
    const cur = currency || "KZT";
    const fractionDigits = value % 100 === 0 ? 0 : 2;
    return `${(value / 100).toLocaleString("ru-RU", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })} ${cur}`;
};

/* ── Kazakhstan-only helpers ── */

export const formatKazakhstanInputValue = (value?: Date | string | number | null) => {
    if (value == null) {
        return "";
    }
    const date = ensureDate(value);
    if (!date) {
        return "";
    }
    const parts = inputFormatter.formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
    return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
};

export const parseKazakhstanInputValue = (value?: string | null) => {
    if (!value?.trim()) {
        return undefined;
    }
    const normalized = value.includes(":") && value.length >= 16 ? value : `${value}:00`;
    const date = new Date(appendTimezone(normalized));
    return Number.isNaN(date.getTime()) ? undefined : date;
};

export const parseKazakhstanDateOnly = (value?: string | null, endOfDay = false) => {
    if (!value?.trim()) {
        return undefined;
    }
    const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
    const date = new Date(`${value}${suffix}${KAZAKHSTAN_OFFSET}`);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

export { KAZAKHSTAN_TIMEZONE };
